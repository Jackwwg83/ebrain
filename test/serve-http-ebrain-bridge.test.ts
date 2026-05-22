import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Subprocess } from 'bun';

const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

interface ServeProc {
  proc: Subprocess;
  port: number;
  home: string;
  cookie: string;
}

let server: ServeProc | null = null;

function pickPort(): number {
  return 35000 + Math.floor(Math.random() * 2500);
}

async function waitForHealth(port: number): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`serve --http never became healthy on ${port}`);
}

async function startServer(): Promise<ServeProc> {
  const home = mkdtempSync(join(tmpdir(), 'gbrain-ebrain-admin-'));
  mkdirSync(join(home, '.gbrain'), { recursive: true });
  writeFileSync(
    join(home, '.gbrain', 'config.json'),
    JSON.stringify({
      engine: 'pglite',
      database_path: join(home, '.gbrain', 'brain.pglite'),
      embedding_dimensions: 1536,
    }) + '\n',
  );

  const port = pickPort();
  const bootstrapToken = 'test-ebrain-bootstrap-token-aaaaaaaaaaaa';
  const proc = Bun.spawn(
    [
      'bun',
      'run',
      `${REPO}/src/cli.ts`,
      'serve',
      '--http',
      '--port',
      String(port),
      '--bind',
      '127.0.0.1',
    ],
    {
      // Endpoint behavior is under test here; keep cwd at repo so serve-http
      // uses the local admin/dist branch instead of the embedded-asset path.
      cwd: REPO,
      env: {
        ...process.env,
        HOME: home,
        GBRAIN_HOME: home,
        GBRAIN_ADMIN_BOOTSTRAP_TOKEN: bootstrapToken,
        OPENAI_API_KEY: '',
        ANTHROPIC_API_KEY: '',
      },
      stdout: 'ignore',
      stderr: 'ignore',
    },
  );

  try {
    await waitForHealth(port);
    const login = await fetch(`http://127.0.0.1:${port}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: bootstrapToken }),
    });
    expect(login.status).toBe(200);
    const rawCookie = login.headers.get('set-cookie');
    expect(rawCookie).toBeTruthy();
    return { proc, port, home, cookie: rawCookie!.split(';')[0] };
  } catch (err) {
    try { proc.kill('SIGKILL'); } catch { /* already dead */ }
    rmSync(home, { recursive: true, force: true });
    throw err;
  }
}

async function stopServer(s: ServeProc | null): Promise<void> {
  if (!s) return;
  try { s.proc.kill('SIGTERM'); } catch { /* already dead */ }
  await Promise.race([s.proc.exited, new Promise(resolve => setTimeout(resolve, 2000))]);
  try { s.proc.kill('SIGKILL'); } catch { /* already dead */ }
  rmSync(s.home, { recursive: true, force: true });
}

function adminFetch(path: string, init: RequestInit = {}) {
  if (!server) throw new Error('server not started');
  const headers = new Headers(init.headers);
  headers.set('Cookie', server.cookie);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(`http://127.0.0.1:${server.port}${path}`, {
    ...init,
    headers,
  });
}

describe('serve-http ebrain admin bridge', () => {
  beforeAll(async () => {
    server = await startServer();
  }, 45_000);

  afterAll(async () => {
    await stopServer(server);
    server = null;
  });

  test('bridge route requires admin session', async () => {
    expect(server).toBeTruthy();
    const res = await fetch(`http://127.0.0.1:${server!.port}/admin/api/ebrain/ops/list_executives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 5 }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Admin authentication required');
  });

  test('allowlisted bridge op returns real PGLite data', async () => {
    const res = await adminFetch('/admin/api/ebrain/ops/list_executives', {
      method: 'POST',
      body: JSON.stringify({ active_only: true, limit: 5 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result).toEqual([]);
  });

  test('localOnly admin op succeeds through bridge because remote is false', async () => {
    const res = await adminFetch('/admin/api/ebrain/ops/enterprise_ingest_status', {
      method: 'POST',
      body: JSON.stringify({ limit: 5 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result).toEqual([]);
  });

  test('non-allowlisted and mutating ops are rejected', async () => {
    const res = await adminFetch('/admin/api/ebrain/ops/detect_enterprise_conflicts', {
      method: 'POST',
      body: JSON.stringify({ limit: 1 }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('op_not_in_ebrain_admin_allowlist');
  });

  test('stats endpoint returns aggregate PGLite payload', async () => {
    const res = await adminFetch('/admin/api/ebrain/stats');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      active_executives: 0,
      briefs_today: 0,
      brief_success_rate: null,
      open_conflicts: 0,
      last_cycle_at: null,
      cycle_status: 'idle',
    });
    expect(body.cycle_phases).toHaveLength(6);
  });
});
