import type { Operation, OperationContext } from '../../core/operations.ts';
import { DETECT_ENTERPRISE_CONFLICTS_DESCRIPTION } from '../../core/operations-descriptions.ts';
import { detectFactConflicts } from '../conflicts/detect.ts';

interface ConflictSampleRow {
  id: string;
  entity_slug: string;
  fact_key: string;
  severity: number | string;
  status: string;
  competing_values: unknown;
  evidence_page_slugs: unknown;
  detected_at: string | Date;
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

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function parseTextArray(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed.slice(1, -1).split(',').filter(Boolean);
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function normalizeDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

async function countConflictRows(ctx: OperationContext, entitySlug: string): Promise<number> {
  const rows = await ctx.engine.executeRaw<{ count: number | string }>(
    `SELECT COUNT(*)::int AS count
       FROM enterprise_fact_conflicts
      WHERE entity_slug = $1`,
    [entitySlug],
  );
  return Number(rows[0]?.count ?? 0);
}

async function countDetectedGroups(ctx: OperationContext, entitySlug: string): Promise<number> {
  const rows = await ctx.engine.executeRaw<{ count: number | string }>(
    `SELECT COUNT(*)::int AS count
       FROM (
         SELECT entity_slug, claim_metric
           FROM enterprise_fact_claims_view
          WHERE entity_slug = $1
            AND claim_metric IS NOT NULL
            AND claim_value IS NOT NULL
          GROUP BY entity_slug, claim_metric
         HAVING COUNT(DISTINCT claim_value) > 1
       ) conflicts`,
    [entitySlug],
  );
  return Number(rows[0]?.count ?? 0);
}

async function loadSamples(
  ctx: OperationContext,
  args: { entitySlug?: string; limit: number },
): Promise<Array<Record<string, unknown>>> {
  const params: unknown[] = [];
  let where = '';
  if (args.entitySlug) {
    params.push(args.entitySlug);
    where = `WHERE entity_slug = $${params.length}`;
  }
  params.push(args.limit);
  const limitPlaceholder = `$${params.length}`;

  const rows = await ctx.engine.executeRaw<ConflictSampleRow>(
    `SELECT
       id::text AS id,
       entity_slug,
       fact_key,
       severity,
       status,
       competing_values,
       evidence_page_slugs,
       detected_at
     FROM enterprise_fact_conflicts
     ${where}
     ORDER BY detected_at DESC, id DESC
     LIMIT ${limitPlaceholder}`,
    params,
  );

  return rows.map((row) => ({
    id: row.id,
    entity_slug: row.entity_slug,
    fact_key: row.fact_key,
    severity: Number(row.severity),
    status: row.status,
    competing_values: parseJsonValue(row.competing_values),
    evidence_page_slugs: parseTextArray(row.evidence_page_slugs),
    detected_at: normalizeDate(row.detected_at),
  }));
}

export const detect_enterprise_conflicts: Operation = {
  name: 'detect_enterprise_conflicts',
  description: DETECT_ENTERPRISE_CONFLICTS_DESCRIPTION,
  scope: 'admin',
  localOnly: true,
  mutating: true,
  params: {
    entity_slug: {
      type: 'string',
      description: 'Optional entity slug to post-filter conflict counts and samples.',
    },
    limit: {
      type: 'number',
      default: 100,
      description: 'Maximum number of sample conflict rows to return. Default 100, max 500.',
    },
  },
  handler: async (ctx, p) => {
    if (ctx.remote === true) {
      await operationError(
        'permission_denied',
        'detect_enterprise_conflicts is local-only and cannot be called from a remote transport.',
      );
    }

    const limit = parseLimit(p.limit, 100);
    if (limit === undefined) {
      return await operationError('invalid_params', 'limit must be a non-negative number');
    }
    const entitySlug = typeof p.entity_slug === 'string' && p.entity_slug.trim()
      ? p.entity_slug.trim()
      : undefined;
    if (p.entity_slug !== undefined && !entitySlug) {
      await operationError('invalid_params', 'entity_slug must be a non-empty string when provided');
    }

    const beforeCount = entitySlug ? await countConflictRows(ctx, entitySlug) : 0;
    const result = await detectFactConflicts(ctx);
    const samples = await loadSamples(ctx, { entitySlug, limit });
    if (!entitySlug) {
      return { ...result, samples };
    }

    const afterCount = await countConflictRows(ctx, entitySlug);
    return {
      conflictsDetected: await countDetectedGroups(ctx, entitySlug),
      conflictsInserted: Math.max(0, afterCount - beforeCount),
      samples,
    };
  },
};
