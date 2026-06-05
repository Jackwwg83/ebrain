import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  validateIngestionEvent,
  type IngestionEvent,
} from '../../../../../src/core/ingestion/types.ts';
import { DingtalkMeetingSource } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkMeetingItem } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
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

describe('DingtalkMeetingSource', () => {
  test('emits meeting events, advances cursor, and calls DingTalk meeting API with cursor', async () => {
    const meetings = await Bun.file('src/ebrain/apps/dingtalk/fixtures/meeting-list.json').json() as DingtalkMeetingItem[];
    const requests: CapturedDingtalkRequest[] = [];
    const emitted: IngestionEvent[] = [];

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

    await runInitialSourcePoll(source, makeIngestionCtx({ engine, emitted }));

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: 'https://api.dingtalk.com/v1.0/meeting/meetings',
      body: { mode: 'incremental', since: '2026-05-18T00:00:00.000Z' },
    });
    expect(meetings.length).toBeGreaterThanOrEqual(5);
    expect(emitted).toHaveLength(meetings.length);
    expect(emitted[0]).toMatchObject({
      source_id: source.id,
      source_kind: 'dingtalk-meeting',
      source_uri: `dingtalk://meeting/${meetings[0].meetingId}`,
      content_type: 'text/markdown',
      untrusted_payload: true,
    });
    expect(emitted[0].content).toContain('## Transcript');
    expect(emitted.some((event) => event.content.includes('Skipped:'))).toBe(true);
    expect(validateIngestionEvent(emitted[0])).toBeNull();

    const row = await readDingtalkSourceRow(engine, source.id);
    expect(row.cursorState).toEqual({ lastSyncedAt: latestDingtalkCursor(meetings) });
    expect(row.lastSuccessAt).toBeTruthy();
  });
});
