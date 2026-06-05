import type { IngestionSourceMode } from '../../../../core/ingestion/types.ts';
import type { RateLimitKey } from '../../base/index.ts';
import { endpointUrl } from '../types.ts';
import { dingtalkRateKey } from '../rate-limit.ts';
import type { DingtalkEnterpriseApp } from '../app.ts';

export interface DingtalkSourceOptions {
  pollIntervalMs?: number;
  mode?: IngestionSourceMode;
  since?: string;
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

export function cursorSince(
  cursorState: Record<string, unknown>,
  initialSince?: string,
): string | undefined {
  return typeof cursorState.lastSyncedAt === 'string'
    ? cursorState.lastSyncedAt
    : initialSince;
}

export function sourceFetchMode(mode: IngestionSourceMode): 'incremental' | 'backfill' {
  return mode === 'migration' ? 'backfill' : 'incremental';
}

export function cursorStateFor(records: Array<{ modifiedTime?: string; createTime?: string; startTime?: string }>): Record<string, unknown> {
  const cursor = isoCursor(records);
  return cursor ? { lastSyncedAt: cursor } : {};
}

export function requireDingtalkString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`DingTalk payload missing required string field: ${field}`);
  }
  return value;
}

export function extractArray<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== 'object') {
    throw new Error(`DingTalk payload must be an object or array with one of: ${keys.join(', ')}`);
  }
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as T[];
    const result = record.result;
    if (result && typeof result === 'object' && Array.isArray((result as Record<string, unknown>)[key])) {
      return (result as Record<string, unknown>)[key] as T[];
    }
  }
  throw new Error(`DingTalk payload missing expected array field: ${keys.join(', ')}`);
}
