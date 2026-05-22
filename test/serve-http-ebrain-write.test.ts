import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { createServer as createHttpServer, type Server as HttpServer } from 'http';
import { tmpdir } from 'os';
import { join } from 'path';
import { createServer as createTcpServer } from 'net';
import { PGLiteEngine } from '../src/core/pglite-engine.ts';

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createTcpServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => address && typeof address === 'object' ? resolve(address.port) : reject(new Error('no port')));
    });
  });
}

async function waitForHealth(baseUrl: string, stderr: () => string) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`server did not become healthy:\n${stderr().slice(-1000)}`);
}

describe('H2 serve-http ebrain write routes', () => {
  let proc: ChildProcess | null = null;
  let vendorServer: HttpServer | null = null;
  let inspectionEngine: PGLiteEngine | null = null;
  let tempHome = '';
  let dbPath = '';
  let baseUrl = '';
  let vendorBaseUrl = '';
  let adminCookie = '';
  let stderr = '';
  const bootstrapToken = 'H2WriteBootstrapToken0123456789abcdef';

  async function stopServeHttp() {
    if (!proc) return;
    const child = proc;
    proc = null;
    const exited = new Promise<void>(resolve => child.once('exit', () => resolve()));
    child.kill('SIGTERM');
    await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 1_000))]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 500))]);
    }
  }

  beforeAll(async () => {
    const port = await freePort();
    baseUrl = `http://127.0.0.1:${port}`;
    const vendorPort = await freePort();
    vendorBaseUrl = `http://127.0.0.1:${vendorPort}`;
    vendorServer = createHttpServer((req, res) => {
      if (req.method === 'POST' && req.url === '/v1.0/oauth2/accessToken') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ accessToken: 'route-dingtalk-token', expireIn: 7200 }));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
    });
    await new Promise<void>((resolve, reject) => {
      vendorServer!.once('error', reject);
      vendorServer!.listen(vendorPort, '127.0.0.1', () => resolve());
    });

    tempHome = mkdtempSync(join(tmpdir(), 'ebrain-h2-write-'));
    dbPath = join(tempHome, 'brain-pglite');
    const configDir = join(tempHome, '.gbrain');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, 'config.json'), JSON.stringify({ engine: 'pglite', database_path: dbPath }, null, 2));

    inspectionEngine = new PGLiteEngine();
    await inspectionEngine.connect({ engine: 'pglite', database_path: dbPath });
    await inspectionEngine.initSchema();
    await inspectionEngine.disconnect();

    proc = spawn('bun', [
      'run', 'src/cli.ts', 'serve', '--http',
      '--port', String(port),
      '--bind', '127.0.0.1',
      '--public-url', baseUrl,
      '--suppress-bootstrap-token',
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        GBRAIN_HOME: tempHome,
        GBRAIN_ADMIN_BOOTSTRAP_TOKEN: bootstrapToken,
        EBRAIN_SECRETS_KEY: Buffer.alloc(32, 7).toString('base64'),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    proc.stderr?.on('data', d => { stderr += d.toString(); });
    await waitForHealth(baseUrl, () => stderr);

    const issue = await fetch(`${baseUrl}/admin/api/issue-magic-link`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bootstrapToken}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const { url } = await issue.json() as { url: string };
    const click = await fetch(url, { redirect: 'manual' });
    const match = (click.headers.get('set-cookie') ?? '').match(/gbrain_admin=([^;]+)/);
    expect(match).toBeTruthy();
    adminCookie = `gbrain_admin=${match![1]}`;
  }, 30_000);

  afterAll(async () => {
    await stopServeHttp();
    if (vendorServer) await new Promise<void>(resolve => vendorServer!.close(() => resolve()));
    if (tempHome) rmSync(tempHome, { recursive: true, force: true });
  });

  test('rejects unauthenticated ebrain writes with 403', async () => {
    const res = await fetch(`${baseUrl}/admin/api/ebrain/executives`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(403);
  });

  test('creates an executive through the admin write route and persists the DB row', async () => {
    const res = await fetch(`${baseUrl}/admin/api/ebrain/executives`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ executive_id: 'ceo', email: 'ceo@example.test', name: 'CEO Example', role: 'CEO', soul_path: 'executives/ceo/SOUL.md' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { executiveId: string };
    expect(body.executiveId).toBe('ceo');

    const list = await fetch(`${baseUrl}/admin/api/ebrain/ops/list_executives`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ active_only: true, limit: 10 }),
    });
    expect(list.status).toBe(200);
    const listed = await list.json() as { result: Array<{ executiveId: string; email: string }> };
    expect(listed.result.find(row => row.executiveId === 'ceo')?.email).toBe('ceo@example.test');
  }, 30_000);

  test('test-connection rejects unsupported providers instead of accepting nonempty credentials', async () => {
    const res = await fetch(`${baseUrl}/admin/api/ebrain/enterprise-apps/test-connection`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_type: 'wecom',
        credentials: { client_id: 'not-used', client_secret: 'not-used' },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; message: string };
    expect(body.ok).toBe(false);
    expect(body.message).toBe("unsupported_app_type 'wecom' (supported: dingtalk, feishu)");
  }, 30_000);

  test('test-connection shell app becomes enabled after save upsert', async () => {
    const appId = 'dingtalk-save-r2';
    const connection = await fetch(`${baseUrl}/admin/api/ebrain/enterprise-apps/test-connection`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_type: 'dingtalk',
        app_id: appId,
        display_name: 'DingTalk Save R2',
        credentials: { client_id: 'ding-key-r2', client_secret: 'ding-secret-r2' },
        config: { api_base_url: vendorBaseUrl },
      }),
    });
    expect(connection.status).toBe(200);
    const connectionBody = await connection.json() as { ok: boolean; message: string };
    expect(connectionBody.ok).toBe(true);
    expect(connectionBody.message).toBe('connection verified via token refresh');

    const save = await fetch(`${baseUrl}/admin/api/ebrain/enterprise-apps`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_type: 'dingtalk',
        app_id: appId,
        display_name: 'DingTalk Save R2',
        credentials: { client_id: 'ding-key-r2', client_secret: 'ding-secret-r2' },
        config: { api_base_url: vendorBaseUrl, sub_connectors: ['default'] },
      }),
    });
    expect(save.status).toBe(200);

    await stopServeHttp();
    const engine = inspectionEngine!;
    await engine.connect({ engine: 'pglite', database_path: dbPath });
    try {
      const rows = await engine.executeRaw<{
        enabled: boolean;
        bot_enabled: boolean;
        push_enabled: boolean;
        deleted_at: string | null;
      }>(
        `SELECT enabled, bot_enabled, push_enabled, deleted_at
         FROM enterprise_apps
         WHERE app_id = $1`,
        [appId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.enabled).toBe(true);
      expect(rows[0]?.bot_enabled).toBe(true);
      expect(rows[0]?.push_enabled).toBe(true);
      expect(rows[0]?.deleted_at).toBeNull();
    } finally {
      await engine.disconnect();
    }
  }, 30_000);
});
