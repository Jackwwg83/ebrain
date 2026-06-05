import { setDefaultTimeout, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { aggregateMessages, DingtalkImSource } from '../../../../../src/ebrain/apps/dingtalk/index.ts';
import type { DingtalkImMessage } from '../../../../../src/ebrain/apps/dingtalk/types.ts';
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

describe('DingtalkImSource', () => {
  test('writes aggregated IM enterprise objects, advances cursor, and calls DingTalk IM API with cursor', async () => {
    const messages = await Bun.file('src/ebrain/apps/dingtalk/fixtures/im-messages.json').json() as DingtalkImMessage[];
    const groups = aggregateMessages(messages);
    const requests: CapturedDingtalkRequest[] = [];

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

    await runInitialSourcePoll(source, makeIngestionCtx({ engine }));

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: 'https://api.dingtalk.com/v1.0/im/groups/messages',
      body: { mode: 'incremental', since: '2026-05-20T00:00:00.000Z' },
    });
    expect(messages).toHaveLength(50);
    expect(groups.length).toBeLessThan(messages.length);
    expect(await countEnterpriseObjects(engine, source.id)).toBe(groups.length);
    const singleSlug = dingtalkEnterpriseSlug(source.id, messages[0].messageId);
    const singleObject = await readEnterpriseObjectRow(engine, {
      sourceId: source.id,
      externalId: messages[0].messageId,
    });
    expect(singleObject).toMatchObject({
      externalId: messages[0].messageId,
      objectType: 'im-message',
      pageSlug: singleSlug,
      status: 'ingested',
    });
    expect(singleObject.metadata).toMatchObject({
      slug: singleSlug,
      external_id: messages[0].messageId,
      object_type: 'im-message',
      source_type: 'dingtalk',
      raw_ref: `dingtalk://im/${messages[0].messageId}`,
      participants: [messages[0].senderUserId],
    });

    const threadObject = await readEnterpriseObjectRow(engine, {
      sourceId: source.id,
      externalId: 'thread:chain-approval',
    });
    expect(threadObject.objectType).toBe('im-thread');
    const threadPage = await readEnterprisePage(engine, threadObject.pageSlug);
    expect(threadPage.compiledTruth).toContain('DingTalk approval');
    expect(threadPage.frontmatter).toMatchObject({
      external_id: 'thread:chain-approval',
      object_type: 'im-thread',
      classification: 'L1',
    });

    const row = await readDingtalkSourceRow(engine, source.id);
    expect(row.cursorState).toEqual({ lastSyncedAt: latestDingtalkCursor(messages) });
    expect(row.lastSuccessAt).toBeTruthy();
  });

  test('merges IM thread raw_messages across polls by message id', async () => {
    const first: DingtalkImMessage = {
      messageId: 'dt-thread-msg-1',
      conversationId: 'dt-conv-r1',
      conversationTitle: 'R1 thread',
      senderUserId: 'user-a',
      createTime: '2026-05-20T10:00:00.000Z',
      msgtype: 'text',
      text: 'first poll message',
      replyChainId: 'chain-r1',
      parentMessageId: 'dt-thread-msg-1',
      url: 'https://dingtalk.example.com/conversation/r1/messages/1',
      raw: { sequence: 1 },
    };
    const second: DingtalkImMessage = {
      messageId: 'dt-thread-msg-2',
      conversationId: 'dt-conv-r1',
      conversationTitle: 'R1 thread',
      senderUserId: 'user-b',
      createTime: '2026-05-20T10:05:00.000Z',
      msgtype: 'text',
      text: 'second poll message',
      replyChainId: 'chain-r1',
      parentMessageId: 'dt-thread-msg-1',
      url: 'https://dingtalk.example.com/conversation/r1/messages/2',
      raw: { sequence: 2 },
    };
    const batches = [[first], [second]];
    const requests: CapturedDingtalkRequest[] = [];

    await seedDingtalkApp(engine);
    await seedTenantToken(engine, 'tenant-token', '2026-05-20T04:00:00.000Z');

    const app = makeDingtalkApp({
      engine,
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        requests.push({
          url: String(input),
          body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>,
          headers: Object.fromEntries(headers.entries()),
        });
        return Response.json({ messages: batches[Math.min(requests.length - 1, batches.length - 1)] });
      },
    });
    const source = new DingtalkImSource(app);

    await runInitialSourcePoll(source, makeIngestionCtx({ engine }));
    const firstObject = await readEnterpriseObjectRow(engine, {
      sourceId: source.id,
      externalId: 'thread:chain-r1',
    });
    expect(rawMessageIds(firstObject.rawRef)).toEqual(['dt-thread-msg-1']);

    await runInitialSourcePoll(source, makeIngestionCtx({ engine }));

    expect(requests).toHaveLength(2);
    const mergedObject = await readEnterpriseObjectRow(engine, {
      sourceId: source.id,
      externalId: 'thread:chain-r1',
    });
    expect(rawMessageIds(mergedObject.rawRef)).toEqual(['dt-thread-msg-1', 'dt-thread-msg-2']);
    expect(mergedObject.metadata).toMatchObject({
      message_count: 2,
      message_ids: ['dt-thread-msg-1', 'dt-thread-msg-2'],
      participants: ['user-a', 'user-b'],
    });
    const page = await readEnterprisePage(engine, dingtalkEnterpriseSlug(source.id, 'thread:chain-r1'));
    expect(page.compiledTruth).toContain('first poll message');
    expect(page.compiledTruth).toContain('second poll message');
    expect(await countEnterpriseObjects(engine, source.id)).toBe(1);
  });
});

function rawMessageIds(rawRef: string | null): string[] {
  if (!rawRef) return [];
  const raw = JSON.parse(rawRef) as { raw_messages?: Array<{ messageId?: string }> };
  return (raw.raw_messages ?? [])
    .map((message) => message.messageId)
    .filter((messageId): messageId is string => typeof messageId === 'string');
}
