# Stage A1: Fork & Scaffold

## Status

- Stage: A1 Fork & Scaffold
- Branch: `ebrain-mvp`
- Actual baseline: gbrain `v0.36.3.0` (`1d5f69fe7afb26222e69674bed08d200a3f7f0a3`)
- Scope: scaffold only, no business implementation

## Verification

| Check | Result | Evidence |
|---|---|---|
| `bun install` | PASS | Completed with gbrain postinstall skipped because global `gbrain` is not installed |
| `bun run verify` | PASS | Privacy, JSONB, source-id projection, admin build, typecheck all passed |
| `bun run build` | PASS | Built `bin/gbrain` from `src/cli.ts` |
| `./bin/gbrain doctor` | PASS with warnings | Exit 0 against isolated `GBRAIN_HOME=/tmp/ebrain-stage-a1-gbrain-source`; output ended `All checks OK (some warnings)` |
| Source CLI doctor cross-check | PASS with warnings | `GBRAIN_HOME=/tmp/ebrain-stage-a1-gbrain-source bun src/cli.ts doctor` connected to PGLite and exited 0 |
| Top-level `src/ebrain` dirs | PASS | 11 Stage dirs plus `lint/` present |
| `index.ts` placeholders | PASS | Every `src/ebrain` directory has `index.ts` |
| `fence-parser.ts` absent | PASS | `find src/ebrain -name fence-parser.ts` returned empty |
| I-01 literal check | PASS | Exact `'enterprise'` literal appears only in `src/ebrain/constants.ts` |
| A1 import check | PASS | `src/ebrain` placeholder TypeScript files contain no imports |
| Remotes | PASS | `origin` points to `Jackwwg83/ebrain`; `upstream` fetch points to `garrytan/gbrain`; upstream push is `NO_PUSH_TO_UPSTREAM` |
| Branch | PASS | `git branch --show-current` returned `ebrain-mvp` |

Doctor notes:
- Running `./bin/gbrain doctor` before init returned `No brain configured. Run: gbrain init`.
- Running compiled `./bin/gbrain init --pglite` hit the upstream PGLite WASM runtime path issue: `ENOENT ... /$bunfs/root/pglite.data`.
- The isolated brain was created with source CLI, then compiled `./bin/gbrain doctor` ran and exited 0.

## Git Diff Stat

This file list was captured from the staged scaffold diff before adding this `STAGE-SUMMARY.md`; this summary file is also part of the Stage A1 commit.

Final staged stat after adding this summary and normalizing EOF newlines: `159 files changed, 9558 insertions(+), 1 deletion(-)`.

```text
admin-ebrain/.gitignore                            |    6 +
admin-ebrain/.npmrc                                |    2 +
admin-ebrain/.storybook/main.ts                    |   18 +
admin-ebrain/.storybook/preview.tsx                |  104 +
admin-ebrain/README.md                             |  100 +
admin-ebrain/package-lock.json                     | 6678 ++++++++++++++++++++
admin-ebrain/package.json                          |   34 +
admin-ebrain/src/Overview.mdx                      |   51 +
admin-ebrain/src/components/AppLayout.tsx          |  119 +
admin-ebrain/src/components/StatCard.stories.tsx   |   32 +
admin-ebrain/src/components/StatCard.tsx           |   45 +
admin-ebrain/src/components/StatusBadge.tsx        |   36 +
admin-ebrain/src/mock/data.ts                      |  339 +
admin-ebrain/src/pages/Agents.stories.tsx          |   13 +
admin-ebrain/src/pages/Agents.tsx                  |  161 +
admin-ebrain/src/pages/Dashboard.stories.tsx       |   13 +
admin-ebrain/src/pages/Dashboard.tsx               |  156 +
admin-ebrain/src/pages/EnterpriseApps.stories.tsx  |   13 +
admin-ebrain/src/pages/EnterpriseApps.tsx          |  172 +
admin-ebrain/src/pages/Executives.stories.tsx      |   13 +
admin-ebrain/src/pages/Executives.tsx              |  140 +
admin-ebrain/src/pages/FactConflicts.stories.tsx   |   13 +
admin-ebrain/src/pages/FactConflicts.tsx           |  184 +
admin-ebrain/src/pages/Ingestion.stories.tsx       |   13 +
admin-ebrain/src/pages/Ingestion.tsx               |  128 +
admin-ebrain/src/pages/Login.stories.tsx           |   13 +
admin-ebrain/src/pages/Login.tsx                   |  111 +
admin-ebrain/src/pages/RequestLog.stories.tsx      |   13 +
admin-ebrain/src/pages/RequestLog.tsx              |  121 +
admin-ebrain/src/styles/globals.css                |   65 +
admin-ebrain/tsconfig.json                         |   27 +
admin-ebrain/vite.config.ts                        |   15 +
enterprise-recipes/crm-to-brain/config.example.yml |    3 +
enterprise-recipes/crm-to-brain/recipe.md          |    4 +
enterprise-recipes/dingtalk-to-brain/config.example.yml |    3 +
enterprise-recipes/dingtalk-to-brain/recipe.md     |    4 +
enterprise-recipes/feishu-to-brain/config.example.yml |    3 +
enterprise-recipes/feishu-to-brain/recipe.md       |    4 +
enterprise-recipes/tencent-meeting-to-brain/config.example.yml |    3 +
enterprise-recipes/tencent-meeting-to-brain/recipe.md |    4 +
enterprise-recipes/wecom-to-brain/config.example.yml |    3 +
enterprise-recipes/wecom-to-brain/recipe.md        |    4 +
skills/board-deck-generator/SKILL.md               |    6 +
skills/capital-allocation-advisor/SKILL.md         |    6 +
skills/competitor-move-monitor/SKILL.md            |    6 +
skills/customer-escalation-radar/SKILL.md          |    6 +
skills/executive-daily-brief/SKILL.md              |    6 +
skills/forecast-variance-explainer/SKILL.md        |    6 +
skills/org-memory-synthesizer/SKILL.md             |    6 +
skills/risk-signal-detector/SKILL.md               |    6 +
src/ebrain/apps/base/bot-adapter.ts                |    4 +
src/ebrain/apps/base/circuit-breaker.ts            |    4 +
src/ebrain/apps/base/enterprise-app.ts             |    4 +
src/ebrain/apps/base/index.ts                      |    4 +
src/ebrain/apps/base/tiered-rate-limiter.ts        |    4 +
src/ebrain/apps/base/token-manager.ts              |    4 +
src/ebrain/apps/base/webhook-handler.ts            |    4 +
src/ebrain/apps/crm/fenxiang/index.ts              |    4 +
src/ebrain/apps/crm/index.ts                       |    4 +
src/ebrain/apps/crm/shenxiao/index.ts              |    4 +
src/ebrain/apps/crm/stub-others/index.ts           |    4 +
src/ebrain/apps/dingtalk/index.ts                  |    4 +
src/ebrain/apps/dingtalk/sub-connectors/index.ts   |    4 +
src/ebrain/apps/feishu/app.ts                      |    4 +
src/ebrain/apps/feishu/bot-adapter.ts              |    4 +
src/ebrain/apps/feishu/fixtures/im-messages.json   |    4 +
src/ebrain/apps/feishu/fixtures/index.ts           |    4 +
src/ebrain/apps/feishu/index.ts                    |    4 +
src/ebrain/apps/feishu/rate-limit.ts               |    4 +
src/ebrain/apps/feishu/sub-connectors/calendar.ts  |    4 +
src/ebrain/apps/feishu/sub-connectors/docs.ts      |    4 +
src/ebrain/apps/feishu/sub-connectors/drive.ts     |    4 +
src/ebrain/apps/feishu/sub-connectors/im.ts        |    4 +
src/ebrain/apps/feishu/sub-connectors/index.ts     |    4 +
src/ebrain/apps/feishu/sub-connectors/meeting.ts   |    4 +
src/ebrain/apps/feishu/sub-connectors/wiki.ts      |    4 +
src/ebrain/apps/feishu/token-manager.ts            |    4 +
src/ebrain/apps/feishu/webhook.ts                  |    4 +
src/ebrain/apps/index.ts                           |    4 +
src/ebrain/apps/tencent-meeting/index.ts           |    4 +
src/ebrain/apps/tencent-meeting/sub-connectors/index.ts |    4 +
src/ebrain/apps/wecom/index.ts                     |    4 +
src/ebrain/apps/wecom/sub-connectors/index.ts      |    4 +
src/ebrain/bot/index.ts                            |    4 +
src/ebrain/bot/intent-classifier.ts                |    4 +
src/ebrain/bot/push-orchestrator.ts                |    4 +
src/ebrain/bot/reply-formatter.ts                  |    4 +
src/ebrain/bot/router.ts                           |    4 +
src/ebrain/conflicts/choose-winner.ts              |    4 +
src/ebrain/conflicts/conflict-hash.ts              |    4 +
src/ebrain/conflicts/detect.ts                     |    4 +
src/ebrain/conflicts/index.ts                      |    4 +
src/ebrain/constants.ts                            |    5 +
src/ebrain/cycle/extract-facts-enterprise.ts       |    4 +
src/ebrain/cycle/index.ts                          |    4 +
src/ebrain/cycle/precompute-briefs.ts              |    4 +
src/ebrain/cycle/refresh-compiled-truth.ts         |    4 +
src/ebrain/cycle/shard.ts                          |    4 +
src/ebrain/executives/create.ts                    |    4 +
src/ebrain/executives/index.ts                     |    4 +
src/ebrain/executives/load-profile.ts              |    4 +
src/ebrain/executives/load-prompt.ts               |    4 +
src/ebrain/executives/soul-audit-enterprise.ts     |    4 +
src/ebrain/index.ts                                |    4 +
src/ebrain/jobs/connector-backfill.ts              |    4 +
src/ebrain/jobs/connector-incremental.ts           |    4 +
src/ebrain/jobs/dream-cycle-enterprise.ts          |    4 +
src/ebrain/jobs/executive-brief.ts                 |    4 +
src/ebrain/jobs/index.ts                           |    4 +
src/ebrain/jobs/run-enterprise-job.ts              |    4 +
src/ebrain/jobs/token-refresh-worker.ts            |    4 +
src/ebrain/lint/index.ts                           |    4 +
src/ebrain/lint/scope-required.ts                  |    4 +
src/ebrain/ops/detect-enterprise-conflicts.ts      |    4 +
src/ebrain/ops/enterprise-ingest-status.ts         |    4 +
src/ebrain/ops/get-executive-context.ts            |    4 +
src/ebrain/ops/index.ts                            |    4 +
src/ebrain/ops/list-executives.ts                  |    4 +
src/ebrain/secrets/crypto.ts                       |    4 +
src/ebrain/secrets/index.ts                        |    4 +
src/ebrain/secrets/master-key.ts                   |    4 +
src/ebrain/sources/circuit-breaker.ts              |    4 +
src/ebrain/sources/index.ts                        |    4 +
src/ebrain/sources/ingest-common.ts                |    4 +
src/ebrain/sources/scheduler.ts                    |    4 +
src/ebrain/sources/transformers/chunking.ts        |    4 +
src/ebrain/sources/transformers/classification.ts  |    4 +
src/ebrain/sources/transformers/entity-tag.ts      |    4 +
src/ebrain/sources/transformers/fact-fence-emitter.ts |    4 +
src/ebrain/sources/transformers/index.ts           |    4 +
src/ebrain/sso/dingtalk-oauth.ts                   |    4 +
src/ebrain/sso/feishu-oauth.ts                     |    4 +
src/ebrain/sso/index.ts                            |    4 +
src/ebrain/sso/oidc-adapter.ts                     |    4 +
src/ebrain/sso/reverse-proxy.ts                    |    4 +
src/ebrain/sso/session.ts                          |    4 +
src/ebrain/sso/user-mapping.ts                     |    4 +
src/ebrain/sso/wecom-oauth.ts                      |    4 +
src/ebrain/types.ts                                |    6 +
src/ebrain/webhook/dingtalk-handler.ts             |    4 +
src/ebrain/webhook/feishu-handler.ts               |    4 +
src/ebrain/webhook/index.ts                        |    4 +
src/ebrain/webhook/reconcile-worker.ts             |    4 +
src/ebrain/webhook/server.ts                       |    4 +
src/ebrain/webhook/tencent-meeting-handler.ts      |    4 +
src/ebrain/webhook/wecom-handler.ts                |    4 +
tests/ebrain/apps/.gitkeep                         |    1 +
tests/ebrain/bot/.gitkeep                          |    1 +
tests/ebrain/conflicts/.gitkeep                    |    1 +
tests/ebrain/cycle/.gitkeep                        |    1 +
tests/ebrain/executives/.gitkeep                   |    1 +
tests/ebrain/jobs/.gitkeep                         |    1 +
tests/ebrain/ops/.gitkeep                          |    1 +
tests/ebrain/secrets/.gitkeep                      |    1 +
tests/ebrain/sources/.gitkeep                      |    1 +
tests/ebrain/sso/.gitkeep                          |    1 +
tests/ebrain/webhook/.gitkeep                      |    1 +
157 files changed, 9429 insertions(+)
```

## New Dependencies

- Root package dependencies: none.
- Root lockfile changes: none.
- `bun add` / `npm install` new dependency actions: none.
- `admin-ebrain/` was copied from `/Users/jackwu/Projects/admin-ebrain-storybook/` without `node_modules`; it preserves that Storybook artifact's own package metadata as copied source.

## ADR / Invariant Notes

- ADR violations: none.
- I-01: satisfied. Exact `'enterprise'` literal is isolated to `src/ebrain/constants.ts`.
- I-05: satisfied for A1. No private `fence-parser.ts` was created.
- I-12: A1 adds scaffold paths only; no existing gbrain runtime files were edited.

## Typical Pitfalls Encountered

- Fork default branch had already moved to `v0.36.3.0`, not the design-validation `v0.35.7` baseline. PM selected the B baseline decision below.
- `git fetch upstream` fetched a large upstream branch set and took several minutes, but completed successfully.
- `admin-ebrain-storybook` contained `node_modules`; it was intentionally excluded during copy to avoid vendoring dependencies.
- Compiled `./bin/gbrain init --pglite` hit the upstream PGLite WASM runtime path issue (`/$bunfs/root/pglite.data`). Source CLI init succeeded; compiled `./bin/gbrain doctor` then ran and exited 0 with warnings.

## A2 Notes

- A2 must wait for PM's Round 7 validation against gbrain `v0.36.3.0`.
- A2 should use current upstream schema state: `package.json` version `0.36.3.0`, current schema migration version `74`, and Ebrain v200 still reserved as the enterprise namespace.
- A2 should re-check any source line references imported from the v0.35.7 validation reports before editing migration code.
- Keep root dependencies unchanged unless A2 spec explicitly authorizes one.

## Baseline 决策（Stage A1 启动时）

- 设计校验基线: gbrain v0.35.7 (commit `1dadd9e`)
- Stage A1 实际基线: gbrain v0.36.3.0 (commit `1d5f69fe7afb26222e69674bed08d200a3f7f0a3`)
- 增量 commits 列表（`git log 1dadd9ed7161fa109f717c551e168d1d63946f80..HEAD --oneline`）:

```text
1d5f69fe v0.36.3.0 feat: dynamic embedding column selection for search (#1164)
cdba533a v0.36.2.0 feat: ZeroEntropy as default + zero-based README rewrite (#1136)
1bc57991 v0.36.1.1 fix-wave: community PR triage + 28 atomic fixes (#1182)
3a0e1116 v0.36.1.0 Hindsight calibration wave: brain learns how you tend to be wrong (#1139)
03947665 v0.36.0.0 feat(skillpack): scaffold + reference + harvest (retire managed-block install) (#1130)
61b79e7c v0.35.8.0 feat(cycle): phantom-page redirect inside extract_facts (#1138)
```

- 风险: 设计文档源码引用基于 v0.35.7，PM 已排队 Round 7 校验 against v0.36.3.0 验证兼容性。
- 建议: A2 (v200 schema migration) 启动前必须等 Round 7 校验通过。

---

# Stage A2: v200 Schema Migration

## Scope

- Added schema migration `v200_ebrain_enterprise_baseline` in `src/core/migrate.ts`.
- Added PGLite forward-reference schema coverage in `src/core/pglite-schema.ts`.
- Added bootstrap coverage for Ebrain tables, columns, and view.
- Added Ebrain v200 migration tests under `tests/ebrain/migrations/`.
- Updated schema drift sentinels so PG/PGLite drift checks include Ebrain tables.

## Files Changed

```text
src/core/migrate.ts
src/core/pglite-schema.ts
test/e2e/schema-drift.test.ts
test/schema-bootstrap-coverage.test.ts
tests/ebrain/migrations/v200.test.ts
STAGE-SUMMARY.md
```

## Schema Additions

- `pages`: 16 Ebrain columns, including `classification` with `L0/L1/L2/L3` CHECK and `trust_tier` with `raw/draft/published/verified/inferred` CHECK.
- New tables: `enterprise_apps`, `enterprise_oauth_tokens`, `enterprise_ingest_sources`, `enterprise_ingest_objects`, `enterprise_entity_aliases`, `enterprise_fact_conflicts`, `executives`.
- Existing tables: nullable `executive_id` on `oauth_clients` and `oauth_tokens`; `executive_id` and `executive_role` on `mcp_request_log`.
- New view: `enterprise_fact_claims_view`.
- RLS: enabled on all seven Ebrain tables in the Postgres migration path; `enterprise_oauth_tokens` and `executives` carry `GBRAIN:RLS_EXEMPT` table comments.

## New Dependencies

- Root package dependencies: none.
- Root lockfile changes: none.
- `bun add` / `npm install` new dependency actions: none.

## ADR / Invariant Notes

- ADR violations: none.
- I-04: enforced by `pages_classification_check` in Postgres and inline CHECK in PGLite.
- I-06: satisfied. No `embedding_model_id` column was added; embedding provider distinction remains on `content_chunks.model`.
- I-08: satisfied. `oauth_clients.executive_id` and `oauth_tokens.executive_id` are nullable at schema level.
- I-12: A2 edits are limited to migration/schema test surfaces plus this summary.

## Verification Evidence

- `bun run verify`: passed.
- `bun test tests/ebrain/migrations/v200.test.ts`: passed 5 tests.
- `bun test test/schema-bootstrap-coverage.test.ts`: passed 10 tests.
- `bun test test/migrate-extensions.test.ts test/migrate.test.ts --timeout 60000`: passed 127 tests.
- `bun test test/e2e/schema-drift.test.ts`: exited 0; 17 drift tests skipped because `DATABASE_URL` was not set.
- Source CLI fresh PGLite init: `GBRAIN_HOME=/tmp/ebrain-stage-a2-cli bun src/cli.ts init --pglite --path /tmp/ebrain-stage-a2-cli/brain.pglite --json` applied schema `1 -> 200` and applied `[200] v200_ebrain_enterprise_baseline`.
- Source CLI schema migration replay: `GBRAIN_HOME=/tmp/ebrain-stage-a2-cli bun src/cli.ts apply-migrations --force-schema --yes --non-interactive` exited 0 with `Applied 0 schema migration(s); now at v200.`
- Source CLI doctor: `GBRAIN_HOME=/tmp/ebrain-stage-a2-cli bun src/cli.ts doctor --fast` exited 0 with health score `90/100`; warnings were limited to skipped resolver and DB checks under `--fast`.
- Runtime artifact inspection against the fresh PGLite database confirmed all seven Ebrain tables, `enterprise_fact_claims_view`, executive columns on OAuth/audit tables, `pages.classification`, `pages.trust_tier`, and failed insertion of `classification='L99'`.

## Known Limits

- Full Postgres schema drift execution was not run because no `DATABASE_URL` was configured in this workspace.
- PGLite uses a btree index for `enterprise_ingest_objects_seen_brin_idx`; Postgres uses BRIN.
- PGLite generated column syntax for `enterprise_entity_aliases.alias_norm` was probed locally and accepted before adding it to the migration.
- The compiled binary PGLite runtime path issue recorded in A1 remains outside A2 scope; A2 validation used the source CLI as specified.

## A3 Notes

- A3 ingest code should write `pages.enterprise_source_type`, `pages.enterprise_source_ref`, and `enterprise_ingest_objects` idempotently.
- A3 should continue to use `content_chunks.model` for embedding provider separation and must not add `embedding_model_id`.
- OAuth executive ownership remains an application-layer rule; schema columns are intentionally nullable for MVP compatibility.
- Before any Postgres deployment path, run `test/e2e/schema-drift.test.ts` with a real `DATABASE_URL`.

---

# Stage A3: Types + Constants + Crypto Helpers

## Scope

- Expanded Ebrain constants and type skeletons.
- Added AES-256-GCM application-layer encryption/decryption helpers.
- Added fail-fast master-key loading from `EBRAIN_SECRETS_KEY`.
- Added optional Ebrain config typing to `GBrainConfig`.
- Added optional enterprise page metadata helper types without changing the existing `Page` interface.

## Files Changed

```text
src/ebrain/constants.ts
src/ebrain/types.ts
src/ebrain/secrets/crypto.ts
src/ebrain/secrets/master-key.ts
src/core/types.ts
src/core/config.ts
tests/ebrain/secrets/crypto.test.ts
tests/ebrain/secrets/master-key.test.ts
STAGE-SUMMARY.md
```

## New Dependencies

- Root package dependencies: none.
- Root lockfile changes: none.
- `bun add` / `npm install` new dependency actions: none.
- Crypto uses Bun's Node-compatible built-in `node:crypto` module.

## ADR / Invariant Notes

- ADR violations: none.
- I-01: `EBRAIN_SOURCE_ID = 'enterprise'` remains isolated in `src/ebrain/constants.ts`; the only other grep hit is the existing v200 SQL view filter in `src/core/migrate.ts`.
- I-02: no `src/core/operations.ts` change in A3; OperationContext/AuthInfo extension remains scheduled for A4.
- I-08: OAuth executive ownership remains application-layer only; A3 adds types and does not enforce schema or config loading.
- Secrets boundary: decrypt/encrypt helpers are only under `src/ebrain/secrets/`.

## Verification Evidence

- `bun run typecheck`: passed.
- `bun test tests/ebrain/secrets/crypto.test.ts`: passed 7 tests.
- `bun test tests/ebrain/secrets/master-key.test.ts`: passed 5 tests.
- `bun test tests/ebrain/secrets/`: passed 12 tests across 2 files.
- `bun run verify`: passed.
- `bun test test/config.test.ts test/types.test.ts`: exited 0; `test/config.test.ts` passed 20 tests. This repository has no `test/types.test.ts`, so Bun ran the existing config suite only.
- I-01 check: `grep -rn "'enterprise'" src/ebrain/ src/core/` returned `src/ebrain/constants.ts` and the expected v200 SQL string in `src/core/migrate.ts`.

## Known Limits

- `EnterpriseConfig` is intentionally narrow because the design docs name the interface but do not define a full config schema.
- A3 does not wire dispatch, operations, OAuth provider, or runtime app loading; those remain later stages.

## A4 Notes

- A4 should add optional AuthInfo and OperationContext fields without changing existing required gbrain fields.
- A4 should keep `buildOperationContext` synchronous and load Ebrain context in the async `dispatchToolCall` path.
- A4 should continue to use `EBRAIN_SOURCE_ID` instead of adding new source-id literals.

---

# Stage A4: OperationContext Extension + Dispatch Hook

## Scope

- Added optional Ebrain identity fields to `AuthInfo`.
- Added optional Ebrain executive and v2 policy fields to `OperationContext`.
- Added a dispatch-time executive profile load hook in `dispatchToolCall`.
- Implemented A4 MVP `loadExecutiveProfile()` stub. Runtime behavior returns `null`; tests use a loader override to prove the hook path.
- Implemented project-local Ebrain `scope:` lint for future `src/ebrain/ops/*.ts` operation files.

## Files Changed

```text
src/core/operations.ts
src/mcp/dispatch.ts
src/ebrain/executives/load-profile.ts
src/ebrain/lint/scope-required.ts
src/ebrain/types.ts
tests/ebrain/operations-context.serial.test.ts
tests/ebrain/lint/scope-required.test.ts
STAGE-SUMMARY.md
```

## Append-Only Check

Implementation diff stat before this summary section:

```text
src/core/operations.ts                   |  17 ++++
src/ebrain/executives/load-profile.ts    |  30 +++++-
src/ebrain/lint/scope-required.ts        |  48 +++++++++-
src/ebrain/types.ts                      |   5 +
src/mcp/dispatch.ts                      |   5 +-
tests/ebrain/lint/scope-required.test.ts |  82 ++++++++++++++++
tests/ebrain/operations-context.serial.test.ts  | 158 +++++++++++++++++++++++++++++++
7 files changed, 338 insertions(+), 7 deletions(-)
```

Append-only guard:

```text
git diff ff0913a2 -- src/core/operations.ts src/mcp/dispatch.ts | grep -cE "^-[^-]"
1
```

The one removed line is the original single-line `const ctx = buildOperationContext(...)` replaced by the async hook block in `dispatchToolCall`.

## Hook 5-Line Check

`buildOperationContext` remains synchronous:

```text
src/mcp/dispatch.ts:196:export function buildOperationContext(
```

Full dispatch hook diff:

```diff
diff --git a/src/mcp/dispatch.ts b/src/mcp/dispatch.ts
index 8501ec74..59e35da6 100644
--- a/src/mcp/dispatch.ts
+++ b/src/mcp/dispatch.ts
@@ -10,6 +10,7 @@ import type { BrainEngine } from '../core/engine.ts';
 import { operations, OperationError } from '../core/operations.ts';
 import type { Operation, OperationContext, AuthInfo } from '../core/operations.ts';
 import { loadConfig } from '../core/config.ts';
+import { loadExecutiveProfile } from '../ebrain/executives/load-profile.ts';

 export interface ToolResult {
   content: { type: 'text'; text: string }[];
@@ -247,8 +248,13 @@ export async function dispatchToolCall(
     };
   }

-  const ctx = buildOperationContext(engine, safeParams, opts);
+  const baseCtx = buildOperationContext(engine, safeParams, opts);
+  let ctx = baseCtx;

   try {
+    if (baseCtx.auth?.executiveId) {
+      const executive = await loadExecutiveProfile(engine, baseCtx.auth.executiveId);
+      if (executive) ctx = { ...baseCtx, executive };
+    }
     const result = await op.handler(ctx, safeParams);
```

## New Dependencies

- Root package dependencies: none.
- Root lockfile changes: none.
- `bun add` / `npm install` new dependency actions: none.

## ADR / Invariant Notes

- ADR violations: none.
- I-02: satisfied. `OperationContext` now has optional `orgId`, `buId`, `workspaceId`, `userAttrs`, `dataClassificationMax`, and `policyDecision`, plus optional `executive`.
- I-03: public `Operation.scope?` and `Operation.localOnly?` remain optional; Ebrain-specific enforcement lives in `src/ebrain/lint/scope-required.ts`.
- I-12: only two gbrain core files changed, with a single removed source line in `operations.ts`/`dispatch.ts` combined.
- `OperationContext.remote` remains required; `buildOperationContext` remains synchronous.

## Verification Evidence

- `bun run typecheck`: passed.
- `bun test tests/ebrain/operations-context.serial.test.ts`: passed 6 tests.
- `bun test tests/ebrain/lint/scope-required.test.ts`: passed 5 tests.
- `bun run verify`: passed.
- `bun test test/operations*.test.ts`: passed 47 tests across 4 files.
- `bun test test/mcp-dispatch-summarize.test.ts test/parity.test.ts test/cli.test.ts`: passed 34 tests across 3 files.

## Known Limits

- `loadExecutiveProfile()` is intentionally a null-returning MVP stub. E1 replaces it with the DB-backed implementation.
- `scope-required` ignores A1 placeholder op files with only `export {};`; it starts enforcing once a concrete exported operation candidate appears.

## Next Stage Notes

- A5 can assume the core context shape is extended, but no Ebrain operation is registered yet.
- E1 must replace the stub loader without moving the hook out of `dispatchToolCall`.

## Fixwave (post-review)

Reviewer report: `/Users/jackwu/Projects/EBRAIN_STAGE_A4_REVIEW.md`, verdict `FAIL`, fixed in a follow-up commit on top of `7cba5de2`.

Fixes:

- H-001: moved core-visible `ExecutiveProfile`, `PolicyDecision`, and `EnterpriseConfig` types to `src/core/types.ts`; `src/core/operations.ts` and `src/core/config.ts` now import only from `./types.ts`; `src/ebrain/types.ts` re-exports the shared types.
- H-002: moved `loadExecutiveProfile()` await inside `dispatchToolCall`'s existing `try` block so loader failures return JSON-shaped `ToolResult` errors.
- M-001: extended `src/ebrain/lint/scope-required.ts` to require both `scope:` and `localOnly:` for concrete Ebrain op files.
- M-002: renamed `tests/ebrain/operations-context.test.ts` to `tests/ebrain/operations-context.serial.test.ts` because it mutates the shared `operations` registry and loader test seam.
- L-001: removed the nonexistent dispatch-test command from verification evidence.

Fixwave verification evidence:

```text
grep -nE "from '\\.\\./ebrain|from '\\.\\.\\./ebrain" src/core/
# no output

bun run typecheck
# passed

bun test tests/ebrain/operations-context.serial.test.ts
# 6 pass / 0 fail

bun test tests/ebrain/lint/scope-required.test.ts
# 5 pass / 0 fail

bun test tests/ebrain/
# 28 pass / 0 fail

bun test test/operations*.test.ts
# 47 pass / 0 fail

bun test test/mcp-dispatch-summarize.test.ts test/parity.test.ts test/cli.test.ts
# 34 pass / 0 fail

bun run verify
# passed, including check-test-isolation: OK (472 non-serial unit files scanned)
```

Fixwave diff guard:

```text
git diff 7cba5de2 -- src/core/operations.ts
# import path only: ../ebrain/types.ts -> ./types.ts

git diff 7cba5de2 -- src/mcp/dispatch.ts
# loader hook moved inside existing try/catch; op handler and error wrapper unchanged
```

# Stage A5 Summary - Minimal Deployable Dev Infra + CI/CD

Timestamp: 2026-05-20T07:13:17+08:00

## Scope

Stage A5 added code-side deployment scaffolding only. Codex did not run
`terraform apply`, `helm install`, `helm upgrade`, `kubectl apply`, or any
Alibaba Cloud deployment command against a live cluster.

New or updated paths:

- `deploy/dev/README.md`
- `deploy/dev/Dockerfile`
- `deploy/dev/helm/Chart.yaml`
- `deploy/dev/helm/values.yaml`
- `deploy/dev/helm/values.dev.yaml`
- `deploy/dev/helm/templates/*.yaml`
- `deploy/dev/terraform/*.tf`
- `deploy/dev/terraform/dev.tfvars.example`
- `deploy/dev/terraform/README.md`
- `.github/workflows/ci.yml`
- `.github/workflows/dev-deploy.yml`
- `scripts/ebrain-dev-up.sh`
- `scripts/ebrain-dev-deploy.sh`
- `scripts/ebrain-dev-logs.sh`
- `EBRAIN_DEV_ENVIRONMENT.md`
- `STAGE-SUMMARY.md`

No `src/`, `test/`, or `tests/` paths were modified.

Diff stat at commit time:

```text
36 files changed, 1935 insertions(+)
```

## Deploy Scaffold

Helm chart:

- Chart name: `ebrain-dev`
- App version: `0.36.3.0`
- Workload: one `mcp-api` Deployment replica
- Resources: request `500m` CPU / `1Gi` memory, limit `1` CPU / `2Gi`
- Health probes: readiness and liveness probe `/health`
- Persistence: NAS-backed RWX PVC mounted at `/data/ebrain`
- Secrets: all runtime credentials are read from External Secrets Operator
- RBAC: namespace `Role` with only `get` on `secrets`
- NetworkPolicy: restricts DNS, RDS CIDR, and configured HTTPS egress CIDRs

CI/CD scaffold:

- `.github/workflows/ci.yml`: verify, test, helm lint/template, actionlint,
  and YAML validation jobs for pull requests.
- `.github/workflows/dev-deploy.yml`: build image, push to ACR, deploy with
  `helm upgrade --install --atomic --wait`, and smoke `/health`.

Scripts:

- `scripts/ebrain-dev-up.sh`: PM-run bootstrap path for Terraform + Helm.
- `scripts/ebrain-dev-deploy.sh`: PM-run manual deploy path for current branch.
- `scripts/ebrain-dev-logs.sh`: PM-run log tail helper.

## Syntax Verification Evidence

```text
helm lint deploy/dev/helm
# 1 chart(s) linted, 0 chart(s) failed

helm template ebrain-dev deploy/dev/helm \
  --values deploy/dev/helm/values.dev.yaml > /tmp/a5-rendered.yaml
# exit 0

ruby -e "require 'yaml'; docs = YAML.load_stream(File.read('/tmp/a5-rendered.yaml')); puts \"rendered yaml docs=#{docs.size}\""
# rendered yaml docs=14

yamllint /tmp/a5-rendered.yaml
# exit 0

yamllint deploy/dev/helm/values.dev.yaml \
  .github/workflows/ci.yml \
  .github/workflows/dev-deploy.yml
# exit 0

actionlint .github/workflows/ci.yml .github/workflows/dev-deploy.yml
# exit 0

shellcheck scripts/ebrain-dev-up.sh \
  scripts/ebrain-dev-deploy.sh \
  scripts/ebrain-dev-logs.sh
# exit 0
```

Rendered manifest resource evidence:

```text
NetworkPolicy/mcp-api-restricted-egress
ServiceAccount/mcp-api
ConfigMap/ebrain-config
PersistentVolumeClaim/ebrain-brain-repo
Role/mcp-api-secret-reader
RoleBinding/mcp-api-secret-reader
Service/mcp-api
Deployment/mcp-api
Ingress/ebrain-dev
ClusterIssuer/letsencrypt-prod
ExternalSecret/acr-pull-secret
ExternalSecret/ebrain-runtime
ExternalSecret/postgres-rds
SecretStore/alicloud-kms
```

Rendered manifest safety checks:

```text
rg -n "readinessProbe|livenessProbe|/health|resources: \[\"secrets\"\]|verbs:|kind: ClusterRole|kind: NetworkPolicy|egress:" /tmp/a5-rendered.yaml
# NetworkPolicy present
# Role resources ["secrets"] with verbs ["get"]
# readinessProbe /health present
# livenessProbe /health present
# no ClusterRole output

rg -n -i "password|secret|token|api[-_ ]?key" /tmp/a5-rendered.yaml | rg -v "<allowed secret reference filters>"
# no output after filtering Secret/ExternalSecret references and env var names
```

## Documentation Evidence

`EBRAIN_DEV_ENVIRONMENT.md` now contains:

- Stage A5 five-step launch checklist.
- GitHub Actions secrets checklist.
- KMS remote key checklist for RDS, runtime, provider keys, and ACR pull secret.
- cert-manager AliDNS DNS-01 setup notes.
- troubleshooting entries for NAT egress, RDS SSL, ACR image pull, and schema
  migration with `gbrain apply-migrations --force-schema --yes`.

## New Dependencies

- Runtime/package dependencies: none.
- Lockfile changes: none.
- Local validation tools installed on the workstation for syntax checks:
  `helm`, `actionlint`, `yamllint`, and `shellcheck`.

## Known Limits

- Terraform templates were not initialized, planned, or applied. PM must run
  them in the company Alibaba Cloud account after reviewing variables.
- The default NetworkPolicy HTTPS CIDRs are documentation placeholders. PM must
  replace them with company-approved egress ranges or an ACK CNI policy that
  supports SaaS FQDN rules.
- `deploy/dev/helm/values*.yaml` uses placeholder hostnames, RDS/KMS references,
  and ACR repository names. No credential values are committed.
- No runtime deployment evidence exists yet because Stage A5 explicitly leaves
  Alibaba Cloud deploy execution to PM.

## PM Action Items

1. Review and fill Terraform variables:

```bash
cd deploy/dev/terraform
cp dev.tfvars.example dev.tfvars  # create manually if needed
terraform init
terraform plan -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
```

2. Install cluster prerequisites:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo add external-secrets https://charts.external-secrets.io
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
helm upgrade --install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --version 2.4.1 \
  --set installCRDs=true
```

Alibaba provider is deprecated in current ESO docs. Stage A5 keeps it pinned for
dev, and PM must plan an RRSA / alicloud-kms-go migration before staging.

3. Create the Kubernetes provider secrets referenced by Helm:

```bash
kubectl create namespace ebrain-dev
kubectl create secret generic alicloud-kms-access \
  -n ebrain-dev \
  --from-literal=access-key-id='<redacted>' \
  --from-literal=access-key-secret='<redacted>'
kubectl create secret generic alicloud-kms-access \
  -n cert-manager \
  --from-literal=access-key-id='<redacted>' \
  --from-literal=access-key-secret='<redacted>'
```

DNS-01 RAM credentials are synced by ESO from KMS into
`cert-manager/alicloud-dns01-access`; do not create them with
`kubectl --from-literal`.

4. Write KMS remote values:

- `ebrain/dev/rds/database-url`
- `ebrain/dev/runtime/ebrain-secrets-key`
- `ebrain/dev/runtime/admin-bootstrap-token`
- `ebrain/dev/providers/openai-api-key`
- `ebrain/dev/providers/anthropic-api-key`
- `ebrain/dev/providers/dashscope-api-key`
- `ebrain/dev/acr/dockerconfigjson`
- `ebrain/dev/dns01/access-key-id`
- `ebrain/dev/dns01/access-key-secret`

5. Configure GitHub Actions repository secrets:

- `ACR_REGISTRY`
- `ACR_REPOSITORY`
- `ACR_USER`
- `ACR_PASS`
- `KUBE_CONFIG_DATA`
- `EBRAIN_DEV_HOST`
- repository variable `EBRAIN_HTTPS_EGRESS_CIDRS` as a comma-separated list of
  company-approved SaaS egress CIDRs

6. Complete deployment gates before running Helm:

- RAM Policy Gate: AccessKeys have only product-scoped KMS read/decrypt, DNS
  record management (`alidns:DescribeDomainRecords`,
  `alidns:AddDomainRecord`, `alidns:UpdateDomainRecord`), ACK read/deploy,
  VPC/RDS/NAS/SLB resource creation, and ACR push/pull permissions needed for
  dev. No account admin key is used.
- DNS Gate: `ebrain-dev.<your-company>.com` resolves by A or CNAME to the SLB
  public address. Verify with `dig ebrain-dev.<your-company>.com`.
- KMS Rotation Gate: Ebrain KMS key has 90-day rotation enabled; after ESO
  sync, check the target K8s Secret resource version changed.

7. Run the first deploy manually:

```bash
HTTPS_EGRESS_CIDRS=203.0.113.0/24 EBRAIN_CONFIRM_APPLY=yes \
  ./scripts/ebrain-dev-up.sh
kubectl get pods -n ebrain-dev
curl -fsS https://ebrain-dev.<your-company>.com/health
kubectl exec -n ebrain-dev deploy/mcp-api -- \
  gbrain apply-migrations --force-schema --yes
```

## A6 Notes

- After PM performs the first real deploy, A6 should capture runtime evidence:
  pod status, `/health` response, schema migration output, and at least one
  concrete log line or DB row proving the deployed app is reading the intended
  RDS/NAS-backed environment.
- Do not broaden deployment targets until the dev vertical slice has real
  runtime evidence.

## Fixwave (post A5 review)

Reviewer report: `/Users/jackwu/Projects/EBRAIN_STAGE_A5_REVIEW.md`, verdict
`FAIL`, fixed in a follow-up commit on top of `5b216a88`.

Fixes:

- R-A5-H-001: switched SecretStore/ExternalSecret manifests to
  `external-secrets.io/v1`; pinned ESO install to `--version 2.4.1`; documented
  Alibaba provider deprecation and RRSA / SDK migration gate.
- R-A5-H-002: added root `.dockerignore` to exclude `.git`, env files,
  Terraform state/tfvars, kubeconfigs, node modules, build outputs, and temp
  artifacts from Docker build context.
- R-A5-H-003: appended Terraform sensitive-file rules to `.gitignore`.
- R-A5-H-004: `scripts/ebrain-dev-up.sh` now requires `TF_VARS_FILE`
  (`dev.tfvars` by default), runs `terraform plan`, and applies with
  `-var-file`.
- R-A5-H-005: added `alicloud-dns01-externalsecret.yaml` so DNS-01 RAM
  credentials sync from KMS into `cert-manager/alicloud-dns01-access`.
- R-A5-M-001: `networkPolicy.httpsEgressCidrs` now defaults to empty and Helm
  fails fast until PM provides company-approved CIDRs; scripts and Actions
  accept `HTTPS_EGRESS_CIDRS` / `EBRAIN_HTTPS_EGRESS_CIDRS`.
- R-A5-M-002: NetworkPolicy ingress now only allows the configured ingress
  controller namespace (`ingress-nginx` by default).
- R-A5-M-003: dev deploy workflow now uses a branch-scoped concurrency lock.
- R-A5-L-001: PM Action Items now include RAM Policy, DNS, and KMS Rotation
  gates.

Fixwave verification:

```text
helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml
# failed as expected: networkPolicy.httpsEgressCidrs is empty

helm template ebrain-dev deploy/dev/helm \
  --values deploy/dev/helm/values.dev.yaml \
  --set networkPolicy.httpsEgressCidrs[0]=203.0.113.0/24
# rendered successfully

grep -R "external-secrets.io/v1beta1" deploy/dev/helm/templates
# no output

grep -E "tfvars|tfstate|\\.terraform" .gitignore
# terraform sensitive-file rules present

grep "TF_VARS_FILE" scripts/ebrain-dev-up.sh
# present

grep "concurrency:" .github/workflows/dev-deploy.yml
# present

helm show chart external-secrets/external-secrets --version 2.4.1
# chart version 2.4.1 exists; appVersion v2.4.1

helm lint deploy/dev/helm
# 1 chart(s) linted, 0 chart(s) failed; fail-fast warning emitted

helm lint deploy/dev/helm --values deploy/dev/helm/values.dev.yaml \
  --set 'networkPolicy.httpsEgressCidrs[0]=203.0.113.0/24'
# 1 chart(s) linted, 0 chart(s) failed

yamllint /tmp/a5-fix-rendered.yaml deploy/dev/helm/values.dev.yaml \
  deploy/dev/helm/values.yaml .github/workflows/ci.yml \
  .github/workflows/dev-deploy.yml
# exit 0

actionlint .github/workflows/*.yml
# exit 0

shellcheck scripts/ebrain-dev-*.sh
# exit 0

bun run typecheck
# exit 0

bun test tests/ebrain/
# 28 pass / 0 fail
```

## A5 Fixwave Round 3

Reviewer report: `/Users/jackwu/Projects/EBRAIN_STAGE_A5_REVIEW_ROUND2.md`,
verdict `FIX_RECOMMENDED`; blocking item R2-M-001 fixed by validating every
`networkPolicy.httpsEgressCidrs` entry as a non-empty IPv4 CIDR-shaped string.

Round 3 verification:

```text
helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml 2>&1 | grep -E "fail|FAIL|Error"
# Error: execution error at (ebrain-dev/templates/networkpolicy.yaml:3:4): networkPolicy.httpsEgressCidrs is empty. Set company-approved SaaS egress CIDRs in values.dev.yaml or --set before deploy.

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs={}' 2>&1 | grep -E "fail|FAIL|Error"
# Error: execution error at (ebrain-dev/templates/networkpolicy.yaml:8:4): networkPolicy.httpsEgressCidrs[0] is invalid: "". Must be a non-empty IPv4 CIDR like 10.0.0.0/8.

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=' 2>&1 | grep -E "fail|FAIL|Error"
# Error: execution error at (ebrain-dev/templates/networkpolicy.yaml:8:4): networkPolicy.httpsEgressCidrs[0] is invalid: "". Must be a non-empty IPv4 CIDR like 10.0.0.0/8.

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=10.0.0.0/8' > /tmp/a5-r3-valid.yaml; echo "exit=$?"; grep -n "cidr: 10.0.0.0/8" /tmp/a5-r3-valid.yaml
# exit=0
# 47:            cidr: 10.0.0.0/8

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=not-a-cidr' 2>&1 | grep -E "fail|FAIL|Error"
# Error: execution error at (ebrain-dev/templates/networkpolicy.yaml:8:4): networkPolicy.httpsEgressCidrs[0] is invalid: "not-a-cidr". Must be a non-empty IPv4 CIDR like 10.0.0.0/8.
```

## A5 Fixwave Round 4

Reviewer round-3 blocking item R3-M-001 fixed by adding semantic IPv4 CIDR
validation for `networkPolicy.httpsEgressCidrs`: each value is split into IP and
mask, every octet must be `0..255`, and mask must be `0..32`. Fail-fast errors
include the entry index, actual CIDR value, and the failing part.

Reviewer 5 gates:

```text
helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=10.0.0.0/99' 2>&1 | tail -3
# Error: execution error at (ebrain-dev/templates/networkpolicy.yaml:15:4): networkPolicy.httpsEgressCidrs[0] = "10.0.0.0/99" has invalid mask /99. Mask must be 0..32.
#
# Use --debug flag to render out invalid YAML

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=10.0.0.0/33' 2>&1 | tail -3
# Error: execution error at (ebrain-dev/templates/networkpolicy.yaml:15:4): networkPolicy.httpsEgressCidrs[0] = "10.0.0.0/33" has invalid mask /33. Mask must be 0..32.
#
# Use --debug flag to render out invalid YAML

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=999.0.0.0/8' 2>&1 | tail -3
# Error: execution error at (ebrain-dev/templates/networkpolicy.yaml:20:4): networkPolicy.httpsEgressCidrs[0] = "999.0.0.0/8" has invalid octet 0 (= 999). Each octet must be 0..255.
#
# Use --debug flag to render out invalid YAML

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=0.0.0.0/0' > /tmp/a5-r4-zero.yaml; echo "exit=$?"
# exit=0

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=10.0.0.1/32' > /tmp/a5-r4-32.yaml; echo "exit=$?"
# exit=0
```

Boundary cases:

```text
helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=10.0.0.0/32' > /dev/null; echo "/32 exit=$?"
# /32 exit=0

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=10.0.0.0/0' > /dev/null; echo "/0 exit=$?"
# /0 exit=0

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=255.255.255.255/32' > /dev/null; echo "255 exit=$?"
# 255 exit=0

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=10.0.0.0/0' > /dev/null; echo "/0-2 exit=$?"
# /0-2 exit=0

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=10.0.0.0/256' 2>&1 | tail -3
# Error: execution error at (ebrain-dev/templates/networkpolicy.yaml:15:4): networkPolicy.httpsEgressCidrs[0] = "10.0.0.0/256" has invalid mask /256. Mask must be 0..32.
#
# Use --debug flag to render out invalid YAML
```

Regression cases:

```text
helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml 2>&1 | tail -3
# Error: execution error at (ebrain-dev/templates/networkpolicy.yaml:3:4): networkPolicy.httpsEgressCidrs is empty. Set company-approved SaaS egress CIDRs in values.dev.yaml or --set before deploy.
#
# Use --debug flag to render out invalid YAML

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs={}' 2>&1 | tail -3
# Error: execution error at (ebrain-dev/templates/networkpolicy.yaml:8:4): networkPolicy.httpsEgressCidrs[0] is invalid: "". Must be a non-empty IPv4 CIDR like 10.0.0.0/8.
#
# Use --debug flag to render out invalid YAML

helm template ebrain-dev deploy/dev/helm --values deploy/dev/helm/values.dev.yaml --set 'networkPolicy.httpsEgressCidrs[0]=10.0.0.0/8' > /dev/null; echo "valid /8 exit=$?"
# valid /8 exit=0
```

Rendered artifact spot checks:

```text
grep -n 'cidr: 0.0.0.0/0' /tmp/a5-r4-zero.yaml
# 47:            cidr: 0.0.0.0/0

grep -n 'cidr: 10.0.0.1/32' /tmp/a5-r4-32.yaml
# 47:            cidr: 10.0.0.1/32
```

---

# Stage B1: EnterpriseApp Base Abstraction

## Scope

- Replaced A1 placeholders in `src/ebrain/apps/base/` with the shared B1 EnterpriseApp abstraction.
- Added strict vendor-neutral interfaces only: `EnterpriseApp`, `TokenManager`, `WebhookHandler`, `TieredRateLimiter`, `BotAdapter`, `EnterpriseConnector`, and `EnterpriseIngestObject` support types.
- Added a barrel export from `src/ebrain/apps/base/index.ts` for reviewer and future connector consumption.
- Added dummy implementation tests under `tests/ebrain/apps/base/types.test.ts` to prove each interface can be satisfied without any concrete Feishu/DingTalk/WeCom/Tencent Meeting/CRM implementation.

## Files Changed

```text
src/ebrain/apps/base/bot-adapter.ts
src/ebrain/apps/base/enterprise-app.ts
src/ebrain/apps/base/enterprise-connector.ts
src/ebrain/apps/base/index.ts
src/ebrain/apps/base/tiered-rate-limiter.ts
src/ebrain/apps/base/token-manager.ts
src/ebrain/apps/base/types.ts
src/ebrain/apps/base/webhook-handler.ts
tests/ebrain/apps/base/types.test.ts
STAGE-SUMMARY.md
```

No `src/core/`, `src/mcp/`, `src/ebrain/types.ts`, or `src/ebrain/executives/` files were edited in B1.

## Implementation Notes

- `EnterpriseApp.appType` is a strict literal union: `feishu | dingtalk | wecom | tencent-meeting | crm-shenxiao | crm-fenxiang`; no `string` fallback.
- `webhookHandler?` and `botAdapter?` remain optional so Tencent Meeting and CRM adapters can satisfy the base contract without fake capabilities.
- `EnterpriseConnector.app` is non-optional and typed as `EnterpriseApp`, preserving the dependency-injection guard for C-stage concrete connectors.
- `TokenKind` matches the v200 `enterprise_oauth_tokens.token_kind` CHECK values: `tenant_access | user_access | app_access | refresh`.
- `TieredRateLimiter` documents the internal `${tier}:${key}` storage rule and exposes separate `app | tenant | user` tiers to avoid cross-tier key collisions.
- `IncomingRequest` stays framework-neutral with only `headers` and `rawBody`; no Express or vendor SDK types were imported.
- `EnterpriseIngestObject.classification?: 'L0' | 'L1' | 'L2' | 'L3'` is present for I-04.
- B1 intentionally has no data-producing runtime path; the stage is interface/type-only by design. Runtime validation is compile-time strictness plus dummy implementation execution, not a fake ingest workflow.

## Diff Stat

```text
src/ebrain/apps/base/bot-adapter.ts          |  27 ++-
src/ebrain/apps/base/enterprise-app.ts       |  41 +++-
src/ebrain/apps/base/enterprise-connector.ts |  20 ++
src/ebrain/apps/base/index.ts                |  10 +-
src/ebrain/apps/base/tiered-rate-limiter.ts  |  26 ++-
src/ebrain/apps/base/token-manager.ts        |  30 ++-
src/ebrain/apps/base/types.ts                |  62 ++++++
src/ebrain/apps/base/webhook-handler.ts      |  20 +-
tests/ebrain/apps/base/types.test.ts         | 321 +++++++++++++++++++++++++++
9 files changed, 539 insertions(+), 18 deletions(-)
```

`STAGE-SUMMARY.md` was updated after this diff-stat capture.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| `git status --short --branch` before work | PASS | `## ebrain-mvp...origin/ebrain-mvp`; HEAD `aefe469d577c95693559f3ecbd82b3dd70be9410` |
| `bun run typecheck` | PASS | `tsc --noEmit` exited 0 |
| `bun test tests/ebrain/apps/base/` | PASS | 12 pass, 0 fail, 22 assertions |
| Explicit type sentinel check for B1 test file | PASS | `./node_modules/.bin/tsc --noEmit --target ESNext --module ESNext --moduleResolution bundler --types bun-types --strict --skipLibCheck --esModuleInterop --allowImportingTsExtensions src/types/image-decoders.d.ts tests/ebrain/apps/base/types.test.ts` exited 0 |
| `bun run verify` | PASS | privacy/proposal PII/test names/JSONB/source-id/progress/test-isolation/WASM/admin build/admin scope/CLI/system-of-record/eval glossary/synthetic corpus/typecheck all exited 0 |
| `bun test test/operations*.test.ts test/parity.test.ts` | PASS | 57 pass, 0 fail, 995 assertions |
| Core reverse-dependency grep | PASS | `grep -rnE "from '\.\./\.\./\.\./ebrain" src/core/` returned empty output |

## Dummy Interface Coverage

- `TokenManager`: dummy `getToken`, `refresh`, and `isExpired` implementation passes.
- `WebhookHandler`: dummy `verify` and `decode` returns a vendor-neutral `Event` with `eventId`, `eventType`, `receivedAt`, and `payload`.
- `TieredRateLimiter`: dummy `acquire`/`release` covers `app:feishu`, `tenant:vx.feishu.cn`, and `user:ou_xxx` key shapes.
- `BotAdapter`: dummy `onMention`, `sendReply`, `pushToUser`, and `pushToChannel` implementation passes.
- `EnterpriseApp`: full dummy includes all sub-capabilities; Tencent Meeting dummy omits optional webhook/bot fields and still satisfies the interface.
- `EnterpriseConnector`: dummy connector requires non-optional `app` and transforms raw input into `EnterpriseIngestObject`.
- Literal strictness sentinels cover `EnterpriseAppType`, `TokenKind`, `ClassificationLevel`, `EnterpriseObjectType`, `EnterpriseSourceType`, `RateLimitTier`, and non-optional `EnterpriseConnector.app`.

## ADR / Invariant Notes

- I-04: satisfied by `EnterpriseIngestObject.classification?: 'L0' | 'L1' | 'L2' | 'L3'`.
- I-09: satisfied by a single strict base `EnterpriseApp` interface and sub-capability interfaces reused by all future vendor adapters.
- I-12: B1 changed only `src/ebrain/apps/base/*`, `tests/ebrain/apps/base/*`, and this summary; no gbrain core/runtime implementation was modified.

## New Dependencies

- Root package dependencies: none.
- Root lockfile changes: none.
- `bun add` / `npm install` new dependency actions: none.

---

# Stage B2: ingest-common + Circuit Breaker + Token Refresh + B1 Follow-up

## B1 Follow-up Resolved

### B1-L-001: 5-vendor EnterpriseApp matrix test

- Added committed coverage in `tests/ebrain/apps/base/types.test.ts` with `5 vendors satisfy EnterpriseApp matrix`.
- The matrix instantiates all six MVP adapter app types: `feishu`, `dingtalk`, `wecom`, `tencent-meeting`, `crm-shenxiao`, and `crm-fenxiang`.
- The test covers full IM-style apps with webhook + bot and meeting/CRM apps where webhook/bot are optional.

Evidence:

```text
bun test tests/ebrain/apps/base/types.test.ts
# 13 pass, 0 fail, 27 expect() calls
```

### B1-L-002: legacy weak base-contract names removed from `src/ebrain/types.ts`

- Removed standalone legacy `EnterpriseApp`, `TokenKind`, and `EnterpriseConnector` definitions from `src/ebrain/types.ts`.
- Re-exported the canonical B1 base contract instead:
  `export type { EnterpriseApp, EnterpriseConnector, TokenKind, TokenManager } from './apps/base/index.ts';`
- This preserves existing imports from `src/ebrain/types.ts` while routing those names to `src/ebrain/apps/base/*`.
- Follow-up hardening also routes `EnterpriseIngestObject`, `EnterpriseIngestResult`, webhook, limiter, and bot adapter helper types from the same base barrel so future connector code cannot mix old A3-shaped contracts with the B1 contract.

Evidence:

```text
grep -n "EnterpriseApp\|TokenKind\|EnterpriseConnector" src/ebrain/types.ts
# 47:export type { EnterpriseApp, EnterpriseConnector, TokenKind, TokenManager } from './apps/base/index.ts';

grep -nE "^export interface (EnterpriseApp|EnterpriseConnector)" src/ebrain/types.ts
# empty

grep -nE "^export type TokenKind" src/ebrain/types.ts
# empty

bun run typecheck
# tsc --noEmit exited 0
```

## B2 Main Deliverable

### ingest-common

- Implemented `src/ebrain/sources/ingest-common.ts` with `upsertEnterpriseObject`, `stableHash`, and `toEnterpriseSlug`.
- Uses `enterprise_ingest_objects` keyed by `(ingest_source_id, external_id)` and updates changed objects with `status = 'ingested'` without regressing status to `seen`.
- Uses canonical `EBRAIN_SOURCE_ID` for enterprise page writes.
- Encodes `enterprise_source_ref` with explicit `source=` and `external=` boundaries so source/external id pairs containing delimiters cannot collide under `pages_enterprise_object_uidx`.
- Computes object `content_hash` from `title`, `bodyMarkdown`, `modifiedAt`, and `raw`.
- Creates/updates the `enterprise` gbrain source page, enterprise provenance columns, and content chunks when the hash changes.
- Skips page/chunk body rewrites when the hash is identical and the object is already `ingested`, but still refreshes page governance metadata/provenance/frontmatter for metadata-only changes.
- Pre-existing `seen` rows still advance to `ingested`.
- Stores v1 raw payload inline in `raw_ref` when it is under 100KB; OSS handoff remains a v1.1 hook.
- Calls `resetCircuit` on successful changed and unchanged ingest paths so source health recovers after a real successful upsert.

Runtime artifact evidence from tests:

```text
bun test tests/ebrain/sources/
# 25 pass, 0 fail, 70 expect() calls across ingest-common, circuit-breaker, and fact-fence-emitter
```

The test inspects real PGLite rows for:

- `enterprise_ingest_objects.status = 'ingested'` after first upsert.
- `pages.source_id = 'enterprise'`, `enterprise_source_type`, `enterprise_source_ref`, `object_hash`, and `last_ingested_at` populated.
- Identical-content metadata-only upsert returns `changed=false` while refreshing `pages.owner_org_unit`, `classification`, `provenance`, and `frontmatter`.
- `content_chunks` rows created for non-empty body content.
- 100 identical upserts leaving exactly 1 `enterprise_ingest_objects` row.
- Lossy external id slug normalization preserving distinct page slugs via hash suffixes.
- Delimiter-bearing `sourceId` / `externalId` values preserving distinct `enterprise_source_ref` values and avoiding page unique-index collisions.
- Pre-existing `seen` rows advancing to `ingested` instead of being skipped.
- Successful upsert clearing `consecutive_errors` and `circuit_open_until` on the source.
- Body, `modifiedAt`, and `raw` changes producing a new `content_hash`.

### circuit-breaker

- Implemented `src/ebrain/sources/circuit-breaker.ts` with `markIngestError`, `checkCircuit`, and `resetCircuit`.
- Threshold is hardcoded to 5 for v1.
- Circuit opens for 30 minutes after the 5th consecutive ingest error.
- Reset clears `consecutive_errors`, clears `circuit_open_until`, and stamps `last_success_at`.
- No IM/push alerting was added; monitoring remains out of scope for J2.

Evidence:

```text
bun test tests/ebrain/sources/
# circuit-breaker.test.ts included in 25 pass, 0 fail, 70 expect() calls
```

### token-refresh-worker

- Implemented `src/ebrain/jobs/token-refresh-worker.ts` with job name constant `ebrain-token-refresh` and `tokenRefreshWorkerHandler`.
- Registered `ebrain-token-refresh` in the gbrain Minions built-in worker registry in `src/commands/jobs.ts`.
- Registered `token-refresh` as a compatibility alias for the existing dev runbook manual enqueue path while keeping `ebrain-token-refresh` as the canonical job name.
- Scans `enterprise_oauth_tokens` for tokens expiring within the next 30 minutes but not already expired, in batches of 50.
- Loads the EnterpriseApp by `app_id`; gracefully skips apps whose concrete `tokenManager` is not implemented yet.
- Handles per-token errors without blocking the rest of the batch.
- Encrypts refreshed `access_token` and optional refreshed `refresh_token` values through `src/ebrain/secrets/crypto.ts` before writing them back.
- Tightened `TokenManager.refresh` to return a persisted refresh payload (`accessToken`, `expiresAt`, optional `refreshToken`/`scopes`/`metadata`) so the worker can own encrypted DB persistence instead of silently treating a successful `void` refresh as skipped.

Evidence:

```text
bun test tests/ebrain/jobs/token-refresh-worker.test.ts
# 4 pass, 0 fail, 11 expect() calls
```

The test inspects real `enterprise_oauth_tokens` rows for skip behavior, encrypted refreshed access-token writes, unchanged far-future and already-expired tokens, and per-token error isolation.

### fact-fence-emitter

- Implemented `src/ebrain/sources/transformers/fact-fence-emitter.ts` using canonical gbrain facts helpers.
- `emitFactFence(facts)` directly returns `renderFactsTable(facts)`.
- No custom marker, YAML parser, or second wrapper was introduced.
- Re-exported canonical `FACTS_FENCE_BEGIN`, `FACTS_FENCE_END`, and `parseFactsFence` from the emitter module for downstream callers/tests.

Evidence:

```text
bun test tests/ebrain/sources/
# fact-fence-emitter.test.ts included in 25 pass, 0 fail, 70 expect() calls
```

The test asserts:

- Output includes the real imported gbrain begin/end markers.
- `parseFactsFence(emitFactFence(facts)).facts` round-trips to the original facts.
- Legacy 10-column and typed 14-column table branches render correctly.
- Begin/end markers each appear exactly once, defending against nested marker output.

## Files Changed

```text
src/commands/jobs.ts
src/ebrain/apps/base/token-manager.ts
src/ebrain/types.ts
src/ebrain/sources/ingest-common.ts
src/ebrain/sources/circuit-breaker.ts
src/ebrain/sources/index.ts
src/ebrain/sources/transformers/fact-fence-emitter.ts
src/ebrain/sources/transformers/index.ts
src/ebrain/jobs/token-refresh-worker.ts
src/ebrain/jobs/index.ts
tests/ebrain/apps/base/types.test.ts
tests/ebrain/sources/ingest-common.test.ts
tests/ebrain/sources/circuit-breaker.test.ts
tests/ebrain/sources/fact-fence-emitter.test.ts
tests/ebrain/jobs/token-refresh-worker.test.ts
STAGE-SUMMARY.md
```

No `src/core/*` or `src/mcp/*` files were edited in B2.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| Resume state | PASS | branch `ebrain-mvp`; HEAD `e919261a`; expected unstaged B2 changes present after interrupted session |
| B1-L-001 focused test | PASS | `bun test tests/ebrain/apps/base/types.test.ts` -> 13 pass, 0 fail |
| B1-L-002 grep guard | PASS | only canonical re-export line remains; standalone `EnterpriseApp` / `EnterpriseConnector` / `TokenKind` definitions absent |
| `bun run typecheck` | PASS | `tsc --noEmit` exited 0 |
| B2 sources focused tests | PASS | `bun test tests/ebrain/sources/` -> 25 pass, 0 fail, 70 expect() calls; includes ingest-common, circuit-breaker, and fact-fence-emitter |
| B2 token-refresh focused test | PASS | 4 pass, including encrypted DB write, already-expired skip, and per-token error isolation |
| `bun test tests/ebrain/` | PASS | 70 pass, 0 fail, 175 expect() calls |
| `bun test tests/ebrain/apps/base/` | PASS | 13 pass, 0 fail, 27 expect() calls |
| Minions handler registration smoke | PASS | `bun test test/handlers.test.ts` -> 8 pass, 0 fail, 39 expect() calls; confirms `registerBuiltinHandlers` still boots after adding `ebrain-token-refresh` |
| `bun test test/operations*.test.ts test/parity.test.ts` | PASS | 57 pass, 0 fail, 995 expect() calls |
| `bun run verify` | PASS | privacy/proposal PII/test names/JSONB/source-id/progress/test-isolation/WASM/admin build/admin scope/CLI/system-of-record/eval glossary/synthetic corpus/typecheck all exited 0 |

## Invariant Notes

- I-05: `fact-fence-emitter` uses gbrain `renderFactsTable` directly; no private marker or double wrapper.
- I-09: ingest-common, circuit-breaker, and token-refresh logic are vendor-neutral and contain no Feishu/DingTalk/WeCom/Tencent Meeting/CRM-specific branches.
- I-12: B2 did not edit `src/core/*` or `src/mcp/*`.

## New Dependencies

- Root package dependencies: none.
- Root lockfile changes: none.
- `bun add` / `npm install` new dependency actions: none.

# Stage C2: DingTalk EnterpriseApp Complete Implementation

## Status

- Stage: C2 DingTalk EnterpriseApp
- Branch: `ebrain-mvp`
- Baseline: `869a02c1` (`Stage B2: ingest-common + Circuit Breaker + Token Refresh + B1 follow-up`)
- Scope: DingTalk-only implementation; no gbrain core, Feishu, WeCom, Tencent Meeting, or CRM app edits
- Result: PASS locally with reviewer round completed and no remaining findings

## Implementation

C2 adds a concrete DingTalk adapter under `src/ebrain/apps/dingtalk/`:

- `DingtalkEnterpriseApp` composes `tokenManager`, `rateLimiter`, `webhookHandler`, `botAdapter`, and five sub-connectors.
- `DingtalkTokenManager` uses the DingTalk v1.0 token endpoint `POST https://api.dingtalk.com/v1.0/oauth2/accessToken`, decrypts the configured app secret, encrypts stored access tokens, and throws `not yet implemented` for `app_access`, `user_access`, and `refresh`.
- `DingtalkWebhookHandler` supports timestamp/nonce signature verification, `msg_signature` encrypted callback verification, 5 minute replay rejection, in-memory accepted-signature replay cache, DingTalk AES-CBC NoPadding with 32-byte PKCS7 padding, encrypted decode, and encrypted success response helper.
- `DingtalkRateLimiter` uses `subagent_rate_leases`, per-tier internal keys, per-key transaction advisory locks, and endpoint-specific limits.
- `DingtalkBotAdapter` supports in-memory mention registration, robot group replies, work notifications, app/tenant/user tier rate limiting, and `executives.push_preferences.dingtalk.disabled_at` opt-out precheck and persistence.
- Sub-connectors implemented: `dingtalk-im`, `dingtalk-docs`, `dingtalk-drive`, `dingtalk-calendar`, `dingtalk-meeting`.

## B2 Reuse

All five sub-connectors route through B2 shared modules:

```text
grep -nE "upsertEnterpriseObject|markIngestError|checkCircuit" src/ebrain/apps/dingtalk/sub-connectors/*.ts | wc -l
# 33
```

The connector path uses:

- `upsertEnterpriseObject` for every produced `EnterpriseIngestObject`.
- `checkCircuit` before work.
- `markIngestError` for transform/upsert failures and vendor API load failures.
- `resetCircuit` on successful batches.
- `emitFactFence` for DingTalk approval workflow facts inside IM thread content.

## Fixtures

```text
im-messages.json: 50
docs-list.json: 8
drive-files.json: 8
calendar-events.json: 7
meeting-list.json: 6
```

Fixture coverage includes IM thread aggregation, approval workflow metadata, docs markdown, drive metadata with `rawRef`, calendar attendees, meeting recording URLs, and transcript-present / transcript-missing cases.

## Reviewer Evidence

Reviewer was run because C2 is vendor-specific. The review found and drove three fixwaves:

- Fixwave 1: encrypted callback compatibility, connector API-load circuit errors, app+tenant rate-limit acquisition, push opt-out precheck, IM webhook/incremental merge, and calendar fixture timestamp validity.
- Fixwave 2: webhook secret-role hardening, token endpoint rate-limit acquisition, user-tier push rate limit, replyChainId thread stability, singleton-root IM merge, and required-field validation.
- Fixwave 3: per-key DB advisory lock in rate limiter, candidate thread-key preservation during IM merge, all-message IM validation, and DingTalk envelope-shape errors instead of silent empty sync.
- Final reviewer result: `no findings`.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| `bun run typecheck` | PASS | `tsc --noEmit` exit 0 |
| DingTalk focused tests | PASS | `bun test tests/ebrain/apps/dingtalk/` -> 22 pass, 0 fail, 84 expect() calls |
| Ebrain test suite | PASS | `bun test tests/ebrain/` -> 92 pass, 0 fail, 259 expect() calls |
| Core regression tests | PASS | `bun test test/operations*.test.ts test/parity.test.ts` -> 57 pass, 0 fail, 995 expect() calls |
| Full verify | PASS | `bun run verify` -> privacy, PII, JSONB, source-id, progress, isolation, WASM, admin build, CLI, system-of-record, eval glossary, corpus privacy, and typecheck all passed |
| No old DingTalk OAPI | PASS | `grep -n 'oapi.dingtalk.com' src/ebrain/apps/dingtalk/*.ts` -> 0 |
| No hardcoded app secret | PASS | `grep -nE "app_secret|appSecret.*=.*['\"]" src/ebrain/apps/dingtalk/*.ts | grep -v "encrypted" | grep -v "config" | grep -v "interface"` -> empty |
| gbrain core append-only | PASS | `git diff 869a02c1..HEAD -- 'src/core/' 'src/mcp/' 'src/commands/' | grep -cE '^-[^-]'` -> 0 |
| Other app dirs untouched | PASS | diff under `feishu`, `wecom`, `tencent-meeting`, `crm` -> 0 files |

Focused DingTalk test stdout tail:

```text
22 pass
0 fail
84 expect() calls
Ran 22 tests across 10 files. [14.59s]
```

Ebrain suite stdout tail:

```text
92 pass
0 fail
259 expect() calls
Ran 92 tests across 20 files. [279.77s]
```

Core regression stdout tail:

```text
57 pass
0 fail
995 expect() calls
Ran 57 tests across 5 files. [852.00ms]
```

## Diff Stat

Captured before appending this C2 section to `STAGE-SUMMARY.md`:

```text
 enterprise-recipes/dingtalk-to-brain/recipe.md     |  66 +-
 src/ebrain/apps/dingtalk/app.ts                    | 111 +++
 src/ebrain/apps/dingtalk/bot-adapter.ts            | 193 +++++
 .../apps/dingtalk/fixtures/calendar-events.json    | 135 ++++
 src/ebrain/apps/dingtalk/fixtures/docs-list.json   | 106 +++
 src/ebrain/apps/dingtalk/fixtures/drive-files.json | 114 +++
 src/ebrain/apps/dingtalk/fixtures/im-messages.json | 786 +++++++++++++++++++++
 src/ebrain/apps/dingtalk/fixtures/index.ts         |   5 +
 .../apps/dingtalk/fixtures/meeting-list.json       | 122 ++++
 src/ebrain/apps/dingtalk/index.ts                  |  10 +-
 src/ebrain/apps/dingtalk/rate-limit.ts             | 154 ++++
 .../apps/dingtalk/sub-connectors/calendar.ts       | 115 +++
 src/ebrain/apps/dingtalk/sub-connectors/common.ts  | 173 +++++
 src/ebrain/apps/dingtalk/sub-connectors/docs.ts    | 100 +++
 src/ebrain/apps/dingtalk/sub-connectors/drive.ts   | 113 +++
 src/ebrain/apps/dingtalk/sub-connectors/im.ts      | 220 ++++++
 src/ebrain/apps/dingtalk/sub-connectors/index.ts   |   8 +-
 src/ebrain/apps/dingtalk/sub-connectors/meeting.ts | 120 ++++
 src/ebrain/apps/dingtalk/token-manager.ts          | 155 ++++
 src/ebrain/apps/dingtalk/types.ts                  | 138 ++++
 src/ebrain/apps/dingtalk/webhook.ts                | 249 +++++++
 tests/ebrain/apps/dingtalk/app.test.ts             |  48 ++
 tests/ebrain/apps/dingtalk/bot-adapter.test.ts     |  75 ++
 tests/ebrain/apps/dingtalk/helpers.ts              |  80 +++
 tests/ebrain/apps/dingtalk/rate-limit.test.ts      |  45 ++
 .../apps/dingtalk/sub-connectors/calendar.test.ts  |  37 +
 .../apps/dingtalk/sub-connectors/docs.test.ts      |  52 ++
 .../apps/dingtalk/sub-connectors/drive.test.ts     |  37 +
 .../ebrain/apps/dingtalk/sub-connectors/im.test.ts |  77 ++
 .../apps/dingtalk/sub-connectors/meeting.test.ts   |  37 +
 tests/ebrain/apps/dingtalk/token-manager.test.ts   | 104 +++
 tests/ebrain/apps/dingtalk/webhook.test.ts         |  95 +++
 32 files changed, 3873 insertions(+), 7 deletions(-)
```

## Invariant Notes

- I-04: DingTalk emitted objects set or default to `classification = 'L1'`.
- I-09: DingTalk app, token manager, webhook handler, rate limiter, bot adapter, and sub-connectors implement/satisfy the B1 base interfaces.
- I-10: Bot adapter only exposes mention registration/reply/push; D2 remains responsible for remote `OperationContext` dispatch and op allowlist.
- I-12: C2 changed only DingTalk adapter paths, DingTalk recipe, DingTalk fixtures/tests, and this summary.
- No `src/core/*`, `src/mcp/*`, or `src/commands/*` source edits were made.
- No root dependency or lockfile changes; no `bun add` was run.

## Residual Runtime Notes

- C2 is unit/local integration complete. The public webhook route itself is still D2 scope; C2 provides handler capability and connector behavior.
- Real company DingTalk traffic is expected at M-D3 after PM configures the dev callback URL and credentials.
- Fixture data is synthetic but non-empty and vendor-shaped; no production/customer payloads are committed.

# Stage C2 Fixwave Round 1: Webhook HMAC Body Bind

## Status

- Stage: C2 Fixwave Round 1
- Branch: `ebrain-mvp`
- Baseline: `f07b0e75` (`Stage C2: DingTalk EnterpriseApp + 5 sub-connectors + fixtures`)
- Scope: H-001 webhook body binding, M-001 replay regression, L-001 corpId warning
- Result: PASS locally; M-D3 dev deployment blocker H-001 is fixed in code and tests

## Fixes

- H-001: `DingtalkWebhookHandler.verify()` now parses JSON payloads, requires encrypted callback bodies by default, and only allows plaintext fallback when `allowPlaintextWebhook` is explicitly enabled.
- H-001: HMAC input now includes body content as `${timestamp}\n${nonce}\n${bodyContent}`. Plaintext mode signs the raw body; encrypted mode decrypts `encrypt` and signs the decrypted plaintext before comparing `sign` / `msg_signature`.
- H-001: Replay cache key is now `${timestamp}:${nonce}`, so a nonce accepted once cannot be reused with a different signature/body inside the five-minute window.
- M-001: Added same-nonce replay regression coverage to `tests/ebrain/apps/dingtalk/webhook.test.ts`.
- L-001: `DingtalkTokenManager` now warns during construction when `corpId` is absent and token scope will fall back to `"app"`.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| `bun run typecheck` | PASS | `tsc --noEmit` exited 0 |
| DingTalk focused tests | PASS | `bun test tests/ebrain/apps/dingtalk/` -> 27 pass, 0 fail, 90 expect() calls |
| Core regression tests | PASS | `bun test test/operations*.test.ts test/parity.test.ts` -> 57 pass, 0 fail, 995 expect() calls |
| Full verify | PASS | `bun run verify` -> privacy, PII, JSONB, source-id, progress, isolation, WASM, admin build, CLI, system-of-record, eval glossary, corpus privacy, and typecheck all passed |
| H-001 tamper tests | PASS | plaintext tamper, encrypted decrypted-plaintext tamper, and default-plaintext rejection all return `false` |
| M-001 replay test | PASS | same request verifies `true` once and `false` on second use of the nonce |
| L-001 warning test | PASS | missing `corpId` constructor path emits the expected `console.warn` |

## Files Changed

```text
src/ebrain/apps/dingtalk/app.ts
src/ebrain/apps/dingtalk/token-manager.ts
src/ebrain/apps/dingtalk/types.ts
src/ebrain/apps/dingtalk/webhook.ts
tests/ebrain/apps/dingtalk/token-manager.test.ts
tests/ebrain/apps/dingtalk/webhook.test.ts
STAGE-SUMMARY.md
```

## Runtime Notes

- No live DingTalk callback traffic was exercised in this fixwave; validation used local encrypted webhook fixtures and synthetic DingTalk-shaped payloads.
- Public webhook routing and M-D3 dev environment traffic remain the next runtime gate after this blocker fix is deployed.

# Stage C2 Fixwave Round 2: Official Encrypted msg_signature

## Status

- Stage: C2 Fixwave Round 2
- Branch: `ebrain-mvp`
- Baseline: `bd0b76c2` (`Stage C2 Fixwave: webhook HMAC body bind + nonce replay test + corpId warn (H-001+M-001+L-001)`)
- Reviewer report: `/Users/jackwu/Projects/EBRAIN_STAGE_C2_REVIEW_ROUND2.md`
- Scope: R2-H-001 encrypted `msg_signature` compatibility regression
- Result: PASS locally; encrypted DingTalk callbacks again verify with official sorted SHA1 over `encrypt`, while plaintext fallback keeps body-bound HMAC and remains opt-in.

## Fixes

- R2-H-001: `DingtalkWebhookHandler.verify()` now treats encrypted callback bodies as the production path and verifies `msg_signature` with `createDingtalkEncryptedWebhookSignature({ token, timestamp, nonce, encrypt })`.
- R2-H-001: encrypted verification uses DingTalk's official sorted SHA1 algorithm (`sort([token, timestamp, nonce, encrypt])`, concatenate, SHA1 hex) before decrypting the payload.
- H-001 preserved: plaintext fallback still requires `allowPlaintextWebhook=true` and compares body-bound HMAC-SHA256 over `${timestamp}\n${nonce}\n${rawBody}`.
- M-001 preserved: replay cache remains keyed by `${timestamp}:${nonce}` and is only populated after a successful verify.
- L-001 preserved: token manager missing-`corpId` warning remains covered by the DingTalk focused test suite.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| Focused webhook regression | PASS | `bun test tests/ebrain/apps/dingtalk/webhook.test.ts` -> 10 pass, 0 fail, 13 expect() calls |
| DingTalk focused suite | PASS | `bun test tests/ebrain/apps/dingtalk/` -> 28 pass, 0 fail, 92 expect() calls |
| `bun run typecheck` | PASS | `tsc --noEmit` exited 0 |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, isolation, WASM, admin build, admin scope, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |
| R2-H-001 regression | PASS | encrypted request signed with `createDingtalkEncryptedWebhookSignature()` verifies `true`; wrong `msg_signature` and ciphertext tamper verify `false` |
| H-001 plaintext body bind | PASS | plaintext default rejection and plaintext tamper-with-same-sign tests still return `false` |
| M-001 replay | PASS | same request verifies `true` once and `false` on second use of the nonce |

## Files Changed

```text
src/ebrain/apps/dingtalk/webhook.ts
tests/ebrain/apps/dingtalk/webhook.test.ts
STAGE-SUMMARY.md
```

## Runtime Notes

- No live DingTalk callback traffic was exercised in Round 2; validation used synthetic encrypted DingTalk-shaped callback bodies and the repo's official-signature helper.
- M-D3 still needs real dev callback traffic after deploy before claiming production/runtime completion.

# Stage D2: IM Bot Router + Webhook Dispatch

## Status

- Stage: D2
- Branch: `ebrain-mvp`
- Baseline: `cb18c74d8290f9a8a579d2813ff42232bd726e86`
- Scope: shared IM bot router, webhook endpoint registration, subagent dispatch trust boundary, push/reply MVP helpers, and focused D2 tests
- Result: PASS locally. IM webhooks now verify, decode, resolve executive actor, enqueue protected `subagent` work with remote trust context and BOT_ALLOWED_OPS allowlist, then return HTTP 200 without waiting for LLM/tool execution.

## Implementation

- `src/ebrain/bot/router.ts`: implemented shared provider-neutral router, exact six-name `BOT_ALLOWED_OPS`, executive lookup by IM user id, friendly 200 rejection for unknown executive, and fire-and-forget protected subagent enqueue.
- `src/ebrain/bot/intent-classifier.ts`, `src/ebrain/bot/reply-formatter.ts`, `src/ebrain/bot/push-orchestrator.ts`: implemented MVP intent classification, vendor markdown reply shapes, and push routing with `disabled_at` opt-out checks.
- `src/ebrain/webhook/server.ts` plus thin provider handlers: registered Feishu, DingTalk, WeCom, Tencent Meeting, and reconcile POST endpoints; DingTalk app loading is implemented, other app loaders warn and leave endpoints registered for later provider stages.
- `src/commands/serve-http.ts`: appended a Postgres-only lazy registration block using `await import('../ebrain/webhook/server.ts')`; registration failure logs a warning and does not block core serve startup.
- `src/core/minions/types.ts`, `src/core/minions/tools/brain-allowlist.ts`, `src/core/minions/handlers/subagent.ts`: threaded optional Ebrain bot `auth`, `executive`, and `sourceId` into the real subagent tool context so the router allowlist and executive actor are enforced at the actual runtime boundary.
- Tests added/updated: `tests/ebrain/bot/router.test.ts`, `tests/ebrain/webhook/server.test.ts`, `tests/ebrain/bot/push-orchestrator.test.ts`, `tests/ebrain/bot/reply-formatter.test.ts`, `test/brain-allowlist.test.ts`, and `test/subagent-handler.test.ts`.

## Trust Boundary Evidence

- I-10 remote trust path: `src/ebrain/bot/router.ts:69` defines subagent job data with `allowed_tools`, `auth`, `executive`, `sourceId`, and `ctx`; `src/ebrain/bot/router.ts:75` and `src/ebrain/bot/router.ts:208` keep `ctx.remote: true`.
- No local-only bypass: acceptance grep found `ctx.remote.*true = 1` and `ctx.remote.*false = 0` in `src/ebrain/bot/router.ts`.
- Strict op allowlist: `src/ebrain/bot/router.ts:11` defines exactly `search`, `query`, `get_page`, `takes_list`, `list_executives`, and `get_executive_context`; acceptance grep found `takes_list = 1` and `list_takes = 0`.
- Snake-case subagent contract: `src/ebrain/bot/router.ts:71` and `src/ebrain/bot/router.ts:204` use `allowed_tools`; acceptance grep found `allowed_tools = 2` and `allowedTools = 0`.
- Protected submit: `src/ebrain/bot/router.ts:264` uses `submitBotSubagentJob()`, which passes `{ allowProtectedSubmit: true }`; acceptance grep found `allowProtectedSubmit.*true = 2`.
- Router does not dispatch directly: acceptance grep found `dispatchToolCall = 0` in `src/ebrain/bot/router.ts`; dispatch remains inside the subagent handler/tool runtime.
- Unknown executive privacy: `src/ebrain/bot/router.ts:161` sends the friendly access-denied reply and returns `res.status(200)` instead of 403, preventing user-enumeration via response code.
- 3-second webhook SLA: `src/ebrain/bot/router.ts:168` starts subagent enqueue as a detached promise and `src/ebrain/bot/router.ts:172` returns 200 immediately; `tests/ebrain/bot/router.test.ts` covers a never-resolving `submitJob` returning within the local SLA guard.
- Enterprise source confinement: `src/core/minions/tools/brain-allowlist.ts:217` keeps subagent op contexts remote; `src/core/minions/tools/brain-allowlist.ts:218`/`:220` thread bot auth/source; `src/core/minions/tools/brain-allowlist.ts:340` rejects authenticated `source_id='__all__'` or out-of-scope overrides.
- Takes privacy: `src/core/minions/tools/brain-allowlist.ts:70` keeps `takes_list` out of the default registry and explicit-only; `src/core/minions/tools/brain-allowlist.ts:219` sets `takesHoldersAllowList: ['world']` for authenticated bot calls; `src/core/minions/tools/brain-allowlist.ts:373` filters returned take rows back to pages in the authorized enterprise source.
- Exact-page reads: `src/core/minions/tools/brain-allowlist.ts:359` rejects authenticated `get_page` with `fuzzy: true`, avoiding cross-source slug candidate enumeration.
- Reconcile endpoint guard: `src/ebrain/webhook/server.ts:50` requires `EBRAIN_WEBHOOK_RECONCILE_TOKEN` before running the reconcile worker, so the public maintenance endpoint does not trigger DB work anonymously.
- `serve-http.ts` append-only evidence: `git diff cb18c74d..HEAD -- src/commands/serve-http.ts | grep -cE "^-[^-]"` returned `0`; lazy import evidence `grep -n "await import('../ebrain/webhook/server.ts')" src/commands/serve-http.ts | wc -l` returned `1`.

## Architect Decision

- Spec gap: the 8-round design validation covered `src/mcp/dispatch.ts` and its executive hook, but missed that the subagent handler builds its own `OperationContext` via `src/core/minions/tools/brain-allowlist.ts`. Without this fix, D2 could enqueue a bot subagent with `auth.executiveId`, yet the actual brain tool calls would still run with the old hardcoded subagent context and bypass the executive actor/source boundary.
- Authorized scope: `src/core/minions/types.ts` added only optional `SubagentHandlerData.auth`, `SubagentHandlerData.executive`, and `SubagentHandlerData.sourceId` fields with JSDoc marking them as Ebrain bot optional fields. `src/core/minions/tools/brain-allowlist.ts` now prefers those optional values and falls back to existing hardcoded defaults when absent.
- Required glue exception: `src/core/minions/handlers/subagent.ts` passes the optional fields and `allowed_tools` from `SubagentHandlerData` into `buildBrainTools()`. This is outside the literal two-file authorization list, but it is the minimal runtime glue needed for the authorized `brain-allowlist.ts` fallback path to receive the data. Existing gbrain callers that leave these fields undefined keep the old behavior.
- Append-only evidence: `git diff -- src/core/minions/types.ts | grep -cE "^-[^-]"` returned `0`; all new fields are optional and existing required fields/signatures were not removed.
- Risk: upstream gbrain changes to `SubagentHandlerData` or subagent tool context construction may conflict with this fork-specific extension. Mitigation: optional fields plus fallback behavior minimize the conflict surface and preserve current gbrain subagent runtime tests.
- Follow-up: for the v0.32.0 Ebrain release, consider a PR back to gbrain to make subagent job `auth`/`executive`/`sourceId` threading a first-class core capability instead of an Ebrain-specific fork delta.

## Reviewer Fixwave

- Independent reviewer found H-001 risk: making `takes_list` bot-allowed without `takesHoldersAllowList` and source filtering could expose takes outside the enterprise source. Fix: keep `takes_list` out of default `BRAIN_TOOL_ALLOWLIST`, allow it only when an authenticated trusted submitter explicitly requests it, set `takesHoldersAllowList: ['world']`, and post-filter take rows to pages whose `source_id` is authorized.
- Independent reviewer found H-002 risk: bot `query` could try `source_id='__all__'` and escape enterprise source scope. Fix: authenticated subagent tool calls reject `__all__` and any source outside `auth.allowedSources` / `ctx.sourceId` before invoking the operation.
- Independent reviewer found M-001 risk: authenticated `get_page` with `fuzzy: true` could enumerate cross-source slug candidates. Fix: authenticated subagent `get_page` rejects fuzzy resolution and requires exact slug reads.
- Independent reviewer found M-002 risk: `/webhook/reconcile` was a public trigger. Fix: the route now requires `EBRAIN_WEBHOOK_RECONCILE_TOKEN` through `x-ebrain-reconcile-token` or `Authorization: Bearer ...` before scheduling reconcile work.
- Independent reviewer noted `src/core/minions/handlers/subagent.ts` as a medium-scope exception; this summary documents why it is required runtime glue and records the regression suite evidence below.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| `git status` start | PASS | Worktree was clean at baseline `cb18c74d`; branch `ebrain-mvp` |
| `bun run typecheck` | PASS | `tsc --noEmit` exited 0 |
| D2 focused tests | PASS | `bun test tests/ebrain/bot/ tests/ebrain/webhook/` -> 16 pass, 0 fail, 51 expect() calls |
| Focused reviewer regressions | PASS | `bun test test/brain-allowlist.test.ts tests/ebrain/webhook/server.test.ts tests/ebrain/bot/router.test.ts test/subagent-handler.test.ts` -> 51 pass, 0 fail, 151 expect() calls |
| Subagent/runtime regression | PASS | `bun test test/subagent*.test.ts test/minions*.test.ts test/agent-cli*.test.ts` -> 317 pass, 0 fail, 821 expect() calls |
| Core gbrain regression | PASS | `bun test test/operations*.test.ts test/parity.test.ts test/cli.test.ts` -> 74 pass, 0 fail, 1037 expect() calls |
| DingTalk C2 regression | PASS | `bun test tests/ebrain/apps/dingtalk/` -> 28 pass, 0 fail, 92 expect() calls |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, isolation, WASM, admin build, admin scope, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |
| I-10 greps | PASS | `ctx.remote.*true = 1`, `ctx.remote.*false = 0`, `dispatchToolCall = 0` in `src/ebrain/bot/router.ts` |
| BOT_ALLOWED_OPS greps | PASS | `takes_list = 1`, `list_takes = 0`; tests also verify all 6 names against `operations.ts` or spec |
| subagent data greps | PASS | `allowed_tools = 2`, `allowedTools = 0`, `allowProtectedSubmit.*true = 2` in `src/ebrain/bot/router.ts` |
| append-only greps | PASS | `serve-http.ts` deletion count `0`; `types.ts` deletion count `0`; lazy webhook import count `1` |

## Files Changed

```text
src/commands/serve-http.ts
src/core/minions/handlers/subagent.ts
src/core/minions/tools/brain-allowlist.ts
src/core/minions/types.ts
src/ebrain/bot/index.ts
src/ebrain/bot/intent-classifier.ts
src/ebrain/bot/push-orchestrator.ts
src/ebrain/bot/reply-formatter.ts
src/ebrain/bot/router.ts
src/ebrain/webhook/dingtalk-handler.ts
src/ebrain/webhook/feishu-handler.ts
src/ebrain/webhook/index.ts
src/ebrain/webhook/reconcile-worker.ts
src/ebrain/webhook/server.ts
src/ebrain/webhook/tencent-meeting-handler.ts
src/ebrain/webhook/wecom-handler.ts
test/brain-allowlist.test.ts
test/subagent-handler.test.ts
tests/ebrain/bot/push-orchestrator.test.ts
tests/ebrain/bot/reply-formatter.test.ts
tests/ebrain/bot/router.test.ts
tests/ebrain/webhook/server.test.ts
STAGE-SUMMARY.md
```

## Runtime Notes

- No live DingTalk/Feishu/WeCom/Tencent Meeting callback traffic was exercised in this D2 local run; validation used local synthetic webhook fixtures and unit/integration tests.
- The realistic end-to-end path proven locally is: decoded IM event -> executive lookup -> protected subagent job data -> real subagent handler -> brain tool context with enterprise source/auth. `test/subagent-handler.test.ts` confirms a real subagent handler tool call sees enterprise source content and does not surface default-source content.
- M-D3 remains the first live webhook runtime gate after PM configures the dev callback URL and credentials; do not claim production traffic completion from D2 alone.

# Stage F1: Fact Conflict Detection

## Status

- Stage: F1
- Branch: `ebrain-mvp`
- Baseline: `0025ce21ce24140b8225d5b9d6cda2f6783998f5`
- Scope: enterprise fact conflict detection on gbrain `facts` via `enterprise_fact_claims_view`, canonical conflict hash, winner helper, and thin enterprise extract-facts wrapper
- Result: PASS locally. The detector reads the v200 `enterprise_fact_claims_view`, groups by `entity_slug + claim_metric`, writes open rows to `enterprise_fact_conflicts` with `ON CONFLICT (entity_slug, fact_key, conflict_hash) DO NOTHING`, and does not resolve conflicts automatically.

## Implementation

- `src/ebrain/conflicts/detect.ts`: implemented `detectFactConflicts(ctx)` against `enterprise_fact_claims_view`, including `competing_values`, evidence slugs, stable conflict hash, and insert-vs-skip accounting.
- `src/ebrain/conflicts/conflict-hash.ts`: implemented sha256 canonicalization with source/value fingerprints sorted for order-independent hashes.
- `src/ebrain/conflicts/choose-winner.ts`: implemented `factAuthority` source-priority winner selection, confidence fallback, and null-on-tie behavior for ops manual resolution.
- `src/ebrain/cycle/extract-facts-enterprise.ts`: implemented a thin wrapper around gbrain `runExtractFacts`, defaulting to `sourceId='enterprise'`, threading page/slugs, and returning enterprise context fields from the view rather than parsing fences itself.
- Tests added: `tests/ebrain/conflicts/detect.test.ts`, `tests/ebrain/conflicts/conflict-hash.test.ts`, `tests/ebrain/conflicts/choose-winner.test.ts`, `tests/ebrain/conflicts/round-trip.test.ts`, and `tests/ebrain/cycle/extract-facts-enterprise.test.ts`.

## Evidence

| Check | Result | Evidence |
|---|---|---|
| Start state | PASS | `git rev-parse --abbrev-ref HEAD` -> `ebrain-mvp`; `git rev-parse HEAD` -> `0025ce21ce24140b8225d5b9d6cda2f6783998f5`; initial `git status --short` was empty |
| Real exports verified | PASS | `grep -nE "^export (async )?(function|const)" src/core/facts-fence.ts` confirmed `FACTS_FENCE_BEGIN`, `FACTS_FENCE_END`, `parseFactsFence`, `renderFactsTable`, `upsertFactRow`, and `stripFactsFence`; `src/core/cycle/extract-facts.ts` exports `runExtractFacts`, not `extractFacts` |
| v200 view verified | PASS | `src/core/migrate.ts` defines `enterprise_fact_claims_view` from `facts` joined to `pages`, including `claim_metric`, `claim_value`, `confidence`, `enterprise_source_type`, and `observed_at` |
| F1 targeted tests | PASS | `bun test tests/ebrain/conflicts/ tests/ebrain/cycle/` -> 12 pass, 0 fail, 30 expect() calls |
| Runtime artifact inspection | PASS | `detect.test.ts` seeds PGLite `facts` rows for `acme/arr` from `salesforce=120` and `erp=124`; `detectFactConflicts` inserts 1 real `enterprise_fact_conflicts` row, inspects `competing_values`, `status='open'`, null winner fields, evidence slugs, then a second run returns `conflictsInserted: 0` |
| Typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, isolation, WASM, admin build, admin scope, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |
| Existing facts regressions | PASS | `bun test test/facts-fence.test.ts test/facts-fence-typed.test.ts test/extract-facts-phase.test.ts test/facts-extract.test.ts test/facts-extract-smoke.test.ts test/facts-extract-silent-no-op.test.ts` -> 84 pass, 0 fail, 237 expect() calls |
| Private parser absent | PASS | `find src/ebrain -name "fence-parser*"` returned no files |
| Canonical fence helpers | PASS | `grep -nE "renderFactsTable|FACTS_FENCE_BEGIN|FACTS_FENCE_END|parseFactsFence" src/ebrain/conflicts/* src/ebrain/cycle/*` returned 6 matches in `extract-facts-enterprise.ts`; no marker strings were hand-built |
| Core contract unchanged | PASS | `git diff 0025ce21..HEAD -- 'src/core/' 'src/mcp/' 'src/commands/'` returned empty |

## Files Changed

```text
src/ebrain/conflicts/choose-winner.ts
src/ebrain/conflicts/conflict-hash.ts
src/ebrain/conflicts/detect.ts
src/ebrain/conflicts/index.ts
src/ebrain/cycle/extract-facts-enterprise.ts
tests/ebrain/conflicts/choose-winner.test.ts
tests/ebrain/conflicts/conflict-hash.test.ts
tests/ebrain/conflicts/detect.test.ts
tests/ebrain/conflicts/round-trip.test.ts
tests/ebrain/cycle/extract-facts-enterprise.test.ts
STAGE-SUMMARY.md
```

## Runtime Notes

- No private Ebrain fence parser was created. Round-trip tests call gbrain `renderFactsTable` directly and assert the begin/end markers occur exactly once, preserving the R5-M-001 no-double-wrap guard.
- `detectFactConflicts` does not call `chooseWinningClaim` and does not set `winning_value` / `winning_source`; conflict resolution remains an ops/manual workflow.
- The requested `test/extract-facts.test.ts` file is not present in this repo snapshot; the actual gbrain facts extraction regression files present under `test/` were run instead and passed.

# Stage F1 Fixwave Round 1: conflict_hash source-identity dedupe

## Status

- Stage: F1 Fixwave Round 1
- Branch: `ebrain-mvp`
- Baseline: `2c4b14f35c1187d11069144e2b8319f526e73db4`
- Reviewer finding: F1-H-001
- Scope: make `conflict_hash` depend on distinct normalized competing values only, while preserving source evidence in `enterprise_fact_conflicts.competing_values`
- Result: PASS locally. A corroborating source for an already-competing value now produces the same `conflict_hash` and does not add a duplicate `enterprise_fact_conflicts` row.

## Fix

- `src/ebrain/conflicts/conflict-hash.ts`: changed the canonical hash input from sorted `sourceType|value` evidence fingerprints to sorted and deduped stable JSON values.
- `sourceType` remains in the public hash args and, for inserted conflict rows, still flows through `detectFactConflicts()` into `competing_values`; it is intentionally ignored by `computeConflictHash()`.
- `tests/ebrain/conflicts/conflict-hash.test.ts`: added F1-H-001 regression coverage for a corroborating source, source order independence, and different distinct values.
- `tests/ebrain/conflicts/detect.test.ts`: added a PGLite-backed regression proving a second detect after `finance-dwh=124` returns `conflictsInserted: 0` and leaves one conflict row for `acme`.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| Start state | PASS | `git rev-parse HEAD` -> `2c4b14f35c1187d11069144e2b8319f526e73db4`; initial `git status --short` was empty |
| F1-H-001 hash regression | PASS | `bun test tests/ebrain/conflicts/` -> 15 pass, 0 fail, 32 expect() calls |
| Runtime artifact inspection | PASS | `detect.test.ts` seeds PGLite `facts` rows for `salesforce=120`, `erp=124`, then `finance-dwh=124`; second detect returns `{ conflictsDetected: 1, conflictsInserted: 0 }` and `COUNT(*)::int` from `enterprise_fact_conflicts` for `acme` is `1` |
| Typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Core diff guard | PASS | `git diff 2c4b14f3 -- 'src/core/' 'src/mcp/' 'src/commands/'` returned empty before commit |

## Files Changed

```text
src/ebrain/conflicts/conflict-hash.ts
tests/ebrain/conflicts/conflict-hash.test.ts
tests/ebrain/conflicts/detect.test.ts
STAGE-SUMMARY.md
```

## Runtime Notes

- No production/staging conflict detector traffic was exercised in this fixwave. The end-to-end evidence is local PGLite schema migration plus real `facts` inserts, real `detectFactConflicts(ctx)` calls, and direct SQL inspection of the produced `enterprise_fact_conflicts` row.
- Existing `ON CONFLICT (entity_slug, fact_key, conflict_hash) DO NOTHING` behavior remains unchanged; the fix makes the conflict hash stable when new source evidence corroborates an existing distinct value.

# Stage F2: Enterprise Cycle 6 Phase + Shard Partition

## Status

- Stage: F2
- Branch: `ebrain-mvp`
- Baseline: `388231e5`
- Scope: independent Ebrain enterprise cycle with 8 shard Minions fan-out, SQL `hashtext(slug)` shard queries, compiled truth refresh, and Stage F2 executive brief stub.
- Result: PASS locally. F2 does not modify gbrain dream-cycle core and does not generate real executive brief content before E2.

## Implementation

- `src/ebrain/cycle/shard.ts`: added `SHARD_COUNT = 8`, shard index validation, and SQL-side `hashtext(slug)` shard listing with negative modulo normalization.
- `src/ebrain/cycle/refresh-entity-aliases.ts`: added a narrow phase-2 alias refresh for entity pages in the shard from page title/frontmatter aliases into `enterprise_entity_aliases`.
- `src/ebrain/cycle/refresh-compiled-truth.ts`: added shard-scoped entity page scan, fact grouping from `enterprise_fact_claims_view`, `chooseWinningClaim` integration, and `putPage` write-back to `frontmatter.compiled_truth`.
- `src/ebrain/cycle/precompute-briefs.ts`: implemented the required F2 stub only; it logs `stub - awaiting E2 wire` and returns `{ briefsGenerated: 0 }`.
- `src/ebrain/jobs/dream-cycle-enterprise.ts`: implemented parent/child handler paths. Parent jobs submit 8 `ebrain-enterprise-cycle-shard` child jobs with `on_child_fail: 'continue'`, persist child ids, and aggregate `child_done` inbox results. Child jobs run the 6 phases in order with per-phase try/catch so a phase error does not block later phases.
- `src/commands/jobs.ts`: appended lazy registration for `ebrain-enterprise-cycle` and `ebrain-enterprise-cycle-shard` using the same lazy import pattern as prior Ebrain job handlers.
- `enterprise-recipes/cron/enterprise-cron.yml`: added the daily 3am enterprise-cycle example cron with `enterprise-cycle:{{date}}` idempotency key template.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| Start state | PASS | `git status --short` was empty; `git rev-parse --short HEAD` -> `388231e5`; `git branch --show-current` -> `ebrain-mvp` |
| Shard distribution | PASS | Fixwave R1 `bun test tests/ebrain/cycle/shard.test.ts` -> 2 pass, 0 fail, 17 expect() calls; 10000 mock pages were partitioned by real PGLite/PG `hashtext` through `listSlugsInShard` and stayed within 1250 +/- 10% per shard |
| F2 targeted tests | PASS | Fixwave R1 `bun test tests/ebrain/cycle/ tests/ebrain/jobs/` -> 14 pass, 0 fail, 64 expect() calls |
| Runtime artifact inspection | PASS | `refresh-compiled-truth.test.ts` runs a real PGLite v200 schema, inserts an entity page plus `salesforce=120` and `erp=124` typed facts, runs `refreshCompiledTruth`, then directly reads the produced page frontmatter: `compiled_truth.arr = { value: 124, source: 'erp' }` |
| 6 phase order and phase isolation | PASS | `dream-cycle-enterprise.test.ts` mocks all 6 phase functions, forces phase 3 to throw, and verifies observed order `phase 1 -> phase 2 -> phase 3 -> phase 4 -> phase 5 -> phase 6` with `failedPhases: 1` and later phases still counted |
| Parent/child fan-out | PASS | `dream-cycle-enterprise.test.ts` verifies parent path submits 8 `ebrain-enterprise-cycle-shard` jobs with shard indexes 0..7 and `on_child_fail: 'continue'`; aggregation counts 7 completed and 1 failed child without blocking siblings |
| Phase 6 stub | PASS | `rg -n "stub - awaiting E2|Stage F2 stub" src/ebrain/cycle/precompute-briefs.ts` shows the JSDoc stub marker and the runtime log line |
| Handler registration | PASS | `rg -n "ebrain-enterprise-cycle|ebrain-enterprise-cycle-shard" src/commands/jobs.ts src/ebrain/jobs/dream-cycle-enterprise.ts enterprise-recipes/cron/enterprise-cron.yml` shows both registered job names and cron job_name |
| Typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, isolation, WASM, admin build, admin scope, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |
| gbrain core/mcp untouched | PASS | `git diff 388231e5..HEAD -- 'src/core/' 'src/mcp/'` returned empty |
| `src/commands/jobs.ts` append-only guard | PASS | `git diff -- src/commands/jobs.ts | grep -cE '^-[^-]'` -> `0` deletions |

## Files Changed

```text
enterprise-recipes/cron/enterprise-cron.yml
src/commands/jobs.ts
src/ebrain/cycle/index.ts
src/ebrain/cycle/precompute-briefs.ts
src/ebrain/cycle/refresh-compiled-truth.ts
src/ebrain/cycle/refresh-entity-aliases.ts
src/ebrain/cycle/shard.ts
src/ebrain/jobs/dream-cycle-enterprise.ts
tests/ebrain/cycle/refresh-compiled-truth.test.ts
tests/ebrain/cycle/refresh-entity-aliases.test.ts
tests/ebrain/cycle/shard.test.ts
tests/ebrain/jobs/dream-cycle-enterprise.test.ts
STAGE-SUMMARY.md
```

## Runtime Notes

- F2 phase 6 is intentionally a stub because E2 is not implemented yet. It does not write placeholder brief files and does not fabricate executive brief content.
- Parent fan-out uses Minions child jobs. In the real worker path the parent first submits children and persists `childJobIds`; after child terminal transitions emit `child_done`, the parent aggregates the inbox on its next claim.
- Phase 4 currently calls the F1 `detectFactConflicts(ctx)` as delivered. That F1 function is global rather than shard-filtered, so F2 relies on the F1 conflict-hash dedupe for repeated shard invocations until a later stage adds a shard-aware detector contract.
- No production or staging cron traffic was exercised in this local run. The end-to-end evidence is local PGLite runtime output plus Minions fan-out/aggregation unit coverage.

## Fixwave R1

- Scope: fixed reviewer M-001 and L-001 only; reviewer M-002 remains a known issue because changing `detectFactConflicts(ctx)` to a shard-scoped F1 contract is out of this fixwave.
- M-001: `refreshEntityAliases` and `refreshCompiledTruth` now accept optional `changedSlugs`; `changedSlugs: []` returns `{ aliasesRefreshed: 0 }` / `{ pagesUpdated: 0 }` before scanning or writing, while omitted `changedSlugs` preserves the original full-shard behavior.
- M-001 wiring: `dream-cycle-enterprise.ts` passes phase-1 `changedSlugs` into phase 2 alias refresh and phase 5 compiled-truth refresh, so an empty changed scan no longer causes alias or compiled-truth writes.
- L-001: removed the TS-side SHA-256 `computeShard()` helper/export; `shard.test.ts` now verifies the production `hashtext` path by inserting 10000 PGLite pages and reading each shard through `listSlugsInShard`.
- Evidence: `bun run typecheck` exited 0; `bun test tests/ebrain/cycle/ tests/ebrain/jobs/` -> 14 pass, 0 fail, 64 expect() calls; `bun run verify` exited 0; `grep -rn "computeShard" src/` returned empty; `git diff a081a024 -- 'src/core/' 'src/mcp/' --stat` returned empty.

# Stage E1: Executives CRUD + Profile Loader

## Status

- Stage: E1
- Branch: `ebrain-mvp`
- Baseline: `7823e548`
- Scope: executives CRUD, DB-backed `loadExecutiveProfile`, prompt assembly from executive-local files, CLI entrypoint, and I-07 sync-exclusion documentation.
- Result: PASS locally. E1 keeps the v200 schema unchanged and does not touch `src/core/` or `src/mcp/`.

## Implementation

- `src/ebrain/executives/derive-paths.ts`: added `derivePathsFromSoulPath(soulPath, executiveId)` for the PM-approved convention: `SOUL.md` siblings derive `AGENT_PERSONA.md`, `USER.md`, `preferences.yml`, `personal-skills/`, and `subagentName = executive_id`.
- `src/ebrain/executives/load-profile.ts`: replaced the A4 null stub with a real `SELECT ... FROM executives WHERE executive_id = $1 AND deleted_at IS NULL`; retained `_setLoadExecutiveProfileForTest`.
- `src/ebrain/executives/create.ts` and `src/ebrain/executives/update.ts`: added insert/update helpers with JSONB/text-array binding, `deleted_at IS NULL` update guard, and `updated_at = now()`.
- `src/ebrain/executives/load-prompt.ts`: added filesystem-only prompt assembly in the required order: SOUL -> USER -> AGENT_PERSONA -> preferences YAML block -> sorted `personal-skills/*.md` -> optional subagent body.
- `src/ebrain/executives/soul-audit-enterprise.ts`: added `auditExecutive(engine, executiveId)` to validate the four required files: SOUL, USER, AGENT_PERSONA, and preferences.
- `src/commands/executives.ts` and `src/cli.ts`: added `gbrain executives create/list/validate/update` via the command helper; `src/cli.ts` was append-only.
- `src/ebrain/executives/gbrain-yml-defaults.md`: documented `sync.exclude_globs` for `executives/*/SOUL.md`, `USER.md`, `preferences.yml`, and `personal-skills/**` so personal SOUL material does not enter the brain index.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| Start state | PASS | `git status --short --branch` showed `## ebrain-mvp...origin/ebrain-mvp`; `git rev-parse HEAD` -> `7823e548f4fb11228e7c77f2074354e59afd7e2d`; `git branch --show-current` -> `ebrain-mvp` |
| Derived paths | PASS | `bun test tests/ebrain/executives/` includes `derive-paths.test.ts`; `executives/ceo/SOUL.md` derives `executives/ceo/AGENT_PERSONA.md`, `USER.md`, `preferences.yml`, `personal-skills/`, and `subagentName: ceo` |
| DB-backed profile loader | PASS | `load-profile.test.ts` inserts a real PGLite v200 `executives` row, calls `loadExecutiveProfile`, verifies derived paths and `pushPreferences`, verifies soft-deleted rows return `null`, and verifies `_setLoadExecutiveProfileForTest` still works |
| CRUD helpers | PASS | `create.test.ts` verifies INSERT plus lower(email) uniqueness; `update.test.ts` verifies patch persistence, `updated_at` bump, deputies text-array roundtrip, and deleted-row update guard |
| Prompt assembly | PASS | `load-prompt.test.ts` verifies order `SOUL -> USER -> AGENT_PERSONA -> PREFERENCES -> personal-skills`, sorted skills, no `HEARTBEAT.md`, missing preferences default `{}`, and >5 skill cap with `MORE` marker |
| Soul audit | PASS | `soul-audit-enterprise.test.ts` verifies the four required files pass and missing `preferences.yml` fails |
| CLI runtime path | PASS | Temp PGLite brain at `/private/tmp/ebrain-e1-cli.X868kt`: `gbrain executives create ceo --email ceo@company.com --name "测试" --role CEO --soul-path executives/ceo/SOUL.md` -> `created executive ceo`; `list` showed `ceo ceo@company.com 测试 CEO Asia/Shanghai`; `validate ceo` printed PASS for SOUL/USER/AGENT_PERSONA/PREFERENCES; `update ceo --timezone Asia/Tokyo` -> `updated executive ceo`; final `list` showed `Asia/Tokyo` |
| Runtime DB artifact | PASS | Direct PGLite query after CLI flow returned `[{"executive_id":"ceo","email":"ceo@company.com","display_name":"测试","role":"CEO","timezone":"Asia/Tokyo","soul_path":"executives/ceo/SOUL.md","deleted_at":null}]` |
| Focused tests | PASS | `bun test tests/ebrain/executives/` -> 14 pass, 0 fail, 37 expect() calls |
| Typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, isolation, WASM, admin build, admin scope, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |
| No schema migration | PASS | No migration file was added; `executives` continues to use the existing v200 schema |
| gbrain core/mcp untouched | PASS | `git diff 7823e548..HEAD -- 'src/core/' 'src/mcp/' --stat` returned empty |
| `src/cli.ts` append-only guard | PASS | `git diff -- src/cli.ts | grep -cE '^-[^-]'` -> `0` deletions |

## Files Changed

```text
src/commands/executives.ts
src/cli.ts
src/ebrain/executives/create.ts
src/ebrain/executives/derive-paths.ts
src/ebrain/executives/gbrain-yml-defaults.md
src/ebrain/executives/index.ts
src/ebrain/executives/load-profile.ts
src/ebrain/executives/load-prompt.ts
src/ebrain/executives/soul-audit-enterprise.ts
src/ebrain/executives/update.ts
tests/ebrain/executives/create.test.ts
tests/ebrain/executives/derive-paths.test.ts
tests/ebrain/executives/helpers.ts
tests/ebrain/executives/load-profile.test.ts
tests/ebrain/executives/load-prompt.test.ts
tests/ebrain/executives/soul-audit-enterprise.test.ts
tests/ebrain/executives/update.test.ts
STAGE-SUMMARY.md
```

## Runtime Notes

- `loadExecutivePrompt` only reads local files and parses `preferences.yml` with `src/core/yaml-lite.ts`; it does not call an LLM.
- Relative executive paths are resolved against `process.cwd()` by default; the CLI validate path uses `sync.repo_path` when configured and falls back to the current working directory.
- `preferences.yml` is optional for prompt assembly and renders an empty YAML block when missing; `validate` still fails when the required file is absent.
- `personal-skills/` is a one-level scan of sorted `.md` files only. The first five are included; a `MORE` section is appended when additional files are present.
- No production or staging brain was mutated. The runtime evidence used an isolated temporary PGLite brain and direct DB row inspection.

## Fixwave R1

- Scope: fixed reviewer R1 M-001, M-002, and L-001 against E1 commit `7ee115db`; no `src/core/` or `src/mcp/` files changed.
- M-001: `gbrain executives create <id> --email ... --name ... --role ...` now defaults omitted `--soul-path` to `executives/<id>/SOUL.md`; explicit `--soul-path` still overrides.
- M-002: `runExecutives(engine, args)` now returns an exit status. `validate` and `update` return `1` for missing/failed targets, caught create errors return `1`, and `src/cli.ts` exits with `process.exit(await runExecutives(...))`.
- L-001: `derivePathsFromSoulPath` now rejects malformed basenames with `soul_path basename must be SOUL.md, got: <basename>` instead of deriving siblings from a directory-shaped path.
- Tests: added `tests/ebrain/executives/cli-exit-code.test.ts`; extended create and derive-path tests for default `soul_path` and strict basename validation.
- Evidence: `bun run typecheck` exited 0; `bun test tests/ebrain/executives/ 2>&1 | tail -5` -> 18 pass, 0 fail, 51 expect() calls; `bun run verify` exited 0.
- Runtime evidence: isolated temp PGLite CLI run returned `create_exit=0`, `dup_exit=1`, `validate_missing_exit=1`, and `validate_nonexistent_exit=1`; direct throw probe returned `PASS: soul_path basename must be SOUL.md, got: ceo`.
- Charter check: `git diff 7ee115db -- 'src/core/' 'src/mcp/' --stat` returned empty; `src/cli.ts` changed only the existing executives case body (`await runExecutives`/`break` replaced by `process.exit(await runExecutives(...))`).

# Stage G1: Enterprise Operations Surface

## Status

- Stage: G1
- Branch: `ebrain-mvp`
- Baseline: `ba6e2b36`
- Scope: four enterprise Operations, operation descriptions, append-only `operations` registration, focused op tests.
- Result: PASS locally; reviewer R1 fixwave below clears H-001/L-001. G1 keeps v200 schema unchanged and does not edit `src/mcp/tool-defs.ts`.

## Implementation

- `src/ebrain/ops/list-executives.ts`: added `list_executives` (`scope: read`, `localOnly: false`) using E1 executive loaders and returning a sanitized bot-safe profile surface. It strips local prompt paths, access-policy paths, deputies, preference file paths, `morning_brief.time`, `critical_signal.min_severity`, and `critical_signal.quiet_hours`.
- `src/ebrain/ops/get-executive-context.ts`: added `get_executive_context` (`scope: read`, `localOnly: false`) that loads a DB-backed profile, returns the sanitized profile, and assembles the prompt with `loadExecutivePrompt(profile)`. Missing ids throw `OperationError('not_found', ...)`.
- `src/ebrain/ops/enterprise-ingest-status.ts`: added `enterprise_ingest_status` (`scope: admin`, `localOnly: true`) with a fail-closed in-handler `ctx.remote !== false` permission gate. It reads the confirmed v200 table `enterprise_ingest_sources` plus `enterprise_ingest_objects` page counts.
- `src/ebrain/ops/detect-enterprise-conflicts.ts`: added `detect_enterprise_conflicts` (`scope: admin`, `localOnly: true`, `mutating: true`) with a fail-closed in-handler `ctx.remote !== false` permission gate. It wraps F1 `detectFactConflicts(ctx)` and post-filters counts/samples for `entity_slug` without changing the F1 contract.
- `src/ebrain/ops/index.ts`: re-exports all four G1 operations.
- `src/core/operations.ts`: append-only import and array registration under `// G1 (Ebrain): enterprise op surface`.
- `src/core/operations-descriptions.ts`: append-only four description constants for the G1 ops.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| Start state | PASS | `git status --short --branch` showed `## ebrain-mvp...origin/ebrain-mvp`; `git rev-parse --short HEAD` -> `ba6e2b36`; `git branch --show-current` -> `ebrain-mvp` |
| v200 ingest table confirmation | PASS | `rg -n "enterprise_ingest_sources|enterprise_fact_conflicts|executives" src/core/migrate.ts src/core/pglite-schema.ts` confirmed v200 has `enterprise_ingest_sources`, `enterprise_ingest_objects`, `enterprise_fact_conflicts`, and `executives`; no schema migration was added |
| Focused op tests | PASS | Fixwave R1 `bun test tests/ebrain/ops/ 2>&1 \| tail -5` -> 9 pass, 0 fail, 41 expect() calls |
| Runtime list evidence | PASS | `list_executives` test inserts a real PGLite `executives` row and verifies remote=true returns one sanitized active profile with IM ids, redacted pushPreferences, no `min_severity`, no `quiet_hours`, no `morning_brief.time`, and no local path fields |
| Runtime prompt evidence | PASS | `get_executive_context` test assembles a real prompt from temp SOUL/USER/AGENT_PERSONA/preferences/personal-skills files and verifies the returned profile is redacted |
| Runtime ingest evidence | PASS | `enterprise_ingest_status` test inserts a real PGLite ingest source plus objects and observes `{source_id:'dingtalk-main', source_type:'dingtalk', circuit_state:'open', page_count:1}` |
| Runtime conflict evidence | PASS | `detect_enterprise_conflicts` test inserts conflicting enterprise facts, runs the op locally, observes `conflictsDetected=1`, `conflictsInserted=1`, sample `{entity_slug:'acme', fact_key:'arr', status:'open'}`, and directly counts one row in `enterprise_fact_conflicts` |
| Remote trust gates | PASS | `enterprise_ingest_status` and `detect_enterprise_conflicts` tests call handlers with `ctx.remote === true` and `ctx.remote === undefined` and catch `permission_denied`; read ops run with `ctx.remote === true` |
| Scope/localOnly lint | PASS | `bun test tests/ebrain/lint/scope-required.test.ts test/operations-descriptions.test.ts` -> 26 pass, 0 fail, 52 expect() calls |
| Tool schema generation | PASS | `bun test test/mcp-tool-defs.test.ts` -> 9 pass, 0 fail, 243 expect() calls; `buildToolDefs(operations).length === operations.length` |
| Typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, isolation, WASM, admin build, admin scope, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |
| `src/core/operations.ts` append-only guard | PASS | `git diff ba6e2b36 -- src/core/operations.ts | grep -cE '^-[^-]'` -> `0` deletions |
| `src/core/operations-descriptions.ts` append-only guard | PASS | `git diff -- src/core/operations-descriptions.ts | grep -cE '^-[^-]'` -> `0` deletions |
| `src/mcp/tool-defs.ts` untouched | PASS | `git diff -- src/mcp/tool-defs.ts | wc -c` -> `0` |

## Files Changed

```text
src/core/operations-descriptions.ts
src/core/operations.ts
src/ebrain/ops/detect-enterprise-conflicts.ts
src/ebrain/ops/enterprise-ingest-status.ts
src/ebrain/ops/get-executive-context.ts
src/ebrain/ops/index.ts
src/ebrain/ops/list-executives.ts
tests/ebrain/ops/detect-enterprise-conflicts.test.ts
tests/ebrain/ops/enterprise-ingest-status.test.ts
tests/ebrain/ops/get-executive-context.test.ts
tests/ebrain/ops/list-executives.test.ts
STAGE-SUMMARY.md
```

## Runtime Notes

- G1 uses the existing v200 `enterprise_ingest_sources` table name rather than inventing an `enterprise_sources` table; no v201 schema or migration was added.
- The admin local-only ops defend in depth inside the handler with strict `ctx.remote !== false`; `ctx.remote === false` remains the only trusted-local behavior, while true/missing/undefined remote contexts are denied.
- `detect_enterprise_conflicts` keeps the F1 detector global and uses post-filtered reporting for `entity_slug`, preserving the PM decision not to change the F1 function signature in G1.
- `src/mcp/tool-defs.ts` remains untouched; MCP schemas flow from `buildToolDefs(operations)`.

## Fixwave R1

- Baseline: `52b2c4fe`; reviewer R1 `G1-H-001` and `G1-L-001` fixed in one wave.
- H-001: `sanitizePushPreferences` now returns only `{enabled, channel}` for `morning_brief`, `{enabled}` for `critical_signal`, and `{enabled}` for `conflict_alert`; it never returns `min_severity`, `quiet_hours`, or `morning_brief.time`.
- L-001: `enterprise_ingest_status` and `detect_enterprise_conflicts` now reject any context where `ctx.remote !== false`, so direct handler calls with omitted/undefined `remote` fail closed with `permission_denied`.
- Runtime redaction evidence: isolated PGLite `list_executives` run returned `critical_signal: {enabled:true}` and printed `contains_min_severity=false`, `contains_quiet_hours=false`.
- Verification: `git diff 52b2c4fe -- 'src/core/' 'src/mcp/' --stat` returned empty; `bun run typecheck` exited 0; `bun test tests/ebrain/ops/ 2>&1 | tail -5` -> 9 pass, 0 fail, 41 expect() calls; `bun run verify` exited 0.

# Stage E2: Morning Brief Generator + Push Orchestrator

## Status

- Stage: E2
- Branch: `ebrain-mvp`
- Baseline: `897a05ef`
- Scope: executive morning brief job, Stage E2 stub generator, push retry/soft-fail handling, per-executive fan-out, Minions handler registration, cron recipe, focused tests.
- Result: PASS locally. Brief content generation remains an explicit Stage E2 stub and does not call the `executive-daily-brief` skill or any LLM.

## Implementation

- `src/ebrain/jobs/generate-brief-stub.ts`: added the deliberate E2 stub generator. It emits markdown with frontmatter (`executive_id`, `generated_at`, `generator_stage: E2_stub`, `dream_generated: true`), includes `## 今日要点`, and logs `[brief gen stub — awaiting I1]`.
- `src/ebrain/jobs/executive-brief.ts`: implemented `runExecutiveBrief(ctx, { executiveId, dateUtc })`; it loads the DB-backed E1 profile, skips disabled morning briefs, evaluates `HH:MM-HH:MM` quiet hours in the executive IANA timezone, writes the generated brief to a DB page under `briefs/daily/{YYYY-MM-DD}-{executive_id}`, and calls the existing D2 `pushMorningBrief` orchestrator.
- `src/ebrain/jobs/executive-brief.ts`: push failures are retried three times and then handled as a soft failure; the job marks `push_preferences.morning_brief.disabled_at`/`disabled_reason`, logs the permanent failure, and returns `{ pushed: false }` instead of throwing into dead-letter behavior.
- `src/ebrain/jobs/fanout-executive-brief.ts`: added the cron fan-out entry that lists active, non-deleted executives and submits one `ebrain-executive-brief` child job per executive with deterministic idempotency key `executive-brief:{local-date}:{executive_id}`.
- `src/ebrain/jobs/run-enterprise-job.ts`: added the E2-only dispatcher branch for `ebrain-executive-brief`; all other enterprise job names still throw `not_implemented:*` for later stages.
- `src/commands/jobs.ts`: appended lazy Minions registrations for `ebrain-executive-brief` and `ebrain-executive-brief-fanout`, matching the B2/D2/F2 lazy import pattern.
- `enterprise-recipes/cron/enterprise-cron.yml`: appended the daily 8am server-time `ebrain.executive-brief` recipe, with fan-out metadata and child idempotency key template; the existing F2 enterprise-cycle entry is unchanged.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| Start state | PASS | `git status --short --branch` showed `## ebrain-mvp...origin/ebrain-mvp`; `git rev-parse HEAD` -> `897a05efe9aea7befdb21012c667266f3b0653ce`; `git branch --show-current` -> `ebrain-mvp` |
| No new dependency | PASS | `rg -n '"luxon"|luxon|dependencies|devDependencies' package.json` showed no `luxon`; implementation uses native `Intl.DateTimeFormat` |
| Focused job tests | PASS | `bun test tests/ebrain/jobs/` -> 16 pass, 0 fail, 78 expect() calls |
| Runtime DB artifact | PASS | `executive-brief.test.ts` runs a real isolated PGLite v200 brain, inserts an `executives` row and `enterprise` source, runs `runExecutiveBrief`, then directly reads DB page `briefs/daily/2026-05-21-ceo` with frontmatter `{executive_id:'ceo', generator_stage:'E2_stub', dream_generated:true}` and stub body text |
| Disabled preference | PASS | `executive-brief.test.ts` verifies `morning_brief.enabled=false` returns `skipped: 'morning_brief.disabled'` and calls no push/write path |
| Quiet hours and timezone | PASS | `executive-brief.test.ts` verifies `Asia/Shanghai` `22:00-07:00` skips at `2026-05-21T14:30:00.000Z` with `nextEligibleAt=2026-05-21T23:00:00.000Z`, and `Asia/Tokyo` at `2026-05-20T23:00:00.000Z` derives local brief date `2026-05-21` |
| Push soft failure | PASS | `executive-brief.test.ts` forces three failed push results, verifies exactly three attempts, `pushed:false`, and a DB update containing `morning_brief.disabled_at='2026-05-21T00:00:00.000Z'` |
| Fan-out | PASS | `fanout-executive-brief.test.ts` inserts three active executives plus deleted/inactive rows, observes exactly three child submissions with `on_child_fail:'continue'`, and verifies idempotency key `executive-brief:2026-05-21:cto` |
| Typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, isolation, WASM, admin build, admin scope, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |
| gbrain core/mcp untouched | PASS | `git diff 897a05ef..HEAD -- 'src/core/' 'src/mcp/' --stat` returned empty |
| `src/commands/jobs.ts` append-only guard | PASS | `git diff -- src/commands/jobs.ts \| grep -cE '^-[^-]'` -> `0` deletions |
| `enterprise-cron.yml` append-only guard | PASS | `git diff -- enterprise-recipes/cron/enterprise-cron.yml \| grep -cE '^-[^-]'` -> `0` deletions |

## Files Changed

```text
enterprise-recipes/cron/enterprise-cron.yml
src/commands/jobs.ts
src/ebrain/jobs/executive-brief.ts
src/ebrain/jobs/fanout-executive-brief.ts
src/ebrain/jobs/generate-brief-stub.ts
src/ebrain/jobs/index.ts
src/ebrain/jobs/run-enterprise-job.ts
tests/ebrain/jobs/executive-brief.test.ts
tests/ebrain/jobs/fanout-executive-brief.test.ts
STAGE-SUMMARY.md
```

## Runtime Notes

- E2 does not call `executive-daily-brief/SKILL.md`; that remains for I1. The stub log and `generator_stage: E2_stub` frontmatter make the handoff explicit.
- Briefs are written as DB pages via `engine.putPage(..., { sourceId: 'enterprise' })`; E2 does not write markdown files into the brain repo filesystem.
- `dream_generated: true` is present both in the stub markdown frontmatter and the DB page frontmatter so downstream dream-cycle guards can ignore generated brief pages.
- Quiet hours are checked but not waited on. Jobs inside the window return `skipped: 'in_quiet_hours'` plus `nextEligibleAt`; the next cron cycle re-evaluates eligibility.
- Push orchestration is reused from D2 unchanged; E2 adds no LLM path to push code and no schema migration.

## Fixwave R1

- Baseline: `09650395`; reviewer R1 found `E2-M-001`, `E2-M-002`, and `E2-L-001`; all three were fixed in one wave with no `src/core/`, `src/mcp/`, or `src/ebrain/bot/push-orchestrator.ts` changes.
- M-001: `runExecutiveBrief` now reads `pushPreferences.morning_brief.time` as strict `HH:MM` in the executive IANA timezone, defaults missing/undefined time to `08:00`, warns and falls back on invalid values, and returns `{ skipped: 'before_scheduled_time', nextEligibleAt }` when outside the due window.
- M-001 regression coverage: Tokyo `08:00` pushes, Tokyo `07:59` skips with same-day `nextEligibleAt`, Tokyo `08:04` pushes within tolerance, Tokyo `08:06` skips with next-day `nextEligibleAt`, and invalid time `'8'` warns then uses the `08:00` default.
- M-002: `runFanoutExecutiveBrief` wraps each child submission in per-executive `try/catch`, continues later executives after one submit failure, logs failures, and returns `failed_submissions` plus `failures` without throwing when all submissions fail.
- L-001: malformed `quiet_hours` such as `'08:00'` now logs `[executive-brief] invalid quiet_hours format ...` and preserves prior no-quiet-window behavior; undefined `quiet_hours` produces no warning.
- Evidence: `bun run typecheck` exited 0; `bun test tests/ebrain/jobs/ 2>&1 | tail -5` -> 24 pass, 0 fail, 116 expect() calls; `bun run verify` exited 0; `git diff 09650395 -- 'src/core/' 'src/mcp/' --stat` returned empty.

# Stage G2: OAuth executive_id Binding + Config Export

## Status

- Stage: G2
- Branch: `ebrain-mvp`
- Baseline: `9ecf49b5`
- Scope: OAuth client executive binding, AuthInfo executive return fields, admin config export endpoint, CLI binding commands, focused OAuth/export tests.
- Result: PASS locally. DCR remains RFC 7591-compatible with `oauth_clients.executive_id = NULL`; CLI/manual registration now requires a valid active executive.

## Implementation

- `src/core/oauth-provider.ts`: `verifyAccessToken(token)` now extends the existing OAuth token/client JOIN with `LEFT JOIN executives e ON e.executive_id = c.executive_id AND e.deleted_at IS NULL`, returning `executiveId`, `executiveEmail`, and `executiveRole` when the bound executive is active. NULL/legacy clients and soft-deleted executives keep verifying with executive fields undefined.
- `src/core/oauth-provider.ts`: `registerClientManual(...)` now validates a non-empty active `executiveId` and binds the created OAuth client via the new public `bindExecutiveToClient(clientId, executiveId)` method. Invalid executives throw `invalid_executive_id`; missing clients throw `invalid_client_id`.
- `src/core/oauth-provider.ts`: DCR `registerClient(...)` is unchanged and still omits `executive_id`, leaving DCR clients NULL until an admin post-binds them.
- `src/commands/auth.ts`: `gbrain auth register-client` now requires `--executive-id <id>` and prints the executive binding on success. Added `gbrain auth bind-executive <client_id> <executive_id>` for post-binding DCR clients.
- `src/ebrain/sso/exports.ts`: added Claude Desktop, Cursor, and generic JSON export helpers. All return pasteable JSON strings with `client_id`, `client_secret`, MCP URL, OAuth authorize/token/register/revoke/metadata endpoints, scopes, and registration metadata where applicable.
- `src/ebrain/sso/bind-executive.ts`: added the Ebrain SSO wrapper around the provider binding method so CLI/admin code can call one testable helper.
- `src/commands/serve-http.ts`: added `GET /admin/api/clients/:id/export?format=claude-desktop|cursor|json` behind admin cookie auth. Invalid format returns 400; no admin session returns 403 for this endpoint; successful responses are `application/json` bodies produced by the export helpers.
- `src/commands/serve-http.ts`: existing admin client registration now requires `executiveId` in the request body and forwards it to `registerClientManual`, preserving the new manual-registration invariant.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| Start state | PASS | `git status --short --branch` showed `## ebrain-mvp...origin/ebrain-mvp`; `git rev-parse HEAD` -> `9ecf49b589bd993f72d8522df33c54b1d590c4aa` |
| Typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Focused OAuth/export tests | PASS | `bun test tests/ebrain/oauth/` -> 17 pass, 0 fail, 65 expect() calls |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, isolation, WASM, admin build, admin scope, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |
| CLI missing executive | PASS | Temp PGLite run: `gbrain auth register-client foo --grant-types client_credentials --scopes read` exited 1 and printed `Error: --executive-id <id> is required` |
| CLI bound executive | PASS | Temp PGLite run after `executives create ceo`: `gbrain auth register-client foo --executive-id ceo --grant-types client_credentials --scopes read` exited 0 and printed `Executive ID:     ceo` |
| DCR NULL compatibility | PASS | `register-client-executive-required.test.ts` calls the provider DCR store path, then reads `oauth_clients.executive_id` as SQL NULL |
| verifyAccessToken executive JOIN | PASS | `verify-access-token-executive.test.ts` mints a real PGLite OAuth token for a client bound to `ceo`; `verifyAccessToken` returns `executiveId='ceo'`, `executiveEmail='ceo@example.test'`, and `executiveRole='CEO'` |
| Legacy NULL compatibility | PASS | `verify-access-token-executive.test.ts` mints a DCR client with NULL `executive_id`; `verifyAccessToken` still succeeds and returns executive fields undefined |
| Soft-deleted executive compatibility | PASS | `verify-access-token-executive.test.ts` soft-deletes the bound executive before verification; the token still verifies and `executiveId` is undefined |
| Post-bind DCR client | PASS | `bind-executive-to-client.test.ts` creates a DCR client, runs `bindExecutiveToClient`, mints a token, and verifies returned executive fields |
| Export formats | PASS | `exports.test.ts` parses all three helper outputs as JSON and checks MCP/OAuth endpoint fields plus `client_id`, `client_secret`, and scopes |
| Admin export endpoint | PASS | `serve-http-export.test.ts` starts a real `gbrain serve --http` on temp PGLite, obtains an admin cookie through the magic-link flow, observes no-cookie 403, invalid format 400, and all three export formats returning parseable JSON with OAuth endpoints |
| Append-only guard: `oauth-provider.ts` | PASS | `git diff 9ecf49b5 -- src/core/oauth-provider.ts \| grep -cE '^-[^-]'` -> `1` (only existing fallback condition line extended) |
| Append-only guard: `src/core/types.ts` | PASS | `git diff 9ecf49b5 -- src/core/types.ts \| grep -cE '^-[^-]'` -> `0`; AuthInfo executive optional fields were already present in `src/core/operations.ts` at the G2 baseline |
| Append-only guard: `serve-http.ts` | PASS | `git diff 9ecf49b5 -- src/commands/serve-http.ts \| grep -cE '^-[^-]'` -> `0` |
| Append-only guard: `auth.ts` | PASS | `git diff 9ecf49b5 -- src/commands/auth.ts \| grep -cE '^-[^-]'` -> `2` |
| No `src/mcp` changes | PASS | `git diff 9ecf49b5 -- 'src/mcp/' --stat` returned empty |
| No schema migration | PASS | `git diff 9ecf49b5 -- src/core/migrate.ts --stat` returned empty |

## Files Changed

```text
src/commands/auth.ts
src/commands/serve-http.ts
src/core/oauth-provider.ts
src/ebrain/sso/bind-executive.ts
src/ebrain/sso/exports.ts
tests/ebrain/oauth/bind-executive-to-client.test.ts
tests/ebrain/oauth/exports.test.ts
tests/ebrain/oauth/register-client-executive-required.test.ts
tests/ebrain/oauth/serve-http-export.test.ts
tests/ebrain/oauth/verify-access-token-executive.test.ts
STAGE-SUMMARY.md
```

## Runtime Notes

- OAuth client secrets remain one-time material; the export endpoint accepts `secret` or `client_secret` query input for immediate post-registration export and otherwise emits `PASTE_CLIENT_SECRET_HERE` rather than pretending the stored hash is a usable secret.
- `src/core/types.ts` did not contain the active `AuthInfo` definition at this baseline; the existing active type in `src/core/operations.ts` already had `executiveId?`, `executiveEmail?`, and `executiveRole?`, so G2 only wires runtime population.
- G2 adds no schema migration and does not touch `src/mcp/*`.
