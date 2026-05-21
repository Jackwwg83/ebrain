import { describe, expect, test } from 'bun:test';
import type { BrainEngine } from '../../../src/core/engine.ts';
import type { OperationContext } from '../../../src/core/operations.ts';
import { detect_enterprise_conflicts } from '../../../src/ebrain/ops/detect-enterprise-conflicts.ts';
import { withEngine } from '../executives/helpers.ts';

function logger(): OperationContext['logger'] {
  return { info() {}, warn() {}, error() {} };
}

function makeCtx(engine: OperationContext['engine'], remote: boolean): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: logger(),
    dryRun: false,
    remote,
    sourceId: 'enterprise',
  };
}

function makeCtxWithUndefinedRemote(engine: OperationContext['engine']): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: logger(),
    dryRun: false,
    remote: undefined,
    sourceId: 'enterprise',
  } as unknown as OperationContext;
}

async function seedEnterpriseSource(engine: OperationContext['engine']): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO sources (id, name, config)
     VALUES ('enterprise', 'enterprise', '{}'::jsonb)
     ON CONFLICT (id) DO NOTHING`,
  );
}

async function seedClaim(
  engine: OperationContext['engine'],
  args: { sourceType: string; pageSlug: string; value: number },
): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO pages (
       source_id, slug, type, title, compiled_truth, enterprise_source_type, last_ingested_at
     )
     VALUES (
       'enterprise', $1, 'note', $2, '', $3, '2026-05-20T00:00:00.000Z'
     )`,
    [args.pageSlug, `Acme ${args.sourceType}`, args.sourceType],
  );

  await engine.executeRaw(
    `INSERT INTO facts (
       source_id, entity_slug, fact, kind, visibility, notability, valid_from,
       source, confidence, row_num, source_markdown_slug, claim_metric,
       claim_value, claim_unit, claim_period
     )
     VALUES (
       'enterprise', 'acme', $1, 'fact', 'private', 'high',
       '2026-05-20T00:00:00.000Z', $2, 0.9, 1, $3,
       'arr', $4, 'USD', 'FY2026'
     )`,
    [`Acme ARR is ${args.value}`, args.sourceType, args.pageSlug, args.value],
  );
}

describe('detect_enterprise_conflicts operation', () => {
  test('declares admin local-only scope and rejects remote callers', async () => {
    expect(detect_enterprise_conflicts.scope).toBe('admin');
    expect(detect_enterprise_conflicts.localOnly).toBe(true);

    let caught: unknown;
    try {
      await detect_enterprise_conflicts.handler(makeCtx({} as BrainEngine, true), {});
    } catch (error) {
      caught = error;
    }

    expect((caught as { code?: string }).code).toBe('permission_denied');
  });

  test('rejects direct calls when remote is undefined', async () => {
    let caught: unknown;
    try {
      await detect_enterprise_conflicts.handler(makeCtxWithUndefinedRemote({} as BrainEngine), {});
    } catch (error) {
      caught = error;
    }

    expect((caught as { code?: string }).code).toBe('permission_denied');
  });

  test('runs the F1 detector locally and returns filtered conflict samples', async () => {
    await withEngine(async (engine) => {
      await seedEnterpriseSource(engine);
      await seedClaim(engine, { sourceType: 'salesforce', pageSlug: 'salesforce/acme-arr', value: 120 });
      await seedClaim(engine, { sourceType: 'erp', pageSlug: 'erp/acme-arr', value: 124 });

      const result = await detect_enterprise_conflicts.handler(
        makeCtx(engine, false),
        { entity_slug: 'acme', limit: 10 },
      ) as {
        conflictsDetected: number;
        conflictsInserted: number;
        samples: Array<Record<string, unknown>>;
      };

      expect(result.conflictsDetected).toBe(1);
      expect(result.conflictsInserted).toBe(1);
      expect(result.samples).toHaveLength(1);
      expect(result.samples[0]).toMatchObject({
        entity_slug: 'acme',
        fact_key: 'arr',
        status: 'open',
      });

      const rows = await engine.executeRaw<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM enterprise_fact_conflicts WHERE entity_slug = 'acme'`,
      );
      expect(rows[0].count).toBe(1);
    });
  }, 30_000);
});
