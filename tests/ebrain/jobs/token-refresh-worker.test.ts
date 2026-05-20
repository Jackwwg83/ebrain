import { afterEach, beforeEach, describe, expect, setDefaultTimeout, test } from 'bun:test';
import { PGLiteEngine } from '../../../src/core/pglite-engine.ts';
import type { OperationContext } from '../../../src/core/operations.ts';
import type { TokenManager } from '../../../src/ebrain/apps/base/index.ts';
import { decrypt } from '../../../src/ebrain/secrets/crypto.ts';
import { _setMasterKeyForTest } from '../../../src/ebrain/secrets/master-key.ts';
import {
  _setLoadEnterpriseAppForTest,
  tokenRefreshWorkerHandler,
} from '../../../src/ebrain/jobs/token-refresh-worker.ts';

let engine: PGLiteEngine;
let ctx: OperationContext;

setDefaultTimeout(15_000);

function makeCtx(engine: PGLiteEngine): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: { info() {}, warn() {}, error() {} },
    dryRun: false,
    remote: false,
    sourceId: 'default',
  } as OperationContext;
}

async function seedAppAndToken(scopeKey = 'tenant-1', expiresSql = "now() + INTERVAL '10 minutes'"): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_apps (app_id, app_type, display_name)
     VALUES ('feishu-prod', 'feishu', 'Feishu Prod')`,
  );
  await engine.executeRaw(
    `INSERT INTO enterprise_oauth_tokens (app_id, token_kind, scope_key, access_token, expires_at)
     VALUES ('feishu-prod', 'tenant_access', $1, 'old-token', ${expiresSql})`,
    [scopeKey],
  );
}

function refreshingTokenManager(accessToken = 'new-access-token'): TokenManager {
  return {
    async getToken() {
      return accessToken;
    },
    async refresh() {
      return {
        accessToken,
        expiresAt: new Date(Date.now() + 60 * 60_000),
        metadata: { refreshed_by: 'unit-test' },
      };
    },
    async isExpired() {
      return true;
    },
  };
}

beforeEach(async () => {
  _setMasterKeyForTest(Buffer.alloc(32, 7));
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
  ctx = makeCtx(engine);
}, { timeout: 15_000 });

afterEach(async () => {
  _setLoadEnterpriseAppForTest(null);
  _setMasterKeyForTest(null);
  await engine.disconnect();
}, { timeout: 15_000 });

describe('tokenRefreshWorkerHandler', () => {
  test('gracefully skips due tokens when concrete tokenManager is not implemented', async () => {
    await seedAppAndToken();

    const result = await tokenRefreshWorkerHandler(ctx, { data: {} });
    const rows = await engine.executeRaw<{ access_token: string }>(
      `SELECT access_token FROM enterprise_oauth_tokens WHERE app_id = 'feishu-prod'`,
    );

    expect(result).toEqual({ refreshed: 0, skipped: 1, errors: 0 });
    expect(rows[0].access_token).toBe('old-token');
  });

  test('refreshes tokens expiring within 30 minutes and writes encrypted access token', async () => {
    await seedAppAndToken('tenant-1');
    await engine.executeRaw(
      `INSERT INTO enterprise_oauth_tokens (app_id, token_kind, scope_key, access_token, expires_at)
       VALUES ('feishu-prod', 'tenant_access', 'tenant-later', 'later-token', now() + INTERVAL '2 hours')`,
    );
    _setLoadEnterpriseAppForTest(async () => ({
      appId: 'feishu-prod',
      appType: 'feishu',
      displayName: 'Feishu Prod',
      tokenManager: refreshingTokenManager('fresh-token'),
    }));

    const result = await tokenRefreshWorkerHandler(ctx, { data: {} });
    const rows = await engine.executeRaw<{ scope_key: string; access_token: string; metadata: Record<string, unknown> }>(
      `SELECT scope_key, access_token, metadata
       FROM enterprise_oauth_tokens
       ORDER BY scope_key`,
    );

    expect(result).toEqual({ refreshed: 1, skipped: 0, errors: 0 });
    const refreshed = rows.find((row) => row.scope_key === 'tenant-1')!;
    const untouched = rows.find((row) => row.scope_key === 'tenant-later')!;
    expect(decrypt(refreshed.access_token)).toBe('fresh-token');
    expect(refreshed.metadata.refreshed_by).toBe('unit-test');
    expect(untouched.access_token).toBe('later-token');
  });

  test('does not process tokens that are already expired', async () => {
    await seedAppAndToken('tenant-expired', "now() - INTERVAL '5 minutes'");
    _setLoadEnterpriseAppForTest(async () => ({
      appId: 'feishu-prod',
      appType: 'feishu',
      displayName: 'Feishu Prod',
      tokenManager: refreshingTokenManager('fresh-token'),
    }));

    const result = await tokenRefreshWorkerHandler(ctx, { data: {} });
    const rows = await engine.executeRaw<{ access_token: string }>(
      `SELECT access_token FROM enterprise_oauth_tokens WHERE scope_key = 'tenant-expired'`,
    );

    expect(result).toEqual({ refreshed: 0, skipped: 0, errors: 0 });
    expect(rows[0].access_token).toBe('old-token');
  });

  test('per-token errors do not block subsequent token refreshes', async () => {
    await seedAppAndToken('tenant-error');
    await engine.executeRaw(
      `INSERT INTO enterprise_oauth_tokens (app_id, token_kind, scope_key, access_token, expires_at)
       VALUES ('feishu-prod', 'tenant_access', 'tenant-ok', 'old-ok', now() + INTERVAL '5 minutes')`,
    );
    const tokenManager: TokenManager = {
      async getToken() {
        return 'unused';
      },
      async refresh(_kind, scope) {
        if (scope === 'tenant-error') throw new Error('refresh boom');
        return { accessToken: 'ok-token', expiresAt: new Date(Date.now() + 60 * 60_000) };
      },
      async isExpired() {
        return true;
      },
    };
    _setLoadEnterpriseAppForTest(async () => ({
      appId: 'feishu-prod',
      appType: 'feishu',
      displayName: 'Feishu Prod',
      tokenManager,
    }));

    const result = await tokenRefreshWorkerHandler(ctx, { data: {} });
    const rows = await engine.executeRaw<{ scope_key: string; access_token: string }>(
      `SELECT scope_key, access_token FROM enterprise_oauth_tokens ORDER BY scope_key`,
    );

    expect(result).toEqual({ refreshed: 1, skipped: 0, errors: 1 });
    expect(rows.find((row) => row.scope_key === 'tenant-error')!.access_token).toBe('old-token');
    expect(decrypt(rows.find((row) => row.scope_key === 'tenant-ok')!.access_token)).toBe('ok-token');
  });
});
