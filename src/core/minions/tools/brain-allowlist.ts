/**
 * Derive the subagent brain-tool registry from src/core/operations.ts.
 *
 * Single source of truth: the MCP server already maps OPERATIONS → tool defs.
 * We reuse the same ParamDef-shape → JSONSchema conversion (lives in
 * buildToolDefs for MCP) and wrap each allowed op with an execute() that
 * invokes its handler under a subagent-tagged OperationContext.
 *
 * Filtering is NAME-based (not by OperationContext.remote, which is a
 * call-time flag, not operation metadata — codex catch). The allow-list
 * below is reviewed manually; adding a new op here is an explicit security
 * decision.
 *
 * put_page: allowed, but the subagent tool-schema wraps its `slug` with a
 * per-subagent namespace regex so the model can only write under
 * `wiki/agents/<subagentId>/...`. The put_page operation also has a server-
 * side fail-closed check (see src/core/operations.ts) that catches any
 * dispatcher bug where viaSubagent=true but subagentId is missing.
 *
 * In v0.15 every allow-list op is treated as idempotent for the two-phase
 * replay path. put_page with a deterministic slug is idempotent at the row
 * level; repeats re-derive the same embedding over identical content.
 */

import type { BrainEngine } from '../../engine.ts';
import type { GBrainConfig } from '../../config.ts';
import { OperationError, operations } from '../../operations.ts';
import type { AuthInfo, Operation, OperationContext } from '../../operations.ts';
import type { ExecutiveProfile } from '../../types.ts';
import { paramDefToSchema } from '../../../mcp/tool-defs.ts';
import type { ToolCtx, ToolDef } from '../types.ts';

/**
 * v0.15 brain-tool allow-list. Review carefully when extending. Op names
 * verified against origin/master:src/core/operations.ts (post shell-jobs +
 * Knowledge Runtime).
 *
 * Read-only (all safe):
 *   query, search, get_page, list_pages, file_list, file_url,
 *   get_backlinks, traverse_graph, resolve_slugs, get_ingest_log
 *
 * Conditional write:
 *   put_page (namespace-enforced by the tool schema + server-side check)
 *
 * Every name below MUST exist in src/core/operations.ts OPERATIONS; the
 * brain-allowlist test pins this invariant so an upstream rename fails CI
 * instead of silently dropping a tool.
 */
export const BRAIN_TOOL_ALLOWLIST: ReadonlySet<string> = new Set([
  'query',
  'search',
  'get_page',
  'list_pages',
  'file_list',
  'file_url',
  'get_backlinks',
  'traverse_graph',
  // v114 (#1941): read-only provenance discovery. Edge-WRITE ops (add_link /
  // remove_link) are deliberately NOT allowlisted — exposing graph writes to
  // subagents is a separate trust decision.
  'list_link_sources',
  'resolve_slugs',
  'get_ingest_log',
  'put_page',
  // v0.29 — Salience + Anomaly Detection. Both read-only. `get_recent_transcripts`
  // is intentionally NOT included: subagent calls always have ctx.remote=true,
  // and the v0.29 trust gate rejects remote callers — adding it here would be
  // a footgun (subagent calls op, gets permission_denied, looks like a bug).
  // The cycle synthesize phase already calls discoverTranscripts directly.
  'get_recent_salience',
  'find_anomalies',
]);

// Extra operations that stay out of the default subagent registry but can be
// enabled by authenticated trusted submitters through an explicit allowed_tools subset.
const EXPLICIT_EXTRA_BRAIN_TOOLS: ReadonlySet<string> = new Set([
  'takes_list',
]);

// Ebrain D2 policy names that are intentionally present in BOT_ALLOWED_OPS
// before their G1 operation registration lands. They are skipped when absent
// from the runtime registry, while all other unknown names still fail closed.
const OPTIONAL_FUTURE_EBRAIN_TOOLS: ReadonlySet<string> = new Set([
  'list_executives',
  'get_executive_context',
]);

/**
 * v0.41 Approach C: per-tool usage_hint surfaced verbatim in the subagent
 * system prompt's tool preamble. Each entry tells the model WHEN to reach
 * for the tool (the description tells the model HOW). One line per tool;
 * no embedded newlines.
 *
 * Field-report driver: the renderer in `src/core/minions/system-prompt.ts`
 * surfaces these so a model with `shell` + brain tools in its registry
 * knows brain tools write to the gbrain DB (NOT local files) and to reach
 * for shell when the task asks for filesystem work.
 *
 * Keyed by OP name (pre-`brain_` prefix). Optional — tools without an entry
 * just render as `- \`name\`` with no hint suffix.
 */
export const BRAIN_TOOL_USAGE_HINTS: Readonly<Record<string, string>> = {
  query: 'Use for natural-language semantic search across the brain (vector + keyword hybrid). Returns ranked passages with citations. First choice when the user asks a question of the brain.',
  search: 'Use for hybrid keyword + vector search returning ranked page hits. Use over `query` when you want page-level not chunk-level results (e.g. "find pages about X").',
  get_page: 'Read a brain page by its slug. Returns the full markdown body + frontmatter + linked pages.',
  list_pages: 'List pages by type or slug-prefix filter. Use when you need to enumerate (e.g. "list all `people/` pages") instead of search.',
  file_list: 'List uploaded files (attachments) by slug-prefix or content type. NOT the local filesystem — only files the brain has stored.',
  file_url: 'Get a presigned URL for a brain-stored file. Read-only; expires.',
  get_backlinks: 'List every page that links TO the given slug. Use for "what references this".',
  traverse_graph: 'Walk the typed-edge graph starting from a slug (e.g. `works_at`, `founded`, `invested_in`). Use for relationship queries.',
  list_link_sources: 'List the distinct link provenances in the brain with edge counts (e.g. `citation-graph`, `manual`). Use to discover which edge-writers have populated the graph.',
  resolve_slugs: 'Resolve free-form entity names to canonical slugs (e.g. "Alice" → `people/alice-example`). Use before any tool that takes a slug if the user gave a name not a slug.',
  get_ingest_log: 'Read the brain ingestion log for diagnostic / verification queries.',
  put_page: 'Write a markdown page to the gbrain DATABASE (NOT the local filesystem). Page becomes searchable + linkable. Slug must match the agent\'s allowed namespace.',
  get_recent_salience: 'Read pages ranked by emotional + activity salience over a recency window. Use for "what\'s been on my mind lately".',
  find_anomalies: 'Read cohort-level activity outliers (e.g. tag-cohort or type-cohort with unusual recent volume). Use for "what\'s unusual lately".',
};

/** Matches Anthropic's tool-name constraint. No dots. */
const ANTHROPIC_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

function sanitizeToolName(opName: string): string {
  // Prefix with brain_ and replace any non-conforming char. For the v0.15
  // allow-list, every op name is already a valid simple identifier, so this
  // is defense-in-depth.
  const prefixed = `brain_${opName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  return prefixed.slice(0, 64);
}

/**
 * Convert an Operation.params (ParamDef) map to an Anthropic-compatible
 * JSONSchema.input_schema. Same shape MCP uses inline — ParamDef.type
 * narrows to a subset of JSONSchema types.
 */
function paramsToInputSchema(op: Operation): Record<string, unknown> {
  return {
    type: 'object' as const,
    properties: Object.fromEntries(
      Object.entries(op.params).map(([k, v]) => [k, paramDefToSchema(v)]),
    ),
    required: Object.entries(op.params).filter(([, v]) => v.required).map(([k]) => k),
  };
}

/**
 * For put_page specifically, the tool schema shown to the model constrains
 * `slug`. Two modes:
 *
 *  - Default (legacy): slug MUST start with `wiki/agents/<subagentId>/`,
 *    enforced by both the JSONSchema `pattern` and the server-side check.
 *  - Trusted-workspace (v0.23 dream cycle): when `allowedSlugPrefixes` is
 *    set, the model is told the allowed prefixes in plain English (no
 *    regex pattern — the prefix list is authoritative server-side, and
 *    JSONSchema can't express "matches any of these globs" cleanly).
 */
function namespacedPutPageSchema(
  op: Operation,
  subagentId: number,
  allowedSlugPrefixes?: readonly string[],
): Record<string, unknown> {
  const base = paramsToInputSchema(op);
  const props = (base.properties as Record<string, Record<string, unknown>>) ?? {};
  if (props.slug) {
    if (allowedSlugPrefixes && allowedSlugPrefixes.length > 0) {
      props.slug = {
        ...props.slug,
        description:
          `Page slug. MUST match one of these prefix globs: ${allowedSlugPrefixes.join(', ')}. ` +
          `Slugs use lowercase alphanumeric segments separated by '/'. No leading slash, no '.md' extension, no underscores.`,
      };
    } else {
      props.slug = {
        ...props.slug,
        description: `Page slug. MUST start with "wiki/agents/${subagentId}/" (agents can only write under their own namespace).`,
        pattern: `^wiki/agents/${subagentId}/.+`,
      };
    }
  }
  return { ...base, properties: props };
}

/** Args required to build the registry for a given subagent job. */
export interface BuildBrainToolsOpts {
  subagentId: number;
  engine: BrainEngine;
  config: GBrainConfig;
  /** Optional filter: only include op/tool names in this set. */
  allowedNames?: ReadonlySet<string>;
  /**
   * Connected-gbrains brain id (v0.19+, PR 0 plumbing only).
   *
   * CURRENT BEHAVIOR: `brainId` is stamped onto each tool-call's
   * `OperationContext.brainId` for audit / logging, but `ctx.engine` is
   * still the engine passed in here (the parent job's engine). Ops
   * targeting mounted brains via brainId WITHOUT a registry lookup will
   * silently run against the parent engine.
   *
   * FUTURE (PR 1): `buildOpContext` will call `BrainRegistry.getBrain
   * (brainId).engine` to select the right engine per dispatch. Once
   * wired, `opCtx.engine` will match `opCtx.brainId`. Until then, treat
   * brainId as metadata only.
   */
  brainId?: string;
  /**
   * Trusted-workspace allow-list (v0.23). When set, put_page is bounded
   * to slugs matching these prefix globs instead of the legacy
   * `wiki/agents/<id>/...` namespace. Trust comes from PROTECTED_JOB_NAMES
   * (MCP can't submit subagent jobs) — this flows from
   * SubagentHandlerData.allowed_slug_prefixes via the handler.
   */
  allowedSlugPrefixes?: readonly string[];
  /**
   * Optional; set by Ebrain bot router to thread executive actor + enterprise source.
   * gbrain core callers leave undefined, falls back to hardcoded defaults.
   */
  auth?: AuthInfo;
  /**
   * Optional; set by Ebrain bot router to thread executive actor + enterprise source.
   * gbrain core callers leave undefined, falls back to hardcoded defaults.
   */
  executive?: ExecutiveProfile;
  /**
   * Optional; set by Ebrain bot router to thread executive actor + enterprise source.
   * gbrain core callers leave undefined, falls back to hardcoded defaults.
   */
  sourceId?: string;
}

interface OpContextDeps {
  engine: BrainEngine;
  config: GBrainConfig;
  subagentId: number;
  jobId: number;
  signal?: AbortSignal;
  brainId?: string;
  allowedSlugPrefixes?: readonly string[];
  auth?: AuthInfo;
  executive?: ExecutiveProfile;
  sourceId?: string;
}

function buildOpContext(deps: OpContextDeps): OperationContext {
  return {
    engine: deps.engine,
    config: deps.config,
    logger: {
      info: (msg: string) => process.stderr.write(`[subagent-tool:${deps.jobId}] ${msg}\n`),
      warn: (msg: string) => process.stderr.write(`[subagent-tool:${deps.jobId}] WARN: ${msg}\n`),
      error: (msg: string) => process.stderr.write(`[subagent-tool:${deps.jobId}] ERROR: ${msg}\n`),
    },
    dryRun: false,
    remote: true,                // match MCP trust boundary for auto-link skip
    auth: deps.auth,
    takesHoldersAllowList: deps.auth ? ['world'] : undefined,
    sourceId: deps.sourceId ?? deps.auth?.sourceId ?? 'default',
    executive: deps.executive,
    jobId: deps.jobId,
    subagentId: deps.subagentId,
    viaSubagent: true,           // FAIL-CLOSED: put_page etc. enforce namespace
    brainId: deps.brainId,
    allowedSlugPrefixes: deps.allowedSlugPrefixes
      ? [...deps.allowedSlugPrefixes]
      : undefined,
  };
}

/**
 * Build the subagent brain-tool registry. One ToolDef per allow-listed op,
 * with a namespace-wrapped schema for put_page.
 *
 * Call this once per subagent-job claim; the registry is keyed to the job's
 * subagentId + engine handle, so it's not shareable across jobs.
 */
export function buildBrainTools(opts: BuildBrainToolsOpts): ToolDef[] {
  const requestedNames = opts.allowedNames ? normalizeAllowedNames(opts.allowedNames) : undefined;
  const filter = requestedNames ?? BRAIN_TOOL_ALLOWLIST;
  const picked: Operation[] = operations.filter(
    op => isAllowedRegistryOp(op.name, requestedNames, Boolean(opts.auth)) && filter.has(op.name),
  );

  return picked.map<ToolDef>(op => {
    const schema = op.name === 'put_page'
      ? namespacedPutPageSchema(op, opts.subagentId, opts.allowedSlugPrefixes)
      : paramsToInputSchema(op);

    const toolName = sanitizeToolName(op.name);
    if (!ANTHROPIC_NAME_RE.test(toolName)) {
      throw new Error(`brain tool name ${toolName} does not match Anthropic constraint`);
    }

    return {
      name: toolName,
      description: op.description,
      input_schema: schema,
      // v0.15 ships only idempotent brain tools (every allow-listed op is
      // deterministic over its input; put_page re-writes the same slug).
      idempotent: true,
      // v0.41 Approach C: surface usage_hint to the system-prompt renderer.
      // Keyed by the unprefixed op name. Undefined when no hint is registered.
      usage_hint: BRAIN_TOOL_USAGE_HINTS[op.name],
      async execute(input: unknown, ctx: ToolCtx): Promise<unknown> {
        const opCtx = buildOpContext({
          engine: ctx.engine,
          config: opts.config,
          subagentId: opts.subagentId,
          jobId: ctx.jobId,
          signal: ctx.signal,
          brainId: opts.brainId,
          allowedSlugPrefixes: opts.allowedSlugPrefixes,
          auth: opts.auth,
          executive: opts.executive,
          sourceId: opts.sourceId,
        });
        const params = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
        enforceSourceScopeOverride(op.name, params, opCtx);
        enforceAuthenticatedBotToolPolicy(op.name, params, opCtx);
        const result = await op.handler(opCtx, params);
        return op.name === 'takes_list'
          ? filterTakeRowsByAuthorizedSource(result, opCtx)
          : result;
      },
    };
  });
}

/**
 * Apply the caller's `allowed_tools` subset to a registry. Unknown tool
 * names throw a clear error at load time (NOT silently ignored) so
 * subagent defs with a typo don't ship to prod wondering why a tool
 * never fires. The only exception is the explicit Ebrain D2 future-op
 * list above; those names are policy allow-list entries that are expected
 * to materialize after Stage G1.
 */
export function filterAllowedTools(registry: ToolDef[], allowedToolNames: string[]): ToolDef[] {
  const indexByName = new Map(registry.map(t => [t.name, t]));
  // Also index by the un-prefixed op name (for friendlier allowed_tools entries).
  const indexByShort = new Map(
    registry.map(t => [t.name.replace(/^brain_/, ''), t]),
  );
  const seen = new Set<string>();
  const picked: ToolDef[] = [];
  for (const requested of allowedToolNames) {
    const match = indexByName.get(requested) ?? indexByShort.get(requested);
    if (!match && isOptionalFutureEbrainToolNotRegistered(requested)) continue;
    if (!match) {
      throw new Error(
        `subagent allowed_tools references unknown tool "${requested}". ` +
        `Known: ${[...indexByName.keys()].join(', ')}`,
      );
    }
    if (seen.has(match.name)) continue;
    seen.add(match.name);
    picked.push(match);
  }
  return picked;
}

function normalizeAllowedNames(names: ReadonlySet<string>): ReadonlySet<string> {
  return new Set([...names].map(name => name.replace(/^brain_/, '')));
}

function isAllowedRegistryOp(
  opName: string,
  requestedNames: ReadonlySet<string> | undefined,
  hasAuth: boolean,
): boolean {
  return BRAIN_TOOL_ALLOWLIST.has(opName)
    || (
      requestedNames?.has(opName) === true
      && (
        EXPLICIT_EXTRA_BRAIN_TOOLS.has(opName)
        || OPTIONAL_FUTURE_EBRAIN_TOOLS.has(opName)
      )
      && hasAuth
    );
}

function enforceSourceScopeOverride(
  opName: string,
  params: Record<string, unknown>,
  ctx: OperationContext,
): void {
  if (!ctx.auth) return;
  const sourceIdParam = params.source_id;
  if (typeof sourceIdParam !== 'string') return;
  const allowedSources = ctx.auth.allowedSources && ctx.auth.allowedSources.length > 0
    ? ctx.auth.allowedSources
    : [ctx.sourceId];
  if (sourceIdParam === '__all__' || !allowedSources.includes(sourceIdParam)) {
    throw new OperationError(
      'permission_denied',
      `subagent tool ${opName} cannot override source_id outside its authorized source scope`,
    );
  }
}

function enforceAuthenticatedBotToolPolicy(
  opName: string,
  params: Record<string, unknown>,
  ctx: OperationContext,
): void {
  if (!ctx.auth) return;
  if (opName === 'get_page' && params.fuzzy === true) {
    throw new OperationError(
      'permission_denied',
      'authenticated subagent get_page cannot use fuzzy slug resolution; provide an exact slug',
    );
  }
}

async function filterTakeRowsByAuthorizedSource(result: unknown, ctx: OperationContext): Promise<unknown> {
  if (!ctx.auth || !Array.isArray(result)) return result;
  const allowedSources = getAuthorizedSourceIds(ctx);
  if (allowedSources.length === 0) return [];

  const filtered: unknown[] = [];
  for (const row of result) {
    const take = row && typeof row === 'object' && !Array.isArray(row)
      ? row as { page_id?: unknown }
      : {};
    const pageId = Number(take.page_id);
    if (!Number.isInteger(pageId)) continue;
    if (await pageBelongsToAuthorizedSource(ctx, pageId, allowedSources)) filtered.push(row);
  }
  return filtered;
}

function getAuthorizedSourceIds(ctx: OperationContext): string[] {
  const fromAuth = ctx.auth?.allowedSources?.filter(source => source && source !== '__all__') ?? [];
  if (fromAuth.length > 0) return fromAuth;
  return ctx.sourceId && ctx.sourceId !== '__all__' ? [ctx.sourceId] : [];
}

async function pageBelongsToAuthorizedSource(
  ctx: OperationContext,
  pageId: number,
  allowedSources: readonly string[],
): Promise<boolean> {
  for (const sourceId of allowedSources) {
    const rows = await ctx.engine.executeRaw<{ id: number }>(
      'SELECT id FROM pages WHERE id = $1 AND source_id = $2 LIMIT 1',
      [pageId, sourceId],
    );
    if (rows.length > 0) return true;
  }
  return false;
}

function isOptionalFutureEbrainToolNotRegistered(toolName: string): boolean {
  const shortName = toolName.replace(/^brain_/, '');
  return OPTIONAL_FUTURE_EBRAIN_TOOLS.has(shortName)
    && !operations.some(op => op.name === shortName);
}

/** Exported for unit tests (stable surface). */
export const __testing = {
  sanitizeToolName,
  paramsToInputSchema,
  namespacedPutPageSchema,
  buildOpContext,
  enforceSourceScopeOverride,
  enforceAuthenticatedBotToolPolicy,
  filterTakeRowsByAuthorizedSource,
  isOptionalFutureEbrainToolNotRegistered,
  ANTHROPIC_NAME_RE,
};
