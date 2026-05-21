import type { BrainEngine } from '../../core/engine.ts';
import type { ExecutiveProfile } from '../types.ts';
import { derivePathsFromSoulPath } from './derive-paths.ts';
import {
  EXECUTIVE_SELECT_COLUMNS,
  type ExecutiveRow,
  mapExecutiveRowToProfile,
} from './load-profile.ts';
import { encodeTextArrayForSql } from './create.ts';

export interface UpdateExecutivePatch {
  email?: string;
  displayName?: string;
  role?: string;
  soulPath?: string;
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

type ColumnPatch =
  | { column: string; value: unknown; cast?: string }
  | null;

function patchToColumn(key: keyof UpdateExecutivePatch, value: unknown): ColumnPatch {
  switch (key) {
    case 'email':
      return { column: 'email', value };
    case 'displayName':
      return { column: 'display_name', value };
    case 'role':
      return { column: 'role', value };
    case 'soulPath':
      return { column: 'soul_path', value };
    case 'accessPolicyPath':
      return { column: 'access_policy_path', value };
    case 'preferences':
      return { column: 'preferences', value: JSON.stringify(value ?? {}), cast: '::jsonb' };
    case 'timezone':
      return { column: 'timezone', value };
    case 'locale':
      return { column: 'locale', value };
    case 'department':
      return { column: 'department', value: value ?? null };
    case 'deputies':
      return { column: 'deputies', value: encodeTextArrayForSql(value as string[] | undefined), cast: '::text[]' };
    case 'feishuUserId':
      return { column: 'feishu_user_id', value: value ?? null };
    case 'dingtalkUserId':
      return { column: 'dingtalk_user_id', value: value ?? null };
    case 'wecomUserId':
      return { column: 'wecom_user_id', value: value ?? null };
    case 'pushPreferences':
      return { column: 'push_preferences', value: JSON.stringify(value ?? {}), cast: '::jsonb' };
    case 'active':
      return { column: 'active', value };
  }
}

export async function updateExecutive(
  engine: BrainEngine,
  executiveId: string,
  patch: UpdateExecutivePatch,
): Promise<ExecutiveProfile | null> {
  const normalizedPatch: UpdateExecutivePatch = { ...patch };
  if (normalizedPatch.soulPath && !normalizedPatch.accessPolicyPath) {
    normalizedPatch.accessPolicyPath = derivePathsFromSoulPath(
      normalizedPatch.soulPath,
      executiveId,
    ).agentPersonaPath;
  }

  const values: unknown[] = [];
  const sets: string[] = [];
  for (const [key, value] of Object.entries(normalizedPatch) as [keyof UpdateExecutivePatch, unknown][]) {
    if (value === undefined) continue;
    const columnPatch = patchToColumn(key, value);
    if (!columnPatch) continue;
    values.push(columnPatch.value);
    sets.push(`${columnPatch.column} = $${values.length}${columnPatch.cast ?? ''}`);
  }

  if (sets.length === 0) throw new Error('at least one update field is required');

  values.push(executiveId);
  const rows = await engine.executeRaw<ExecutiveRow>(
    `UPDATE executives
     SET ${sets.join(', ')}, updated_at = now()
     WHERE executive_id = $${values.length} AND deleted_at IS NULL
     RETURNING ${EXECUTIVE_SELECT_COLUMNS}`,
    values,
  );
  const row = rows[0];
  return row ? mapExecutiveRowToProfile(row) : null;
}
