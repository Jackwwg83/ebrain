import type { PageType } from '../../core/types.ts';
import type { OperationContext } from '../../core/operations.ts';
import { chooseWinningClaim, type CompetingValue } from '../conflicts/choose-winner.ts';
import { EBRAIN_SOURCE_ID } from '../constants.ts';
import { SHARD_COUNT, assertValidShardIdx, shardSqlPredicate } from './shard.ts';

export interface RefreshCompiledTruthOpts {
  shardIdx: number;
}

export interface RefreshCompiledTruthResult {
  pagesUpdated: number;
}

interface EntityPageRow {
  slug: string;
  type: PageType;
  title: string;
  compiled_truth: string;
  timeline: string | null;
  frontmatter: unknown;
}

interface ClaimRow {
  claim_metric: string;
  claim_value: unknown;
  source_type: string | null;
  confidence: number | string | null;
}

type FactAuthority = Record<string, string[]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeConfidence(value: number | string | null): number | null {
  if (value === null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeFactAuthority(value: unknown): FactAuthority | undefined {
  if (!isRecord(value)) return undefined;
  const out: FactAuthority = {};
  for (const [key, rawOrder] of Object.entries(value)) {
    if (!Array.isArray(rawOrder)) continue;
    const order = rawOrder.filter((item): item is string => typeof item === 'string' && item.length > 0);
    if (order.length > 0) out[key] = order;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeCompiledTruth(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  return { ...value };
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function loadClaimsForEntity(ctx: OperationContext, entitySlug: string): Promise<Map<string, CompetingValue[]>> {
  const rows = await ctx.engine.executeRaw<ClaimRow>(
    `SELECT claim_metric,
            claim_value,
            COALESCE(enterprise_source_type, fact_source, 'unknown') AS source_type,
            confidence
       FROM enterprise_fact_claims_view
      WHERE entity_slug = $1
        AND claim_metric IS NOT NULL
        AND claim_value IS NOT NULL
      ORDER BY claim_metric, COALESCE(enterprise_source_type, fact_source, ''), claim_value`,
    [entitySlug],
  );

  const byFactKey = new Map<string, CompetingValue[]>();
  for (const row of rows) {
    const values = byFactKey.get(row.claim_metric) ?? [];
    values.push({
      value: row.claim_value,
      source_type: row.source_type ?? 'unknown',
      confidence: normalizeConfidence(row.confidence),
      factKey: row.claim_metric,
    });
    byFactKey.set(row.claim_metric, values);
  }
  return byFactKey;
}

export async function refreshCompiledTruth(
  ctx: OperationContext,
  opts: RefreshCompiledTruthOpts,
): Promise<RefreshCompiledTruthResult> {
  assertValidShardIdx(opts.shardIdx);
  const pages = await ctx.engine.executeRaw<EntityPageRow>(
    `SELECT p.slug,
            p.type,
            p.title,
            p.compiled_truth,
            p.timeline,
            p.frontmatter
       FROM pages p
      WHERE p.source_id = $3
        AND p.deleted_at IS NULL
        AND EXISTS (
          SELECT 1
            FROM enterprise_fact_claims_view v
           WHERE v.entity_slug = p.slug
             AND v.claim_metric IS NOT NULL
             AND v.claim_value IS NOT NULL
        )
        AND ${shardSqlPredicate('p.slug')}
      ORDER BY p.slug`,
    [SHARD_COUNT, opts.shardIdx, EBRAIN_SOURCE_ID],
  );

  let pagesUpdated = 0;
  for (const page of pages) {
    const frontmatter = parseJsonRecord(page.frontmatter);
    const factAuthority = normalizeFactAuthority(
      frontmatter.fact_authority ?? frontmatter.factAuthority,
    );
    const nextCompiledTruth = normalizeCompiledTruth(frontmatter.compiled_truth);
    const originalCompiledTruth = JSON.parse(JSON.stringify(nextCompiledTruth)) as Record<string, unknown>;
    const claimsByFactKey = await loadClaimsForEntity(ctx, page.slug);

    for (const [factKey, values] of claimsByFactKey.entries()) {
      const winner = chooseWinningClaim({ values, factAuthority, factKey });
      if (!winner) continue;
      nextCompiledTruth[factKey] = {
        value: winner.winningValue,
        source: winner.winningSource,
      };
    }

    if (sameJson(nextCompiledTruth, originalCompiledTruth)) continue;

    await ctx.engine.putPage(page.slug, {
      type: page.type,
      title: page.title,
      compiled_truth: page.compiled_truth,
      timeline: page.timeline ?? '',
      frontmatter: {
        ...frontmatter,
        compiled_truth: nextCompiledTruth,
      },
    }, { sourceId: EBRAIN_SOURCE_ID });
    pagesUpdated += 1;
  }

  return { pagesUpdated };
}

export const __testing = {
  normalizeCompiledTruth,
  normalizeFactAuthority,
};
