import type { BrainEngine } from '../../core/engine.ts';
import type { ExecutiveProfile } from '../types.ts';
import { derivePathsFromSoulPath } from './derive-paths.ts';
import {
  EXECUTIVE_SELECT_COLUMNS,
  type ExecutiveRow,
  mapExecutiveRowToProfile,
} from './load-profile.ts';

export interface CreateExecutiveParams {
  executiveId: string;
  email: string;
  displayName: string;
  role: string;
  soulPath: string;
  accessPolicyPath?: string;
  preferences?: Record<string, unknown>;
  timezone?: string;
  locale?: string;
  department?: string | null;
  deputies?: string[];
  feishuUserId?: string | null;
  dingtalkUserId?: string | null;
  wecomUserId?: string | null;
  pushPreferences?: Record<string, unknown>;
  active?: boolean;
}

function assertNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new Error(`${name} is required`);
}

function toPgTextArrayLiteral(items: string[] | undefined): string {
  if (!items?.length) return '{}';
  const escaped = items.map((item) => `"${item.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${escaped.join(',')}}`;
}

export function encodeTextArrayForSql(items: string[] | undefined): string {
  return toPgTextArrayLiteral(items);
}

export async function createExecutive(
  engine: BrainEngine,
  params: CreateExecutiveParams,
): Promise<ExecutiveProfile> {
  assertNonEmpty('executiveId', params.executiveId);
  assertNonEmpty('email', params.email);
  assertNonEmpty('displayName', params.displayName);
  assertNonEmpty('role', params.role);
  assertNonEmpty('soulPath', params.soulPath);

  const accessPolicyPath = params.accessPolicyPath
    ?? derivePathsFromSoulPath(params.soulPath, params.executiveId).agentPersonaPath;

  const rows = await engine.executeRaw<ExecutiveRow>(
    `INSERT INTO executives (
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
       active
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11::text[],
       $12, $13, $14, $15::jsonb, $16
     )
     RETURNING ${EXECUTIVE_SELECT_COLUMNS}`,
    [
      params.executiveId,
      params.email,
      params.displayName,
      params.role,
      params.soulPath,
      accessPolicyPath,
      JSON.stringify(params.preferences ?? {}),
      params.timezone ?? 'Asia/Shanghai',
      params.locale ?? 'zh-CN',
      params.department ?? null,
      toPgTextArrayLiteral(params.deputies),
      params.feishuUserId ?? null,
      params.dingtalkUserId ?? null,
      params.wecomUserId ?? null,
      JSON.stringify(params.pushPreferences ?? {}),
      params.active ?? true,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error('failed to create executive');
  return mapExecutiveRowToProfile(row);
}
