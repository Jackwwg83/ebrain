import { afterEach, beforeEach, describe, expect, setDefaultTimeout, test } from 'bun:test';
import { PGLiteEngine } from '../../../src/core/pglite-engine.ts';
import type {
  IngestionSource,
  IngestionSourceContext,
} from '../../../src/core/ingestion/types.ts';
import type { Logger } from '../../../src/core/operations.ts';
import type {
  EnterpriseApp,
  RateLimitKey,
  TieredRateLimiter,
  TokenKind,
  TokenManager,
  TokenRefreshResult,
} from '../../../src/ebrain/apps/base/index.ts';
import {
  _resetEnterpriseIngestionDaemonForTest,
  _setEnterpriseAppFactoryForTest,
  bootstrapEnterpriseIngestionDaemon,
} from '../../../src/ebrain/daemon/index.ts';
import { encrypt } from '../../../src/ebrain/secrets/crypto.ts';
import { _setMasterKeyForTest } from '../../../src/ebrain/secrets/master-key.ts';

setDefaultTimeout(60_000);

let engine: PGLiteEngine;
let originalFetch: typeof fetch;

beforeEach(async () => {
  originalFetch = globalThis.fetch;
  _setMasterKeyForTest(Buffer.alloc(32, 17));
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
});

afterEach(async () => {
  await _resetEnterpriseIngestionDaemonForTest(500);
  globalThis.fetch = originalFetch;
  await engine.disconnect();
  _setMasterKeyForTest(null);
});

describe('bootstrapEnterpriseIngestionDaemon', () => {
  test('registers enabled enterprise app sub-connectors and starts them', async () => {
    const started: string[] = [];
    _setEnterpriseAppFactoryForTest(async (row) =>
      makeMockApp(row.app_id, [makeSource(`mock:${row.app_id}`, started)]),
    );
    await seedEnterpriseApp('dingtalk-a');
    await seedEnterpriseApp('dingtalk-b');

    const daemon = await bootstrapEnterpriseIngestionDaemon(engine, logger());
    const health = await daemon.healthCheck();

    expect(health.sources.map((source) => source.id).sort()).toEqual([
      'mock:dingtalk-a',
      'mock:dingtalk-b',
    ]);
    expect(started.sort()).toEqual(['mock:dingtalk-a', 'mock:dingtalk-b']);
  });

  test('skips disabled apps, soft-deleted apps, disabled sources, and soft-deleted sources', async () => {
    const factoryAppIds: string[] = [];
    _setEnterpriseAppFactoryForTest(async (row) => {
      factoryAppIds.push(row.app_id);
      return makeMockApp(row.app_id, [
        makeSource(`mock-active:${row.app_id}`),
        makeSource(`mock-disabled:${row.app_id}`),
        makeSource(`mock-deleted:${row.app_id}`),
      ]);
    });
    await seedEnterpriseApp('dingtalk-active');
    await seedEnterpriseApp('dingtalk-disabled', { enabled: false });
    await seedEnterpriseApp('dingtalk-deleted', { deleted: true });
    await seedIngestSource('mock-disabled:dingtalk-active', { syncEnabled: false });
    await seedIngestSource('mock-deleted:dingtalk-active', { deleted: true });

    const daemon = await bootstrapEnterpriseIngestionDaemon(engine, logger());
    const health = await daemon.healthCheck();

    expect(factoryAppIds).toEqual(['dingtalk-active']);
    expect(health.sources.map((source) => source.id)).toEqual(['mock-active:dingtalk-active']);
  });

  test('production DingTalk app registers and starts five migrated sources', async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (input) => {
      calls.push(String(input));
      return Response.json({
        messages: [],
        docs: [],
        files: [],
        events: [],
        meetings: [],
        items: [],
      });
    }) as typeof fetch;
    await seedEnterpriseApp('dingtalk-prod', {
      credentials: {
        appKey: 'ding-prod-key',
        encryptedAppSecret: encrypt('ding-prod-secret'),
      },
      config: { corpId: 'corp-prod' },
    });
    await engine.executeRaw(
      `INSERT INTO enterprise_oauth_tokens (app_id, token_kind, scope_key, access_token, expires_at)
       VALUES ('dingtalk-prod', 'tenant_access', 'corp-prod', $1, '2999-01-01T00:00:00.000Z')`,
      [encrypt('tenant-token')],
    );

    const daemon = await bootstrapEnterpriseIngestionDaemon(engine, logger());
    const health = await daemon.healthCheck();
    const sourceIds = health.sources.map((source) => source.id).sort();

    expect(sourceIds).toEqual([
      'dingtalk-calendar:dingtalk-prod',
      'dingtalk-docs:dingtalk-prod',
      'dingtalk-drive:dingtalk-prod',
      'dingtalk-im:dingtalk-prod',
      'dingtalk-meeting:dingtalk-prod',
    ]);
    expect(calls.length).toBe(5);

    const rows = await engine.executeRaw<{ ingest_source_id: string; last_success_at: string | Date | null }>(
      `SELECT ingest_source_id, last_success_at
       FROM enterprise_ingest_sources
       WHERE parent_app_id = 'dingtalk-prod'
       ORDER BY ingest_source_id`,
    );
    expect(rows.map((row) => row.ingest_source_id)).toEqual(sourceIds);
    expect(rows.every((row) => row.last_success_at !== null)).toBe(true);
  });
});

function logger(): Logger {
  return { info() {}, warn() {}, error() {} };
}

function makeSource(id: string, started: string[] = []): IngestionSource {
  return {
    id,
    kind: id.split(':')[0] ?? 'mock',
    async start(_ctx: IngestionSourceContext) {
      started.push(id);
    },
    async stop() {},
  };
}

function makeMockApp(appId: string, sources: IngestionSource[]): EnterpriseApp {
  return {
    appId,
    appType: 'dingtalk',
    displayName: appId,
    tokenManager: new NoopTokenManager(),
    rateLimiter: new NoopRateLimiter(),
    subConnectors: sources,
    enabled: true,
    botEnabled: false,
    pushEnabled: false,
    consecutiveErrors: 0,
  };
}

class NoopTokenManager implements TokenManager {
  async getToken(_kind: TokenKind, _scope?: string): Promise<string> {
    return 'token';
  }

  async refresh(_kind: TokenKind, _scope?: string): Promise<TokenRefreshResult> {
    return { accessToken: 'token', expiresAt: new Date('2999-01-01T00:00:00.000Z') };
  }

  async isExpired(_kind: TokenKind, _scope?: string): Promise<boolean> {
    return false;
  }
}

class NoopRateLimiter implements TieredRateLimiter {
  async acquire(_keys: RateLimitKey[]): Promise<void> {}
  release(_keys: Array<Omit<RateLimitKey, 'limit'>>): void {}
}

async function seedEnterpriseApp(
  appId: string,
  opts: {
    enabled?: boolean;
    deleted?: boolean;
    credentials?: Record<string, unknown>;
    config?: Record<string, unknown>;
  } = {},
): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_apps (
       app_id, app_type, display_name, credentials, config, enabled, bot_enabled, push_enabled, deleted_at
     ) VALUES ($1, 'dingtalk', $2, $3::jsonb, $4::jsonb, $5, false, false, $6)`,
    [
      appId,
      appId,
      JSON.stringify(opts.credentials ?? { appKey: appId, encryptedAppSecret: encrypt(`${appId}-secret`) }),
      JSON.stringify(opts.config ?? {}),
      opts.enabled ?? true,
      opts.deleted ? new Date().toISOString() : null,
    ],
  );
}

async function seedIngestSource(
  sourceId: string,
  opts: { syncEnabled?: boolean; deleted?: boolean },
): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_ingest_sources (
       ingest_source_id, ingest_source_type, display_name, sync_enabled, deleted_at
     ) VALUES ($1, 'dingtalk', $1, $2, $3)`,
    [sourceId, opts.syncEnabled ?? true, opts.deleted ? new Date().toISOString() : null],
  );
}
