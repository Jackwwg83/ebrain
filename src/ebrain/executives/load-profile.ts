import type { BrainEngine } from '../../core/engine.ts';
import type { ExecutiveProfile } from '../types.ts';
import { derivePathsFromSoulPath } from './derive-paths.ts';

type ExecutiveProfileLoader = (
  engine: BrainEngine,
  executiveId: string,
) => Promise<ExecutiveProfile | null>;

let testLoader: ExecutiveProfileLoader | null = null;

export const EXECUTIVE_SELECT_COLUMNS = `
  executive_id,
  email,
  display_name,
  role,
  soul_path,
  access_policy_path,
  preferences,
  timezone,
  locale,
  department,
  deputies,
  feishu_user_id,
  dingtalk_user_id,
  wecom_user_id,
  push_preferences,
  active,
  created_at,
  updated_at
`;

export interface ExecutiveRow {
  executive_id: string;
  email: string;
  display_name: string;
  role: string;
  soul_path: string;
  access_policy_path: string;
  preferences: unknown;
  timezone: string | null;
  locale: string | null;
  department: string | null;
  deputies: unknown;
  feishu_user_id: string | null;
  dingtalk_user_id: string | null;
  wecom_user_id: string | null;
  push_preferences: unknown;
  active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function parseTextArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed || trimmed === '{}') return [];
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
  }
  return [trimmed];
}

function optionalString(value: string | null): string | undefined {
  return value === null ? undefined : value;
}

export function mapExecutiveRowToProfile(row: ExecutiveRow): ExecutiveProfile {
  const derived = derivePathsFromSoulPath(row.soul_path, row.executive_id);

  return {
    executiveId: row.executive_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    soulPath: row.soul_path,
    agentPersonaPath: derived.agentPersonaPath,
    userPath: derived.userPath,
    preferencesPath: derived.preferencesPath,
    personalSkillsRoot: derived.personalSkillsRoot,
    subagentName: derived.subagentName,
    timezone: optionalString(row.timezone),
    locale: optionalString(row.locale),
    department: optionalString(row.department),
    deputies: parseTextArray(row.deputies),
    feishuUserId: optionalString(row.feishu_user_id),
    dingtalkUserId: optionalString(row.dingtalk_user_id),
    wecomUserId: optionalString(row.wecom_user_id),
    pushPreferences: parseJsonRecord(row.push_preferences) as ExecutiveProfile['pushPreferences'],
  };
}

export async function loadExecutiveProfile(
  engine: BrainEngine,
  executiveId: string,
): Promise<ExecutiveProfile | null> {
  if (testLoader) return testLoader(engine, executiveId);
  const rows = await engine.executeRaw<ExecutiveRow>(
    `SELECT ${EXECUTIVE_SELECT_COLUMNS}
     FROM executives
     WHERE executive_id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [executiveId],
  );
  const row = rows[0];
  return row ? mapExecutiveRowToProfile(row) : null;
}

export async function listExecutiveProfiles(
  engine: BrainEngine,
): Promise<ExecutiveProfile[]> {
  const rows = await engine.executeRaw<ExecutiveRow>(
    `SELECT ${EXECUTIVE_SELECT_COLUMNS}
     FROM executives
     WHERE deleted_at IS NULL AND active = true
     ORDER BY executive_id ASC`,
  );
  return rows.map(mapExecutiveRowToProfile);
}

export function _setLoadExecutiveProfileForTest(loader: ExecutiveProfileLoader | null): void {
  testLoader = loader;
}
