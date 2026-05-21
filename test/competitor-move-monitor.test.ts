import { describe, expect, it } from 'bun:test';
import { join } from 'path';
import { pathToFileURL } from 'url';

async function loadScript() {
  const url = pathToFileURL(join(import.meta.dir, '..', 'skills', 'competitor-move-monitor', 'scripts', 'competitor-move-monitor.mjs')).href;
  return await import(url) as any;
}

describe('competitor-move-monitor shell skill', () => {
  it('keeps the I1 script placeholder while SKILL.md and routing fixtures are real', async () => {
    const { run } = await loadScript();
    expect(() => run(null)).toThrow('competitor-move-monitor scaffold not yet implemented');
  });
});
