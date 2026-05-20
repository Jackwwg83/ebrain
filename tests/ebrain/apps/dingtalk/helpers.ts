import { PGLiteEngine } from '../../../../src/core/pglite-engine.ts';
import type { OperationContext } from '../../../../src/core/operations.ts';
import { encrypt } from '../../../../src/ebrain/secrets/crypto.ts';
import { _setMasterKeyForTest } from '../../../../src/ebrain/secrets/master-key.ts';
import { DingtalkEnterpriseApp } from '../../../../src/ebrain/apps/dingtalk/index.ts';
import type { FetchLike } from '../../../../src/ebrain/apps/dingtalk/types.ts';

export function logger(): OperationContext['logger'] {
  return { info() {}, warn() {}, error() {} };
}

export function makeCtx(engine: PGLiteEngine): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: logger(),
    dryRun: false,
    remote: false,
    sourceId: 'default',
  } as OperationContext;
}

export async function setupEngine(): Promise<{ engine: PGLiteEngine; ctx: OperationContext }> {
  _setMasterKeyForTest(Buffer.alloc(32, 11));
  const engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
  return { engine, ctx: makeCtx(engine) };
}

export async function teardownEngine(engine: PGLiteEngine | undefined): Promise<void> {
  _setMasterKeyForTest(null);
  if (engine) await engine.disconnect();
}

export async function seedDingtalkApp(engine: PGLiteEngine, appId = 'dingtalk-dev'): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_apps (app_id, app_type, display_name, credentials, config, bot_enabled, push_enabled)
     VALUES ($1, 'dingtalk', 'DingTalk Dev', $2::jsonb, $3::jsonb, true, true)
     ON CONFLICT (app_id) DO NOTHING`,
    [
      appId,
      JSON.stringify({ appKey: 'ding-test-key', encryptedAppSecret: encrypt('ding-secret') }),
      JSON.stringify({ corpId: 'corp-test' }),
    ],
  );
}

export async function seedTenantToken(
  engine: PGLiteEngine,
  accessToken = 'tenant-token',
  expiresAt = '2026-05-20T03:00:00.000Z',
  appId = 'dingtalk-dev',
): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_oauth_tokens (app_id, token_kind, scope_key, access_token, expires_at)
     VALUES ($1, 'tenant_access', 'corp-test', $2, $3)
     ON CONFLICT (app_id, token_kind, scope_key) DO UPDATE SET access_token = EXCLUDED.access_token, expires_at = EXCLUDED.expires_at`,
    [appId, encrypt(accessToken), expiresAt],
  );
}

export function makeDingtalkApp(args: {
  engine: PGLiteEngine;
  fetch?: FetchLike;
  now?: () => Date;
}): DingtalkEnterpriseApp {
  return new DingtalkEnterpriseApp({
    appId: 'dingtalk-dev',
    appKey: 'ding-test-key',
    encryptedAppSecret: encrypt('ding-secret'),
    corpId: 'corp-test',
    token: 'webhook-secret',
    aesKey: 'aes-key-for-test',
    displayName: 'DingTalk Dev',
    engine: args.engine,
    fetch: args.fetch ?? (async () => new Response('{}', { status: 200 })),
    now: args.now ?? (() => new Date('2026-05-20T02:00:00.000Z')),
  });
}
