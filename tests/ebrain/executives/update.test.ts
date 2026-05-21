import { describe, expect, test } from 'bun:test';
import { createExecutive } from '../../../src/ebrain/executives/create.ts';
import { updateExecutive } from '../../../src/ebrain/executives/update.ts';
import { withEngine } from './helpers.ts';

describe('updateExecutive', () => {
  test('applies patches and bumps updated_at on non-deleted executives', async () => {
    await withEngine(async (engine) => {
      await createExecutive(engine, {
        executiveId: 'ceo',
        email: 'ceo@example.test',
        displayName: 'CEO Example',
        role: 'CEO',
        soulPath: 'executives/ceo/SOUL.md',
      });
      await engine.executeRaw(
        `UPDATE executives SET updated_at = '2020-01-01T00:00:00Z'::timestamptz WHERE executive_id = 'ceo'`,
      );

      const profile = await updateExecutive(engine, 'ceo', {
        displayName: 'Updated CEO',
        timezone: 'Asia/Tokyo',
        deputies: ['coo', 'cfo'],
      });

      expect(profile).toMatchObject({
        executiveId: 'ceo',
        displayName: 'Updated CEO',
        timezone: 'Asia/Tokyo',
        deputies: ['coo', 'cfo'],
      });
      const rows = await engine.executeRaw<{ updated_at: string | Date; display_name: string }>(
        `SELECT updated_at, display_name FROM executives WHERE executive_id = 'ceo'`,
      );
      expect(new Date(rows[0].updated_at).getTime()).toBeGreaterThan(new Date('2020-01-01T00:00:00Z').getTime());
      expect(rows[0].display_name).toBe('Updated CEO');
    });
  }, 30_000);

  test('returns null for soft-deleted executives', async () => {
    await withEngine(async (engine) => {
      await createExecutive(engine, {
        executiveId: 'ceo',
        email: 'ceo@example.test',
        displayName: 'CEO Example',
        role: 'CEO',
        soulPath: 'executives/ceo/SOUL.md',
      });
      await engine.executeRaw(`UPDATE executives SET deleted_at = now() WHERE executive_id = 'ceo'`);

      await expect(updateExecutive(engine, 'ceo', { timezone: 'Asia/Tokyo' })).resolves.toBeNull();
    });
  }, 30_000);
});
