import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { DingtalkDriveSource } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkDriveFile } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
import {
  countEnterpriseObjects,
  dingtalkEnterpriseSlug,
  latestDingtalkCursor,
  makeDingtalkApp,
  makeDingtalkListFetch,
  makeIngestionCtx,
  readEnterpriseObjectRow,
  readEnterprisePage,
  readDingtalkSourceRow,
  runInitialSourcePoll,
  seedDingtalkApp,
  seedDingtalkCursor,
  seedTenantToken,
  setupEngine,
  teardownEngine,
  type CapturedDingtalkRequest,
} from '../helpers.ts';
import type { PGLiteEngine } from '../../../../../src/core/pglite-engine.ts';

setDefaultTimeout(20_000);

let engine: PGLiteEngine;

beforeEach(async () => {
  ({ engine } = await setupEngine());
});

afterEach(async () => {
  await teardownEngine(engine);
});

describe('DingtalkDriveSource', () => {
  test('writes drive enterprise objects, advances cursor, and calls DingTalk drive API with cursor', async () => {
    const files = await Bun.file('src/ebrain/apps/dingtalk/fixtures/drive-files.json').json() as DingtalkDriveFile[];
    const requests: CapturedDingtalkRequest[] = [];

    await seedDingtalkApp(engine);
    await seedTenantToken(engine, 'tenant-token', '2026-05-20T04:00:00.000Z');

    const app = makeDingtalkApp({
      engine,
      fetch: makeDingtalkListFetch('files', files, requests),
    });
    const source = new DingtalkDriveSource(app);
    await seedDingtalkCursor(engine, {
      sourceId: source.id,
      sourceKind: source.kind,
      cursorState: { lastSyncedAt: '2026-05-17T00:00:00.000Z' },
    });

    await runInitialSourcePoll(source, makeIngestionCtx({ engine }));

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: 'https://api.dingtalk.com/v1.0/drive/files',
      body: { mode: 'incremental', since: '2026-05-17T00:00:00.000Z' },
    });
    expect(files.length).toBeGreaterThanOrEqual(5);
    expect(await countEnterpriseObjects(engine, source.id)).toBe(files.length);
    const expectedSlug = dingtalkEnterpriseSlug(source.id, files[0].fileId);
    const object = await readEnterpriseObjectRow(engine, {
      sourceId: source.id,
      externalId: files[0].fileId,
    });
    expect(object).toMatchObject({
      externalId: files[0].fileId,
      objectType: 'drive-file',
      pageSlug: expectedSlug,
      status: 'ingested',
    });
    expect(object.metadata).toMatchObject({
      slug: expectedSlug,
      external_id: files[0].fileId,
      object_type: 'drive-file',
      source_type: 'dingtalk',
      url: files[0].url,
      participants: [files[0].ownerUserId],
      raw_ref: files[0].rawRef,
    });
    const page = await readEnterprisePage(engine, expectedSlug);
    expect(page.compiledTruth).toContain(`- raw_ref: ${files[0].rawRef}`);
    expect(page.frontmatter).toMatchObject({
      external_id: files[0].fileId,
      object_type: 'drive-file',
      url: files[0].url,
      participants: [files[0].ownerUserId],
      classification: 'L1',
    });

    const row = await readDingtalkSourceRow(engine, source.id);
    expect(row.cursorState).toEqual({ lastSyncedAt: latestDingtalkCursor(files) });
    expect(row.lastSuccessAt).toBeTruthy();
  });
});
