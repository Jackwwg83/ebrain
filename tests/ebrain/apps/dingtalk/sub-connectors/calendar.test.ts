import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';

setDefaultTimeout(20_000);
import { DingtalkCalendarConnector } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkCalendarEvent } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
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

describe('DingtalkCalendarConnector', () => {
  test('ingests calendar fixture with attendees', async () => {
    const events = await Bun.file('src/ebrain/apps/dingtalk/fixtures/calendar-events.json').json() as DingtalkCalendarEvent[];
    const connector = new DingtalkCalendarConnector(makeDingtalkApp({ engine }), { fixtureEvents: events });

    const first = await connector.runIncremental(ctx);
    const second = await connector.runIncremental(ctx);

    expect(events.length).toBeGreaterThanOrEqual(5);
    for (const event of events) {
      expect(Number.isFinite(new Date(event.startTime).getTime())).toBe(true);
      expect(Number.isFinite(new Date(event.endTime).getTime())).toBe(true);
    }
    expect(first).toMatchObject({ objectsIngested: events.length, objectsSkipped: 0, errors: 0 });
    expect(second).toMatchObject({ objectsIngested: 0, objectsSkipped: events.length, errors: 0 });
  });
});
