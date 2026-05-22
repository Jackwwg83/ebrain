import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { PGLiteEngine } from '../src/core/pglite-engine.ts';
import { testEnterpriseConnection } from '../src/ebrain/apps/test-connection-dispatch.ts';
import { decrypt } from '../src/ebrain/secrets/crypto.ts';
import { _setMasterKeyForTest } from '../src/ebrain/secrets/master-key.ts';
import { resetPgliteState } from './helpers/reset-pglite.ts';

let engine: PGLiteEngine;

beforeAll(async () => {
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
});

afterAll(async () => {
  await engine.disconnect();
});

beforeEach(async () => {
  _setMasterKeyForTest(Buffer.alloc(32, 7));
  await resetPgliteState(engine);
});

afterEach(async () => {
  _setMasterKeyForTest(null);
});

async function tokenRows(appId: string): Promise<Array<{ access_token: string; metadata: Record<string, unknown> }>> {
  return engine.executeRaw(
    `SELECT access_token, metadata
     FROM enterprise_oauth_tokens
     WHERE app_id = $1 AND token_kind = 'tenant_access' AND scope_key = 'app'`,
    [appId],
  );
}

describe('testEnterpriseConnection', () => {
  test('dispatches dingtalk through EnterpriseApp.tokenManager.refresh and persists the token row', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const result = await testEnterpriseConnection({
      appType: 'dingtalk',
      appId: 'dingtalk-test',
      displayName: 'DingTalk Test',
      credentials: { client_id: 'ding-key', client_secret: 'ding-secret' },
      config: { corp_id: 'corp-test' },
      engine,
      now: () => new Date('2026-05-22T01:00:00.000Z'),
      fetch: async (input, init) => {
        calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
        return Response.json({ accessToken: 'fresh-dingtalk-token', expireIn: 7200 });
      },
    });

    expect(result).toEqual({
      ok: true,
      message: 'connection verified via token refresh',
      checked_at: '2026-05-22T01:00:00.000Z',
    });
    expect(calls).toEqual([{
      url: 'https://api.dingtalk.com/v1.0/oauth2/accessToken',
      body: { appKey: 'ding-key', appSecret: 'ding-secret' },
    }]);
    const rows = await tokenRows('dingtalk-test');
    expect(rows).toHaveLength(1);
    expect(decrypt(rows[0]!.access_token)).toBe('fresh-dingtalk-token');
    expect(rows[0]!.metadata.provider).toBe('dingtalk');
  }, 30_000);

  test('dispatches feishu through EnterpriseApp.tokenManager.refresh and persists the token row', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const result = await testEnterpriseConnection({
      appType: 'feishu',
      appId: 'feishu-test',
      displayName: 'Feishu Test',
      credentials: { client_id: 'cli_a', client_secret: 'feishu-secret' },
      engine,
      now: () => new Date('2026-05-22T02:00:00.000Z'),
      fetch: async (input, init) => {
        calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
        return Response.json({ code: 0, msg: 'ok', tenant_access_token: 'fresh-feishu-token', expire: 7200 });
      },
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe('connection verified via token refresh');
    expect(calls).toEqual([{
      url: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      body: { app_id: 'cli_a', app_secret: 'feishu-secret' },
    }]);
    const rows = await tokenRows('feishu-test');
    expect(rows).toHaveLength(1);
    expect(decrypt(rows[0]!.access_token)).toBe('fresh-feishu-token');
    expect(rows[0]!.metadata.provider).toBe('feishu');
  }, 30_000);

  test('returns connection_failed when vendor token refresh rejects credentials', async () => {
    const result = await testEnterpriseConnection({
      appType: 'dingtalk',
      appId: 'dingtalk-bad',
      credentials: { client_id: 'ding-key', client_secret: 'wrong-secret' },
      config: { corp_id: 'corp-test' },
      engine,
      fetch: async () => Response.json({ code: 'InvalidAppSecret' }, { status: 401 }),
      now: () => new Date('2026-05-22T03:00:00.000Z'),
    });

    expect(result.ok).toBe(false);
    expect(result.checked_at).toBe('2026-05-22T03:00:00.000Z');
    expect(result.message).toContain('connection_failed: DingTalk access token refresh failed: 401');
    expect(await tokenRows('dingtalk-bad')).toHaveLength(0);
  }, 30_000);

  test('returns unsupported_app_type for app types without concrete app classes', async () => {
    for (const appType of ['wecom', 'salesforce', 'feishu-meetings', '']) {
      const result = await testEnterpriseConnection({
        appType,
        credentials: { client_id: 'not-used', client_secret: 'not-used' },
        engine,
        fetch: async () => {
          throw new Error('fetch should not be called for unsupported providers');
        },
        now: () => new Date('2026-05-22T04:00:00.000Z'),
      });
      expect(result.ok).toBe(false);
      expect(result.message).toBe(`unsupported_app_type '${appType}' (supported: dingtalk, feishu)`);
      expect(result.checked_at).toBe('2026-05-22T04:00:00.000Z');
    }
  });
});
