import type { OperationContext } from '../../../../core/operations.ts';
import type { EnterpriseConnector, EnterpriseIngestObject, EnterpriseIngestResult } from '../../base/index.ts';
import { upsertEnterpriseObject } from '../../../sources/ingest-common.ts';
import { markIngestError, checkCircuit, resetCircuit } from '../../../sources/circuit-breaker.ts';
import { emitFactFence } from '../../../sources/transformers/fact-fence-emitter.ts';
import type { ParsedFact } from '../../../../core/facts-fence.ts';
import type { DingtalkEnterpriseApp } from '../app.ts';
import type { DingtalkImMessage } from '../types.ts';
import { fetchDingtalkRecords, isoCursor, requireDingtalkString, runDingtalkConnectorLoad } from './common.ts';

const ENDPOINT = '/v1.0/im/groups/messages';
const SOURCE_ID = 'dingtalk-im';

function threadKeyFor(message: DingtalkImMessage): string {
  return message.replyChainId ?? message.parentMessageId ?? message.messageId;
}

export interface DingtalkImConnectorOptions {
  fixtureMessages?: DingtalkImMessage[];
}

export class DingtalkImConnector implements EnterpriseConnector {
  readonly name = SOURCE_ID;
  readonly app: DingtalkEnterpriseApp;
  private readonly fixtureMessages?: DingtalkImMessage[];

  constructor(app: DingtalkEnterpriseApp, opts: DingtalkImConnectorOptions = {}) {
    this.app = app;
    this.fixtureMessages = opts.fixtureMessages;
  }

  async runIncremental(ctx: OperationContext): Promise<EnterpriseIngestResult> {
    return this.ingestMessages(ctx, () => this.loadMessages({ mode: 'incremental' }));
  }

  async runBackfill(ctx: OperationContext, opts: { since?: string }): Promise<EnterpriseIngestResult> {
    return this.ingestMessages(ctx, () => this.loadMessages({ mode: 'backfill', since: opts.since }));
  }

  async handleWebhookEvent(event: { payload: unknown }): Promise<EnterpriseIngestResult> {
    const payload = event.payload as { message?: DingtalkImMessage; messages?: DingtalkImMessage[] };
    const messages = payload.messages ?? (payload.message ? [payload.message] : []);
    const ctx = this.app.operationContext();
    if (!ctx) return { objectsIngested: 0, objectsSkipped: messages.length, errors: 1 };
    return this.ingestMessages(ctx, async () => messages);
  }

  async transform(raw: unknown): Promise<EnterpriseIngestObject> {
    return messageGroupToObject([raw as DingtalkImMessage]);
  }

  private async ingestMessages(ctx: OperationContext, load: () => Promise<DingtalkImMessage[]>): Promise<EnterpriseIngestResult> {
    return runDingtalkConnectorLoad({
      ctx,
      app: this.app,
      sourceId: SOURCE_ID,
      displayName: 'DingTalk IM',
      load: async () => aggregateMessages(await load()),
      transform: (group) => this.messageGroupToObjectWithExisting(ctx, group),
      cursorForRecords: (groups) => isoCursor(groups.flat()),
      upsertEnterpriseObject,
      markIngestError,
      checkCircuit,
      resetCircuit,
    });
  }

  private async messageGroupToObjectWithExisting(
    ctx: OperationContext,
    group: DingtalkImMessage[],
  ): Promise<EnterpriseIngestObject> {
    const candidate = messageGroupToObject(group);
    if (candidate.objectType !== 'im-thread') return candidate;
    const rows = await ctx.engine.executeRaw<{ raw_ref: string | null }>(
      `SELECT raw_ref
       FROM enterprise_ingest_objects
       WHERE ingest_source_id = $1 AND external_id = $2`,
      [SOURCE_ID, candidate.externalId],
    );
    let prior = parsePriorMessages(rows[0]?.raw_ref);
    if (prior.length === 0 && group[0]?.parentMessageId) {
      const rootRows = await ctx.engine.executeRaw<{ raw_ref: string | null }>(
        `SELECT raw_ref
         FROM enterprise_ingest_objects
         WHERE ingest_source_id = $1 AND external_id = $2`,
        [SOURCE_ID, group[0].parentMessageId],
      );
      prior = parsePriorMessages(rootRows[0]?.raw_ref);
    }
    if (prior.length === 0) return candidate;
    return messageGroupToObject(mergeMessages(prior, group), String(candidate.metadata?.thread_key ?? threadKeyFor(group[0]!)));
  }

  private async loadMessages(args: { mode: 'incremental' | 'backfill'; since?: string }): Promise<DingtalkImMessage[]> {
    if (this.fixtureMessages) return this.fixtureMessages;
    return fetchDingtalkRecords<DingtalkImMessage>(
      this.app,
      ENDPOINT,
      { mode: args.mode, since: args.since },
      (payload) => extractArray<DingtalkImMessage>(payload, ['messages', 'items']),
    );
  }
}

export function aggregateMessages(messages: DingtalkImMessage[]): DingtalkImMessage[][] {
  const byThread = new Map<string, DingtalkImMessage[]>();
  for (const message of messages) {
    const key = threadKeyFor(message);
    const current = byThread.get(key) ?? [];
    current.push(message);
    byThread.set(key, current);
  }
  return [...byThread.values()].map((group) => group.sort((a, b) => a.createTime.localeCompare(b.createTime)));
}

function messageGroupToObject(messages: DingtalkImMessage[], forcedThreadKey?: string): EnterpriseIngestObject {
  const first = messages[0];
  if (!first) throw new Error('Cannot transform empty DingTalk IM message group');
  for (const message of messages) {
    requireDingtalkString(message.messageId, 'messageId');
    requireDingtalkString(message.conversationId, 'conversationId');
    requireDingtalkString(message.senderUserId, 'senderUserId');
    requireDingtalkString(message.createTime, 'createTime');
  }
  const threadKey = forcedThreadKey ?? threadKeyFor(first);
  const isThread = messages.length > 1 || Boolean(first.parentMessageId || first.replyChainId);
  const workflows = messages.flatMap((message) => message.workflow ? [message.workflow] : []);
  const bodyParts = [
    `# ${first.conversationTitle ?? 'DingTalk conversation'}`,
    '',
    ...messages.map((message) => renderMessage(message)),
  ];
  const facts = approvalFacts(messages);
  if (facts.length > 0) bodyParts.push('', emitFactFence(facts));

  return {
    sourceId: SOURCE_ID,
    sourceType: 'dingtalk',
    externalId: isThread ? `thread:${threadKey}` : first.messageId,
    objectType: isThread ? 'im-thread' : 'im-message',
    title: isThread
      ? `${first.conversationTitle ?? first.conversationId} thread ${threadKey}`
      : `${first.conversationTitle ?? first.conversationId} message ${first.messageId}`,
    bodyMarkdown: bodyParts.join('\n'),
    modifiedAt: messages[messages.length - 1].createTime,
    url: first.url,
    participants: unique(messages.map((message) => message.senderUserId)),
    classification: 'L1',
    raw: { messages },
    metadata: {
      vendor: 'dingtalk',
      conversation_id: first.conversationId,
      thread_key: threadKey,
      message_ids: messages.map((message) => message.messageId),
      workflows,
    },
  };
}

function parsePriorMessages(rawRef: string | null | undefined): DingtalkImMessage[] {
  if (!rawRef) return [];
  try {
    const parsed = JSON.parse(rawRef) as { messages?: DingtalkImMessage[] };
    return Array.isArray(parsed.messages) ? parsed.messages : [];
  } catch {
    return [];
  }
}

function mergeMessages(existing: DingtalkImMessage[], incoming: DingtalkImMessage[]): DingtalkImMessage[] {
  const byId = new Map<string, DingtalkImMessage>();
  for (const message of [...existing, ...incoming]) byId.set(message.messageId, message);
  return [...byId.values()].sort((a, b) => a.createTime.localeCompare(b.createTime));
}

function renderMessage(message: DingtalkImMessage): string {
  const author = message.senderName ?? message.senderUserId;
  const text = message.text ?? `[${message.msgtype ?? 'unsupported'} message]`;
  const workflow = message.workflow
    ? `\n  - approval: ${message.workflow.title} (${message.workflow.status})`
    : '';
  return `- ${message.createTime} ${author}: ${text}${workflow}`;
}

function approvalFacts(messages: DingtalkImMessage[]): ParsedFact[] {
  return messages.flatMap((message, index) => {
    if (!message.workflow) return [];
    return [{
      rowNum: index + 1,
      claim: `DingTalk approval ${message.workflow.title} status is ${message.workflow.status}`,
      kind: 'event',
      confidence: 0.85,
      visibility: 'private',
      notability: 'medium',
      validFrom: message.createTime.slice(0, 10),
      source: SOURCE_ID,
      context: `approvalId=${message.workflow.approvalId}`,
      active: true,
    } satisfies ParsedFact];
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function extractArray<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(record[key])) return record[key] as T[];
      const result = record.result;
      if (result && typeof result === 'object' && Array.isArray((result as Record<string, unknown>)[key])) {
        return (result as Record<string, unknown>)[key] as T[];
      }
    }
  }
  throw new Error(`DingTalk payload missing expected array field: ${keys.join(', ')}`);
}
