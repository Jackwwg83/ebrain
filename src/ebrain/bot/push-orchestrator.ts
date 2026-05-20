import type { BrainEngine } from '../../core/engine.ts';
import type { EnterpriseApp, PushContent } from '../apps/base/index.ts';
import type { ImProvider } from './router.ts';
import { loadEnabledEnterpriseApps } from '../webhook/server.ts';

export type PushKind = 'morning_brief' | 'critical_signal' | 'conflict_alert';

interface ExecutivePushRow {
  executive_id: string;
  feishu_user_id: string | null;
  dingtalk_user_id: string | null;
  wecom_user_id: string | null;
  push_preferences: Record<string, unknown> | string | null;
}

interface PushRoute {
  provider?: ImProvider;
  channel?: 'user' | 'channel';
  user_id?: string;
  channel_id?: string;
  disabled_at?: string | null;
}

interface PushOrchestratorOpts {
  apps?: Map<string, EnterpriseApp>;
  logger?: { warn?(msg: string): void };
}

export interface PushResult {
  pushed: boolean;
  skipped: boolean;
  reason?: string;
  provider?: string;
  channel?: string;
}

export async function pushMorningBrief(
  engine: BrainEngine,
  executiveId: string,
  content: string | PushContent,
  opts: PushOrchestratorOpts = {},
): Promise<PushResult> {
  return pushForKind(engine, executiveId, 'morning_brief', content, opts);
}

export async function pushCriticalSignal(
  engine: BrainEngine,
  executiveId: string,
  content: string | PushContent,
  opts: PushOrchestratorOpts = {},
): Promise<PushResult> {
  return pushForKind(engine, executiveId, 'critical_signal', content, opts);
}

export async function pushConflictAlert(
  engine: BrainEngine,
  executiveId: string,
  content: string | PushContent,
  opts: PushOrchestratorOpts = {},
): Promise<PushResult> {
  return pushForKind(engine, executiveId, 'conflict_alert', content, opts);
}

async function pushForKind(
  engine: BrainEngine,
  executiveId: string,
  kind: PushKind,
  content: string | PushContent,
  opts: PushOrchestratorOpts,
): Promise<PushResult> {
  const row = await loadExecutivePushRow(engine, executiveId);
  if (!row) return { pushed: false, skipped: true, reason: 'executive_not_found' };

  const preferences = parsePreferences(row.push_preferences);
  const route = readRoute(preferences[kind]);
  const provider = route.provider ?? inferProvider(row);
  if (!provider) return { pushed: false, skipped: true, reason: 'provider_not_configured' };
  if (isDisabled(route) || isDisabled(readRoute(preferences[provider]))) {
    return { pushed: false, skipped: true, reason: 'push_disabled', provider };
  }

  const apps = opts.apps ?? await loadEnabledEnterpriseApps(engine, opts.logger);
  const app = apps.get(provider);
  if (!app?.botAdapter || !app.pushEnabled) {
    return { pushed: false, skipped: true, reason: 'app_push_unavailable', provider };
  }

  const pushContent = normalizeContent(kind, content);
  if ((route.channel ?? 'user') === 'channel') {
    const channelId = route.channel_id;
    if (!channelId) return { pushed: false, skipped: true, reason: 'channel_missing', provider };
    await app.botAdapter.pushToChannel(channelId, pushContent);
    return { pushed: true, skipped: false, provider, channel: 'channel' };
  }

  const userId = route.user_id ?? providerUserId(row, provider);
  if (!userId) return { pushed: false, skipped: true, reason: 'user_missing', provider };
  await app.botAdapter.pushToUser(userId, pushContent);
  return { pushed: true, skipped: false, provider, channel: 'user' };
}

async function loadExecutivePushRow(engine: BrainEngine, executiveId: string): Promise<ExecutivePushRow | null> {
  const rows = await engine.executeRaw<ExecutivePushRow>(
    `SELECT executive_id, feishu_user_id, dingtalk_user_id, wecom_user_id, push_preferences
     FROM executives
     WHERE executive_id = $1
       AND active = true
       AND deleted_at IS NULL
     LIMIT 1`,
    [executiveId],
  );
  return rows[0] ?? null;
}

function parsePreferences(value: ExecutivePushRow['push_preferences']): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return value;
}

function readRoute(value: unknown): PushRoute {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as PushRoute : {};
}

function isDisabled(route: PushRoute): boolean {
  return typeof route.disabled_at === 'string' && route.disabled_at.length > 0;
}

function inferProvider(row: ExecutivePushRow): ImProvider | null {
  if (row.dingtalk_user_id) return 'dingtalk';
  if (row.feishu_user_id) return 'feishu';
  if (row.wecom_user_id) return 'wecom';
  return null;
}

function providerUserId(row: ExecutivePushRow, provider: string): string | null {
  if (provider === 'dingtalk') return row.dingtalk_user_id;
  if (provider === 'feishu') return row.feishu_user_id;
  if (provider === 'wecom') return row.wecom_user_id;
  return null;
}

function normalizeContent(kind: PushKind, content: string | PushContent): PushContent {
  if (typeof content !== 'string') return content;
  const subject = kind === 'morning_brief'
    ? 'Morning brief'
    : kind === 'critical_signal'
      ? 'Critical signal'
      : 'Conflict alert';
  return { subject, bodyMarkdown: content, urgency: kind === 'morning_brief' ? 'low' : 'high' };
}
