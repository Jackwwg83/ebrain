import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  validateIngestionEvent,
  type IngestionEvent,
} from '../../../../../src/core/ingestion/types.ts';
import { DingtalkDriveSource } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkDriveFile } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
import {
  latestDingtalkCursor,
  makeDingtalkApp,
  makeDingtalkListFetch,
  makeIngestionCtx,
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
  test('emits drive metadata events, advances cursor, and calls DingTalk drive API with cursor', async () => {
    const files = await Bun.file('src/ebrain/apps/dingtalk/fixtures/drive-files.json').json() as DingtalkDriveFile[];
    const requests: CapturedDingtalkRequest[] = [];
    const emitted: IngestionEvent[] = [];

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

    await runInitialSourcePoll(source, makeIngestionCtx({ engine, emitted }));

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: 'https://api.dingtalk.com/v1.0/drive/files',
      body: { mode: 'incremental', since: '2026-05-17T00:00:00.000Z' },
    });
    expect(files.length).toBeGreaterThanOrEqual(5);
    expect(emitted).toHaveLength(files.length);
    expect(emitted[0]).toMatchObject({
      source_id: source.id,
      source_kind: 'dingtalk-drive',
      source_uri: `dingtalk://drive/${files[0].fileId}`,
      content_type: 'text/markdown',
      untrusted_payload: true,
    });
    expect(emitted[0].content).toContain(`- raw_ref: ${files[0].rawRef}`);
    expect(validateIngestionEvent(emitted[0])).toBeNull();

    const row = await readDingtalkSourceRow(engine, source.id);
    expect(row.cursorState).toEqual({ lastSyncedAt: latestDingtalkCursor(files) });
    expect(row.lastSuccessAt).toBeTruthy();
  });
});
