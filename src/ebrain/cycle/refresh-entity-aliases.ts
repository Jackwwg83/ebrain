import type { OperationContext } from '../../core/operations.ts';
import { EBRAIN_SOURCE_ID } from '../constants.ts';
import { SHARD_COUNT, assertValidShardIdx, shardSqlPredicate } from './shard.ts';

export interface RefreshEntityAliasesOpts {
  shardIdx: number;
  changedSlugs?: string[];
}

export interface RefreshEntityAliasesResult {
  aliasesRefreshed: number;
}

interface AliasPageRow {
  slug: string;
  type: string;
  title: string;
  enterprise_source_type: string | null;
  frontmatter: unknown;
}

interface AliasCandidate {
  entitySlug: string;
  entityType: string;
  alias: string;
  ingestSourceType: string | null;
}

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

function collectStringList(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeAlias(alias: string): string {
  return alias.trim().replace(/\s+/g, ' ');
}

function candidatesFromPage(row: AliasPageRow): AliasCandidate[] {
  const frontmatter = parseJsonRecord(row.frontmatter);
  const aliases = [
    row.title,
    ...collectStringList(frontmatter.aliases),
    ...collectStringList(frontmatter.entity_aliases),
  ]
    .map(normalizeAlias)
    .filter((alias) => alias.length > 0);

  const uniqueAliases = Array.from(new Set(aliases));
  return uniqueAliases.map((alias) => ({
    entitySlug: row.slug,
    entityType: row.type,
    alias,
    ingestSourceType: row.enterprise_source_type,
  }));
}

export async function refreshEntityAliases(
  ctx: OperationContext,
  opts: RefreshEntityAliasesOpts,
): Promise<RefreshEntityAliasesResult> {
  assertValidShardIdx(opts.shardIdx);
  if (opts.changedSlugs && opts.changedSlugs.length === 0) {
    return { aliasesRefreshed: 0 };
  }

  const params: unknown[] = [SHARD_COUNT, opts.shardIdx, EBRAIN_SOURCE_ID];
  const clauses = [
    `source_id = $3`,
    `deleted_at IS NULL`,
    `type IN ('person', 'company', 'deal', 'project')`,
    shardSqlPredicate('slug'),
  ];
  if (opts.changedSlugs) {
    params.push(opts.changedSlugs);
    clauses.push(`slug = ANY($${params.length}::text[])`);
  }

  const pages = await ctx.engine.executeRaw<AliasPageRow>(
    `SELECT slug, type, title, enterprise_source_type, frontmatter
       FROM pages
      WHERE ${clauses.join('\n        AND ')}
      ORDER BY slug`,
    params,
  );

  let aliasesRefreshed = 0;
  for (const page of pages) {
    await ctx.engine.executeRaw(
      `DELETE FROM enterprise_entity_aliases
        WHERE entity_slug = $1`,
      [page.slug],
    );

    for (const candidate of candidatesFromPage(page)) {
      const inserted = await ctx.engine.executeRaw<{ entity_slug: string }>(
        `INSERT INTO enterprise_entity_aliases (
           entity_slug,
           entity_type,
           alias,
           ingest_source_type,
           confidence,
           metadata
         )
         VALUES ($1, $2, $3, $4, 0.8000, $5::jsonb)
         ON CONFLICT (entity_type, alias_norm) DO UPDATE SET
           entity_slug = EXCLUDED.entity_slug,
           alias = EXCLUDED.alias,
           ingest_source_type = EXCLUDED.ingest_source_type,
           metadata = EXCLUDED.metadata
         RETURNING entity_slug`,
        [
          candidate.entitySlug,
          candidate.entityType,
          candidate.alias,
          candidate.ingestSourceType,
          JSON.stringify({ refreshed_by: 'ebrain-enterprise-cycle' }),
        ],
      );
      aliasesRefreshed += inserted.length;
    }
  }

  return { aliasesRefreshed };
}

export const __testing = {
  candidatesFromPage,
};
