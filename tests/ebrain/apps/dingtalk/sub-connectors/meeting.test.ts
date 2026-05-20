import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';

setDefaultTimeout(20_000);
import { DingtalkMeetingConnector } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkMeetingItem } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
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

describe('DingtalkMeetingConnector', () => {
  test('ingests meeting fixture and skips missing transcript as metadata', async () => {
    const meetings = await Bun.file('src/ebrain/apps/dingtalk/fixtures/meeting-list.json').json() as DingtalkMeetingItem[];
    const connector = new DingtalkMeetingConnector(makeDingtalkApp({ engine }), { fixtureMeetings: meetings });

    const first = await connector.runIncremental(ctx);
    const second = await connector.runIncremental(ctx);
    const rows = await engine.executeRaw<{ metadata: Record<string, unknown> }>(
      `SELECT metadata FROM enterprise_ingest_objects WHERE ingest_source_id = 'dingtalk-meeting' ORDER BY external_id`,
    );

    expect(meetings.length).toBeGreaterThanOrEqual(5);
    expect(first).toMatchObject({ objectsIngested: meetings.length, objectsSkipped: 0, errors: 0 });
    expect(second).toMatchObject({ objectsIngested: 0, objectsSkipped: meetings.length, errors: 0 });
    expect(rows.some((row) => row.metadata.transcript_available === false)).toBe(true);
  });
});
