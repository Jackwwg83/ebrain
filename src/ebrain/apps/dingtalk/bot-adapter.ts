import type { BrainEngine } from '../../../core/engine.ts';
import type { BotAdapter, MentionEvent, PushContent, Reply } from '../base/index.ts';
import { dingtalkRateKey } from './rate-limit.ts';
import { defaultFetch, endpointUrl, normalizeBaseUrl, type FetchLike } from './types.ts';
import type { DingtalkEnterpriseApp } from './app.ts';

const ROBOT_GROUP_MESSAGE_ENDPOINT = '/v1.0/robot/groupMessages/send';
const WORK_NOTIFICATION_ENDPOINT = '/v1.0/notification/asyncSendV2';

export interface DingtalkBotAdapterConfig {
  app: DingtalkEnterpriseApp;
  engine?: BrainEngine;
  apiBaseUrl?: string;
  fetch?: FetchLike;
  now?: () => Date;
}

interface DingtalkApiErrorPayload {
  errcode?: string | number;
  errorCode?: string | number;
  code?: string | number;
  errmsg?: string;
  message?: string;
  [key: string]: unknown;
}

export class DingtalkBotAdapter implements BotAdapter {
  private readonly app: DingtalkEnterpriseApp;
  private readonly engine?: BrainEngine;
  private readonly apiBaseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => Date;
  private readonly mentionHandlers: Array<(event: MentionEvent) => Promise<Reply>> = [];

  constructor(config: DingtalkBotAdapterConfig) {
    this.app = config.app;
    this.engine = config.engine;
    this.apiBaseUrl = normalizeBaseUrl(config.apiBaseUrl);
    this.fetchImpl = config.fetch ?? defaultFetch();
    this.now = config.now ?? (() => new Date());
  }

  onMention(handler: (event: MentionEvent) => Promise<Reply>): void {
    this.mentionHandlers.push(handler);
  }

  async sendReply(channelId: string, reply: Reply): Promise<void> {
    await this.sendGroupMarkdown(channelId, reply.markdown ?? renderCards(reply.cards));
  }

  async pushToUser(userId: string, content: PushContent): Promise<void> {
    if (await this.isDingtalkPushDisabled(userId)) return;
    const payload = {
      toUserId: userId,
      msg: {
        msgtype: 'markdown',
        markdown: {
          title: content.subject,
          text: this.toDingtalkMarkdown(content.bodyMarkdown),
        },
      },
      metadata: { urgency: content.urgency },
    };
    const responsePayload = await this.postDingtalk(WORK_NOTIFICATION_ENDPOINT, payload, {
      allowFailurePayload: true,
      userId,
    });
    if (isDisabledNotificationPayload(responsePayload)) {
      await this.markDingtalkPushDisabled(userId);
      return;
    }
    if (isErrorPayload(responsePayload)) {
      throw new Error(`DingTalk work notification failed: ${JSON.stringify(responsePayload)}`);
    }
  }

  async pushToChannel(channelId: string, content: PushContent): Promise<void> {
    await this.sendGroupMarkdown(channelId, `## ${content.subject}\n\n${content.bodyMarkdown}`);
  }

  async dispatchMention(event: MentionEvent): Promise<Reply[]> {
    const replies: Reply[] = [];
    for (const handler of this.mentionHandlers) replies.push(await handler(event));
    return replies;
  }

  private async sendGroupMarkdown(channelId: string, markdown: string): Promise<void> {
    await this.postDingtalk(ROBOT_GROUP_MESSAGE_ENDPOINT, {
      openConversationId: channelId,
      sendBizType: 'cardWithBindMethod',
      msgKey: 'sampleMarkdown',
      msgParam: JSON.stringify({
        title: 'Ebrain',
        text: this.toDingtalkMarkdown(markdown),
      }),
    });
  }

  private async postDingtalk(
    endpoint: string,
    body: unknown,
    opts: { allowFailurePayload?: boolean; userId?: string } = {},
  ): Promise<DingtalkApiErrorPayload> {
    await this.app.rateLimiter.acquire([
      dingtalkRateKey('app', this.app.appKey, endpoint),
      ...(this.app.corpId ? [dingtalkRateKey('tenant', this.app.corpId, endpoint)] : []),
      ...(opts.userId ? [dingtalkRateKey('user', opts.userId, endpoint)] : []),
    ]);
    const token = await this.app.tokenManager.getToken('tenant_access', this.app.corpId);
    const response = await this.fetchImpl(endpointUrl(this.apiBaseUrl, endpoint), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-acs-dingtalk-access-token': token,
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({})) as DingtalkApiErrorPayload;
    if (!response.ok && !opts.allowFailurePayload) {
      throw new Error(`DingTalk API ${endpoint} failed: ${response.status} ${JSON.stringify(payload)}`);
    }
    return payload;
  }

  private toDingtalkMarkdown(markdown: string): string {
    return markdown
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\n{4,}/g, '\n\n\n')
      .slice(0, 18_000);
  }

  private async isDingtalkPushDisabled(userId: string): Promise<boolean> {
    if (!this.engine) return false;
    const rows = await this.engine.executeRaw<{ push_preferences: Record<string, unknown> | string | null }>(
      `SELECT push_preferences
       FROM executives
       WHERE (dingtalk_user_id = $1 OR executive_id = $1) AND deleted_at IS NULL
       LIMIT 1`,
      [userId],
    );
    const prefs = rows[0]?.push_preferences;
    const parsed = typeof prefs === 'string' ? JSON.parse(prefs) : (prefs ?? {});
    const disabledAt = (parsed.dingtalk as { disabled_at?: unknown } | undefined)?.disabled_at;
    return typeof disabledAt === 'string' && disabledAt.length > 0;
  }

  private async markDingtalkPushDisabled(userId: string): Promise<void> {
    if (!this.engine) return;
    const rows = await this.engine.executeRaw<{
      executive_id: string;
      push_preferences: Record<string, unknown> | string | null;
    }>(
      `SELECT executive_id, push_preferences
       FROM executives
       WHERE (dingtalk_user_id = $1 OR executive_id = $1) AND deleted_at IS NULL
       LIMIT 1`,
      [userId],
    );
    const row = rows[0];
    if (!row) return;
    const current = typeof row.push_preferences === 'string'
      ? JSON.parse(row.push_preferences)
      : (row.push_preferences ?? {});
    const next = {
      ...current,
      dingtalk: {
        ...((current.dingtalk as Record<string, unknown> | undefined) ?? {}),
        disabled_at: this.now().toISOString(),
      },
    };
    await this.engine.executeRaw(
      `UPDATE executives
       SET push_preferences = $2::jsonb, updated_at = now()
       WHERE executive_id = $1`,
      [row.executive_id, JSON.stringify(next)],
    );
  }
}

function renderCards(cards: unknown[] | undefined): string {
  if (!cards || cards.length === 0) return '';
  return cards.map((card) => JSON.stringify(card)).join('\n\n');
}

function isDisabledNotificationPayload(payload: DingtalkApiErrorPayload): boolean {
  const text = `${payload.errcode ?? ''} ${payload.errorCode ?? ''} ${payload.code ?? ''} ${payload.errmsg ?? ''} ${payload.message ?? ''}`.toLowerCase();
  return text.includes('disabled') || text.includes('disable_notification') || text.includes('user_disabled_notification');
}

function isErrorPayload(payload: DingtalkApiErrorPayload): boolean {
  const code = payload.errcode ?? payload.errorCode ?? payload.code;
  return code !== undefined && String(code) !== '0' && String(code).toLowerCase() !== 'ok';
}
