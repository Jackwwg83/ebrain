import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';

setDefaultTimeout(20_000);
import { aggregateMessages, DingtalkImConnector } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkImMessage } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
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

describe('DingtalkImConnector', () => {
  test('runs 50-message fixture through thread aggregation and second run is idempotent', async () => {
    const messages = await Bun.file('src/ebrain/apps/dingtalk/fixtures/im-messages.json').json() as DingtalkImMessage[];
    const groups = aggregateMessages(messages);
    const app = makeDingtalkApp({ engine });
    const connector = new DingtalkImConnector(app, { fixtureMessages: messages });

    const first = await connector.runIncremental(ctx);
    const second = await connector.runIncremental(ctx);
    const rows = await engine.executeRaw<{ count: string }>(
      `SELECT count(*)::text AS count FROM enterprise_ingest_objects WHERE ingest_source_id = 'dingtalk-im'`,
    );
    const threadRows = await engine.executeRaw<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM enterprise_ingest_objects
       WHERE ingest_source_id = 'dingtalk-im' AND object_type = 'im-thread'`,
    );

    expect(messages).toHaveLength(50);
    expect(groups.length).toBeLessThan(50);
    expect(first).toMatchObject({ objectsIngested: groups.length, objectsSkipped: 0, errors: 0 });
    expect(second).toMatchObject({ objectsIngested: 0, objectsSkipped: groups.length, errors: 0 });
    expect(Number(rows[0].count)).toBe(groups.length);
    expect(Number(threadRows[0].count)).toBeGreaterThan(0);
  });

  test('incremental reply-only batches merge with existing thread state', async () => {
    const messages = await Bun.file('src/ebrain/apps/dingtalk/fixtures/im-messages.json').json() as DingtalkImMessage[];
    const initial = messages.filter((message) => ['dt-msg-022', 'dt-msg-023'].includes(message.messageId));
    const replyOnly = messages.filter((message) => message.messageId === 'dt-msg-024');
    const app = makeDingtalkApp({ engine });
    const initialConnector = new DingtalkImConnector(app, { fixtureMessages: initial });
    const replyConnector = new DingtalkImConnector(app, { fixtureMessages: replyOnly });

    await initialConnector.runIncremental(ctx);
    const replyResult = await replyConnector.runIncremental(ctx);
    const rows = await engine.executeRaw<{ raw_ref: string | null }>(
      `SELECT raw_ref
       FROM enterprise_ingest_objects
       WHERE ingest_source_id = 'dingtalk-im' AND external_id = 'thread:chain-approval'`,
    );
    const raw = JSON.parse(rows[0].raw_ref ?? '{}') as { messages: DingtalkImMessage[] };

    expect(replyResult.objectsIngested).toBe(1);
    expect(raw.messages.map((message) => message.messageId)).toEqual(['dt-msg-022', 'dt-msg-023', 'dt-msg-024']);
  });

  test('handleWebhookEvent ingests message payload when app has an engine', async () => {
    const messages = await Bun.file('src/ebrain/apps/dingtalk/fixtures/im-messages.json').json() as DingtalkImMessage[];
    const app = makeDingtalkApp({ engine });
    const connector = new DingtalkImConnector(app);

    const result = await connector.handleWebhookEvent({ payload: { message: messages[0] } });

    expect(result).toMatchObject({ objectsIngested: 1, objectsSkipped: 0, errors: 0 });
  });
});
