import { describe, expect, it } from 'bun:test';
import { join } from 'path';
import { pathToFileURL } from 'url';

async function loadScript() {
  const url = pathToFileURL(join(import.meta.dir, '..', 'skills', 'capital-allocation-advisor', 'scripts', 'capital-allocation-advisor.mjs')).href;
  return await import(url) as any;
}

describe('capital-allocation-advisor shell skill', () => {
  it('keeps the I1 script placeholder while SKILL.md and routing fixtures are real', async () => {
    const { run } = await loadScript();
    expect(() => run(null)).toThrow('capital-allocation-advisor scaffold not yet implemented');
  });
});
