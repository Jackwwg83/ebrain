import { describe, expect, test } from 'bun:test';
import type { BrainEngine } from '../../../src/core/engine.ts';
import type { ExecutiveProfile } from '../../../src/ebrain/types.ts';
import {
  _setLoadExecutiveProfileForTest,
  loadExecutiveProfile,
} from '../../../src/ebrain/executives/load-profile.ts';
import { fakeExecutiveProfile, withEngine } from './helpers.ts';

describe('loadExecutiveProfile', () => {
  test('loads a real executives row and derives path fields from soul_path', async () => {
    await withEngine(async (engine) => {
      await engine.executeRaw(
        `INSERT INTO executives (
           executive_id, email, display_name, role, soul_path, access_policy_path,
           timezone, locale, department, deputies, feishu_user_id, push_preferences
         )
         VALUES (
           'ceo', 'ceo@example.test', 'CEO Example', 'CEO',
           'executives/ceo/SOUL.md', 'legacy/access-policy.md',
           'Asia/Tokyo', 'ja-JP', 'Office', '{"coo","cfo"}'::text[],
           'ou_ceo', '{"morning_brief":{"enabled":true,"time":"08:30","channel":"feishu"}}'::jsonb
         )`,
      );

      const profile = await loadExecutiveProfile(engine, 'ceo');
      expect(profile).toMatchObject({
        executiveId: 'ceo',
        email: 'ceo@example.test',
        displayName: 'CEO Example',
        role: 'CEO',
        soulPath: 'executives/ceo/SOUL.md',
        agentPersonaPath: 'executives/ceo/AGENT_PERSONA.md',
        userPath: 'executives/ceo/USER.md',
        preferencesPath: 'executives/ceo/preferences.yml',
        personalSkillsRoot: 'executives/ceo/personal-skills/',
        subagentName: 'ceo',
        timezone: 'Asia/Tokyo',
        locale: 'ja-JP',
        department: 'Office',
        deputies: ['coo', 'cfo'],
        feishuUserId: 'ou_ceo',
      });
      expect(profile?.pushPreferences.morning_brief?.time).toBe('08:30');
    });
  }, 30_000);

  test('filters soft-deleted executives', async () => {
    await withEngine(async (engine) => {
      await engine.executeRaw(
        `INSERT INTO executives (executive_id, email, display_name, role, soul_path, access_policy_path, deleted_at)
         VALUES ('ceo', 'ceo@example.test', 'CEO Example', 'CEO', 'executives/ceo/SOUL.md', 'executives/ceo/AGENT_PERSONA.md', now())`,
      );

      await expect(loadExecutiveProfile(engine, 'ceo')).resolves.toBeNull();
    });
  }, 30_000);

  test('preserves the A3 test seam', async () => {
    const override = fakeExecutiveProfile({ executiveId: 'override' });
    _setLoadExecutiveProfileForTest(async (_engine: BrainEngine, _id: string): Promise<ExecutiveProfile> => override);
    try {
      await withEngine(async (engine) => {
        await expect(loadExecutiveProfile(engine, 'ceo')).resolves.toBe(override);
      });
    } finally {
      _setLoadExecutiveProfileForTest(null);
    }
  }, 30_000);
});
