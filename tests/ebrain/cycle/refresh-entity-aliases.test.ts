import { afterEach, beforeEach, describe, expect, setDefaultTimeout, test } from 'bun:test';
import type { OperationContext } from '../../../src/core/operations.ts';
import { PGLiteEngine } from '../../../src/core/pglite-engine.ts';
import { refreshEntityAliases } from '../../../src/ebrain/cycle/refresh-entity-aliases.ts';
import { SHARD_COUNT } from '../../../src/ebrain/cycle/shard.ts';

let engine: PGLiteEngine;
let ctx: OperationContext;

setDefaultTimeout(30_000);

function makeCtx(engine: PGLiteEngine): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' },
    logger: { info() {}, warn() {}, error() {} },
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

beforeEach(async () => {
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
  ctx = makeCtx(engine);
  await seedEnterpriseSource();
  await engine.putPage('acme-example', {
    type: 'company',
    title: 'Acme Example',
    compiled_truth: '',
    timeline: '',
    frontmatter: {
      aliases: ['Acme', 'Acme Co'],
    },
  }, { sourceId: 'enterprise' });
});

afterEach(async () => {
  await engine.disconnect();
});

describe('refreshEntityAliases', () => {
  test('empty changedSlugs returns 0 work without writing aliases', async () => {
    const shardIdx = await pgShard('acme-example');
    const result = await refreshEntityAliases(ctx, { shardIdx, changedSlugs: [] });

    expect(result).toEqual({ aliasesRefreshed: 0 });

    const rows = await engine.executeRaw<{ count: string }>(
      `SELECT count(*)::text AS count FROM enterprise_entity_aliases`,
    );
    expect(rows[0]?.count).toBe('0');
  });
});
