import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createServer } from 'net';
import { PGLiteEngine } from '../../../src/core/pglite-engine.ts';
import { GBrainOAuthProvider } from '../../../src/core/oauth-provider.ts';
import { sqlQueryForEngine } from '../../../src/core/sql-query.ts';

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') resolve(address.port);
        else reject(new Error('failed to allocate port'));
      });
    });
  });
}

async function waitForHealth(baseUrl: string, stderr: () => string) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {
      // keep polling while the child process starts
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`server did not become healthy:\n${stderr().slice(-1000)}`);
}

describe('G2 admin OAuth client export endpoint', () => {
  let proc: ChildProcess | null = null;
  let tempHome = '';
  let baseUrl = '';
  let adminCookie = '';
  let clientId = '';
  const clientSecret = 'gbrain_cs_export_secret';
  const bootstrapToken = 'G2ExportBootstrapToken0123456789abcdef';
  let stderr = '';

  beforeAll(async () => {
    const port = await freePort();
    baseUrl = `http://127.0.0.1:${port}`;
    tempHome = mkdtempSync(join(tmpdir(), 'ebrain-g2-export-'));
    const configDir = join(tempHome, '.gbrain');
    const dbPath = join(tempHome, 'brain-pglite');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, 'config.json'), JSON.stringify({
      engine: 'pglite',
      database_path: dbPath,
    }, null, 2));

    const engine = new PGLiteEngine();
    await engine.connect({ engine: 'pglite', database_path: dbPath });
    await engine.initSchema();
    await engine.executeRaw(
      `INSERT INTO executives (executive_id, email, display_name, role, soul_path, access_policy_path)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['ceo', 'ceo@example.test', 'CEO Example', 'CEO', 'executives/ceo/SOUL.md', 'executives/ceo/AGENT_PERSONA.md'],
    );
    const provider = new GBrainOAuthProvider({ sql: sqlQueryForEngine(engine) });
    const registered = await provider.registerClientManual(
      'export-agent', ['client_credentials'], 'read write', [], 'default', undefined, undefined, 'ceo',
    );
    clientId = registered.clientId;
    await engine.disconnect();

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
    expect(issue.status).toBe(200);
    const { url } = await issue.json() as { url: string };
    const click = await fetch(url, { redirect: 'manual' });
    expect(click.status).toBe(302);
    const cookie = click.headers.get('set-cookie') ?? '';
    const match = cookie.match(/gbrain_admin=([^;]+)/);
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

  test('requires admin session', async () => {
    const res = await fetch(`${baseUrl}/admin/api/clients/${clientId}/export?format=json`);
    expect(res.status).toBe(403);
  });

  test('rejects invalid format', async () => {
    const res = await fetch(`${baseUrl}/admin/api/clients/${clientId}/export?format=yaml`, {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('invalid_format');
  });

  test('returns Claude Desktop export JSON', async () => {
    const res = await fetch(`${baseUrl}/admin/api/clients/${clientId}/export?format=claude-desktop&secret=${clientSecret}`, {
      headers: { Cookie: adminCookie },
    });
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = JSON.parse(await res.text());
    expect(body.mcpServers.gbrain.url).toBe(`${baseUrl}/mcp`);
    expect(body.mcpServers.gbrain.oauth.client_id).toBe(clientId);
    expect(body.mcpServers.gbrain.oauth.client_secret).toBe(clientSecret);
    expect(body.mcpServers.gbrain.oauth.authorize_url).toBe(`${baseUrl}/authorize`);
    expect(body.mcpServers.gbrain.oauth.token_url).toBe(`${baseUrl}/token`);
  });

  test('returns Cursor export JSON', async () => {
    const res = await fetch(`${baseUrl}/admin/api/clients/${clientId}/export?format=cursor&secret=${clientSecret}`, {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.mcpServers.gbrain.url).toBe(`${baseUrl}/mcp`);
    expect(body.mcpServers.gbrain.oauth.client_id).toBe(clientId);
    expect(body.mcpServers.gbrain.oauth.client_secret).toBe(clientSecret);
  });

  test('returns generic export JSON', async () => {
    const res = await fetch(`${baseUrl}/admin/api/clients/${clientId}/export?format=json&secret=${clientSecret}`, {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.client_id).toBe(clientId);
    expect(body.client_secret).toBe(clientSecret);
    expect(body.mcp_url).toBe(`${baseUrl}/mcp`);
    expect(body.authorize_url).toBe(`${baseUrl}/authorize`);
    expect(body.token_url).toBe(`${baseUrl}/token`);
  });
});
