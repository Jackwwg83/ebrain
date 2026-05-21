import { describe, expect, it } from 'bun:test';
import { join } from 'path';
import { pathToFileURL } from 'url';

async function loadScript() {
  const url = pathToFileURL(join(import.meta.dir, '..', 'skills', 'org-memory-synthesizer', 'scripts', 'org-memory-synthesizer.mjs')).href;
  return await import(url) as any;
}

describe('org-memory-synthesizer shell skill', () => {
  it('keeps the I1 script placeholder while SKILL.md and routing fixtures are real', async () => {
    const { run } = await loadScript();
    expect(() => run(null)).toThrow('org-memory-synthesizer scaffold not yet implemented');
  });
});
