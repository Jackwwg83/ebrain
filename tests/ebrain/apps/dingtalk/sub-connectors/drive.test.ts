import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';

setDefaultTimeout(20_000);
import { DingtalkDriveConnector } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkDriveFile } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
import { makeDingtalkApp, setupEngine, teardownEngine } from '../helpers.ts';
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

describe('DingtalkDriveConnector', () => {
  test('ingests drive metadata fixture without downloading large files', async () => {
    const files = await Bun.file('src/ebrain/apps/dingtalk/fixtures/drive-files.json').json() as DingtalkDriveFile[];
    const connector = new DingtalkDriveConnector(makeDingtalkApp({ engine }), { fixtureFiles: files });

    const first = await connector.runIncremental(ctx);
    const second = await connector.runIncremental(ctx);
    const rows = await engine.executeRaw<{ metadata: Record<string, unknown> }>(
      `SELECT metadata FROM enterprise_ingest_objects WHERE ingest_source_id = 'dingtalk-drive' LIMIT 1`,
    );

    expect(files.length).toBeGreaterThanOrEqual(5);
    expect(first).toMatchObject({ objectsIngested: files.length, objectsSkipped: 0, errors: 0 });
    expect(second).toMatchObject({ objectsIngested: 0, objectsSkipped: files.length, errors: 0 });
    expect(rows[0].metadata.raw_inline).toBe(true);
  });
});
