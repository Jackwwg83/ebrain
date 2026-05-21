import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createExecutive } from '../../../src/ebrain/executives/create.ts';
import { auditExecutive } from '../../../src/ebrain/executives/soul-audit-enterprise.ts';
import { withEngine } from './helpers.ts';

const tmpRoots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'ebrain-executive-audit-'));
  tmpRoots.push(root);
  return root;
}

function write(root: string, relativePath: string): void {
  const absolutePath = join(root, relativePath);
  mkdirSync(join(absolutePath, '..'), { recursive: true });
  writeFileSync(absolutePath, relativePath);
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('auditExecutive', () => {
  test('passes when SOUL, USER, AGENT_PERSONA, and preferences files exist', async () => {
    const root = makeRoot();
    for (const file of [
      'executives/ceo/SOUL.md',
      'executives/ceo/USER.md',
      'executives/ceo/AGENT_PERSONA.md',
      'executives/ceo/preferences.yml',
    ]) write(root, file);

    await withEngine(async (engine) => {
      await createExecutive(engine, {
        executiveId: 'ceo',
        email: 'ceo@example.test',
        displayName: 'CEO Example',
        role: 'CEO',
        soulPath: 'executives/ceo/SOUL.md',
      });

      const result = await auditExecutive(engine, 'ceo', { rootDir: root });
      expect(result.ok).toBe(true);
      expect(result.files.map((file) => [file.label, file.exists])).toEqual([
        ['SOUL', true],
        ['USER', true],
        ['AGENT_PERSONA', true],
        ['PREFERENCES', true],
      ]);
    });
  }, 30_000);

  test('fails when one of the required four files is missing', async () => {
    const root = makeRoot();
    for (const file of [
      'executives/ceo/SOUL.md',
      'executives/ceo/USER.md',
      'executives/ceo/AGENT_PERSONA.md',
    ]) write(root, file);

    await withEngine(async (engine) => {
      await createExecutive(engine, {
        executiveId: 'ceo',
        email: 'ceo@example.test',
        displayName: 'CEO Example',
        role: 'CEO',
        soulPath: 'executives/ceo/SOUL.md',
      });

      const result = await auditExecutive(engine, 'ceo', { rootDir: root });
      expect(result.ok).toBe(false);
      expect(result.files.find((file) => file.label === 'PREFERENCES')?.exists).toBe(false);
    });
  }, 30_000);
});
