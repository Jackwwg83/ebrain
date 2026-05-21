import { describe, expect, it } from 'bun:test';
import { join } from 'path';
import { pathToFileURL } from 'url';

async function loadScript() {
  const url = pathToFileURL(join(import.meta.dir, '..', 'skills', 'board-deck-generator', 'scripts', 'board-deck-generator.mjs')).href;
  return await import(url) as any;
}

describe('board-deck-generator shell skill', () => {
  it('keeps the I1 script placeholder while SKILL.md and routing fixtures are real', async () => {
    const { run } = await loadScript();
    expect(() => run(null)).toThrow('board-deck-generator scaffold not yet implemented');
  });
});
