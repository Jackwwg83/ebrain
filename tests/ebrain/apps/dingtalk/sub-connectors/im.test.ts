import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  validateIngestionEvent,
  type IngestionEvent,
} from '../../../../../src/core/ingestion/types.ts';
import { aggregateMessages, DingtalkImSource } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkImMessage } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
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

describe('DingtalkImSource', () => {
  test('emits aggregated IM events, advances cursor, and calls DingTalk IM API with cursor', async () => {
    const messages = await Bun.file('src/ebrain/apps/dingtalk/fixtures/im-messages.json').json() as DingtalkImMessage[];
    const groups = aggregateMessages(messages);
    const requests: CapturedDingtalkRequest[] = [];
    const emitted: IngestionEvent[] = [];

    await seedDingtalkApp(engine);
    await seedTenantToken(engine, 'tenant-token', '2026-05-20T04:00:00.000Z');

    const app = makeDingtalkApp({
      engine,
      fetch: makeDingtalkListFetch('messages', messages, requests),
    });
    const source = new DingtalkImSource(app);
    await seedDingtalkCursor(engine, {
      sourceId: source.id,
      sourceKind: source.kind,
      cursorState: { lastSyncedAt: '2026-05-20T00:00:00.000Z' },
    });

    await runInitialSourcePoll(source, makeIngestionCtx({ engine, emitted }));

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: 'https://api.dingtalk.com/v1.0/im/groups/messages',
      body: { mode: 'incremental', since: '2026-05-20T00:00:00.000Z' },
    });
    expect(messages).toHaveLength(50);
    expect(groups.length).toBeLessThan(messages.length);
    expect(emitted).toHaveLength(groups.length);
    expect(emitted[0]).toMatchObject({
      source_id: source.id,
      source_kind: 'dingtalk-im',
      source_uri: `dingtalk://im/${messages[0].messageId}`,
      content_type: 'text/markdown',
      untrusted_payload: true,
    });
    expect(emitted.some((event) => event.source_uri === 'dingtalk://im/thread:chain-approval')).toBe(true);
    expect(emitted.some((event) => event.content.includes('DingTalk approval'))).toBe(true);
    expect(validateIngestionEvent(emitted[0])).toBeNull();

    const row = await readDingtalkSourceRow(engine, source.id);
    expect(row.cursorState).toEqual({ lastSyncedAt: latestDingtalkCursor(messages) });
    expect(row.lastSuccessAt).toBeTruthy();
  });
});
