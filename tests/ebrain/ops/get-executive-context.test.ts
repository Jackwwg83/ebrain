import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BrainEngine } from '../../../src/core/engine.ts';
import type { OperationContext } from '../../../src/core/operations.ts';
import {
  _setLoadExecutiveProfileForTest,
} from '../../../src/ebrain/executives/load-profile.ts';
import { get_executive_context } from '../../../src/ebrain/ops/get-executive-context.ts';
import { fakeExecutiveProfile } from '../executives/helpers.ts';

const cleanup: string[] = [];

function logger(): OperationContext['logger'] {
  return { info() {}, warn() {}, error() {} };
}

function makeCtx(remote: boolean): OperationContext {
  return {
    engine: {} as BrainEngine,
    config: { engine: 'pglite' },
    logger: logger(),
    dryRun: false,
    remote,
    sourceId: 'enterprise',
  };
}

function makeExecutiveDir(): string {
  const root = mkdtempSync(join(tmpdir(), 'ebrain-g1-exec-'));
  cleanup.push(root);
  mkdirSync(join(root, 'personal-skills'));
  writeFileSync(join(root, 'SOUL.md'), 'Soul body\n');
  writeFileSync(join(root, 'USER.md'), 'User body\n');
  writeFileSync(join(root, 'AGENT_PERSONA.md'), 'Persona body\n');
  writeFileSync(join(root, 'preferences.yml'), 'tone: direct\n');
  writeFileSync(join(root, 'personal-skills', 'briefing.md'), 'Briefing skill\n');
  return root;
}

afterEach(() => {
  _setLoadExecutiveProfileForTest(null);
  while (cleanup.length > 0) {
    const root = cleanup.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('get_executive_context operation', () => {
  test('declares read scope and returns redacted profile plus assembled prompt for remote callers', async () => {
    expect(get_executive_context.scope).toBe('read');
    expect(get_executive_context.localOnly).toBe(false);

    const root = makeExecutiveDir();
    _setLoadExecutiveProfileForTest(async () => fakeExecutiveProfile({
      soulPath: join(root, 'SOUL.md'),
      userPath: join(root, 'USER.md'),
      agentPersonaPath: join(root, 'AGENT_PERSONA.md'),
      preferencesPath: join(root, 'preferences.yml'),
      personalSkillsRoot: join(root, 'personal-skills'),
      pushPreferences: {
        morning_brief: { enabled: true, time: '08:30', channel: 'feishu' },
        critical_signal: { enabled: true, min_severity: 2, quiet_hours: '22:00-07:00' },
      },
    }));

    const result = await get_executive_context.handler(makeCtx(true), { executive_id: 'ceo' }) as {
      profile: Record<string, unknown>;
      prompt: string;
    };

    expect(result.profile).toMatchObject({
      executiveId: 'ceo',
      email: 'ceo@example.test',
      displayName: 'CEO Example',
      role: 'CEO',
      pushPreferences: {
        morning_brief: { enabled: true, channel: 'feishu' },
        critical_signal: { enabled: true, min_severity: 2 },
      },
    });
    expect(result.profile.soulPath).toBeUndefined();
    expect(result.profile.preferencesPath).toBeUndefined();
    expect(JSON.stringify(result.profile)).not.toContain('quiet_hours');
    expect(JSON.stringify(result.profile)).not.toContain('08:30');
    expect(result.prompt).toContain('## SOUL');
    expect(result.prompt).toContain('Soul body');
    expect(result.prompt).toContain('## USER');
    expect(result.prompt).toContain('## AGENT_PERSONA');
    expect(result.prompt).toContain('## PREFERENCES');
    expect(result.prompt).toContain('## PERSONAL_SKILL: briefing.md');
  });

  test('returns not_found when the executive id is missing', async () => {
    _setLoadExecutiveProfileForTest(async () => null);

    let caught: unknown;
    try {
      await get_executive_context.handler(makeCtx(true), { executive_id: 'missing' });
    } catch (error) {
      caught = error;
    }

    expect((caught as { code?: string }).code).toBe('not_found');
    expect((caught as Error).message).toBe('executive_id missing not found');
  });
});
