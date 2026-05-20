import { afterEach, beforeEach, describe, expect, setDefaultTimeout, test } from 'bun:test';
import { PGLiteEngine } from '../../../src/core/pglite-engine.ts';
import type { OperationContext } from '../../../src/core/operations.ts';
import { refreshCompiledTruth } from '../../../src/ebrain/cycle/refresh-compiled-truth.ts';
import { SHARD_COUNT } from '../../../src/ebrain/cycle/shard.ts';

let engine: PGLiteEngine;
let ctx: OperationContext;

setDefaultTimeout(30_000);

function logger(): OperationContext['logger'] {
  return { info() {}, warn() {}, error() {} };
}

function makeCtx(engine: PGLiteEngine): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: logger(),
    dryRun: false,
    remote: false,
    sourceId: 'enterprise',
  } as OperationContext;
}

async function pgShard(slug: string): Promise<number> {
  const rows = await engine.executeRaw<{ shard: number | string }>(
    `SELECT (((hashtext($1)::bigint % $2::bigint) + $2::bigint) % $2::bigint)::int AS shard`,
    [slug, SHARD_COUNT],
  );
  return Number(rows[0]!.shard);
}

async function seedEnterpriseSource(): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO sources (id, name, config)
     VALUES ('enterprise', 'enterprise', '{}'::jsonb)
     ON CONFLICT (id) DO NOTHING`,
  );
}

async function seedEntityPage(): Promise<void> {
  await engine.putPage('acme-example', {
    type: 'company',
    title: 'Acme Example',
    compiled_truth: 'Acme Example company profile.',
    timeline: '',
    frontmatter: {
      fact_authority: { arr: ['erp', 'salesforce'] },
    },
  }, { sourceId: 'enterprise' });
}

async function seedClaim(args: { sourceType: string; pageSlug: string; value: number; confidence: number }): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO pages (
       source_id,
       slug,
       type,
       title,
       compiled_truth,
       enterprise_source_type,
       last_ingested_at
     )
     VALUES ('enterprise', $1, 'note', $2, '', $3, '2026-05-20T00:00:00.000Z')`,
    [args.pageSlug, `${args.sourceType} ARR`, args.sourceType],
  );

  await engine.executeRaw(
    `INSERT INTO facts (
       source_id,
       entity_slug,
       fact,
       kind,
       visibility,
       notability,
       valid_from,
       source,
       confidence,
       row_num,
       source_markdown_slug,
       claim_metric,
       claim_value,
       claim_unit,
       claim_period
     )
     VALUES (
       'enterprise',
       'acme-example',
       $1,
       'fact',
       'private',
       'high',
       '2026-05-20T00:00:00.000Z',
       $2,
       $3,
       1,
       $4,
       'arr',
       $5,
       'USD',
       'FY2026'
     )`,
    [
      `Acme Example ARR is ${args.value}`,
      args.sourceType,
      args.confidence,
      args.pageSlug,
      args.value,
    ],
  );
}

beforeEach(async () => {
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
  ctx = makeCtx(engine);
  await seedEnterpriseSource();
  await seedEntityPage();
  await seedClaim({ sourceType: 'salesforce', pageSlug: 'salesforce/acme-arr', value: 120, confidence: 0.95 });
  await seedClaim({ sourceType: 'erp', pageSlug: 'erp/acme-arr', value: 124, confidence: 0.8 });
});

afterEach(async () => {
  await engine.disconnect();
});

describe('refreshCompiledTruth', () => {
  test('writes the fact_authority winner into entity frontmatter.compiled_truth', async () => {
    const shardIdx = await pgShard('acme-example');
    const result = await refreshCompiledTruth(ctx, { shardIdx });

    expect(result).toEqual({ pagesUpdated: 1 });

    const page = await engine.getPage('acme-example', { sourceId: 'enterprise' });
    expect(page?.frontmatter.compiled_truth).toEqual({
      arr: { value: 124, source: 'erp' },
    });
  });
});
