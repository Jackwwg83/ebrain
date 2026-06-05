import type { IngestionSourceContext } from '../../../../core/ingestion/types.ts';
import type { ParsedFact } from '../../../../core/facts-fence.ts';
import { BaseEnterpriseIngestionSource, type EnterpriseIngestObject } from '../../base/index.ts';
import { emitFactFence } from '../../../sources/transformers/fact-fence-emitter.ts';
import type { DingtalkEnterpriseApp } from '../app.ts';
import type { DingtalkImMessage } from '../types.ts';
import {
  cursorSince,
  cursorStateFor,
  extractArray,
  fetchDingtalkRecords,
  requireDingtalkString,
  sourceFetchMode,
  type DingtalkSourceOptions,
} from './common.ts';

const ENDPOINT = '/v1.0/im/groups/messages';
const SOURCE_KIND = 'dingtalk-im';

function threadKeyFor(message: DingtalkImMessage): string {
  return message.replyChainId ?? message.parentMessageId ?? message.messageId;
}

export interface DingtalkImSourceOptions extends DingtalkSourceOptions {
  fixtureMessages?: DingtalkImMessage[];
}

export class DingtalkImSource extends BaseEnterpriseIngestionSource {
  private readonly dingtalkApp: DingtalkEnterpriseApp;
  private readonly fixtureMessages?: DingtalkImMessage[];
  private readonly initialSince?: string;

  constructor(app: DingtalkEnterpriseApp, opts: DingtalkImSourceOptions = {}) {
    super({
      id: `${SOURCE_KIND}:${app.appId}`,
      kind: SOURCE_KIND,
      app,
      pollIntervalMs: opts.pollIntervalMs,
      mode: opts.mode,
    });
    this.dingtalkApp = app;
    this.fixtureMessages = opts.fixtureMessages;
    this.initialSince = opts.since;
  }

  protected async pollOnce(
    ctx: IngestionSourceContext,
    cursorState: Record<string, unknown>,
  ): Promise<{ objects: EnterpriseIngestObject[]; cursorState: Record<string, unknown> }> {
    const messages = await this.loadMessages(cursorState);
    const groups = aggregateMessages(messages);
    const objects: EnterpriseIngestObject[] = [];
    for (const group of groups) {
      objects.push(await this.messageGroupToObjectWithExisting(ctx, group));
    }
    return {
      objects,
      cursorState: cursorStateFor(messages),
    };
  }

  private async loadMessages(cursorState: Record<string, unknown>): Promise<DingtalkImMessage[]> {
    if (this.fixtureMessages) return this.fixtureMessages;
    return fetchDingtalkRecords<DingtalkImMessage>(
      this.dingtalkApp,
      ENDPOINT,
      {
        mode: sourceFetchMode(this.mode),
        since: cursorSince(cursorState, this.initialSince),
      },
      (payload) => extractArray<DingtalkImMessage>(payload, ['messages', 'items']),
    );
  }

  private async messageGroupToObjectWithExisting(
    ctx: IngestionSourceContext,
    messages: DingtalkImMessage[],
  ): Promise<EnterpriseIngestObject> {
    const externalId = externalIdForMessages(messages);
    const existing = await this.loadExistingRawMessages(ctx, externalId);
    return this.messageGroupToObject(mergeMessagesById(existing, messages));
  }

  private async loadExistingRawMessages(
    ctx: IngestionSourceContext,
    externalId: string,
  ): Promise<DingtalkImMessage[]> {
    const rows = await ctx.engine.executeRaw<{ raw_ref: unknown }>(
      `SELECT raw_ref
       FROM enterprise_ingest_objects
       WHERE ingest_source_id = $1 AND external_id = $2`,
      [this.id, externalId],
    );
    return rawMessagesFromRawRef(rows[0]?.raw_ref);
  }

  private messageGroupToObject(messages: DingtalkImMessage[]): EnterpriseIngestObject {
    const first = messages[0];
    if (!first) throw new Error('Cannot transform empty DingTalk IM message group');
    for (const message of messages) {
      requireDingtalkString(message.messageId, 'messageId');
      requireDingtalkString(message.conversationId, 'conversationId');
      requireDingtalkString(message.senderUserId, 'senderUserId');
      requireDingtalkString(message.createTime, 'createTime');
    }

    const threadKey = threadKeyFor(first);
    const isThread = messages.length > 1 || Boolean(first.parentMessageId || first.replyChainId);
    const externalId = isThread ? `thread:${threadKey}` : first.messageId;
    const workflows = messages.flatMap((message) => message.workflow ? [message.workflow] : []);
    const participants = participantsForMessages(messages);
    const modifiedAt = messages
      .map((message) => message.createTime)
      .sort()
      .at(-1);
    const bodyParts = [
      `# ${first.conversationTitle ?? 'DingTalk conversation'}`,
      '',
      ...messages.map((message) => renderMessage(message)),
    ];
    const facts = approvalFacts(messages);
    if (facts.length > 0) bodyParts.push('', emitFactFence(facts));
    if (workflows.length > 0) {
      bodyParts.push('', `Workflows: ${workflows.map((workflow) => workflow.approvalId).join(', ')}`);
    }

    return this.makeEnterpriseObject({
      externalId,
      objectType: isThread ? 'im-thread' : 'im-message',
      title: first.conversationTitle ?? `DingTalk IM ${externalId}`,
      bodyMarkdown: bodyParts.join('\n'),
      modifiedAt,
      url: first.url,
      participants,
      classification: 'L1',
      raw: {
        conversation_id: first.conversationId,
        thread_key: threadKey,
        raw_messages: messages,
      },
      rawRef: `dingtalk://im/${externalId}`,
      metadata: {
        dingtalk_object: isThread ? 'im-thread' : 'im-message',
        conversation_id: first.conversationId,
        conversation_title: first.conversationTitle ?? null,
        thread_key: threadKey,
        message_count: messages.length,
        message_ids: messages.map((message) => message.messageId),
        workflow_ids: workflows.map((workflow) => workflow.approvalId),
      },
    });
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

function externalIdForMessages(messages: DingtalkImMessage[]): string {
  const first = messages[0];
  if (!first) throw new Error('Cannot derive external id for empty DingTalk IM message group');
  const threadKey = threadKeyFor(first);
  const isThread = messages.length > 1 || Boolean(first.parentMessageId || first.replyChainId);
  return isThread ? `thread:${threadKey}` : first.messageId;
}

function mergeMessagesById(
  existing: DingtalkImMessage[],
  incoming: DingtalkImMessage[],
): DingtalkImMessage[] {
  const byId = new Map<string, DingtalkImMessage>();
  for (const message of [...existing, ...incoming]) {
    byId.set(message.messageId, message);
  }
  return [...byId.values()].sort((a, b) => a.createTime.localeCompare(b.createTime));
}

function rawMessagesFromRawRef(rawRef: unknown): DingtalkImMessage[] {
  if (rawRef === null || rawRef === undefined) return [];
  let parsed: unknown = rawRef;
  if (typeof rawRef === 'string') {
    try {
      parsed = JSON.parse(rawRef);
    } catch {
      return [];
    }
  }
  if (!parsed || typeof parsed !== 'object') return [];
  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.raw_messages)) return [];
  return record.raw_messages.filter(isDingtalkImMessage);
}

function isDingtalkImMessage(value: unknown): value is DingtalkImMessage {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.messageId === 'string'
    && typeof record.conversationId === 'string'
    && typeof record.senderUserId === 'string'
    && typeof record.createTime === 'string';
}

function participantsForMessages(messages: DingtalkImMessage[]): string[] {
  const participants = new Set<string>();
  for (const message of messages) {
    participants.add(message.senderUserId);
    if (message.workflow?.requesterUserId) {
      participants.add(message.workflow.requesterUserId);
    }
    for (const approverUserId of message.workflow?.approverUserIds ?? []) {
      participants.add(approverUserId);
    }
  }
  return [...participants];
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
      source: SOURCE_KIND,
      context: `approvalId=${message.workflow.approvalId}`,
      active: true,
    } satisfies ParsedFact];
  });
}
