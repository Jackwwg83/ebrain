import { describe, expect, it } from 'bun:test';
import { join } from 'path';
import { pathToFileURL } from 'url';

async function loadScript() {
  const url = pathToFileURL(join(import.meta.dir, '..', 'skills', 'forecast-variance-explainer', 'scripts', 'forecast-variance-explainer.mjs')).href;
  return await import(url) as any;
}

describe('forecast-variance-explainer shell skill', () => {
  it('keeps the I1 script placeholder while SKILL.md and routing fixtures are real', async () => {
    const { run } = await loadScript();
    expect(() => run(null)).toThrow('forecast-variance-explainer scaffold not yet implemented');
  });
});
