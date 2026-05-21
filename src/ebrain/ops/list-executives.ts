import type { Operation } from '../../core/operations.ts';
import { LIST_EXECUTIVES_DESCRIPTION } from '../../core/operations-descriptions.ts';
import type { BrainEngine } from '../../core/engine.ts';
import type { ExecutiveProfile } from '../types.ts';
import {
  EXECUTIVE_SELECT_COLUMNS,
  listExecutiveProfiles,
  mapExecutiveRowToProfile,
  type ExecutiveRow,
} from '../executives/load-profile.ts';

export interface SanitizedExecutiveProfile {
  executiveId: string;
  email: string;
  displayName: string;
  role: string;
  timezone?: string;
  feishuUserId?: string;
  dingtalkUserId?: string;
  wecomUserId?: string;
  pushPreferences?: {
    morning_brief?: {
      enabled: boolean;
      channel: 'feishu' | 'dingtalk' | 'wecom';
    };
    critical_signal?: {
      enabled: boolean;
    };
    conflict_alert?: {
      enabled: boolean;
    };
  };
}

async function operationError(code: string, message: string): Promise<never> {
  const { OperationError } = await import('../../core/operations.ts');
  throw new OperationError(code, message);
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.trunc(value);
}

function sanitizePushPreferences(
  value: ExecutiveProfile['pushPreferences'],
): SanitizedExecutiveProfile['pushPreferences'] | undefined {
  const out: NonNullable<SanitizedExecutiveProfile['pushPreferences']> = {};
  const morningBrief = value.morning_brief;
  if (morningBrief) {
    out.morning_brief = {
      enabled: morningBrief.enabled,
      channel: morningBrief.channel,
    };
  }

  const criticalSignal = value.critical_signal;
  if (criticalSignal) {
    out.critical_signal = {
      enabled: criticalSignal.enabled,
    };
  }

  const conflictAlert = value.conflict_alert;
  if (conflictAlert) {
    out.conflict_alert = {
      enabled: conflictAlert.enabled,
    };
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

export function sanitizeExecutiveProfile(
  profile: ExecutiveProfile,
): SanitizedExecutiveProfile {
  const sanitized: SanitizedExecutiveProfile = {
    executiveId: profile.executiveId,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
  };

  if (profile.timezone) sanitized.timezone = profile.timezone;
  if (profile.feishuUserId) sanitized.feishuUserId = profile.feishuUserId;
  if (profile.dingtalkUserId) sanitized.dingtalkUserId = profile.dingtalkUserId;
  if (profile.wecomUserId) sanitized.wecomUserId = profile.wecomUserId;

  const pushPreferences = sanitizePushPreferences(profile.pushPreferences);
  if (pushPreferences) sanitized.pushPreferences = pushPreferences;

  return sanitized;
}

async function listAllExecutiveProfiles(engine: BrainEngine): Promise<ExecutiveProfile[]> {
  const rows = await engine.executeRaw<ExecutiveRow>(
    `SELECT ${EXECUTIVE_SELECT_COLUMNS}
       FROM executives
      WHERE deleted_at IS NULL
      ORDER BY executive_id ASC`,
  );
  return rows.map(mapExecutiveRowToProfile);
}

export const list_executives: Operation = {
  name: 'list_executives',
  description: LIST_EXECUTIVES_DESCRIPTION,
  scope: 'read',
  localOnly: false,
  mutating: false,
  params: {
    active_only: {
      type: 'boolean',
      default: true,
      description: 'When false, include inactive non-deleted executives. Default true.',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of executives to return.',
    },
  },
  handler: async (ctx, p) => {
    const limit = parseLimit(p.limit);
    if (p.limit !== undefined && limit === undefined) {
      await operationError('invalid_params', 'limit must be a non-negative number');
    }

    const activeOnly = p.active_only !== false;
    const profiles = activeOnly
      ? await listExecutiveProfiles(ctx.engine)
      : await listAllExecutiveProfiles(ctx.engine);
    const limited = limit === undefined ? profiles : profiles.slice(0, limit);
    return limited.map(sanitizeExecutiveProfile);
  },
};
