import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { DingtalkDocsSource } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkDocItem } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
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

describe('DingtalkDocsSource', () => {
  test('writes document enterprise objects, advances cursor, and calls DingTalk docs API with cursor', async () => {
    const docs = await Bun.file('src/ebrain/apps/dingtalk/fixtures/docs-list.json').json() as DingtalkDocItem[];
    const requests: CapturedDingtalkRequest[] = [];

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

    await runInitialSourcePoll(source, makeIngestionCtx({ engine }));

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: 'https://api.dingtalk.com/v1.0/document/docs',
      body: { mode: 'incremental', since: '2026-05-18T00:00:00.000Z' },
    });
    expect(requests[0].headers['x-acs-dingtalk-access-token']).toBe('tenant-token');

    expect(docs.length).toBeGreaterThanOrEqual(5);
    expect(await countEnterpriseObjects(engine, source.id)).toBe(docs.length);
    const expectedSlug = dingtalkEnterpriseSlug(source.id, docs[0].docId);
    const object = await readEnterpriseObjectRow(engine, {
      sourceId: source.id,
      externalId: docs[0].docId,
    });
    expect(object).toMatchObject({
      externalId: docs[0].docId,
      objectType: 'doc',
      pageSlug: expectedSlug,
      status: 'ingested',
    });
    expect(object.metadata).toMatchObject({
      slug: expectedSlug,
      ingest_source_id: source.id,
      external_id: docs[0].docId,
      object_type: 'doc',
      source_type: 'dingtalk',
      url: docs[0].url,
      participants: [docs[0].ownerUserId],
      classification: 'L1',
      raw_ref: `dingtalk://docs/${docs[0].docId}`,
    });

    const page = await readEnterprisePage(engine, expectedSlug);
    expect(page.compiledTruth).toBe(docs[0].markdown);
    expect(page.frontmatter).toMatchObject({
      external_id: docs[0].docId,
      object_type: 'doc',
      url: docs[0].url,
      participants: [docs[0].ownerUserId],
      classification: 'L1',
    });
    expect(page.provenance).toMatchObject({
      ingest_source_id: source.id,
      external_id: docs[0].docId,
      object_type: 'doc',
      source_type: 'dingtalk',
      url: docs[0].url,
      participants: [docs[0].ownerUserId],
    });

    const row = await readDingtalkSourceRow(engine, source.id);
    expect(row.cursorState).toEqual({ lastSyncedAt: latestDingtalkCursor(docs) });
    expect(row.lastSuccessAt).toBeTruthy();

    await runInitialSourcePoll(source, makeIngestionCtx({ engine }));
    const repeatedObject = await readEnterpriseObjectRow(engine, {
      sourceId: source.id,
      externalId: docs[0].docId,
    });
    expect(repeatedObject.pageSlug).toBe(expectedSlug);
    expect(await countEnterpriseObjects(engine, source.id)).toBe(docs.length);
  });

  test('migration mode uses backfill and keeps slug-keyed idempotency across polls', async () => {
    const docs = (await Bun.file('src/ebrain/apps/dingtalk/fixtures/docs-list.json').json() as DingtalkDocItem[]).slice(0, 1);
    const requests: CapturedDingtalkRequest[] = [];

    await seedDingtalkApp(engine);
    await seedTenantToken(engine, 'tenant-token', '2026-05-20T04:00:00.000Z');

    const app = makeDingtalkApp({
      engine,
      fetch: makeDingtalkListFetch('docs', docs, requests),
    });
    const source = new DingtalkDocsSource(app, { mode: 'migration' });

    await runInitialSourcePoll(source, makeIngestionCtx({ engine }));
    const firstObject = await readEnterpriseObjectRow(engine, {
      sourceId: source.id,
      externalId: docs[0].docId,
    });
    await runInitialSourcePoll(source, makeIngestionCtx({ engine }));

    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.body.mode === 'backfill')).toBe(true);
    const secondObject = await readEnterpriseObjectRow(engine, {
      sourceId: source.id,
      externalId: docs[0].docId,
    });
    expect(secondObject.pageSlug).toBe(firstObject.pageSlug);
    expect(await countEnterpriseObjects(engine, source.id)).toBe(1);
  });

  test('records circuit error when DingTalk document API load fails', async () => {
    await seedDingtalkApp(engine);
    await seedTenantToken(engine, 'tenant-token', '2026-05-20T04:00:00.000Z');
    const app = makeDingtalkApp({
      engine,
      fetch: async () => Response.json({ errcode: 500, errmsg: 'vendor down' }, { status: 500 }),
    });
    const source = new DingtalkDocsSource(app);

    await runInitialSourcePoll(source, makeIngestionCtx({ engine }));
    const row = await readDingtalkSourceRow(engine, source.id);

    expect(await countEnterpriseObjects(engine, source.id)).toBe(0);
    expect(row.consecutiveErrors).toBe(1);
    expect(row.lastError).toContain('DingTalk API');
  });
});
