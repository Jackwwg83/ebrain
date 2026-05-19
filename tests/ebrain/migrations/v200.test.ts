import { describe, expect, test } from 'bun:test';
import { PGLiteEngine } from '../../../src/core/pglite-engine.ts';
import { LATEST_VERSION } from '../../../src/core/migrate.ts';

async function withEngine<T>(fn: (engine: PGLiteEngine) => Promise<T>): Promise<T> {
  const engine = new PGLiteEngine();
  await engine.connect({});
  try {
    return await fn(engine);
  } finally {
    await engine.disconnect();
  }
}

async function tableExists(engine: PGLiteEngine, tableName: string): Promise<boolean> {
  const rows = await engine.executeRaw<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  );
  return rows.length > 0;
}

async function columnExists(engine: PGLiteEngine, table: string, column: string): Promise<boolean> {
  const rows = await engine.executeRaw<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return rows.length > 0;
}

describe('Ebrain v200 schema migration', () => {
  test('fresh PGLite initSchema applies v200 and creates enterprise tables', async () => {
    await withEngine(async (engine) => {
      await engine.initSchema();

      const version = await engine.getConfig('version');
      expect(Number(version)).toBe(LATEST_VERSION);
      expect(LATEST_VERSION).toBeGreaterThanOrEqual(200);

      for (const table of [
        'enterprise_apps',
        'enterprise_oauth_tokens',
        'enterprise_ingest_sources',
        'enterprise_ingest_objects',
        'enterprise_entity_aliases',
        'enterprise_fact_conflicts',
        'executives',
      ]) {
        expect(await tableExists(engine, table), `${table} should exist`).toBe(true);
      }
    });
  }, 30_000);

  test('pages.classification CHECK rejects invalid values', async () => {
    await withEngine(async (engine) => {
      await engine.initSchema();

      await expect(
        engine.executeRaw(
          `INSERT INTO pages (slug, type, title, classification)
           VALUES ('bad-classification', 'note', 'Bad Classification', 'L99')`,
        ),
      ).rejects.toThrow();
    });
  }, 30_000);

  test('enterprise_fact_claims_view is queryable', async () => {
    await withEngine(async (engine) => {
      await engine.initSchema();
      await expect(engine.executeRaw(`SELECT 1 FROM enterprise_fact_claims_view LIMIT 0`)).resolves.toEqual([]);
    });
  }, 30_000);

  test('initSchema is idempotent after v200', async () => {
    await withEngine(async (engine) => {
      await engine.initSchema();
      await expect(engine.initSchema()).resolves.toBeUndefined();
      expect(Number(await engine.getConfig('version'))).toBe(LATEST_VERSION);
    });
  }, 30_000);

  test('PGLite fresh init includes v200 forward-reference columns', async () => {
    await withEngine(async (engine) => {
      await engine.initSchema();

      for (const [table, column] of [
        ['pages', 'classification'],
        ['pages', 'trust_tier'],
        ['pages', 'enterprise_source_type'],
        ['pages', 'enterprise_source_ref'],
        ['oauth_clients', 'executive_id'],
        ['oauth_tokens', 'executive_id'],
        ['mcp_request_log', 'executive_id'],
        ['mcp_request_log', 'executive_role'],
      ] as const) {
        expect(await columnExists(engine, table, column), `${table}.${column} should exist`).toBe(true);
      }
    });
  }, 30_000);
});
