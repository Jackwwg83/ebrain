import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';

setDefaultTimeout(20_000);
import { decrypt, encrypt } from '../../../../src/ebrain/secrets/crypto.ts';
import { DingtalkTokenManager } from '../../../../src/ebrain/apps/dingtalk/index.ts';
import type { FetchLike } from '../../../../src/ebrain/apps/dingtalk/types.ts';
import { seedDingtalkApp, setupEngine, teardownEngine } from './helpers.ts';
import type { PGLiteEngine } from '../../../../src/core/pglite-engine.ts';

let engine: PGLiteEngine;

beforeEach(async () => {
  ({ engine } = await setupEngine());
  await seedDingtalkApp(engine);
});

afterEach(async () => {
  await teardownEngine(engine);
});

function manager(fetchImpl?: FetchLike, now = () => new Date('2026-05-20T02:00:00.000Z')): DingtalkTokenManager {
  return new DingtalkTokenManager({
    appId: 'dingtalk-dev',
    appKey: 'ding-test-key',
    encryptedAppSecret: encrypt('ding-secret'),
    corpId: 'corp-test',
    engine,
    fetch: fetchImpl,
    now,
  });
}

describe('DingtalkTokenManager', () => {
  test('getToken returns cached encrypted token when it is not expired', async () => {
    let fetchCalls = 0;
    await engine.executeRaw(
      `INSERT INTO enterprise_oauth_tokens (app_id, token_kind, scope_key, access_token, expires_at)
       VALUES ('dingtalk-dev', 'tenant_access', 'corp-test', $1, '2026-05-20T04:00:00.000Z')`,
      [encrypt('cached-token')],
    );

    const token = await manager(async () => {
      fetchCalls += 1;
      return new Response('{}', { status: 500 });
    }).getToken('tenant_access');

    expect(token).toBe('cached-token');
    expect(fetchCalls).toBe(0);
  });

  test('getToken refreshes on cache miss and writes encrypted token to DB', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const fetchImpl: FetchLike = async (input, init) => {
      calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
      return Response.json({ accessToken: 'fresh-dingtalk-token', expireIn: 7200 });
    };

    const token = await manager(fetchImpl).getToken('tenant_access');
    const rows = await engine.executeRaw<{ access_token: string; expires_at: string | Date; metadata: Record<string, unknown> }>(
      `SELECT access_token, expires_at, metadata
       FROM enterprise_oauth_tokens
       WHERE app_id = 'dingtalk-dev' AND token_kind = 'tenant_access' AND scope_key = 'corp-test'`,
    );

    expect(token).toBe('fresh-dingtalk-token');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.dingtalk.com/v1.0/oauth2/accessToken');
    expect(calls[0].body).toEqual({ appKey: 'ding-test-key', appSecret: 'ding-secret' });
    expect(rows).toHaveLength(1);
    expect(rows[0].access_token).toStartWith('encrypted:');
    expect(decrypt(rows[0].access_token)).toBe('fresh-dingtalk-token');
    expect(rows[0].metadata.provider).toBe('dingtalk');
  });

  test('unsupported TokenKind values throw not yet implemented', async () => {
    const tm = manager();
    await expect(tm.getToken('app_access')).rejects.toThrow('not yet implemented');
    await expect(tm.getToken('user_access')).rejects.toThrow('not yet implemented');
    await expect(tm.getToken('refresh')).rejects.toThrow('not yet implemented');
    await expect(tm.refresh('app_access')).rejects.toThrow('not yet implemented');
    await expect(tm.refresh('user_access')).rejects.toThrow('not yet implemented');
    await expect(tm.refresh('refresh')).rejects.toThrow('not yet implemented');
  });

  test('constructor warns when corpId is missing and scope falls back to app', () => {
    const originalWarn = console.warn;
    const warnings: unknown[][] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args);
    };

    try {
      new DingtalkTokenManager({
        appId: 'dingtalk-dev',
        appKey: 'ding-test-key',
        encryptedAppSecret: encrypt('ding-secret'),
        engine,
        now: () => new Date('2026-05-20T02:00:00.000Z'),
      });
    } finally {
      console.warn = originalWarn;
    }

    expect(warnings).toEqual([[
      '[DingtalkTokenManager] corpId not configured; token scope will fall back to "app". For multi-tenant isolation, set corpId on EnterpriseApp config.',
    ]]);
  });

  test('isExpired treats missing and 30-minute-skew tokens as expired', async () => {
    const tm = manager(undefined, () => new Date('2026-05-20T02:00:00.000Z'));
    expect(await tm.isExpired('tenant_access')).toBe(true);

    await engine.executeRaw(
      `INSERT INTO enterprise_oauth_tokens (app_id, token_kind, scope_key, access_token, expires_at)
       VALUES ('dingtalk-dev', 'tenant_access', 'corp-test', $1, '2026-05-20T02:29:59.000Z')
       ON CONFLICT (app_id, token_kind, scope_key) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      [encrypt('soon')],
    );
    expect(await tm.isExpired('tenant_access')).toBe(true);

    await engine.executeRaw(
      `UPDATE enterprise_oauth_tokens
       SET expires_at = '2026-05-20T02:31:00.000Z'
       WHERE app_id = 'dingtalk-dev' AND token_kind = 'tenant_access' AND scope_key = 'corp-test'`,
    );
    expect(await tm.isExpired('tenant_access')).toBe(false);
  });
});
