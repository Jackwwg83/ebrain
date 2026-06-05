import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  validateIngestionEvent,
  type IngestionEvent,
} from '../../../../../src/core/ingestion/types.ts';
import { DingtalkCalendarSource } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkCalendarEvent } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
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

describe('DingtalkCalendarSource', () => {
  test('emits calendar events, advances cursor, and calls DingTalk calendar API with cursor', async () => {
    const events = await Bun.file('src/ebrain/apps/dingtalk/fixtures/calendar-events.json').json() as DingtalkCalendarEvent[];
    const requests: CapturedDingtalkRequest[] = [];
    const emitted: IngestionEvent[] = [];

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

    await runInitialSourcePoll(source, makeIngestionCtx({ engine, emitted }));

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: 'https://api.dingtalk.com/v1.0/calendar/events',
      body: { mode: 'incremental', since: '2026-05-18T00:00:00.000Z' },
    });
    expect(events.length).toBeGreaterThanOrEqual(5);
    expect(emitted).toHaveLength(events.length);
    expect(emitted[0]).toMatchObject({
      source_id: source.id,
      source_kind: 'dingtalk-calendar',
      source_uri: `dingtalk://calendar/${events[0].eventId}`,
      content_type: 'text/markdown',
      untrusted_payload: true,
    });
    expect(emitted[0].content).toContain(`- start: ${events[0].startTime}`);
    expect(emitted[0].content).toContain(`- attendees: ${events[0].attendeeUserIds?.join(', ')}`);
    expect(validateIngestionEvent(emitted[0])).toBeNull();

    const row = await readDingtalkSourceRow(engine, source.id);
    expect(row.cursorState).toEqual({ lastSyncedAt: latestDingtalkCursor(events) });
    expect(row.lastSuccessAt).toBeTruthy();
  });
});
