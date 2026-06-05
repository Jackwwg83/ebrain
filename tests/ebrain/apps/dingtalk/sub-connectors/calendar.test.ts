import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { DingtalkCalendarSource } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkCalendarEvent } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
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

describe('DingtalkCalendarSource', () => {
  test('writes calendar enterprise objects, advances cursor, and calls DingTalk calendar API with cursor', async () => {
    const events = await Bun.file('src/ebrain/apps/dingtalk/fixtures/calendar-events.json').json() as DingtalkCalendarEvent[];
    const requests: CapturedDingtalkRequest[] = [];

    await seedDingtalkApp(engine);
    await seedTenantToken(engine, 'tenant-token', '2026-05-20T04:00:00.000Z');

    const app = makeDingtalkApp({
      engine,
      fetch: makeDingtalkListFetch('events', events, requests),
    });
    const source = new DingtalkCalendarSource(app);
    await seedDingtalkCursor(engine, {
      sourceId: source.id,
      sourceKind: source.kind,
      cursorState: { lastSyncedAt: '2026-05-18T00:00:00.000Z' },
    });

    await runInitialSourcePoll(source, makeIngestionCtx({ engine }));

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: 'https://api.dingtalk.com/v1.0/calendar/events',
      body: { mode: 'incremental', since: '2026-05-18T00:00:00.000Z' },
    });
    expect(events.length).toBeGreaterThanOrEqual(5);
    expect(await countEnterpriseObjects(engine, source.id)).toBe(events.length);
    const expectedSlug = dingtalkEnterpriseSlug(source.id, events[0].eventId);
    const object = await readEnterpriseObjectRow(engine, {
      sourceId: source.id,
      externalId: events[0].eventId,
    });
    expect(object).toMatchObject({
      externalId: events[0].eventId,
      objectType: 'calendar-event',
      pageSlug: expectedSlug,
      status: 'ingested',
    });
    expect(object.metadata).toMatchObject({
      slug: expectedSlug,
      external_id: events[0].eventId,
      object_type: 'calendar-event',
      source_type: 'dingtalk',
      url: events[0].url,
      participants: [events[0].organizerUserId, ...(events[0].attendeeUserIds ?? [])],
      raw_ref: `dingtalk://calendar/${events[0].eventId}`,
    });
    const page = await readEnterprisePage(engine, expectedSlug);
    expect(page.compiledTruth).toContain(`- start: ${events[0].startTime}`);
    expect(page.compiledTruth).toContain(`- attendees: ${events[0].attendeeUserIds?.join(', ')}`);
    expect(page.frontmatter).toMatchObject({
      external_id: events[0].eventId,
      object_type: 'calendar-event',
      url: events[0].url,
      participants: [events[0].organizerUserId, ...(events[0].attendeeUserIds ?? [])],
      classification: 'L1',
    });

    const row = await readDingtalkSourceRow(engine, source.id);
    expect(row.cursorState).toEqual({ lastSyncedAt: latestDingtalkCursor(events) });
    expect(row.lastSuccessAt).toBeTruthy();
  });
});
