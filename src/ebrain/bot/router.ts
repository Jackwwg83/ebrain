import type { BrainEngine } from '../../core/engine.ts';
import { MinionQueue } from '../../core/minions/queue.ts';
import { operations, type AuthInfo } from '../../core/operations.ts';
import type { BotAdapter, EnterpriseApp, Event as EnterpriseEvent, IncomingRequest } from '../apps/base/index.ts';
import { EBRAIN_SOURCE_ID } from '../constants.ts';
import type { ExecutiveProfile } from '../types.ts';
import { classifyIntent } from './intent-classifier.ts';

export type ImProvider = 'feishu' | 'dingtalk' | 'wecom' | 'tencent-meeting';

export const BOT_ALLOWED_OP_NAMES = [
  'search',
  'query',
  'get_page',
  'takes_list',
  'list_executives',
  'get_executive_context',
] as const;

export const BOT_ALLOWED_OPS: ReadonlySet<string> = new Set(BOT_ALLOWED_OP_NAMES);

export const IM_ACCESS_DENIED_REPLY = '抱歉，您当前没有 Ebrain 访问权限。';

interface LoggerLike {
  info?(msg: string): void;
  warn?(msg: string): void;
  error?(msg: string): void;
}

export interface ExpressLikeResponse {
  status(code: number): ExpressLikeResponse;
  json?(body: unknown): unknown;
  send?(body?: unknown): unknown;
  end?(body?: unknown): unknown;
}

export interface ImWebhookApp extends Pick<EnterpriseApp, 'webhookHandler' | 'botAdapter' | 'appType' | 'appId'> {}

export interface HandleImWebhookOpts {
  engine: BrainEngine | EngineWithSubmitJob;
  app?: ImWebhookApp | null;
  logger?: LoggerLike;
}

export interface ImDecodedEvent extends EnterpriseEvent {
  sender?: { userId?: string | null };
  senderUserId?: string | null;
  channelId?: string | null;
  messageText?: string | null;
}

export interface ExecutiveActor {
  executive_id: string;
  email?: string | null;
  display_name?: string | null;
  role?: string | null;
  soul_path?: string | null;
  access_policy_path?: string | null;
  timezone?: string | null;
  locale?: string | null;
  department?: string | null;
  deputies?: string[] | null;
  feishu_user_id?: string | null;
  dingtalk_user_id?: string | null;
  wecom_user_id?: string | null;
  push_preferences?: Record<string, unknown> | string | null;
}

export interface BotSubagentJobData extends Record<string, unknown> {
  prompt: string;
  allowed_tools: string[];
  auth: AuthInfo;
  executive: ExecutiveProfile;
  sourceId: typeof EBRAIN_SOURCE_ID;
  ctx: {
    remote: true;
    sourceId: typeof EBRAIN_SOURCE_ID;
  };
  input_vars: {
    provider: ImProvider;
    channel_id: string | null;
    sender_user_id: string;
    event_id: string | null;
    event_type: string | null;
    intent: ReturnType<typeof classifyIntent>;
  };
}

type EngineWithSubmitJob = BrainEngine & {
  submitJob?: (
    job: { name: string; queue?: string; data: Record<string, unknown> },
    trusted: { allowProtectedSubmit: true },
  ) => Promise<unknown>;
};

const IM_USER_ID_COLUMNS: Record<ImProvider, 'feishu_user_id' | 'dingtalk_user_id' | 'wecom_user_id' | null> = {
  feishu: 'feishu_user_id',
  dingtalk: 'dingtalk_user_id',
  wecom: 'wecom_user_id',
  'tencent-meeting': null,
};

let warnedAboutMissingOps = false;

export function warnOnUnregisteredBotAllowedOps(logger: LoggerLike = console): string[] {
  const registered = new Set(operations.map(op => op.name));
  const missing = BOT_ALLOWED_OP_NAMES.filter(name => !registered.has(name));
  if (missing.length > 0 && !warnedAboutMissingOps) {
    warnedAboutMissingOps = true;
    logger.warn?.(
      `BOT_ALLOWED_OPS contains ops not yet registered: ${missing.join(', ')} — expected after Stage G1`,
    );
  }
  return missing;
}

export async function findExecutiveByImUserId(
  engine: BrainEngine,
  provider: ImProvider,
  userId: string,
): Promise<ExecutiveActor | null> {
  const column = IM_USER_ID_COLUMNS[provider];
  if (!column || userId.trim().length === 0) return null;
  const rows = await engine.executeRaw<ExecutiveActor>(
    `SELECT executive_id, email, display_name, role, soul_path, access_policy_path,
            timezone, locale, department, deputies, feishu_user_id, dingtalk_user_id,
            wecom_user_id, push_preferences
     FROM executives
     WHERE ${column} = $1
       AND active = true
       AND deleted_at IS NULL
     LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function handleImWebhook(
  provider: ImProvider,
  req: IncomingRequest,
  res: ExpressLikeResponse,
  opts: HandleImWebhookOpts,
): Promise<unknown> {
  const logger = opts.logger ?? console;
  const app = opts.app;
  if (!app?.webhookHandler || !app.botAdapter) {
    logger.warn?.(`[ebrain bot] ${provider} webhook received but no enabled app/webhook/bot adapter is configured`);
    return sendResponse(res, 503, { ok: false, error: 'provider_not_configured' });
  }

  if (!await app.webhookHandler.verify(req)) {
    return sendResponse(res, 401, { ok: false, error: 'invalid_signature' });
  }

  const event = await app.webhookHandler.decode(req) as ImDecodedEvent;
  const senderUserId = getSenderUserId(event);
  const channelId = getChannelId(event);
  const messageText = getMessageText(event);
  const exec = senderUserId ? await findExecutiveByImUserId(opts.engine, provider, senderUserId) : null;

  if (!exec || !senderUserId) {
    sendBotReply(app.botAdapter, channelId, IM_ACCESS_DENIED_REPLY, logger);
    return sendResponse(res, 200, { ok: true });
  }

  const jobData = buildBotSubagentJobData({ provider, event, exec, senderUserId, channelId, messageText });
  // I-10: ctx.remote=true is preserved in job data for the bot-authorized remote trust path.
  void submitBotSubagentJob(opts.engine, jobData).catch(error => {
    logger.warn?.(`[ebrain bot] failed to enqueue ${provider} subagent job: ${formatError(error)}`);
  });

  return sendResponse(res, 200, { ok: true });
}

export function createWebhookHandler(provider: ImProvider) {
  return (req: IncomingRequest, res: ExpressLikeResponse, opts: HandleImWebhookOpts): Promise<unknown> => (
    handleImWebhook(provider, req, res, opts)
  );
}

export function buildBotSubagentJobData(args: {
  provider: ImProvider;
  event: ImDecodedEvent;
  exec: ExecutiveActor;
  senderUserId: string;
  channelId: string | null;
  messageText: string;
}): BotSubagentJobData {
  const eventId = typeof args.event.eventId === 'string' ? args.event.eventId : null;
  const eventType = typeof args.event.eventType === 'string' ? args.event.eventType : null;
  const auth: AuthInfo = {
    token: `internal-bot:${args.provider}:${eventId ?? 'event'}`,
    clientId: `bot:${args.provider}`,
    clientName: `Ebrain ${args.provider} bot`,
    scopes: ['read'],
    sourceId: EBRAIN_SOURCE_ID,
    allowedSources: [EBRAIN_SOURCE_ID],
    executiveId: args.exec.executive_id,
    executiveEmail: args.exec.email ?? undefined,
    executiveRole: args.exec.role ?? undefined,
  };
  return {
    prompt: args.messageText,
    allowed_tools: Array.from(BOT_ALLOWED_OPS),
    auth,
    executive: buildExecutiveProfile(args.exec),
    sourceId: EBRAIN_SOURCE_ID,
    ctx: {
      remote: true,
      sourceId: EBRAIN_SOURCE_ID,
    },
    input_vars: {
      provider: args.provider,
      channel_id: args.channelId,
      sender_user_id: args.senderUserId,
      event_id: eventId,
      event_type: eventType,
      intent: classifyIntent(args.messageText),
    },
  };
}

function buildExecutiveProfile(exec: ExecutiveActor): ExecutiveProfile {
  const basePath = `executives/${exec.executive_id}`;
  const role = exec.role ?? 'executive';
  const subagentSlug = role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'executive';
  return {
    executiveId: exec.executive_id,
    email: exec.email ?? `${exec.executive_id}@example.invalid`,
    displayName: exec.display_name ?? exec.executive_id,
    role,
    soulPath: exec.soul_path ?? `${basePath}/SOUL.md`,
    agentPersonaPath: exec.access_policy_path ?? `${basePath}/AGENT_PERSONA.md`,
    userPath: `${basePath}/USER.md`,
    preferencesPath: `${basePath}/preferences.yml`,
    personalSkillsRoot: `${basePath}/personal-skills`,
    subagentName: `${subagentSlug}-agent`,
    timezone: exec.timezone ?? undefined,
    locale: exec.locale ?? undefined,
    department: exec.department ?? undefined,
    deputies: exec.deputies ?? undefined,
    feishuUserId: exec.feishu_user_id ?? undefined,
    dingtalkUserId: exec.dingtalk_user_id ?? undefined,
    wecomUserId: exec.wecom_user_id ?? undefined,
    pushPreferences: readPushPreferences(exec.push_preferences),
  };
}

function readPushPreferences(value: ExecutiveActor['push_preferences']): ExecutiveProfile['pushPreferences'] {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as ExecutiveProfile['pushPreferences']
        : {};
    } catch {
      return {};
    }
  }
  return value as ExecutiveProfile['pushPreferences'];
}

export async function submitBotSubagentJob(
  engine: BrainEngine | EngineWithSubmitJob,
  data: BotSubagentJobData,
): Promise<unknown> {
  const trusted = { allowProtectedSubmit: true } as const;
  const submitJob = (engine as EngineWithSubmitJob).submitJob;
  if (typeof submitJob === 'function') {
    return submitJob.call(engine, { name: 'subagent', queue: 'default', data }, trusted);
  }
  const queue = new MinionQueue(engine as BrainEngine);
  return queue.add('subagent', data, { queue: 'default' }, trusted);
}

function getSenderUserId(event: ImDecodedEvent): string | null {
  const nested = event.sender?.userId;
  if (typeof nested === 'string' && nested.trim().length > 0) return nested;
  if (typeof event.senderUserId === 'string' && event.senderUserId.trim().length > 0) return event.senderUserId;
  const payload = asRecord(event.payload);
  const message = asRecord(payload.message) ?? payload;
  return readNestedString(message, ['sender', 'userId'])
    ?? readNestedString(message, ['sender', 'user_id'])
    ?? firstString(message, [
      'senderUserId',
      'sender_user_id',
      'userId',
      'user_id',
      'senderId',
      'sender_id',
      'fromUserId',
    ]);
}

function getChannelId(event: ImDecodedEvent): string | null {
  if (typeof event.channelId === 'string' && event.channelId.trim().length > 0) return event.channelId;
  const payload = asRecord(event.payload);
  const message = asRecord(payload.message) ?? payload;
  return firstString(message, [
    'channelId',
    'channel_id',
    'conversationId',
    'conversation_id',
    'chatId',
    'ChatId',
    'openConversationId',
  ]);
}

function getMessageText(event: ImDecodedEvent): string {
  if (typeof event.messageText === 'string') return event.messageText;
  const payload = asRecord(event.payload);
  const message = asRecord(payload.message) ?? payload;
  return firstString(message, ['messageText', 'message_text', 'text', 'content', 'bodyMarkdown'])
    ?? readNestedString(message, ['content', 'text'])
    ?? '';
}

function sendBotReply(adapter: BotAdapter, channelId: string | null, markdown: string, logger: LoggerLike): void {
  if (!channelId) return;
  void adapter.sendReply(channelId, { markdown }).catch(error => {
    logger.warn?.(`[ebrain bot] failed to send friendly reject reply: ${formatError(error)}`);
  });
}

function sendResponse(res: ExpressLikeResponse, status: number, body: unknown): unknown {
  const target = res.status(status) ?? res;
  if (typeof target.json === 'function') return target.json(body);
  if (typeof target.send === 'function') return target.send(body);
  if (typeof target.end === 'function') return target.end();
  return target;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return null;
}

function readNestedString(record: Record<string, unknown>, path: readonly string[]): string | null {
  let value: unknown = record;
  for (const key of path) {
    const current = asRecord(value);
    value = current[key];
  }
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}
