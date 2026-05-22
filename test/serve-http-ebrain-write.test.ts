import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createServer } from 'net';

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
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
  let tempHome = '';
  let dbPath = '';
  let baseUrl = '';
  let adminCookie = '';
  let stderr = '';
  const bootstrapToken = 'H2WriteBootstrapToken0123456789abcdef';

  beforeAll(async () => {
    const port = await freePort();
    baseUrl = `http://127.0.0.1:${port}`;
    tempHome = mkdtempSync(join(tmpdir(), 'ebrain-h2-write-'));
    dbPath = join(tempHome, 'brain-pglite');
    const configDir = join(tempHome, '.gbrain');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, 'config.json'), JSON.stringify({ engine: 'pglite', database_path: dbPath }, null, 2));

    const { PGLiteEngine } = await import('../src/core/pglite-engine.ts');
    const engine = new PGLiteEngine();
    await engine.connect({ engine: 'pglite', database_path: dbPath });
    await engine.initSchema();
    await engine.disconnect();

    proc = spawn('bun', [
      'run', 'src/cli.ts', 'serve', '--http',
      '--port', String(port),
      '--bind', '127.0.0.1',
      '--public-url', baseUrl,
      '--suppress-bootstrap-token',
    ], {
      cwd: process.cwd(),
      env: { ...process.env, GBRAIN_HOME: tempHome, GBRAIN_ADMIN_BOOTSTRAP_TOKEN: bootstrapToken },
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
    if (proc) {
      proc.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!proc.killed) proc.kill('SIGKILL');
    }
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
});
