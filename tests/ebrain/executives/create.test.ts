import { describe, expect, test } from 'bun:test';
import { runExecutives } from '../../../src/commands/executives.ts';
import { createExecutive } from '../../../src/ebrain/executives/create.ts';
import { withEngine } from './helpers.ts';

describe('createExecutive', () => {
  test('inserts an executive and stores derived access_policy_path fallback', async () => {
    await withEngine(async (engine) => {
      const profile = await createExecutive(engine, {
        executiveId: 'ceo',
        email: 'ceo@example.test',
        displayName: 'CEO Example',
        role: 'CEO',
        soulPath: 'executives/ceo/SOUL.md',
      });

      expect(profile.agentPersonaPath).toBe('executives/ceo/AGENT_PERSONA.md');
      const rows = await engine.executeRaw<{ email: string; access_policy_path: string }>(
        `SELECT email, access_policy_path FROM executives WHERE executive_id = 'ceo'`,
      );
      expect(rows[0]).toEqual({
        email: 'ceo@example.test',
        access_policy_path: 'executives/ceo/AGENT_PERSONA.md',
      });
    });
  }, 30_000);

  test('enforces lower(email) uniqueness for active rows', async () => {
    await withEngine(async (engine) => {
      await createExecutive(engine, {
        executiveId: 'ceo',
        email: 'ceo@example.test',
        displayName: 'CEO Example',
        role: 'CEO',
        soulPath: 'executives/ceo/SOUL.md',
      });

      await expect(createExecutive(engine, {
        executiveId: 'coo',
        email: 'CEO@example.test',
        displayName: 'COO Example',
        role: 'COO',
        soulPath: 'executives/coo/SOUL.md',
      })).rejects.toThrow();
    });
  }, 30_000);

  test('CLI create defaults omitted --soul-path to executives/<id>/SOUL.md', async () => {
    await withEngine(async (engine) => {
      const exitCode = await runExecutives(engine, [
        'create',
        'ceo',
        '--email',
        'ceo@example.test',
        '--name',
        'CEO Example',
        '--role',
        'CEO',
      ]);

      expect(exitCode).toBe(0);
      const rows = await engine.executeRaw<{ soul_path: string; access_policy_path: string }>(
        `SELECT soul_path, access_policy_path FROM executives WHERE executive_id = 'ceo'`,
      );
      expect(rows[0]).toEqual({
        soul_path: 'executives/ceo/SOUL.md',
        access_policy_path: 'executives/ceo/AGENT_PERSONA.md',
      });
    });
  }, 30_000);
});
