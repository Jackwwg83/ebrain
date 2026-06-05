import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { DingtalkMeetingSource } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkMeetingItem } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
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

describe('DingtalkMeetingSource', () => {
  test('writes meeting enterprise objects, advances cursor, and calls DingTalk meeting API with cursor', async () => {
    const meetings = await Bun.file('src/ebrain/apps/dingtalk/fixtures/meeting-list.json').json() as DingtalkMeetingItem[];
    const requests: CapturedDingtalkRequest[] = [];

    await seedDingtalkApp(engine);
    await seedTenantToken(engine, 'tenant-token', '2026-05-20T04:00:00.000Z');

    const app = makeDingtalkApp({
      engine,
      fetch: makeDingtalkListFetch('meetings', meetings, requests),
    });
    const source = new DingtalkMeetingSource(app);
    await seedDingtalkCursor(engine, {
      sourceId: source.id,
      sourceKind: source.kind,
      cursorState: { lastSyncedAt: '2026-05-18T00:00:00.000Z' },
    });

    await runInitialSourcePoll(source, makeIngestionCtx({ engine }));

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: 'https://api.dingtalk.com/v1.0/meeting/meetings',
      body: { mode: 'incremental', since: '2026-05-18T00:00:00.000Z' },
    });
    expect(meetings.length).toBeGreaterThanOrEqual(5);
    expect(await countEnterpriseObjects(engine, source.id)).toBe(meetings.length);
    const expectedSlug = dingtalkEnterpriseSlug(source.id, meetings[0].meetingId);
    const object = await readEnterpriseObjectRow(engine, {
      sourceId: source.id,
      externalId: meetings[0].meetingId,
    });
    expect(object).toMatchObject({
      externalId: meetings[0].meetingId,
      objectType: meetings[0].transcriptMarkdown ? 'meeting-transcript' : 'meeting',
      pageSlug: expectedSlug,
      status: 'ingested',
    });
    expect(object.metadata).toMatchObject({
      slug: expectedSlug,
      external_id: meetings[0].meetingId,
      source_type: 'dingtalk',
      raw_ref: `dingtalk://meeting/${meetings[0].meetingId}`,
    });
    const page = await readEnterprisePage(engine, expectedSlug);
    expect(page.compiledTruth).toContain('## Transcript');
    expect(page.frontmatter).toMatchObject({
      external_id: meetings[0].meetingId,
      object_type: meetings[0].transcriptMarkdown ? 'meeting-transcript' : 'meeting',
      url: meetings[0].url ?? meetings[0].recordingUrl,
      participants: [meetings[0].hostUserId, ...(meetings[0].participantUserIds ?? [])],
      classification: 'L1',
    });

    const skippedRows = await engine.executeRaw<{ compiled_truth: string }>(
      `SELECT p.compiled_truth
       FROM pages p
       JOIN enterprise_ingest_objects o ON o.page_slug = p.slug
       WHERE o.ingest_source_id = $1`,
      [source.id],
    );
    expect(skippedRows.some((row) => row.compiled_truth.includes('Skipped:'))).toBe(true);

    const row = await readDingtalkSourceRow(engine, source.id);
    expect(row.cursorState).toEqual({ lastSyncedAt: latestDingtalkCursor(meetings) });
    expect(row.lastSuccessAt).toBeTruthy();
  });
});
