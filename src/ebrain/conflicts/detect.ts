import type { OperationContext } from '../../core/operations.ts';
import { computeConflictHash } from './conflict-hash.ts';

export interface FactConflictDetectionResult {
  conflictsDetected: number;
  conflictsInserted: number;
}

export interface CompetingFactValue {
  value: unknown;
  source_type: string;
  page_slug: string;
  confidence: number | null;
  observed_at: string | null;
}

interface ConflictGroupRow {
  entity_slug: string;
  fact_key: string;
}

interface ClaimRow {
  claim_value: unknown;
  enterprise_source_type: string | null;
  fact_source: string | null;
  page_slug: string;
  confidence: number | string | null;
  observed_at: Date | string | null;
}

function normalizeObservedAt(value: Date | string | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function normalizeConfidence(value: number | string | null): number | null {
  if (value === null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeClaimValue(value: unknown): unknown {
  if (typeof value !== 'number') return value;
  return Number.isInteger(value) ? value : Number(value.toString());
}

export async function detectFactConflicts(
  ctx: OperationContext,
): Promise<FactConflictDetectionResult> {
  const groups = await ctx.engine.executeRaw<ConflictGroupRow>(
    `SELECT entity_slug, claim_metric AS fact_key
       FROM enterprise_fact_claims_view
      WHERE entity_slug IS NOT NULL
        AND claim_metric IS NOT NULL
        AND claim_value IS NOT NULL
      GROUP BY entity_slug, claim_metric
     HAVING COUNT(DISTINCT claim_value) > 1
      ORDER BY entity_slug, claim_metric`,
  );

  let conflictsInserted = 0;
  for (const group of groups) {
    const rows = await ctx.engine.executeRaw<ClaimRow>(
      `SELECT claim_value,
              enterprise_source_type,
              fact_source,
              page_slug,
              confidence,
              observed_at
         FROM enterprise_fact_claims_view
        WHERE entity_slug = $1
          AND claim_metric = $2
          AND claim_value IS NOT NULL
        ORDER BY claim_value, COALESCE(enterprise_source_type, fact_source, ''), page_slug`,
      [group.entity_slug, group.fact_key],
    );

    const competingValues: CompetingFactValue[] = rows.map((row) => ({
      value: normalizeClaimValue(row.claim_value),
      source_type: row.enterprise_source_type ?? row.fact_source ?? 'unknown',
      page_slug: row.page_slug,
      confidence: normalizeConfidence(row.confidence),
      observed_at: normalizeObservedAt(row.observed_at),
    }));
    const conflictHash = computeConflictHash({
      entitySlug: group.entity_slug,
      factKey: group.fact_key,
      values: competingValues.map((value) => ({
        value: value.value,
        sourceType: value.source_type,
      })),
    });
    const evidencePageSlugs = Array.from(new Set(competingValues.map((value) => value.page_slug)));

    const inserted = await ctx.engine.executeRaw<{ id: number }>(
      `INSERT INTO enterprise_fact_conflicts (
         entity_slug,
         fact_key,
         conflict_hash,
         competing_values,
         evidence_page_slugs
       )
       VALUES ($1, $2, $3, $4::jsonb, $5::text[])
       ON CONFLICT (entity_slug, fact_key, conflict_hash) DO NOTHING
       RETURNING id`,
      [
        group.entity_slug,
        group.fact_key,
        conflictHash,
        JSON.stringify(competingValues),
        evidencePageSlugs,
      ],
    );
    conflictsInserted += inserted.length;
  }

  return {
    conflictsDetected: groups.length,
    conflictsInserted,
  };
}
