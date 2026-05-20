import { afterEach, beforeEach, describe, expect, setDefaultTimeout, test } from 'bun:test';
import { PGLiteEngine } from '../../../src/core/pglite-engine.ts';
import type { OperationContext } from '../../../src/core/operations.ts';
import { detectFactConflicts } from '../../../src/ebrain/conflicts/detect.ts';

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

async function seedEnterpriseSource(): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO sources (id, name, config)
     VALUES ('enterprise', 'enterprise', '{}'::jsonb)
     ON CONFLICT (id) DO NOTHING`,
  );
}

async function seedClaim(args: {
  sourceType: string;
  pageSlug: string;
  value: number;
  confidence: number;
}): Promise<void> {
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
     VALUES (
       'enterprise',
       $1,
       'note',
       $2,
       '',
       $3,
       '2026-05-20T00:00:00.000Z'
     )`,
    [args.pageSlug, `Acme ${args.sourceType}`, args.sourceType],
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
       'acme',
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
      `Acme ARR is ${args.value}`,
      args.sourceType,
      args.confidence,
      args.pageSlug,
      args.value,
    ],
  );
}

function coerceJsonArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (typeof value === 'string') return JSON.parse(value) as Array<Record<string, unknown>>;
  throw new Error(`unexpected jsonb value: ${String(value)}`);
}

function coerceTextArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    if (value.startsWith('{') && value.endsWith('}')) {
      return value.slice(1, -1).split(',').filter(Boolean);
    }
    return JSON.parse(value) as string[];
  }
  throw new Error(`unexpected text[] value: ${String(value)}`);
}

beforeEach(async () => {
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
  ctx = makeCtx(engine);
  await seedEnterpriseSource();
  await seedClaim({
    sourceType: 'salesforce',
    pageSlug: 'salesforce/acme-arr',
    value: 120,
    confidence: 0.82,
  });
  await seedClaim({
    sourceType: 'erp',
    pageSlug: 'erp/acme-arr',
    value: 124,
    confidence: 0.91,
  });
});

afterEach(async () => {
  await engine.disconnect();
});

describe('detectFactConflicts', () => {
  test('detects and inserts one open conflict from the enterprise facts view', async () => {
    const first = await detectFactConflicts(ctx);

    expect(first).toEqual({ conflictsDetected: 1, conflictsInserted: 1 });

    const rows = await engine.executeRaw<{
      entity_slug: string;
      fact_key: string;
      conflict_hash: string;
      competing_values: unknown;
      winning_value: unknown;
      winning_source: string | null;
      status: string;
      evidence_page_slugs: unknown;
    }>(
      `SELECT entity_slug,
              fact_key,
              conflict_hash,
              competing_values,
              winning_value,
              winning_source,
              status,
              evidence_page_slugs
         FROM enterprise_fact_conflicts`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].entity_slug).toBe('acme');
    expect(rows[0].fact_key).toBe('arr');
    expect(rows[0].conflict_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(rows[0].status).toBe('open');
    expect(rows[0].winning_value).toBeNull();
    expect(rows[0].winning_source).toBeNull();

    const competing = coerceJsonArray(rows[0].competing_values);
    expect(competing.map((value) => [value.source_type, value.value]).sort()).toEqual([
      ['erp', 124],
      ['salesforce', 120],
    ]);
    expect(coerceTextArray(rows[0].evidence_page_slugs).sort()).toEqual([
      'erp/acme-arr',
      'salesforce/acme-arr',
    ]);

    const second = await detectFactConflicts(ctx);
    expect(second).toEqual({ conflictsDetected: 1, conflictsInserted: 0 });
  });

  test('corroborating source does not insert duplicate conflict row (F1-H-001)', async () => {
    const first = await detectFactConflicts(ctx);
    expect(first).toEqual({ conflictsDetected: 1, conflictsInserted: 1 });

    await seedClaim({
      sourceType: 'finance-dwh',
      pageSlug: 'finance-dwh/acme-arr',
      value: 124,
      confidence: 0.89,
    });

    const second = await detectFactConflicts(ctx);
    expect(second).toEqual({ conflictsDetected: 1, conflictsInserted: 0 });

    const rows = await engine.executeRaw<{ row_count: number }>(
      `SELECT COUNT(*)::int AS row_count
         FROM enterprise_fact_conflicts
        WHERE entity_slug = $1`,
      ['acme'],
    );
    expect(rows[0].row_count).toBe(1);
  });
});
