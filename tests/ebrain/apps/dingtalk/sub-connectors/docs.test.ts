import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';

setDefaultTimeout(20_000);
import { DingtalkDocsConnector } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkDocItem } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
import { makeDingtalkApp, seedDingtalkApp, seedTenantToken, setupEngine, teardownEngine } from '../helpers.ts';
import type { PGLiteEngine } from '../../../../../src/core/pglite-engine.ts';
import type { OperationContext } from '../../../../../src/core/operations.ts';

let engine: PGLiteEngine;
let ctx: OperationContext;

beforeEach(async () => {
  ({ engine, ctx } = await setupEngine());
});

afterEach(async () => {
  await teardownEngine(engine);
});

describe('DingtalkDocsConnector', () => {
  test('ingests docs fixture idempotently', async () => {
    const docs = await Bun.file('src/ebrain/apps/dingtalk/fixtures/docs-list.json').json() as DingtalkDocItem[];
    const connector = new DingtalkDocsConnector(makeDingtalkApp({ engine }), { fixtureDocs: docs });

    const first = await connector.runIncremental(ctx);
    const second = await connector.runIncremental(ctx);

    expect(docs.length).toBeGreaterThanOrEqual(5);
    expect(first).toMatchObject({ objectsIngested: docs.length, objectsSkipped: 0, errors: 0 });
    expect(second).toMatchObject({ objectsIngested: 0, objectsSkipped: docs.length, errors: 0 });
  });

  test('marks circuit error when DingTalk document API load fails', async () => {
    await seedDingtalkApp(engine);
    await seedTenantToken(engine, 'tenant-token', '2026-05-20T04:00:00.000Z');
    const app = makeDingtalkApp({
      engine,
      fetch: async () => Response.json({ errcode: 500, errmsg: 'vendor down' }, { status: 500 }),
    });
    const connector = new DingtalkDocsConnector(app);

    const result = await connector.runIncremental(ctx);
    const rows = await engine.executeRaw<{ consecutive_errors: number; last_error: string | null }>(
      `SELECT consecutive_errors, last_error FROM enterprise_ingest_sources WHERE ingest_source_id = 'dingtalk-docs'`,
    );

    expect(result).toMatchObject({ objectsIngested: 0, objectsSkipped: 0, errors: 1 });
    expect(rows[0].consecutive_errors).toBe(1);
    expect(rows[0].last_error).toContain('DingTalk API');
  });
});
