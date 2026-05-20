import type { OperationContext } from '../../../../core/operations.ts';
import type {
  EnterpriseIngestObject,
  EnterpriseIngestResult,
  RateLimitKey,
} from '../../base/index.ts';
import { endpointUrl } from '../types.ts';
import { dingtalkRateKey } from '../rate-limit.ts';
import type { DingtalkEnterpriseApp } from '../app.ts';

type UpsertFn = (ctx: OperationContext, obj: EnterpriseIngestObject) => Promise<{ changed: boolean; slug: string }>;
type MarkErrorFn = (ctx: OperationContext, args: { ingestSourceId: string; error: Error }) => Promise<void>;
type CheckCircuitFn = (ctx: OperationContext, ingestSourceId: string) => Promise<boolean>;
type ResetCircuitFn = (ctx: OperationContext, ingestSourceId: string) => Promise<void>;

export interface ConnectorBatchDeps {
  upsertEnterpriseObject: UpsertFn;
  markIngestError: MarkErrorFn;
  checkCircuit: CheckCircuitFn;
  resetCircuit: ResetCircuitFn;
}

export interface ConnectorBatchOptions<Raw> extends ConnectorBatchDeps {
  ctx: OperationContext;
  app: DingtalkEnterpriseApp;
  sourceId: string;
  displayName: string;
  records: Raw[];
  transform: (raw: Raw) => Promise<EnterpriseIngestObject>;
  cursor?: string;
}

export async function runDingtalkConnectorBatch<Raw>(
  opts: ConnectorBatchOptions<Raw>,
): Promise<EnterpriseIngestResult> {
  await ensureDingtalkIngestSource(opts.ctx, opts.app, opts.sourceId, opts.displayName);
  if (await opts.checkCircuit(opts.ctx, opts.sourceId)) {
    return { objectsIngested: 0, objectsSkipped: opts.records.length, errors: 0, cursorAdvanced: opts.cursor };
  }

  let objectsIngested = 0;
  let objectsSkipped = 0;
  let errors = 0;
  for (const raw of opts.records) {
    try {
      const obj = await opts.transform(raw);
      const result = await opts.upsertEnterpriseObject(opts.ctx, obj);
      if (result.changed) objectsIngested += 1;
      else objectsSkipped += 1;
    } catch (error) {
      errors += 1;
      await opts.markIngestError(opts.ctx, {
        ingestSourceId: opts.sourceId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  if (errors === 0) {
    await opts.resetCircuit(opts.ctx, opts.sourceId);
    await updateCursor(opts.ctx, opts.sourceId, opts.cursor);
  }

  return { objectsIngested, objectsSkipped, errors, cursorAdvanced: opts.cursor };
}

export interface ConnectorLoadOptions<Raw> extends Omit<ConnectorBatchOptions<Raw>, 'records'> {
  load: () => Promise<Raw[]>;
  cursorForRecords?: (records: Raw[]) => string | undefined;
}

export async function runDingtalkConnectorLoad<Raw>(
  opts: ConnectorLoadOptions<Raw>,
): Promise<EnterpriseIngestResult> {
  await ensureDingtalkIngestSource(opts.ctx, opts.app, opts.sourceId, opts.displayName);
  if (await opts.checkCircuit(opts.ctx, opts.sourceId)) {
    return { objectsIngested: 0, objectsSkipped: 0, errors: 0, cursorAdvanced: opts.cursor };
  }

  try {
    const records = await opts.load();
    const cursor = opts.cursor ?? opts.cursorForRecords?.(records);
    return runDingtalkConnectorBatch({ ...opts, records, cursor });
  } catch (error) {
    await opts.markIngestError(opts.ctx, {
      ingestSourceId: opts.sourceId,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return { objectsIngested: 0, objectsSkipped: 0, errors: 1, cursorAdvanced: opts.cursor };
  }
}

export async function fetchDingtalkRecords<T>(
  app: DingtalkEnterpriseApp,
  endpoint: string,
  body: Record<string, unknown> = {},
  extract: (payload: unknown) => T[],
  extraLimits: RateLimitKey[] = [],
): Promise<T[]> {
  await app.rateLimiter.acquire([
    dingtalkRateKey('app', app.appKey, endpoint),
    ...(app.corpId ? [dingtalkRateKey('tenant', app.corpId, endpoint)] : []),
    ...extraLimits,
  ]);
  const accessToken = await app.tokenManager.getToken('tenant_access', app.corpId);
  const response = await app.fetch(endpointUrl(app.apiBaseUrl, endpoint), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-acs-dingtalk-access-token': accessToken,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`DingTalk API ${endpoint} failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return extract(payload);
}

export function isoCursor(records: Array<{ modifiedTime?: string; createTime?: string; startTime?: string }>): string | undefined {
  const latest = records
    .map((record) => record.modifiedTime ?? record.createTime ?? record.startTime)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0];
  return latest === undefined ? undefined : new Date(latest).toISOString();
}

export async function ensureDingtalkIngestSource(
  ctx: OperationContext,
  app: DingtalkEnterpriseApp,
  sourceId: string,
  displayName: string,
): Promise<void> {
  await ctx.engine.executeRaw(
    `INSERT INTO enterprise_apps (app_id, app_type, display_name, credentials, config, enabled, bot_enabled, push_enabled)
     VALUES ($1, 'dingtalk', $2, $3::jsonb, $4::jsonb, true, true, true)
     ON CONFLICT (app_id) DO NOTHING`,
    [
      app.appId,
      app.displayName,
      JSON.stringify({ appKey: app.appKey, encryptedAppSecret: app.encryptedAppSecret }),
      JSON.stringify({ corpId: app.corpId ?? null }),
    ],
  );
  await ctx.engine.executeRaw(
    `INSERT INTO enterprise_ingest_sources (
       ingest_source_id, parent_app_id, ingest_source_type, display_name, connector_config
     ) VALUES ($1, $2, 'dingtalk', $3, $4::jsonb)
     ON CONFLICT (ingest_source_id) DO NOTHING`,
    [sourceId, app.appId, displayName, JSON.stringify({ app_type: 'dingtalk', source_id: sourceId })],
  );
}

async function updateCursor(ctx: OperationContext, sourceId: string, cursor?: string): Promise<void> {
  if (!cursor) return;
  await ctx.engine.executeRaw(
    `UPDATE enterprise_ingest_sources
     SET cursor_state = jsonb_build_object('last_seen_at', $2::text), updated_at = now()
     WHERE ingest_source_id = $1`,
    [sourceId, cursor],
  );
}


export function requireDingtalkString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`DingTalk payload missing required string field: ${field}`);
  }
  return value;
}
