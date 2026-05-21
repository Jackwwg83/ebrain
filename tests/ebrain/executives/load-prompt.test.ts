import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadExecutivePrompt } from '../../../src/ebrain/executives/load-prompt.ts';
import { fakeExecutiveProfile } from './helpers.ts';

const tmpRoots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'ebrain-executive-prompt-'));
  tmpRoots.push(root);
  return root;
}

function write(root: string, relativePath: string, content: string): void {
  const absolutePath = join(root, relativePath);
  mkdirSync(join(absolutePath, '..'), { recursive: true });
  writeFileSync(absolutePath, content);
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('loadExecutivePrompt', () => {
  test('assembles SOUL, USER, AGENT_PERSONA, preferences, and sorted personal skills', async () => {
    const root = makeRoot();
    write(root, 'executives/ceo/SOUL.md', 'SOUL-CONTENT');
    write(root, 'executives/ceo/USER.md', 'USER-CONTENT');
    write(root, 'executives/ceo/AGENT_PERSONA.md', 'PERSONA-CONTENT');
    write(root, 'executives/ceo/preferences.yml', 'tone: concise\nlanguage: zh-CN\n');
    write(root, 'executives/ceo/HEARTBEAT.md', 'DO-NOT-READ');
    write(root, 'executives/ceo/personal-skills/b.md', 'SKILL-B');
    write(root, 'executives/ceo/personal-skills/a.md', 'SKILL-A');
    write(root, 'executives/ceo/personal-skills/ignore.txt', 'IGNORE');

    const prompt = await loadExecutivePrompt(fakeExecutiveProfile(), { rootDir: root });

    const markers = [
      '## SOUL',
      'SOUL-CONTENT',
      '## USER',
      'USER-CONTENT',
      '## AGENT_PERSONA',
      'PERSONA-CONTENT',
      '## PREFERENCES',
      'tone: concise',
      '## PERSONAL_SKILL: a.md',
      'SKILL-A',
      '## PERSONAL_SKILL: b.md',
      'SKILL-B',
    ];
    for (let i = 1; i < markers.length; i++) {
      expect(prompt.indexOf(markers[i - 1])).toBeLessThan(prompt.indexOf(markers[i]));
    }
    expect(prompt).not.toContain('DO-NOT-READ');
    expect(prompt).not.toContain('IGNORE');
  });

  test('uses empty preferences when preferences.yml is missing and caps skills above five', async () => {
    const root = makeRoot();
    write(root, 'executives/ceo/SOUL.md', 'SOUL-CONTENT');
    write(root, 'executives/ceo/USER.md', 'USER-CONTENT');
    write(root, 'executives/ceo/AGENT_PERSONA.md', 'PERSONA-CONTENT');
    for (let i = 1; i <= 6; i++) {
      write(root, `executives/ceo/personal-skills/0${i}.md`, `SKILL-${i}`);
    }

    const prompt = await loadExecutivePrompt(fakeExecutiveProfile(), { rootDir: root });

    expect(prompt).toContain('```yaml\n{}\n```');
    expect(prompt).toContain('SKILL-1');
    expect(prompt).toContain('SKILL-5');
    expect(prompt).not.toContain('SKILL-6');
    expect(prompt).toContain('## MORE\n\n... (more available in personal-skills/)');
  });
});
