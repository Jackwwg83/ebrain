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

## Fixwave R1

- Baseline: `b9bec8b9`; reviewer R1 `G2-H-001` fixed by moving the Ebrain executive requirement out of the gbrain core helper contract and into an Ebrain wrapper/CLI surface.
- Core compatibility: `registerClientManual(...)` now treats `executiveId` as optional again. Omitted `executiveId` skips executive validation/binding and leaves `oauth_clients.executive_id` as SQL NULL; provided values still go through `requireActiveExecutiveId(...)` and `bindExecutiveToClient(...)`.
- Ebrain invariant: `src/ebrain/sso/register-client.ts` adds `registerEbrainClient(...)`, which rejects blank `executiveId`, checks `loadExecutiveProfile(engine, executiveId)`, and then calls the core helper with the validated executive id.
- CLI split: `gbrain auth register-client` is backward-compatible again with optional `--executive-id`; `gbrain ebrain register-client <name> --executive-id <id> ...` is the Ebrain-specific path that enforces executive binding.
- Test changes: `tests/ebrain/oauth/register-client-executive-required.test.ts` now verifies core NULL compatibility plus wrapper missing/unknown/valid executive behavior; DCR NULL compatibility remains covered.
- Evidence: `bun test test/oauth.test.ts 2>&1 | tail -10` -> 71 pass, 0 fail, 298 expect() calls; `bun test tests/ebrain/oauth/ 2>&1 | tail -10` -> 18 pass, 0 fail, 65 expect() calls; `bun run typecheck` exited 0; `bun run verify` exited 0.
- Charter check: `git diff --stat b9bec8b9 -- 'src/core/' 'src/mcp/'` shows only `src/core/oauth-provider.ts` with 6 insertions/2 deletions for the optional branch; `src/mcp/*` remains untouched; `src/cli.ts` has 0 deletion lines relative to `b9bec8b9`.

# Stage I1: Enterprise Skills + routing-eval

## Status

- Stage: I1
- Branch: `ebrain-mvp`
- Baseline: `3eb7df61`
- Scope: 8 enterprise skills scaffolded with `gbrain skillify scaffold` flow, 3 full skill implementations, 5 thin-shell skills, routing fixtures, placeholder tests, and skill resolver wiring.
- Result: PASS locally. E2 brief job stub remains unchanged by PM decision; I1 only builds the agent-routable skill surface.

## Implementation

- Ran `./bin/gbrain skillify scaffold <skill> --force --description ...` for all 8 skills because Stage A1 placeholders already existed; the v0.36.0 missing-description contract was verified separately with exit 2.
- `skills/executive-daily-brief/SKILL.md`: full 149-line skill for C-level morning briefs with required sections `今日要点`, `风险信号`, `销售/营收态势`, and `跨团队焦点`, plus filing to `briefs/daily/`.
- `skills/risk-signal-detector/SKILL.md`: full 147-line skill for conflict/anomaly/fact/take risk aggregation with severity rubric and filing to `signals/risk/`.
- `skills/customer-escalation-radar/SKILL.md`: full 142-line skill for high-value customer health radar with risk-score table contract and filing to `signals/customer/`.
- The 3 full scripts under `skills/*/scripts/*.mjs` are executable deterministic subagent planners. They return `{skill, model, operations, subagent, filing, markdown}` and use `claude-sonnet-4-6` in the returned subagent payload.
- `board-deck-generator`, `forecast-variance-explainer`, `competitor-move-monitor`, `capital-allocation-advisor`, and `org-memory-synthesizer` are 131-line thin-shell skills with real frontmatter, trigger boundaries, filing rules, future workflow, and intentionally retained `.mjs` placeholders.
- Added routing fixtures: 22 each for the 3 full skills, 12 each for the 5 shell skills.
- Added 8 focused tests under `test/<skill>.test.ts`; full-skill tests assert script output shape and shell-skill tests assert placeholders remain intentionally unimplemented.
- Updated `skills/RESOLVER.md` rows for the 8 new skills and broadened the existing `skillpack-harvest` resolver row so pre-existing routing fixtures no longer fail global `routing-eval`.
- Updated `skills/manifest.json` so `check-resolvable` counts all 8 enterprise skills as reachable in this repo, whose existing manifest is still present.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| Start state | PASS | `git status --short` was clean; branch `ebrain-mvp`; `git rev-parse --short HEAD` -> `3eb7df61` |
| Missing description contract | PASS | `./bin/gbrain skillify scaffold missing-description-probe` exited `2` and printed `Error: --description is required.` |
| Scaffold output | PASS | Each of the 8 scaffold commands wrote/overwrote `SKILL.md`, created `scripts/<name>.mjs`, `routing-eval.jsonl`, `test/<name>.test.ts`, and appended one resolver row |
| Skill line counts | PASS | Full skills: 149 / 147 / 142 lines; shell skills: 131 lines each; no `SKILLIFY_STUB` remains in any of the 8 `SKILL.md` files |
| Routing fixtures | PASS | Full skills have 22 JSONL fixtures each; shell skills have 12 JSONL fixtures each |
| Focused skill tests | PASS | `bun test test/executive-daily-brief.test.ts test/risk-signal-detector.test.ts test/customer-escalation-radar.test.ts test/board-deck-generator.test.ts test/forecast-variance-explainer.test.ts test/competitor-move-monitor.test.ts test/capital-allocation-advisor.test.ts test/org-memory-synthesizer.test.ts` -> 8 pass, 0 fail, 22 expect() calls |
| Runtime script output | PASS | `bun skills/executive-daily-brief/scripts/executive-daily-brief.mjs --markdown ...` produced all 4 required markdown sections with a realistic CRM/support sample; risk/customer scripts produced JSON/table artifacts with operation plans |
| routing-eval | PASS | `bun src/cli.ts routing-eval --json` -> `ok:true`, 203/203 passed, top1Accuracy `1`, missed `0`, ambiguous `0`, lint `0`; executive-daily-brief 22/22 passed |
| check-resolvable | PASS | `bun src/cli.ts check-resolvable --json` -> errors `0`, total skills `51`, reachable `51`, unreachable `0`; warnings are advisory for the intentionally retained 5 shell script placeholders and enterprise filing namespaces not yet listed in `_brain-filing-rules.json` |
| skillpack-check | PASS | `bun src/cli.ts skillpack-check --json` -> `healthy:true`, summary `gbrain skillpack healthy`; doctor surfaced the same advisory resolver warnings but no failing action |
| Typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, isolation, WASM, admin build, admin scope, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |
| Charter v2 core/mcp guard | PASS | `git diff --stat 3eb7df61 -- 'src/core/' 'src/mcp/'` returned empty; no `src/commands/` or `src/ebrain/` files changed |
| Dependency/schema guard | PASS | No `package.json`, lockfile, or migration files changed; no `bun add` was run |

## Files Changed

```text
skills/RESOLVER.md
skills/manifest.json
skills/executive-daily-brief/SKILL.md
skills/executive-daily-brief/scripts/executive-daily-brief.mjs
skills/executive-daily-brief/routing-eval.jsonl
skills/risk-signal-detector/SKILL.md
skills/risk-signal-detector/scripts/risk-signal-detector.mjs
skills/risk-signal-detector/routing-eval.jsonl
skills/customer-escalation-radar/SKILL.md
skills/customer-escalation-radar/scripts/customer-escalation-radar.mjs
skills/customer-escalation-radar/routing-eval.jsonl
skills/board-deck-generator/SKILL.md
skills/board-deck-generator/scripts/board-deck-generator.mjs
skills/board-deck-generator/routing-eval.jsonl
skills/forecast-variance-explainer/SKILL.md
skills/forecast-variance-explainer/scripts/forecast-variance-explainer.mjs
skills/forecast-variance-explainer/routing-eval.jsonl
skills/competitor-move-monitor/SKILL.md
skills/competitor-move-monitor/scripts/competitor-move-monitor.mjs
skills/competitor-move-monitor/routing-eval.jsonl
skills/capital-allocation-advisor/SKILL.md
skills/capital-allocation-advisor/scripts/capital-allocation-advisor.mjs
skills/capital-allocation-advisor/routing-eval.jsonl
skills/org-memory-synthesizer/SKILL.md
skills/org-memory-synthesizer/scripts/org-memory-synthesizer.mjs
skills/org-memory-synthesizer/routing-eval.jsonl
test/executive-daily-brief.test.ts
test/risk-signal-detector.test.ts
test/customer-escalation-radar.test.ts
test/board-deck-generator.test.ts
test/forecast-variance-explainer.test.ts
test/competitor-move-monitor.test.ts
test/capital-allocation-advisor.test.ts
test/org-memory-synthesizer.test.ts
STAGE-SUMMARY.md
```

## Runtime Notes

- I1 intentionally does not swap `src/ebrain/jobs/generate-brief-stub.ts`; J1/J-stage job-runner wiring should bridge the in-process E2 handler to the skill surface later.
- Full skill scripts are deterministic planners rather than live LLM callers. They expose the intended `claude-sonnet-4-6` subagent payload and can be wired to Minions/job-runner later without touching gbrain core.
- The 5 shell `.mjs` files retain the scaffold sentinel by design; default `check-resolvable` treats this as advisory, while `--strict` would fail until a later stage implements them.
- Enterprise output namespaces such as `briefs/daily/` and `signals/risk/` are documented in skill frontmatter per I1 spec; `_brain-filing-rules.md` and its JSON companion were not changed in this stage.
- The repo does not have a `gbrain` binary on PATH in this shell. `./bin/gbrain` was used for scaffold/routing probes, and `bun src/cli.ts` was used for final `routing-eval`, `check-resolvable`, and `skillpack-check` evidence.

# Stage H1: Admin Dashboard 4 Pages

## Status

- Stage: H1
- Branch: `ebrain-mvp`
- Baseline: `e9db4d78`
- Scope: admin SPA frontend only; no gbrain core, MCP, commands, or `src/ebrain/*` runtime changes.
- Result: PASS for the allowed H1 frontend/build scope. Standalone admin `tsc -p admin/tsconfig.json` still has a pre-existing error in `admin/src/pages/Agents.tsx`, which H1 explicitly forbids editing; root `bun run typecheck` and full `bun run verify` pass.

## Implementation

- Added `admin/src/ebrain/pages/Dashboard.tsx` with four stat cards, enterprise-op-filtered `/admin/events` SSE activity, five app health slots, and six Dream Cycle phase rows.
- Added `admin/src/ebrain/pages/Executives.tsx` with active/archived tabs, executive table, profile drawer calling `get_executive_context`, and create modal with the five required fields.
- Added `admin/src/ebrain/pages/EnterpriseApps.tsx` with a five-step wizard: app type, credentials, real `testConnection` fetch step, sub-connector config, and save.
- Added `admin/src/ebrain/pages/Ingestion.tsx` with 20+ sub-connector-ready health table, detail drawer, and manual retry action.
- Added shared `AppLayout`, `StatCard`, and `StatusBadge` components under `admin/src/ebrain/components/`.
- Added simple no-dependency i18n under `admin/src/ebrain/i18n/` with `zh-CN.json`, `en-US.json`, a pure helper, and a small locale hook. The four H1 pages route their main labels, headings, buttons, and table headers through i18n.
- Extended `admin/src/api.ts` append-only after the existing `api` export with Ebrain types and helper exports: `getExecutives`, `createExecutive`, `getExecutiveContext`, `getEnterpriseApps`, `registerEnterpriseApp`, `testConnection`, `getIngestionSources`, `triggerSync`, `getStats`, and `getEbrainEventSource`.
- Extended `admin/src/App.tsx` with hash routes `#ebrain/dashboard`, `#ebrain/executives`, `#ebrain/enterprise-apps`, and `#ebrain/ingestion`, plus matching sidebar nav entries.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| Start state | PASS | `git status --short --branch` showed `## ebrain-mvp...origin/ebrain-mvp`; `git rev-parse HEAD` -> `e9db4d7841222409a2944412f0fa040ed0b6709c`; `git branch --show-current` -> `ebrain-mvp` |
| Admin build | PASS | `cd admin && bun run build` -> Vite built 47 modules and emitted `admin/dist/` successfully |
| Root typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, isolation, WASM, admin build, admin scope, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |
| Vite dev serving | PASS | `cd admin && bun run dev -- --host 127.0.0.1` started at `http://127.0.0.1:5173/admin/`; localhost checks returned HTTP 200 for all four H1 page modules |
| Browser plugin | BLOCKED | The in-app Browser skill was loaded, but the required Node REPL browser execution tool was not exposed by tool discovery in this session; local Vite HTTP checks were used instead of an interactive browser screenshot |
| Standalone admin tsconfig | BLOCKED (pre-existing) | `cd admin && ../node_modules/.bin/tsc --noEmit -p tsconfig.json` now reports only existing `admin/src/pages/Agents.tsx:582` tab-indexing errors; H1 files produced no standalone TS errors after ES2020 fixes |
| Charter v2 guard | PASS | `git diff e9db4d78..HEAD -- 'src/core/' 'src/mcp/' --stat` returned empty; `git diff e9db4d78..HEAD -- src/commands/ --stat` returned empty |
| No forbidden `src/ebrain/*` changes | PASS | H1 changes are confined to `admin/src/ebrain/*`, `admin/src/App.tsx`, `admin/src/api.ts`, and this `STAGE-SUMMARY.md` |
| No mock/storybook imports | PASS | `rg -n "mock/data|admin-ebrain-storybook|from ['\"].*mock" admin/src/ebrain admin/src/api.ts admin/src/App.tsx` returned no matches |
| No new dependencies | PASS | No `package.json`, lockfile, or admin package metadata changed; no `bun add` was run |
| i18n files | PASS | `admin/src/ebrain/i18n/zh-CN.json` and `admin/src/ebrain/i18n/en-US.json` exist and are consumed through `useEbrainI18n`/`translate` |

## Files Changed

```text
admin/src/App.tsx
admin/src/api.ts
admin/src/ebrain/components/AppLayout.tsx
admin/src/ebrain/components/StatCard.tsx
admin/src/ebrain/components/StatusBadge.tsx
admin/src/ebrain/hooks/useEbrainI18n.ts
admin/src/ebrain/i18n/en-US.json
admin/src/ebrain/i18n/i18n.ts
admin/src/ebrain/i18n/json.d.ts
admin/src/ebrain/i18n/zh-CN.json
admin/src/ebrain/pages/Dashboard.tsx
admin/src/ebrain/pages/EnterpriseApps.tsx
admin/src/ebrain/pages/Executives.tsx
admin/src/ebrain/pages/Ingestion.tsx
STAGE-SUMMARY.md
```

## Runtime Notes

- Initial H1 intentionally did not add new Express/admin middleware because that stage forbade `src/commands/*` changes. The frontend helper used an admin-scoped operation bridge path, `/admin/api/ebrain/ops/:operation`, for existing Ebrain ops and concrete admin resource paths for create/register/test/retry actions.
- Initial H1 baseline did not expose those H1 admin resource paths in `src/commands/serve-http.ts`; the Fixwave R1 section below records the later backend read bridge and stats endpoint.
- Dashboard SSE uses the existing `/admin/events` EventSource and filters enterprise operations client-side: `list_executives`, `get_executive_context`, `enterprise_ingest_status`, `detect_enterprise_conflicts`, `enterprise_*`, `*executive*`, and `*ebrain*`.
- Initial H1 used `detect_enterprise_conflicts` as the only available conflict-count source; Fixwave R1 replaces that Dashboard polling path with a pure read counter.
- The frontend does not persist credentials, push preferences, or profile payloads to localStorage/sessionStorage. Wizard credentials live only in React component state until the submit/test calls complete or the modal closes.

## Fixwave R1

- Baseline: H1 commit `9f683434` plus reviewer report `/Users/jackwu/Projects/EBRAIN_STAGE_H1_REVIEW.md`.
- Fixed H1-H-001 by adding an admin-authenticated Ebrain ops bridge in `src/commands/serve-http.ts` for the H1 read allowlist only: `list_executives`, `get_executive_context`, and `enterprise_ingest_status`. The bridge calls `dispatchToolCall(..., { remote: false })`, so the admin UI can reach localOnly admin reads without exposing the full gbrain op surface.
- Fixed H1-M-001/H1-M-002 by adding `/admin/api/ebrain/stats` as a pure SQL aggregate for active executives, today's briefs, derived brief coverage rate, open conflicts, and last completed enterprise cycle time. `admin/src/api.ts:getStats()` now reads this endpoint and no longer polls `detect_enterprise_conflicts`.
- Fixed H1-L-001 by making `zh-CN` the default locale unless `localStorage['ebrain.locale']` is explicitly `zh-CN` or `en-US`; the locale hook persists user changes back to that key.
- Added `test/serve-http-ebrain-bridge.test.ts` covering admin-cookie enforcement, allowlist rejection for `detect_enterprise_conflicts`, successful PGLite bridge reads, remote=false behavior for `enterprise_ingest_status`, and the stats endpoint payload.

Fixwave verification:

| Check | Result | Evidence |
|---|---|---|
| Core HTTP transport gate | PASS | `bun test test/http-transport.test.ts` -> 24 pass, 0 fail, 71 expect() calls |
| Admin bridge PGLite E2E | PASS | `bun test test/serve-http-ebrain-bridge.test.ts` -> 5 pass, 0 fail, 14 expect() calls; real `gbrain serve --http` with PGLite returned `[]` for allowlisted reads and aggregate stats JSON |
| Admin build | PASS | `cd admin && bun run build` -> Vite built 47 modules and emitted `dist/assets/index-BoEMKTfx.js` |
| Root typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Full verify | PASS | `bun run verify` -> all checks through synthetic corpus privacy and `tsc --noEmit` passed |
| Charter v2 guard | PASS | `git diff 9f683434 -- 'src/core/' 'src/mcp/' --stat` returned empty; `git diff 9f683434 -- src/commands/serve-http.ts \| grep -cE '^-[^-]'` -> 0 |

Fixwave runtime notes:

- The bridge deliberately does not allow `detect_enterprise_conflicts`, so opening Dashboard cannot run the mutating detector through polling.
- The H1 concrete resource action paths (`/admin/api/ebrain/executives`, enterprise-app register/test, ingestion-source sync) remain outside this R1 bridge allowlist; R1 validates the requested read bridge and stats path without changing G1 op internals or adding schema/dependencies.

# Stage H2: 3 Pages + react-i18next + Client Export + H1 Write Paths

## Status

- Stage: H2
- Branch: `ebrain-mvp`
- Baseline: `b12eb3db`
- Scope: H2 admin pages, react-i18next upgrade, OAuth client config export modal, specific admin write routes for H1 caveats, conflict resolution helper, focused E2E tests.
- Result: PASS for implemented H2 scope with real PGLite write/read evidence and required gates passing.

## Implementation

- Added `admin/src/ebrain/pages/FactConflicts.tsx` with open-first conflict list, manual conflict detection trigger, resolve drawer, winning-value radio selection, resolver note, and Resolve/Skip/Defer actions wired to backend endpoints.
- Added `admin/src/ebrain/pages/Agents.tsx` with OAuth client list from `oauth_clients`, executive binding display, create flow through `registerEbrainClient`, revoke action, and per-row export modal launch.
- Added `admin/src/ebrain/pages/RequestLog.tsx` with paginated `mcp_request_log` table and filters for `executive_id`, time range, op name, and status. Backend response summarizes params via `summarizeMcpParams` before returning them to the UI.
- Added `admin/src/ebrain/components/ClientConfigExportModal.tsx` that calls the existing G2 `/admin/api/clients/:id/export?format=...` endpoint for Claude Desktop, Cursor, and Generic JSON, then supports copy and download.
- Installed only the H2-approved dependencies in `admin/package.json`: `react-i18next` and `i18next`.
- Added `admin/src/ebrain/i18n/react-i18next.ts` and swapped `useEbrainI18n` internals to `useTranslation` while preserving the H1 hook API (`locale`, `setLocale`, `t`). H1 and H2 pages share the same language dropdown and flat JSON dictionaries.
- Extended `admin/src/App.tsx` and `AppLayout` with routes/nav for `#ebrain/conflicts`, `#ebrain/agents`, and `#ebrain/request-log`, wrapping page rendering in `I18nextProvider`.
- Extended `admin/src/api.ts` with H2 types and helpers: fact conflicts, OAuth clients, client export, request log, and existing H1 write paths.
- Added `src/ebrain/conflicts/resolve.ts` to resolve/ignore/defer fact conflicts and, for resolve, update `enterprise_fact_conflicts` plus write selected compiled truth into the entity page frontmatter through `engine.putPage`.
- Extended `src/commands/serve-http.ts` with specific `requireAdmin`-protected routes for H1/H2 actions: executive create, enterprise app registration, connection test, ingestion source sync enqueue, fact conflict list/detect/resolve, OAuth client list/create/revoke, and Ebrain request log.
- Added focused tests in `tests/ebrain/admin-write-paths.test.ts` and `test/serve-http-ebrain-write.test.ts` covering PGLite writes, executive-bound OAuth clients, conflict resolution frontmatter writeback, unauthenticated write rejection, and route-level admin write/read evidence.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| Approved dependency install | PASS | `cd admin && bun add react-i18next i18next` installed `react-i18next@17.0.8` and `i18next@26.2.0`; no other new dependencies were added |
| Admin build | PASS | `cd admin && bun run build` -> Vite built 83 modules and emitted `dist/assets/index-qYig93p4.js` |
| H2 focused tests | PASS | `bun test tests/ebrain/admin-write-paths.test.ts test/serve-http-ebrain-write.test.ts` -> 5 pass, 0 fail, 10 expect() calls; includes PGLite route write and conflict frontmatter writeback evidence |
| Core HTTP transport gate | PASS | `bun test test/http-transport.test.ts` -> 24 pass, 0 fail, 71 expect() calls |
| Root typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, isolation, WASM, admin build, admin scope drift, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |
| Charter v2 core guard | PASS | `git diff b12eb3db..HEAD -- 'src/core/' 'src/mcp/' --stat` returned empty |
| serve-http append-only guard | PASS | `git diff b12eb3db..HEAD -- src/commands/serve-http.ts \| grep -cE '^-[^-]'` -> 0 |
| No full unit suite | PASS | Did not run `bun test test/` full suite per H2 instruction/OOM warning |

## Files Changed

```text
admin/bun.lock
admin/package.json
admin/dist/index.html
admin/dist/assets/index-qYig93p4.js
admin/src/App.tsx
admin/src/api.ts
admin/src/ebrain/components/AppLayout.tsx
admin/src/ebrain/components/ClientConfigExportModal.tsx
admin/src/ebrain/hooks/useEbrainI18n.ts
admin/src/ebrain/i18n/en-US.json
admin/src/ebrain/i18n/react-i18next.ts
admin/src/ebrain/i18n/zh-CN.json
admin/src/ebrain/pages/Agents.tsx
admin/src/ebrain/pages/FactConflicts.tsx
admin/src/ebrain/pages/RequestLog.tsx
src/commands/serve-http.ts
src/ebrain/conflicts/resolve.ts
test/serve-http-ebrain-write.test.ts
tests/ebrain/admin-write-paths.test.ts
STAGE-SUMMARY.md
```

## Runtime Notes

- H2 uses specific admin routes for write actions rather than expanding the H1 bridge allowlist. The bridge remains read-only for the H1 allowlisted ops.
- `testConnection` is implemented as an admin route that dispatches submitted connector configuration to vendor app token refresh and returns a timestamped result. The connector base interface remains stable; H2 does not add a new vendor-neutral method.
- `triggerSync` enqueues an `ebrain-sync` minion job with the requested `source_id`; worker-side execution remains owned by the existing minion/job infrastructure.
- `FactConflicts` manual detect calls the existing `detect_enterprise_conflicts` op through the admin route on button click only; no polling path was added.
- `resolveFactConflict` writes selected truth into `frontmatter.compiled_truth[fact_key]` via `putPage` and preserves the existing page body/timeline.
- `admin/dist` was already dirty at the start of H2; the H2 admin build replaced the prior generated asset with `index-qYig93p4.js`.

## Fixwave R1

- Baseline: `ee57972e`; reviewer R1 findings `H-001` and `L-001` fixed in this wave.
- H-001: added `src/ebrain/apps/test-connection-dispatch.ts` as the single admin connection-test entrypoint. It dispatches exact `app_type` values `dingtalk` and `feishu` to EnterpriseApp instances and calls `tokenManager.refresh('tenant_access', 'app')` as the real ping.
- H-001: `wecom`, `salesforce`, `feishu-meetings`, and blank/unknown app types fail closed with `unsupported_app_type ... (supported: dingtalk, feishu)`; nonempty credentials no longer produce `ok: true`.
- H-001: added a minimal Feishu EnterpriseApp/token manager path for the token-refresh probe, mirroring the DingTalk persistence contract without changing the stable `EnterpriseApp` interface. Pre-save probes create a soft-deleted app shell only to satisfy the token FK and do not persist submitted secrets.
- L-001: moved RequestLog filters, columns, pagination, and success/error status labels into `zh-CN.json` / `en-US.json`; data values such as real `executive_id`, `client_id`, and raw params remain data.
- L-001: moved FactConflicts status options plus source/confidence metadata labels into dictionaries, and swept H1 edge literals for `timezone`, profile payload, `client_id`, app-list columns, ingestion filter placeholder, and payload heading.

Fixwave R1 verification:

| Check | Result | Evidence |
|---|---|---|
| Charter v2 core guard | PASS | `git diff ee57972e -- 'src/core/' 'src/mcp/' --stat` returned empty |
| serve-http deletion guard | PASS | `git diff ee57972e -- src/commands/serve-http.ts \| grep -cE '^-[^-]'` -> 4 |
| Core HTTP transport gate | PASS | `bun test test/http-transport.test.ts` -> 24 pass, 0 fail, 71 expect() calls |
| H2 focused write tests | PASS | `bun test test/serve-http-ebrain-write.test.ts tests/ebrain/admin-write-paths.test.ts` -> 6 pass, 0 fail, 13 expect() calls; route test verifies unsupported providers no longer pass on nonempty credentials |
| Connection dispatch tests | PASS | `bun test test/test-connection-dispatch.test.ts` -> 4 pass, 0 fail, 27 expect() calls; mocked vendor token endpoints exercised DingTalk and Feishu `tokenManager.refresh`, then inspected/decrypted real PGLite `enterprise_oauth_tokens` rows |
| Admin build | PASS | `cd admin && bun run build` -> Vite built 83 modules and emitted `dist/assets/index-OUw0lndQ.js` |
| Root typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, test isolation, WASM, admin build, admin scope drift, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |

Fixwave R1 runtime evidence notes:

- No live production/staging DingTalk or Feishu credentials were available in this fixwave. Runtime evidence is local PGLite plus mocked vendor token HTTP responses: the production code path still calls the real app token managers and only the test fetch layer is mocked.
- The inspected artifacts were real `enterprise_oauth_tokens` rows written by the token managers, with encrypted token payloads decrypted in test to prove the refresh result was persisted.

## Fixwave R2

- Baseline: `640c9abb`; reviewer R2 blocker `H-002` fixed in this wave.
- H-002: `/admin/api/ebrain/enterprise-apps` save now updates `app_type`, `enabled`, `bot_enabled`, and `push_enabled` in the `ON CONFLICT (app_id)` path, so a pre-save connection-test shell row cannot remain disabled after the user saves the wizard.
- Added route-level regression coverage for the full sequence: connection test creates the hidden shell app, save upserts the same `app_id`, the HTTP server is stopped, and the produced PGLite `enterprise_apps` row is inspected directly.

Fixwave R2 verification:

| Check | Result | Evidence |
|---|---|---|
| Charter v2 core guard | PASS | `git diff 640c9abb -- 'src/core/' 'src/mcp/' --stat` returned empty |
| serve-http deletion guard | PASS | `git diff 640c9abb -- src/commands/serve-http.ts \| grep -cE '^-[^-]'` -> 0 |
| Core HTTP transport gate | PASS | `bun test test/http-transport.test.ts` -> 24 pass, 0 fail, 71 expect() calls |
| H2 focused write tests | PASS | `bun test test/serve-http-ebrain-write.test.ts tests/ebrain/admin-write-paths.test.ts` -> 7 pass, 0 fail, 22 expect() calls; route regression verifies testConnection -> save -> `enterprise_apps.enabled=true`, `bot_enabled=true`, `push_enabled=true`, and `deleted_at IS NULL` |
| Root typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, test isolation, WASM, admin build, admin scope drift, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |

Fixwave R2 runtime evidence notes:

- No live production/staging DingTalk credentials were used in this fixwave. Runtime evidence is local PGLite plus a local HTTP token endpoint; the server route still exercises the production `testEnterpriseConnection` dispatcher and DingTalk token-manager refresh path.
- The inspected end artifact was the real `enterprise_apps` row for `dingtalk-save-r2`, read from the same PGLite database after the HTTP save route completed, proving the runtime flags are enabled rather than inferred from mocks or types.

# Stage J1: Production Helm Chart for Alibaba Cloud ACK and AWS EKS

## Status

- Stage: J1
- Branch: `ebrain-mvp`
- Baseline: `b839da76`
- Scope: production Helm chart only under `deploy/ebrain-helm-chart/`; no gbrain core, admin, skills, schema, dependencies, or `deploy/dev/` changes.
- Result: PASS for J1 chart-rendering scope. Dual-stack Helm dry-runs render valid Kubernetes manifests for Aliyun ACK and AWS EKS; no live cluster apply was performed in J1.

## Implementation

- Added `deploy/ebrain-helm-chart/Chart.yaml` with chart name `ebrain`, version `0.1.0`, and appVersion `0.36.3.0`.
- Added production defaults plus cloud/customer overlays: `values.yaml`, `values.aliyun.yaml`, `values.aws.yaml`, and `values.example-customer.yaml`.
- Added Helm helpers for release/component naming, labels/selectors, image construction, image pull secrets, runtime env, PVC mounts, and ingress backend service selection.
- Added 5 Deployment templates: `mcp-api` (`gbrain serve --http`), `worker` (`gbrain jobs work`), `autopilot` (`gbrain autopilot`), `webhook-receiver` (`gbrain serve --http` routed only through `/webhook` ingress), and `admin-spa` (`nginx` serving the production admin SPA image).
- Added 11 CronJob templates with per-job `enabled` values rendered as `spec.suspend`: enterprise cycle, executive brief fanout, token refresh, 5 connector sync submitters, upstream dream cycle, weekly audit review J2 stub, and backup J2 stub.
- Added 3 ClusterIP services, one cloud-switched ingress, 1 SecretStore plus 5 ExternalSecret templates, and 2 PVC templates (`brain-repo` RWX NAS/EFS plus optional Postgres data PVC for customer-managed in-cluster stateful workloads).

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| Helm lint | PASS | `helm lint deploy/ebrain-helm-chart` -> 1 chart linted, 0 failed; icon recommendation only |
| Aliyun ACK dry-run | PASS | `helm install ebrain deploy/ebrain-helm-chart --dry-run=client -f deploy/ebrain-helm-chart/values.aliyun.yaml` rendered successfully |
| AWS EKS dry-run | PASS | `helm install ebrain deploy/ebrain-helm-chart --dry-run=client -f deploy/ebrain-helm-chart/values.aws.yaml` rendered successfully |
| Aliyun render inspection | PASS | `/tmp/ebrain-j1-aliyun.yaml` contains 5 Deployments, 11 CronJobs, 3 Services, 1 Ingress, 1 SecretStore, 5 ExternalSecrets, and 2 PVCs; storage classes `nas-cifs` and `alicloud-disk-essd`; ingress class `nginx`; ACR pull secret `acr-pull-secret`; image registry `registry.cn-hangzhou.aliyuncs.com/ebrain/...` |
| AWS render inspection | PASS | `/tmp/ebrain-j1-aws.yaml` contains 5 Deployments, 11 CronJobs, 3 Services, 1 Ingress, 1 SecretStore, 5 ExternalSecrets, and 2 PVCs; storage classes `efs-sc` and `gp3`; ingress class `alb`; ECR pull secret `ecr-pull-secret`; image registry `<aws_account>.dkr.ecr.<region>.amazonaws.com/ebrain/...` |
| File count checklist | PASS | `find deploy/ebrain-helm-chart/templates/deployments -type f` -> 5; `templates/cronjobs` -> 11; `templates/services` -> 3; `templates/secrets` -> 6; `templates/pvc` -> 2 |
| Root typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0 |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, isolation, WASM, admin build, admin scope drift, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed |
| No full unit suite | PASS | Did not run `bun test test/` full suite per J1 instruction/OOM warning |

## Runtime Evidence Notes

- J1 runtime evidence is the Helm renderer output, not a live ACK/EKS deployment: both cloud overlays were rendered through `helm install --dry-run=client`, and the produced manifests were inspected directly for kind counts, storage classes, ingress annotations/classes, pull secrets, image registries, and CLI command wiring.
- No live cluster, RDS, NAS/EFS, ALB/SLB, KMS, Secrets Manager, or External Secrets controller was contacted in this stage. Applying the chart into real ACK/EKS and observing pods/ExternalSecrets/PVC binding belongs to the customer environment or a later deployment run.
- The weekly audit review and backup CronJobs are J2 stubs by design. They render as suspended by default and carry `j2Stub` params; J2 owns the actual monitoring, audit alerting, and backup business logic.
- Connector sync CronJobs submit named connector jobs through `gbrain jobs submit`; J1 does not add connector business logic or worker handlers.

## Files Changed

```text
deploy/ebrain-helm-chart/Chart.yaml
deploy/ebrain-helm-chart/values.yaml
deploy/ebrain-helm-chart/values.aliyun.yaml
deploy/ebrain-helm-chart/values.aws.yaml
deploy/ebrain-helm-chart/values.example-customer.yaml
deploy/ebrain-helm-chart/templates/_helpers.tpl
deploy/ebrain-helm-chart/templates/deployments/*.yaml
deploy/ebrain-helm-chart/templates/cronjobs/*.yaml
deploy/ebrain-helm-chart/templates/services/*.yaml
deploy/ebrain-helm-chart/templates/ingress/ingress.yaml
deploy/ebrain-helm-chart/templates/secrets/*.yaml
deploy/ebrain-helm-chart/templates/pvc/*.yaml
STAGE-SUMMARY.md
```

## Charter v2 Scope Notes

- `src/`, `admin/`, `skills/`, `deploy/dev/`, dependencies, Dockerfiles, and migrations were intentionally untouched.
- The production chart is isolated under `deploy/ebrain-helm-chart/` and does not package Postgres or Redis; external RDS/PolarDB/Aurora and NAS/EFS are selected by values.

# Stage J2: Monitoring + Backup + Audit Alerting + J1 Follow-ups

## Status

- Stage: J2
- Branch: `ebrain-mvp`
- Baseline: `e0bf5334`
- Scope: Ebrain observability, Grafana dashboards, backup/restore/export scripts, weekly audit review, circuit-breaker reset job, and J1 known-issue cleanup.
- Result: Implementation complete with local PGLite job evidence, Helm render/dry-run evidence, dashboard/script validation, core HTTP gate, typecheck, and full verify passing. Backup/restore scripts were not executed against a live Postgres instance in this workstation because `pg_dump`, `pg_restore`, and `psql` are not installed and Docker daemon is unavailable.

## Implementation

- Added `src/ebrain/observability/init.ts` with env-gated OpenTelemetry NodeSDK startup and wired it from `src/cli.ts`. It auto-enables in production unless disabled, supports explicit `EBRAIN_OTEL_ENABLED=1`, configures OTLP trace/metric HTTP exporters, and registers Node auto-instrumentations including HTTP/Express coverage.
- Added `src/ebrain/observability/metrics.ts` with custom Ebrain metric registration and record helpers for brief pushes, detected/open conflicts, cycle duration, connector sync lag/circuit state, LLM tokens, and estimated cost.
- Added three Grafana dashboard JSON files under `deploy/grafana-dashboards/`: overview P0 request/error/latency/brief/conflict/cycle panels, ingestion connector lag/circuit panels, and LLM token/cost panels.
- Added real shell scripts: `scripts/ebrain-backup.sh` (`pg_dump`, optional RDS/PITR hooks, git mirror, working-tree tar, LFS object tar, S3/OSS/rclone/local upload), `scripts/ebrain-restore.sh` (download archive, `pg_restore`, restore git mirror/working tree/LFS to staging), and `scripts/ebrain-export.sh` (R-13 customer exit export of enterprise CSVs plus brief markdown tarball).
- Added `src/ebrain/jobs/weekly-audit-review.ts` to scan 7 days of `mcp_request_log`, connector lag over 24h, and open fact conflicts, render a markdown report, and push it to the ops channel through `notifyOpsChannel` and `BotAdapter` channel/group push.
- Added `src/ebrain/jobs/circuit-breaker-reset.ts` plus `src/ebrain/sources/circuit-breaker.ts:resetExpired()` to reset only expired `enterprise_ingest_sources.circuit_open_until` rows without faking `last_success_at`.
- Extended `src/commands/jobs.ts` append-only with lazy handlers for `ebrain-weekly-audit-review` and `ebrain-circuit-breaker-reset`.
- Upgraded Helm cronjobs: weekly audit now submits the real job, backup now runs `scripts/ebrain-backup.sh`, token refresh schedule is `*/30 * * * *`, and a new hourly circuit-breaker reset CronJob submits the minion job.
- Added OpenTelemetry dependencies in `package.json`/`bun.lock`: SDK node, auto-instrumentations, OTLP HTTP exporters, API, resources, SDK metrics, and semantic conventions.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| J2 focused tests | PASS | `bun test tests/ebrain/jobs/weekly-audit-review.test.ts tests/ebrain/jobs/circuit-breaker-reset.test.ts tests/ebrain/observability/metrics.test.ts` -> 5 pass, 0 fail, 24 expect() calls. The weekly audit test inserted real PGLite rows into `mcp_request_log`, `enterprise_ingest_sources`, and `enterprise_fact_conflicts`, inspected the markdown/report, and verified one ops-channel push payload. The reset test inspected produced DB rows after reset. |
| Grafana JSON validity | PASS | `python3 -m json.tool deploy/grafana-dashboards/ebrain-overview.json`, `ebrain-ingestion.json`, and `ebrain-cost.json` all exited 0. |
| Backup/restore/export shell syntax | PASS | `bash -n scripts/ebrain-backup.sh && bash -n scripts/ebrain-restore.sh && bash -n scripts/ebrain-export.sh` exited 0. |
| Helm lint | PASS | `helm lint deploy/ebrain-helm-chart` -> 1 chart linted, 0 failed; icon recommendation only. |
| Aliyun Helm dry-run | PASS | `helm template ebrain deploy/ebrain-helm-chart/ -f deploy/ebrain-helm-chart/values.aliyun.yaml` and `helm install ... --dry-run=client -f values.aliyun.yaml` exited 0. Rendered manifest has 12 CronJobs; token refresh schedule `*/30 * * * *`; circuit reset schedule `0 * * * *`; weekly audit schedule `0 9 * * MON`; backup command `/usr/bin/env bash scripts/ebrain-backup.sh`. |
| AWS Helm dry-run | PASS | `helm template ebrain deploy/ebrain-helm-chart/ -f deploy/ebrain-helm-chart/values.aws.yaml` and `helm install ... --dry-run=client -f values.aws.yaml` exited 0. |
| Core HTTP transport gate | PASS | `bun test test/http-transport.test.ts` -> 24 pass, 0 fail, 71 expect() calls. |
| Root typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0. |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, test isolation, WASM, admin build, admin scope drift, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed. |
| Charter v2 core guard | PASS | `git diff e0bf5334..HEAD -- 'src/core/' 'src/mcp/' --stat` returned empty. |
| jobs.ts append-only guard | PASS | `git diff e0bf5334..HEAD -- src/commands/jobs.ts | grep -cE '^-[^-]'` -> 0. |
| J1-M-001 cleanup | PASS | `deploy/ebrain-helm-chart/values.yaml` has `cronjobs.tokenRefresh.schedule: "*/30 * * * *"`. |
| J1-L-001 cleanup | PASS | `deploy/ebrain-helm-chart/templates/cronjobs/circuit-breaker-reset.yaml` renders and submits job name `ebrain-circuit-breaker-reset`. |

## Runtime Evidence Notes

- Weekly audit runtime evidence is local PGLite plus mocked ops BotAdapter transport: the job read real produced DB rows from all three required tables, generated a markdown payload, and the test inspected the exact content sent to channel `ops`.
- Circuit-breaker reset runtime evidence is local PGLite: the expired source row was reset to `consecutive_errors=0` and `circuit_open_until=NULL`, while the future-open source stayed open.
- Helm runtime evidence is renderer output and dry-run manifests for both cloud overlays, not a live ACK/EKS apply.
- Backup/restore/export script runtime against real Postgres was blocked locally: `pg_dump`, `pg_restore`, and `psql` are absent, and Docker is installed but the daemon socket is unavailable. The scripts are functional shell implementations and Helm wires backup to the script, but live backup/restore drill evidence still requires an environment with Postgres client tools and a staging database.
- OpenTelemetry startup is env-gated. It will auto-start in production or when `EBRAIN_OTEL_ENABLED=1`, and can be disabled with `EBRAIN_OTEL_DISABLED=1` or `OTEL_SDK_DISABLED=1`; no telemetry is forced in local dev.

## Files Changed

```text
package.json
bun.lock
src/cli.ts
src/commands/jobs.ts
src/ebrain/sources/circuit-breaker.ts
src/ebrain/observability/init.ts
src/ebrain/observability/metrics.ts
src/ebrain/jobs/weekly-audit-review.ts
src/ebrain/jobs/circuit-breaker-reset.ts
deploy/grafana-dashboards/ebrain-overview.json
deploy/grafana-dashboards/ebrain-ingestion.json
deploy/grafana-dashboards/ebrain-cost.json
scripts/ebrain-backup.sh
scripts/ebrain-restore.sh
scripts/ebrain-export.sh
deploy/ebrain-helm-chart/values.yaml
deploy/ebrain-helm-chart/templates/cronjobs/backup.yaml
deploy/ebrain-helm-chart/templates/cronjobs/weekly-audit-review.yaml
deploy/ebrain-helm-chart/templates/cronjobs/circuit-breaker-reset.yaml
tests/ebrain/jobs/weekly-audit-review.test.ts
tests/ebrain/jobs/circuit-breaker-reset.test.ts
tests/ebrain/observability/metrics.test.ts
STAGE-SUMMARY.md
```

# Stage K1: Fixtures Complete + PGLite Smoke

## Status

- Stage: K1
- Branch: `ebrain-mvp`
- Baseline: `715aedba`
- Scope: EnterpriseApp fixture completeness plus local PGLite smoke coverage for all fixture-backed sub-connectors.
- Result: Implementation complete with fixture-only PGLite smoke, v200 migration, import-file page import, enterprise ingest DB artifacts, facts extraction, entity alias refresh, core HTTP gate, typecheck, and full verify passing.

## Implementation

- Completed app fixture directories under `src/ebrain/apps/*/fixtures/`:
  - DingTalk: 6 JSON fixture files covering IM, docs, drive, calendar, meeting, and approvals.
  - Feishu: 6 JSON fixture files covering docs, IM/messages, calendar, mail, wiki, and meetings.
  - WeCom: 5 JSON fixture files covering messages, contacts, meetings, departments, and approvals.
  - CRM: 5 JSON fixture files covering accounts, contacts, opportunities, leads, and activities.
  - Tencent Meeting: 5 JSON fixture files covering meetings, recordings, participants, transcripts, and attendance.
- Added `tests/e2e/ebrain-pglite-smoke.test.ts`.
  - Starts one local PGLite engine in `beforeAll`, runs `initSchema()` through v200+, and seeds the `enterprise` source.
  - Loads 27 fixture-backed connector descriptors from disk using `Bun.file`; no external vendor fetches.
  - Runs the gbrain import path via `importFromContent(..., { noEmbed: true, sourceId: 'enterprise' })` for fixture pages and synthetic entity pages.
  - Writes real rows to `enterprise_apps`, `enterprise_ingest_sources`, `enterprise_ingest_objects`, and `pages` enterprise columns.
  - Runs `runExtractFacts` against imported fixture pages and `refreshEntityAliases` across all shards.
  - Installs a fetch guard that throws on network access, proving the smoke remains fixture-only.
- Added `scripts/ebrain-smoke.sh` with `set -euo pipefail`, friendly pass/fail summary, and exit-code propagation.
- Added package script `ebrain:smoke` pointing to `bash scripts/ebrain-smoke.sh`.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| K1 PGLite smoke | PASS | `bun run ebrain:smoke` -> PGLite `Schema version 1 -> 200`, 71 migrations applied, 1 test pass, 0 fail, 177 expect() calls. Smoke imported fixture pages, wrote enterprise ingest rows, extracted facts, refreshed aliases, and exited 0. |
| Fixture coverage | PASS | Smoke manifest covers 27 fixture-backed sub-connectors across 5 apps: DingTalk 6, Feishu 6, WeCom 5, CRM 5, Tencent Meeting 5. Fixture record count is 123 total. |
| Runtime artifact assertions | PASS | Smoke asserts `enterprise_ingest_sources = 27`, `enterprise_ingest_objects = recordsImported`, fixture `pages = recordsImported`, `facts >= recordsImported`, `enterprise_entity_aliases >= entity count`, and non-empty `enterprise_fact_claims_view`. |
| No external network | PASS | Smoke overrides `globalThis.fetch` to throw; all fixture loads use local `Bun.file` and all page imports pass `noEmbed: true`. |
| Core HTTP transport gate | PASS | `bun test test/http-transport.test.ts` -> 24 pass, 0 fail, 71 expect() calls. |
| Root typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0. |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, test isolation, WASM, admin build, admin scope drift, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed. |
| Charter v2 core guard | PASS | `git diff 715aedba..HEAD -- 'src/core/' 'src/mcp/' --stat` returned empty. |
| CLI entry guard | PASS | `git diff 715aedba..HEAD -- src/commands/ --stat` returned empty. |
| No full unit suite | PASS | Did not run `bun test test/` full suite per K1 instruction/OOM warning. |

## Runtime Evidence Notes

- K1 runtime evidence is local PGLite, not mocked table assertions only: the smoke ran migrations, imported real fixture page content through `importFromContent`, inspected produced DB rows, reconciled facts from real facts fences, and read `enterprise_fact_claims_view`.
- DingTalk already has concrete C2 adapters; K1 still imports the fixtures through the gbrain import-file path to keep the smoke common across all 5 apps.
- Feishu/WeCom/CRM/Tencent Meeting adapter wiring is intentionally not expanded in K1. Their smoke path validates fixture parse plus DB import/write artifacts until C3/C4-style concrete adapters exist.
- No schema migration, dependency, `src/core/`, `src/mcp/`, `src/commands/`, `admin/`, `skills/`, `deploy/`, jobs, conflicts, or cycle business-code changes were made.

## Files Changed

```text
package.json
scripts/ebrain-smoke.sh
tests/e2e/ebrain-pglite-smoke.test.ts
src/ebrain/apps/dingtalk/fixtures/*
src/ebrain/apps/feishu/fixtures/*
src/ebrain/apps/wecom/fixtures/*
src/ebrain/apps/crm/fixtures/*
src/ebrain/apps/tencent-meeting/fixtures/*
STAGE-SUMMARY.md
```

# Stage K2: Postgres End-to-End Integration Testbed

## Status

- Stage: K2
- Branch: `ebrain-mvp`
- Baseline: `e68159d2`
- Scope: test-only K2 integration harness: Postgres pgvector compose testbed, one 9-step Ebrain full-flow E2E test, runner script, and package script.
- Result: Implementation complete with typecheck, verify, core HTTP gate, script syntax, compose config, and no-DATABASE_URL skip behavior passing. Full Docker-backed E2E execution is blocked on this workstation because the Docker daemon socket is unavailable; per K2 instruction, the test uses the existing skip-if-`DATABASE_URL` pattern and this caveat is recorded here.

## Implementation

- Added `docker-compose.ebrain-test.yml` with a single `pgvector/pgvector:pg16` Postgres service, database `ebrain_e2e`, host port `5434`, and `pg_isready` healthcheck.
- Added `scripts/run-e2e-ebrain.sh` with `set -euo pipefail`, compose v2/v1 detection, pre/post cleanup via `docker compose down --volumes --remove-orphans`, readiness polling, a forced local `DATABASE_URL=postgresql://postgres:postgres@localhost:5434/ebrain_e2e`, and exit-code propagation.
- Added `tests/e2e/ebrain-full-flow.test.ts` with the K2 9-step flow:
  - verifies live Postgres/pgvector target and v200+ migration state,
  - creates 5 executives through `createExecutive`,
  - inserts 5 mock EnterpriseApps and 5 direct `enterprise_oauth_tokens` rows without vendor OAuth,
  - imports 5 K1 fixture connector sets through `importFromContent(..., noEmbed: true, sourceId: enterprise)`,
  - runs the F2 enterprise-cycle parent fan-out and all 8 shard handlers, asserting 6 phases per shard plus facts/conflict DB artifacts,
  - simulates a Feishu `@brain` event through the D2 IM webhook router and asserts the mocked subagent enqueue payload,
  - runs executive brief generation for all 5 executives with the E2 stub and real `pushMorningBrief` routing into a mock `BotAdapter.pushToUser`,
  - starts the real HTTP admin server and calls `/admin/api/ebrain/stats`, asserting active executives, today's briefs, open conflicts, last cycle timestamp, and cycle phase payload.
- Added package script `ebrain:e2e` pointing to `bash scripts/run-e2e-ebrain.sh`.

## Verification Evidence

| Check | Result | Evidence |
|---|---|---|
| Compose config syntax | PASS | `docker compose -f docker-compose.ebrain-test.yml config` rendered service `postgres`, image `pgvector/pgvector:pg16`, DB `ebrain_e2e`, and host port `5434`. |
| Runner shell syntax | PASS | `bash -n scripts/run-e2e-ebrain.sh` exited 0. |
| K2 test skip guard | PASS | `bun test tests/e2e/ebrain-full-flow.test.ts --timeout=1000` with no `DATABASE_URL` -> 0 pass, 2 skip, 0 fail. |
| K2 Docker-backed full flow | BLOCKED LOCALLY | `bun run ebrain:e2e` failed before tests because Docker daemon socket `/Users/jackwu/.docker/run/docker.sock` does not exist (`connect: no such file or directory`). No vendor API or LLM call was attempted. |
| Core HTTP transport gate | PASS | `bun test test/http-transport.test.ts` -> 24 pass, 0 fail, 71 expect() calls. |
| Root typecheck | PASS | `bun run typecheck` -> `tsc --noEmit` exited 0. |
| Full verify | PASS | `bun run verify` -> privacy, proposal PII, test names, JSONB, source-id projection, progress, test isolation, WASM, admin build, admin scope drift, CLI executable, system-of-record, eval glossary, synthetic corpus privacy, and typecheck all passed. |
| Charter v2 core guard | PASS | `git diff -- 'src/core/' 'src/mcp/' --stat` returned empty. |
| CLI entry guard | PASS | `git diff -- src/commands/ --stat` returned empty. |
| Admin/skills/deploy guard | PASS | `git diff -- admin/ skills/ deploy/ --stat` returned empty. |
| Dependency guard | PASS | `package.json` changed only by adding `scripts.ebrain:e2e`; no dependency or devDependency entries changed. |
| No full unit suite | PASS | Did not run `bun test test/` full suite per K2 instruction/OOM warning. |

## Runtime Evidence Notes

- The E2E test is designed to inspect real produced artifacts when run with Postgres: `executives`, `enterprise_apps`, `enterprise_oauth_tokens`, `enterprise_ingest_sources`, `enterprise_ingest_objects`, `pages`, `facts`, `enterprise_fact_conflicts`, `minion_jobs`, generated brief pages, mock `pushToUser` calls, webhook subagent job data, and `/admin/api/ebrain/stats` JSON.
- Full runtime artifact evidence from the 9-step path is not available on this workstation because Docker is not running. The script and compose file are present and validated; a host with Docker daemon access should run `bun run ebrain:e2e` to produce the required Postgres-backed artifact evidence.
- The test guards external network by allowing only localhost fetches. Fixture import uses local JSON files and `noEmbed: true`; brief generation uses the existing E2 stub; webhook subagent execution is captured through a mock `submitJob` and never calls a real LLM.
- No schema migrations, dependencies, gbrain core, MCP, CLI command, admin, skills, deploy, or `src/ebrain/*` business-code changes were made.

## Files Changed

```text
docker-compose.ebrain-test.yml
package.json
scripts/run-e2e-ebrain.sh
tests/e2e/ebrain-full-flow.test.ts
STAGE-SUMMARY.md
```
