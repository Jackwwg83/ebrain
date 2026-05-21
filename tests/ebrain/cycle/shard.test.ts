import { describe, expect, setDefaultTimeout, test } from 'bun:test';
import type { OperationContext } from '../../../src/core/operations.ts';
import { PGLiteEngine } from '../../../src/core/pglite-engine.ts';
import { listSlugsInShard, SHARD_COUNT } from '../../../src/ebrain/cycle/shard.ts';

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

async function seedEnterpriseSource(engine: PGLiteEngine): Promise<void> {
  await engine.executeRaw(
    `INSERT INTO sources (id, name, config)
     VALUES ('enterprise', 'enterprise', '{}'::jsonb)
     ON CONFLICT (id) DO NOTHING`,
  );
}

describe('enterprise cycle shard partition', () => {
  test('SHARD_COUNT is fixed to 8 for the MVP', () => {
    expect(SHARD_COUNT).toBe(8);
  });

  test('listSlugsInShard distributes 10000 mock slugs with PG hashtext within 10 percent', async () => {
    const engine = new PGLiteEngine();
    await engine.connect({});
    try {
      await engine.initSchema();
      await seedEnterpriseSource(engine);
      const ctx = makeCtx(engine);
      await engine.executeRaw(
        `INSERT INTO pages (source_id, slug, type, title, compiled_truth, timeline)
         SELECT 'enterprise',
                'mock-slug-' || i::text,
                'note',
                'Mock Slug ' || i::text,
                '',
                ''
           FROM generate_series(0, 9999) AS s(i)`,
      );

      const counts: number[] = [];
      for (let shardIdx = 0; shardIdx < SHARD_COUNT; shardIdx += 1) {
        counts.push((await listSlugsInShard(ctx, shardIdx)).length);
      }

      const expected = 10_000 / SHARD_COUNT;
      const tolerance = expected * 0.1;
      for (const count of counts) {
        expect(count).toBeGreaterThanOrEqual(expected - tolerance);
        expect(count).toBeLessThanOrEqual(expected + tolerance);
      }
    } finally {
      await engine.disconnect();
    }
  });
});
