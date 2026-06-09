/**
 * Subagent brain-tool registry tests. Covers:
 *   - every allow-list name exists in OPERATIONS (catches renames upstream)
 *   - Anthropic tool-name constraint enforced
 *   - put_page schema is namespace-wrapped per subagent
 *   - execute() invokes the op handler with viaSubagent=true + subagentId
 *   - filterAllowedTools narrows registry + rejects unknown names
 *   - denied ops (file_upload etc.) do NOT appear in the registry
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { PGLiteEngine } from '../src/core/pglite-engine.ts';
import { operations, OperationError } from '../src/core/operations.ts';
import {
  BRAIN_TOOL_ALLOWLIST,
  buildBrainTools,
  filterAllowedTools,
  __testing,
} from '../src/core/minions/tools/brain-allowlist.ts';
import type { GBrainConfig } from '../src/core/config.ts';
import type { ToolCtx } from '../src/core/minions/types.ts';

let engine: PGLiteEngine;
const config: GBrainConfig = { engine: 'pglite' } as GBrainConfig;

beforeAll(async () => {
  engine = new PGLiteEngine();
  await engine.connect({ database_url: '' });
  await engine.initSchema();
}, 60_000); // OAuth v25 + full migration chain needs breathing room

afterAll(async () => {
  if (engine) await engine.disconnect();
}, 60_000);

beforeEach(async () => {
  await engine.executeRaw('DELETE FROM pages');
});

describe('BRAIN_TOOL_ALLOWLIST', () => {
  test('every name exists in src/core/operations.ts OPERATIONS', () => {
    const opNames = new Set(operations.map(o => o.name));
    const missing = [...BRAIN_TOOL_ALLOWLIST].filter(n => !opNames.has(n));
    expect(missing).toEqual([]);
  });

  test('contains the v0.15 read-only 10 + put_page + v0.29 salience pair + v114 list_link_sources', () => {
    // v0.29 added get_recent_salience + find_anomalies (read-only).
    // Ebrain D2 takes_list stays explicit-only, not in the default registry.
    // get_recent_transcripts is deliberately excluded — subagent calls always
    // have ctx.remote=true, and the v0.29 trust gate rejects remote callers.
    // v114 (#1941) added list_link_sources (read-only provenance discovery);
    // the edge-WRITE ops add_link/remove_link stay out (separate trust call).
    expect(BRAIN_TOOL_ALLOWLIST.size).toBe(14);
    expect(BRAIN_TOOL_ALLOWLIST.has('query')).toBe(true);
    expect(BRAIN_TOOL_ALLOWLIST.has('search')).toBe(true);
    expect(BRAIN_TOOL_ALLOWLIST.has('get_page')).toBe(true);
    expect(BRAIN_TOOL_ALLOWLIST.has('takes_list')).toBe(false);
    expect(BRAIN_TOOL_ALLOWLIST.has('list_pages')).toBe(true);
    expect(BRAIN_TOOL_ALLOWLIST.has('put_page')).toBe(true);
    expect(BRAIN_TOOL_ALLOWLIST.has('get_recent_salience')).toBe(true);
    expect(BRAIN_TOOL_ALLOWLIST.has('find_anomalies')).toBe(true);
    expect(BRAIN_TOOL_ALLOWLIST.has('list_link_sources')).toBe(true);
    expect(BRAIN_TOOL_ALLOWLIST.has('add_link')).toBe(false);
    expect(BRAIN_TOOL_ALLOWLIST.has('remove_link')).toBe(false);
    expect(BRAIN_TOOL_ALLOWLIST.has('get_recent_transcripts')).toBe(false);
  });

  test('does NOT contain destructive ops', () => {
    expect(BRAIN_TOOL_ALLOWLIST.has('file_upload')).toBe(false);
    expect(BRAIN_TOOL_ALLOWLIST.has('delete_page')).toBe(false);
    expect(BRAIN_TOOL_ALLOWLIST.has('delete_file')).toBe(false);
    expect(BRAIN_TOOL_ALLOWLIST.has('sync')).toBe(false);
  });
});

describe('buildBrainTools', () => {
  test('produces one ToolDef per allow-listed op that exists in operations.ts', () => {
    const tools = buildBrainTools({ subagentId: 42, engine, config });
    const opNames = new Set(operations.map(o => o.name));
    const expected = [...BRAIN_TOOL_ALLOWLIST].filter(n => opNames.has(n)).length;
    expect(tools.length).toBe(expected);
  });

  test('explicit allowedNames can add Ebrain D2 takes_list without widening the default registry', () => {
    const defaultTools = buildBrainTools({ subagentId: 42, engine, config });
    expect(defaultTools.some(t => t.name === 'brain_takes_list')).toBe(false);

    const tools = buildBrainTools({
      subagentId: 42,
      engine,
      config,
      allowedNames: new Set(['search', 'takes_list']),
      auth: {
        token: 'internal-bot:dingtalk:evt-1',
        clientId: 'bot:dingtalk',
        scopes: ['read'],
        sourceId: 'enterprise',
        allowedSources: ['enterprise'],
      },
    });

    expect(tools.map(t => t.name).sort()).toEqual(['brain_search', 'brain_takes_list']);
  });

  test('explicit takes_list is unavailable without authenticated Ebrain bot context', () => {
    const tools = buildBrainTools({
      subagentId: 42,
      engine,
      config,
      allowedNames: new Set(['takes_list']),
    });

    expect(tools.some(t => t.name === 'brain_takes_list')).toBe(false);
  });

  test('tool names are brain_<op> and match Anthropic constraint', () => {
    const tools = buildBrainTools({ subagentId: 7, engine, config });
    for (const t of tools) {
      expect(t.name).toMatch(__testing.ANTHROPIC_NAME_RE);
      expect(t.name.startsWith('brain_')).toBe(true);
    }
  });

  test('tools are flagged idempotent in v0.15', () => {
    const tools = buildBrainTools({ subagentId: 1, engine, config });
    expect(tools.every(t => t.idempotent === true)).toBe(true);
  });

  test('tools carry the op description verbatim', () => {
    const tools = buildBrainTools({ subagentId: 1, engine, config });
    const getPage = tools.find(t => t.name === 'brain_get_page');
    const op = operations.find(o => o.name === 'get_page');
    expect(getPage?.description).toBe(op!.description);
  });

  test('put_page schema is namespace-wrapped per subagent', () => {
    const tools42 = buildBrainTools({ subagentId: 42, engine, config });
    const putPage42 = tools42.find(t => t.name === 'brain_put_page');
    const slug42 = ((putPage42!.input_schema as any).properties as any).slug;
    expect(slug42.pattern).toBe('^wiki/agents/42/.+');
    expect(slug42.description).toContain('wiki/agents/42/');

    const tools7 = buildBrainTools({ subagentId: 7, engine, config });
    const putPage7 = tools7.find(t => t.name === 'brain_put_page');
    const slug7 = ((putPage7!.input_schema as any).properties as any).slug;
    expect(slug7.pattern).toBe('^wiki/agents/7/.+');
  });

  test('non-put_page tools do NOT get a pattern on slug', () => {
    const tools = buildBrainTools({ subagentId: 42, engine, config });
    const getPage = tools.find(t => t.name === 'brain_get_page');
    const slug = ((getPage!.input_schema as any).properties as any).slug;
    expect(slug).toBeDefined();
    expect(slug.pattern).toBeUndefined();
  });

  test('execute() on put_page with valid namespace slug succeeds', async () => {
    const tools = buildBrainTools({ subagentId: 42, engine, config });
    const putPage = tools.find(t => t.name === 'brain_put_page');
    const ctx: ToolCtx = { engine, jobId: 1, remote: true };
    const res = await putPage!.execute(
      { slug: 'wiki/agents/42/notes', content: '---\ntitle: Notes\n---\nbody' },
      ctx,
    );
    expect(res).toBeTruthy();
  });

  test('execute() on put_page with out-of-namespace slug throws permission_denied', async () => {
    const tools = buildBrainTools({ subagentId: 42, engine, config });
    const putPage = tools.find(t => t.name === 'brain_put_page');
    const ctx: ToolCtx = { engine, jobId: 1, remote: true };
    await expect(
      putPage!.execute(
        { slug: 'wiki/analysis/stomp', content: '---\ntitle: x\n---\nb' },
        ctx,
      ),
    ).rejects.toBeInstanceOf(OperationError);
  });

  test('buildOpContext threads optional Ebrain auth, executive, and sourceId', () => {
    const executive = {
      executiveId: 'exec-1',
      email: 'exec1@example.test',
      displayName: 'Exec One',
      role: 'CEO',
      soulPath: 'executives/exec-1/SOUL.md',
      agentPersonaPath: 'executives/exec-1/AGENT_PERSONA.md',
      userPath: 'executives/exec-1/USER.md',
      preferencesPath: 'executives/exec-1/preferences.yml',
      personalSkillsRoot: 'executives/exec-1/personal-skills',
      subagentName: 'ceo-agent',
      pushPreferences: {},
    };
    const auth = {
      token: 'internal-bot:dingtalk:evt-1',
      clientId: 'bot:dingtalk',
      scopes: ['read'],
      sourceId: 'enterprise',
      allowedSources: ['enterprise'],
      executiveId: 'exec-1',
    };

    const opCtx = __testing.buildOpContext({
      engine,
      config,
      subagentId: 42,
      jobId: 100,
      auth,
      executive,
      sourceId: 'enterprise',
    });

    expect(opCtx.remote).toBe(true);
    expect(opCtx.auth).toBe(auth);
    expect(opCtx.executive).toBe(executive);
    expect(opCtx.sourceId).toBe('enterprise');
    expect(opCtx.takesHoldersAllowList).toEqual(['world']);
  });

  test('execute() on explicit takes_list uses remote-safe holder allow-list', async () => {
    let seenAllowList: string[] | undefined;
    const fakeEngine = {
      async listTakes(opts: { takesHoldersAllowList?: string[] }) {
        seenAllowList = opts.takesHoldersAllowList;
        return [];
      },
    };
    const tools = buildBrainTools({
      subagentId: 1,
      engine: fakeEngine as any,
      config,
      allowedNames: new Set(['takes_list']),
      auth: {
        token: 'internal-bot:dingtalk:evt-1',
        clientId: 'bot:dingtalk',
        scopes: ['read'],
        sourceId: 'enterprise',
        allowedSources: ['enterprise'],
        executiveId: 'exec-1',
      },
      sourceId: 'enterprise',
    });
    const takesList = tools.find(t => t.name === 'brain_takes_list');

    await takesList!.execute({}, { engine: fakeEngine as any, jobId: 1, remote: true });

    expect(seenAllowList).toEqual(['world']);
  });

  test('execute() on explicit takes_list filters rows to authenticated source scope', async () => {
    const fakeEngine = {
      async listTakes() {
        return [
          { id: 1, page_id: 1, page_slug: 'wiki/default', holder: 'world' },
          { id: 2, page_id: 2, page_slug: 'wiki/enterprise', holder: 'world' },
        ];
      },
      async executeRaw(_sql: string, params?: unknown[]) {
        return params?.[0] === 2 && params?.[1] === 'enterprise' ? [{ id: 2 }] : [];
      },
    };
    const tools = buildBrainTools({
      subagentId: 1,
      engine: fakeEngine as any,
      config,
      allowedNames: new Set(['takes_list']),
      auth: {
        token: 'internal-bot:dingtalk:evt-1',
        clientId: 'bot:dingtalk',
        scopes: ['read'],
        sourceId: 'enterprise',
        allowedSources: ['enterprise'],
        executiveId: 'exec-1',
      },
      sourceId: 'enterprise',
    });
    const takesList = tools.find(t => t.name === 'brain_takes_list');

    const result = await takesList!.execute({}, { engine: fakeEngine as any, jobId: 1, remote: true });

    expect(result).toEqual([{ id: 2, page_id: 2, page_slug: 'wiki/enterprise', holder: 'world' }]);
  });

  test('execute() rejects authenticated fuzzy get_page to avoid cross-source slug enumeration', async () => {
    const tools = buildBrainTools({
      subagentId: 1,
      engine,
      config,
      allowedNames: new Set(['get_page']),
      auth: {
        token: 'internal-bot:dingtalk:evt-1',
        clientId: 'bot:dingtalk',
        scopes: ['read'],
        sourceId: 'enterprise',
        allowedSources: ['enterprise'],
        executiveId: 'exec-1',
      },
      sourceId: 'enterprise',
    });
    const getPage = tools.find(t => t.name === 'brain_get_page');

    await expect(
      getPage!.execute(
        { slug: 'ambiguous', fuzzy: true },
        { engine, jobId: 1, remote: true },
      ),
    ).rejects.toThrow(/fuzzy slug resolution/);
  });

  test('execute() rejects source_id override outside authenticated bot source scope', async () => {
    const tools = buildBrainTools({
      subagentId: 1,
      engine,
      config,
      allowedNames: new Set(['query']),
      auth: {
        token: 'internal-bot:dingtalk:evt-1',
        clientId: 'bot:dingtalk',
        scopes: ['read'],
        sourceId: 'enterprise',
        allowedSources: ['enterprise'],
        executiveId: 'exec-1',
      },
      sourceId: 'enterprise',
    });
    const query = tools.find(t => t.name === 'brain_query');

    await expect(
      query!.execute(
        { query: 'anything', source_id: '__all__' },
        { engine, jobId: 1, remote: true },
      ),
    ).rejects.toThrow(/cannot override source_id/);
  });
});

describe('filterAllowedTools', () => {
  test('passes prefixed names through', () => {
    const tools = buildBrainTools({ subagentId: 1, engine, config });
    const filtered = filterAllowedTools(tools, ['brain_get_page', 'brain_search']);
    expect(filtered.map(t => t.name)).toEqual(['brain_get_page', 'brain_search']);
  });

  test('accepts un-prefixed names as a convenience', () => {
    const tools = buildBrainTools({ subagentId: 1, engine, config });
    const filtered = filterAllowedTools(tools, ['get_page', 'search']);
    expect(filtered.map(t => t.name)).toEqual(['brain_get_page', 'brain_search']);
  });

  test('rejects unknown tool names (no silent ignore)', () => {
    const tools = buildBrainTools({ subagentId: 1, engine, config });
    expect(() => filterAllowedTools(tools, ['brain_typo_nope'])).toThrow(/unknown tool/);
  });

  test('skips explicitly future Ebrain tools but still rejects unknown typos', () => {
    const tools = buildBrainTools({
      subagentId: 1,
      engine,
      config,
      allowedNames: new Set([
        'search',
        'query',
        'get_page',
        'takes_list',
        'list_executives',
        'get_executive_context',
      ]),
      auth: {
        token: 'internal-bot:dingtalk:evt-1',
        clientId: 'bot:dingtalk',
        scopes: ['read'],
        sourceId: 'enterprise',
        allowedSources: ['enterprise'],
      },
    });
    const filtered = filterAllowedTools(tools, [
      'search',
      'query',
      'get_page',
      'takes_list',
      'list_executives',
      'get_executive_context',
    ]);

    expect(filtered.map(t => t.name)).toEqual([
      'brain_search',
      'brain_query',
      'brain_get_page',
      'brain_takes_list',
    ]);
    expect(() => filterAllowedTools(tools, ['ghost_tool'])).toThrow(/unknown tool/);
  });

  test('deduplicates when both prefixed + unprefixed given', () => {
    const tools = buildBrainTools({ subagentId: 1, engine, config });
    const filtered = filterAllowedTools(tools, ['brain_get_page', 'get_page']);
    expect(filtered.length).toBe(1);
  });

  test('empty array yields empty registry', () => {
    const tools = buildBrainTools({ subagentId: 1, engine, config });
    expect(filterAllowedTools(tools, [])).toEqual([]);
  });
});

describe('sanitizeToolName', () => {
  test('returns within 64 chars', () => {
    // Synthetic: simulate an op name long enough to need slicing.
    const long = 'a'.repeat(100);
    expect(__testing.sanitizeToolName(long).length).toBeLessThanOrEqual(64);
  });

  test('replaces non-conforming chars with _', () => {
    expect(__testing.sanitizeToolName('foo.bar')).toBe('brain_foo_bar');
  });
});
