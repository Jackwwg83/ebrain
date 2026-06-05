import { PGLiteEngine } from '../../../../src/core/pglite-engine.ts';
import type {
  IngestionEvent,
  IngestionSource,
  IngestionSourceContext,
} from '../../../../src/core/ingestion/types.ts';
import type { OperationContext } from '../../../../src/core/operations.ts';
import { encrypt } from '../../../../src/ebrain/secrets/crypto.ts';
import { _setMasterKeyForTest } from '../../../../src/ebrain/secrets/master-key.ts';
import { DingtalkEnterpriseApp } from '../../../../src/ebrain/apps/dingtalk/index.ts';
import type { FetchLike } from '../../../../src/ebrain/apps/dingtalk/types.ts';

export interface CapturedDingtalkRequest {
  url: string;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

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

export function makeIngestionCtx(args: {
  engine: PGLiteEngine;
  emitted?: IngestionEvent[];
  controller?: AbortController;
}): IngestionSourceContext {
  const emitted = args.emitted ?? [];
  const controller = args.controller ?? new AbortController();
  return {
    emit(event: IngestionEvent): void {
      emitted.push(event);
    },
    engine: args.engine,
    logger: logger(),
    abortSignal: controller.signal,
    config: {},
  };
}

export async function runInitialSourcePoll(source: IngestionSource, ctx: IngestionSourceContext): Promise<void> {
  try {
    await source.start(ctx);
  } finally {
    await source.stop();
  }
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

export async function seedDingtalkCursor(
  engine: PGLiteEngine,
  args: { sourceId: string; sourceKind: string; cursorState: Record<string, unknown>; appId?: string },
): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO enterprise_ingest_sources (
       ingest_source_id,
       parent_app_id,
       ingest_source_type,
       display_name,
       cursor_state
     ) VALUES ($1, $2, $3, $3, $4::jsonb)
     ON CONFLICT (ingest_source_id) DO UPDATE SET
       cursor_state = EXCLUDED.cursor_state`,
    [
      args.sourceId,
      args.appId ?? 'dingtalk-dev',
      args.sourceKind,
      JSON.stringify(args.cursorState),
    ],
  );
}

export async function readDingtalkSourceRow(engine: PGLiteEngine, sourceId: string): Promise<{
  cursorState: Record<string, unknown>;
  lastSuccessAt: string | Date | null;
  consecutiveErrors: number;
  lastError: string | null;
}> {
  const rows = await engine.executeRaw<{
    cursor_state: unknown;
    last_success_at: string | Date | null;
    consecutive_errors: number;
    last_error: string | null;
  }>(
    `SELECT cursor_state, last_success_at, consecutive_errors, last_error
     FROM enterprise_ingest_sources
     WHERE ingest_source_id = $1`,
    [sourceId],
  );
  const row = rows[0];
  if (!row) throw new Error(`Missing DingTalk source row ${sourceId}`);
  return {
    cursorState: toRecord(row.cursor_state),
    lastSuccessAt: row.last_success_at,
    consecutiveErrors: row.consecutive_errors,
    lastError: row.last_error,
  };
}

export function makeDingtalkListFetch<T>(
  arrayKey: string,
  records: T[],
  requests: CapturedDingtalkRequest[],
): FetchLike {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    requests.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>,
      headers: Object.fromEntries(headers.entries()),
    });
    return Response.json({ [arrayKey]: records });
  };
}

export function latestDingtalkCursor(records: Array<{ modifiedTime?: string; createTime?: string; startTime?: string }>): string {
  const latest = records
    .map((record) => record.modifiedTime ?? record.createTime ?? record.startTime)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0];
  if (latest === undefined) throw new Error('Cannot compute cursor for empty DingTalk fixture');
  return new Date(latest).toISOString();
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

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>;
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}
