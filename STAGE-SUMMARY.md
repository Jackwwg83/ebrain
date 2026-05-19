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
  --create-namespace
```

3. Create the Kubernetes provider secrets referenced by Helm:

```bash
kubectl create namespace ebrain-dev
kubectl create secret generic alicloud-kms-access \
  -n ebrain-dev \
  --from-literal=access-key-id='<redacted>' \
  --from-literal=access-key-secret='<redacted>'
kubectl create secret generic alicloud-dns01-access \
  -n cert-manager \
  --from-literal=access-key-id='<redacted>' \
  --from-literal=access-key-secret='<redacted>'
```

4. Write KMS remote values:

- `ebrain/dev/rds/database-url`
- `ebrain/dev/runtime/ebrain-secrets-key`
- `ebrain/dev/runtime/admin-bootstrap-token`
- `ebrain/dev/providers/openai-api-key`
- `ebrain/dev/providers/anthropic-api-key`
- `ebrain/dev/providers/dashscope-api-key`
- `ebrain/dev/acr/dockerconfigjson`

5. Configure GitHub Actions repository secrets:

- `ACR_REGISTRY`
- `ACR_REPOSITORY`
- `ACR_USER`
- `ACR_PASS`
- `KUBE_CONFIG_DATA`
- `EBRAIN_DEV_HOST`

6. Run the first deploy manually:

```bash
EBRAIN_CONFIRM_APPLY=yes ./scripts/ebrain-dev-up.sh
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
