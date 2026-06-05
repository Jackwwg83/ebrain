import type {
  IngestionEvent,
  IngestionSourceContext,
} from '../../../../core/ingestion/types.ts';
import type { ParsedFact } from '../../../../core/facts-fence.ts';
import { BaseEnterpriseIngestionSource } from '../../base/index.ts';
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
    _ctx: IngestionSourceContext,
    cursorState: Record<string, unknown>,
  ): Promise<{ events: IngestionEvent[]; cursorState: Record<string, unknown> }> {
    const messages = await this.loadMessages(cursorState);
    const groups = aggregateMessages(messages);
    return {
      events: groups.map((group) => this.messageGroupToEvent(group)),
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

  private messageGroupToEvent(messages: DingtalkImMessage[]): IngestionEvent {
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

    return this.makeEvent({
      source_uri: `dingtalk://im/${externalId}`,
      content_type: 'text/markdown',
      content: bodyParts.join('\n'),
      trusted: false,
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
