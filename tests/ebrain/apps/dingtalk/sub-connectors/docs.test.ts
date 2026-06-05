import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  validateIngestionEvent,
  type IngestionEvent,
} from '../../../../../src/core/ingestion/types.ts';
import { DingtalkDocsSource } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkDocItem } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
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

describe('DingtalkDocsSource', () => {
  test('emits document events, advances cursor, and calls DingTalk docs API with cursor', async () => {
    const docs = await Bun.file('src/ebrain/apps/dingtalk/fixtures/docs-list.json').json() as DingtalkDocItem[];
    const requests: CapturedDingtalkRequest[] = [];
    const emitted: IngestionEvent[] = [];

    await seedDingtalkApp(engine);
    await seedTenantToken(engine, 'tenant-token', '2026-05-20T04:00:00.000Z');

    const app = makeDingtalkApp({
      engine,
      fetch: makeDingtalkListFetch('docs', docs, requests),
    });
    const source = new DingtalkDocsSource(app);
    await seedDingtalkCursor(engine, {
      sourceId: source.id,
      sourceKind: source.kind,
      cursorState: { lastSyncedAt: '2026-05-18T00:00:00.000Z' },
    });

    await runInitialSourcePoll(source, makeIngestionCtx({ engine, emitted }));

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: 'https://api.dingtalk.com/v1.0/document/docs',
      body: { mode: 'incremental', since: '2026-05-18T00:00:00.000Z' },
    });
    expect(requests[0].headers['x-acs-dingtalk-access-token']).toBe('tenant-token');

    expect(docs.length).toBeGreaterThanOrEqual(5);
    expect(emitted).toHaveLength(docs.length);
    expect(emitted[0]).toMatchObject({
      source_id: source.id,
      source_kind: 'dingtalk-docs',
      source_uri: `dingtalk://docs/${docs[0].docId}`,
      content_type: 'text/markdown',
      content: docs[0].markdown,
      untrusted_payload: true,
    });
    expect(validateIngestionEvent(emitted[0])).toBeNull();

    const row = await readDingtalkSourceRow(engine, source.id);
    expect(row.cursorState).toEqual({ lastSyncedAt: latestDingtalkCursor(docs) });
    expect(row.lastSuccessAt).toBeTruthy();
  });

  test('records circuit error when DingTalk document API load fails', async () => {
    await seedDingtalkApp(engine);
    await seedTenantToken(engine, 'tenant-token', '2026-05-20T04:00:00.000Z');
    const emitted: IngestionEvent[] = [];
    const app = makeDingtalkApp({
      engine,
      fetch: async () => Response.json({ errcode: 500, errmsg: 'vendor down' }, { status: 500 }),
    });
    const source = new DingtalkDocsSource(app);

    await runInitialSourcePoll(source, makeIngestionCtx({ engine, emitted }));
    const row = await readDingtalkSourceRow(engine, source.id);

    expect(emitted).toEqual([]);
    expect(row.consecutiveErrors).toBe(1);
    expect(row.lastError).toContain('DingTalk API');
  });
});
