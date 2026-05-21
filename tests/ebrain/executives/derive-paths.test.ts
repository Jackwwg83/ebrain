import { describe, expect, test } from 'bun:test';
import { derivePathsFromSoulPath } from '../../../src/ebrain/executives/derive-paths.ts';

describe('derivePathsFromSoulPath', () => {
  test('derives sibling executive files from SOUL.md path', () => {
    expect(derivePathsFromSoulPath('executives/ceo/SOUL.md', 'ceo')).toEqual({
      agentPersonaPath: 'executives/ceo/AGENT_PERSONA.md',
      userPath: 'executives/ceo/USER.md',
      preferencesPath: 'executives/ceo/preferences.yml',
      personalSkillsRoot: 'executives/ceo/personal-skills/',
      subagentName: 'ceo',
    });
  });

  test('uses executive_id as subagentName and normalizes backslashes', () => {
    expect(derivePathsFromSoulPath('executives\\cto\\SOUL.md', 'cto').subagentName).toBe('cto');
    expect(derivePathsFromSoulPath('executives\\cto\\SOUL.md', 'cto').userPath).toBe('executives/cto/USER.md');
  });

  test('supports root-level SOUL.md paths', () => {
    expect(derivePathsFromSoulPath('SOUL.md', 'founder')).toEqual({
      agentPersonaPath: 'AGENT_PERSONA.md',
      userPath: 'USER.md',
      preferencesPath: 'preferences.yml',
      personalSkillsRoot: 'personal-skills/',
      subagentName: 'founder',
    });
  });

  test('rejects non-SOUL.md basenames', () => {
    expect(() => derivePathsFromSoulPath('executives/ceo', 'ceo')).toThrow(
      'soul_path basename must be SOUL.md, got: ceo',
    );
    expect(() => derivePathsFromSoulPath('executives/ceo/README.md', 'ceo')).toThrow(
      'soul_path basename must be SOUL.md, got: README.md',
    );
  });
});
