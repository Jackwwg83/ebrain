import type { Operation } from '../../core/operations.ts';
import { ENTERPRISE_INGEST_STATUS_DESCRIPTION } from '../../core/operations-descriptions.ts';

interface EnterpriseIngestStatusRow {
  source_id: string;
  source_type: string;
  last_sync_at: string | Date | null;
  last_error: string | null;
  circuit_state: 'open' | 'closed' | 'disabled';
  page_count: number | string;
}

async function operationError(code: string, message: string): Promise<never> {
  const { OperationError } = await import('../../core/operations.ts');
  throw new OperationError(code, message);
}

function parseLimit(value: unknown, defaultValue: number): number | undefined {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.min(Math.trunc(value), 500);
}

function normalizeDate(value: string | Date | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export const enterprise_ingest_status: Operation = {
  name: 'enterprise_ingest_status',
  description: ENTERPRISE_INGEST_STATUS_DESCRIPTION,
  scope: 'admin',
  localOnly: true,
  mutating: false,
  params: {
    source_type: {
      type: 'string',
      description: 'Optional enterprise source type filter, such as feishu, dingtalk, wecom, or salesforce.',
    },
    limit: {
      type: 'number',
      default: 50,
      description: 'Maximum number of source rows to return. Default 50, max 500.',
    },
  },
  handler: async (ctx, p) => {
    if (ctx.remote === true) {
      await operationError(
        'permission_denied',
        'enterprise_ingest_status is local-only and cannot be called from a remote transport.',
      );
    }

    const limit = parseLimit(p.limit, 50);
    if (limit === undefined) {
      await operationError('invalid_params', 'limit must be a non-negative number');
    }
    const sourceType = typeof p.source_type === 'string' && p.source_type.trim()
      ? p.source_type.trim()
      : undefined;

    const params: unknown[] = [];
    let where = 's.deleted_at IS NULL';
    if (sourceType) {
      params.push(sourceType);
      where += ` AND s.ingest_source_type = $${params.length}`;
    }
    params.push(limit);
    const limitPlaceholder = `$${params.length}`;

    const rows = await ctx.engine.executeRaw<EnterpriseIngestStatusRow>(
      `SELECT
         s.ingest_source_id AS source_id,
         s.ingest_source_type AS source_type,
         COALESCE(s.last_success_at, MAX(o.last_ingested_at), MAX(o.last_seen_at)) AS last_sync_at,
         s.last_error,
         CASE
           WHEN s.sync_enabled = false THEN 'disabled'
           WHEN s.circuit_open_until IS NOT NULL AND s.circuit_open_until > now() THEN 'open'
           ELSE 'closed'
         END AS circuit_state,
         COUNT(o.page_slug)::int AS page_count
       FROM enterprise_ingest_sources s
       LEFT JOIN enterprise_ingest_objects o
         ON o.ingest_source_id = s.ingest_source_id
      WHERE ${where}
      GROUP BY
        s.ingest_source_id,
        s.ingest_source_type,
        s.last_success_at,
        s.last_error,
        s.sync_enabled,
        s.circuit_open_until
      ORDER BY s.ingest_source_type ASC, s.ingest_source_id ASC
      LIMIT ${limitPlaceholder}`,
      params,
    );

    return rows.map((row) => ({
      source_id: row.source_id,
      source_type: row.source_type,
      last_sync_at: normalizeDate(row.last_sync_at),
      last_error: row.last_error,
      circuit_state: row.circuit_state,
      page_count: Number(row.page_count),
    }));
  },
};
