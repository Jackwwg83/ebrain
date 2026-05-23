# Upgrading From GBrain

## 概述

ebrain fork 自 gbrain v0.36.3.0。K3 的目标不是做一次升级，而是给未来维护者留下一个可重复执行的 upstream sync playbook：先检测 upstream 是否改到了 ebrain 曾扩展过的 gbrain core 文件，再决定如何合并。

Charter v2 原则是：gbrain core 接口契约 0 破坏，ebrain 对上游共享代码只做 append-only 或 wrapper/shim 式扩展。这个原则让 upstream sync 保持友好，但不能替代人工评估。每次升级仍然必须看 upstream 改动是否改变了 OAuth、HTTP transport、operation registry、CLI dispatch 或 job dispatch 的行为契约。

K3 提供两个维护工具：

- `scripts/check-upstream-drift.sh`：只 fetch 和读取 git history，报告 upstream 是否改到已识别冲突点。
- `.github/workflows/ebrain-upstream-drift.yml`：默认手动触发的 CI stub，未来需要时可启用周检查。

## 何时同步

建议在以下场景同步 upstream gbrain：

- upstream gbrain 发布新 release 后，建议每 2-4 周 check 一次。
- upstream 修复了影响 ebrain 的 bug，尤其是 security、OAuth、serve-http、MCP transport、job queue、schema migration 或 CLI 行为。
- 主动 cadence：每月 1 次 sync，即使没有紧急 bug，也保留 fork drift 的可见性。

不要在业务 stage 中顺手 merge upstream。upstream sync 应该作为独立维护任务处理，并保留自己的验证记录。

## 同步前准备

先确认工作区干净，并确认当前分支是 `ebrain-mvp`：

```bash
git status --short --branch
```

确认 upstream remote 存在。K3 脚本不会自动创建 remote，避免检测脚本隐式改 git 配置：

```bash
git remote -v
git remote add upstream https://github.com/garrytan/gbrain.git
```

跑 drift 检测：

```bash
bash scripts/check-upstream-drift.sh
```

评估结果：

- zero drift：upstream 没有改到 ebrain 已识别的 gbrain core overlap 文件，可以进入同步流程。
- drift detected：逐个看 report 中的文件、commit、risk。不要直接按 git 冲突文本机械解决，因为有些 upstream 行为变化不会形成文本冲突。

如果 drift 集中在 OAuth、HTTP transport 或 shared types，先读 upstream commit，再决定是 merge、局部 cherry-pick，还是暂缓。

## 同步流程 (Mode B: Merge + 半自动 cherry-pick)

默认策略是 Mode B：merge upstream/master 到 `ebrain-mvp`，遇到冲突时手工保留 upstream 行为，并把 ebrain 扩展重新放到 append-only 位置。drift 很少且明确时，也可以改为 cherry-pick 个别 upstream commit。

```bash
# 1. fetch upstream
git fetch upstream --no-tags

# 2. 看 upstream 有啥新 commit
git log ebrain-mvp..upstream/master --oneline

# 3. 估 drift
bash scripts/check-upstream-drift.sh

# 4. merge (or rebase if drift 较少)
git checkout ebrain-mvp
git merge upstream/master
# 解决冲突 (主要 operations.ts 末尾 + types.ts AuthInfo + jobs.ts dispatch)

# 5. 跑 gbrain core test backward compat (G2 教训)
bun test test/oauth.test.ts test/http-transport.test.ts
# 必须全过 — 否则 ebrain 加的 wrapper / shim 破了 upstream 行为契约

# 6. ebrain 测试
bun test tests/ebrain/

# 7. helm dry-run 验证 (J1)
helm template ebrain deploy/ebrain-helm-chart/ -f deploy/ebrain-helm-chart/values.aliyun.yaml
helm template ebrain deploy/ebrain-helm-chart/ -f deploy/ebrain-helm-chart/values.aws.yaml

# 8. PGLite smoke (K1)
bun run ebrain:smoke
```

同步完成后再跑全量 pre-push gate：

```bash
bun run typecheck
bun run verify
```

注意：不要用 upstream sync 任务修业务需求。merge 冲突解决只做兼容上游和恢复 ebrain append-only 扩展，业务变更另开 stage。

## 已识别冲突点

这些文件是 ebrain 修改过、且 upstream 也可能继续演进的 gbrain core overlap 文件。`scripts/check-upstream-drift.sh` 的硬编码文件清单与这里保持一致。

- `src/core/operations.ts`：末尾 `];` 附近。ebrain operations 必须移到 upstream 新 operations 后，保持 append-only registry。
- `src/core/operations-descriptions.ts`：末尾 description registry。ebrain DESCRIPTION const 和 map entry 放到 upstream 新描述后。
- `src/core/oauth-provider.ts`：G2 改过 `verifyAccessToken`，使用 `LEFT JOIN executives` 读 executive binding。upstream 如果改 `verifyAccessToken` JOIN 路径、token scope 校验或 client lookup，必须手解并重跑 OAuth tests。
- `src/core/types.ts`：`AuthInfo`、`OperationContext`、operation metadata 字段。原则是 optional append，不能把 upstream caller 必填化。
- `src/commands/serve-http.ts`：G2/H1/H2 加 ebrain bridge route 和 admin endpoints。upstream 如果改 HTTP transport、auth middleware、body parsing、DCR/OAuth routes 或 rate limit，必须确认 ebrain route 没绕开新行为。
- `src/commands/auth.ts`：G2 加 ebrain auth dispatch/flag。upstream 如果改 auth command parser 或 client registration behavior，保留 upstream 行为，再追加 ebrain executive binding。
- `src/commands/jobs.ts`：D2/F2/E2/J2 注册 ebrain handlers，使用 lazy import 模式。upstream 如果改 job dispatch、handler data shape 或 Minions lifecycle，保持 ebrain handlers additive。
- `src/cli.ts`：G1/G2/E1/H2 注册 ebrain subcommand cases。upstream 如果改 CLI dispatch 或 exit-code contract，不能让 ebrain case 破坏 upstream commands。

## 已识别非冲突 (sync-friendly)

这些路径是 ebrain-only 或独立扩展，正常 upstream sync 不应触碰：

- `src/ebrain/`：全 ebrain-only business code。
- `admin/src/ebrain/`：全 ebrain-only admin UI slice。
- `skills/ebrain/*`：ebrain skills，不与 upstream skillpack 撞。
- `deploy/ebrain-helm-chart/`：ebrain-only deploy chart。
- `tests/ebrain/`：ebrain tests。

如果 upstream merge 修改了这些路径，先确认是不是本 fork 自己的历史冲突、rename 或误操作；不要把 upstream 文件当作这些目录的 authority。

## upstream sync 检查清单

- [ ] `bash scripts/check-upstream-drift.sh` exit 0，或已阅读 drift report 并逐项记录处理结论。
- [ ] `git merge upstream/master` 冲突解决完成，且已按“已识别冲突点”逐文件复核。
- [ ] **核心 gate**：`bun test test/oauth.test.ts test/http-transport.test.ts test/serve-http-ebrain-bridge.test.ts test/serve-http-ebrain-write.test.ts` 全过。
- [ ] `bun test tests/ebrain/` 全过。
- [ ] helm dry-run 双栈全过。
- [ ] `bun run ebrain:smoke` 全过，并检查真实 PGLite artifact assertions。
- [ ] `bun run verify` 全过。
- [ ] `git diff -- 'src/core/' 'src/mcp/' --stat` 没有非 append-only 或 contract-breaking 改动。
- [ ] `git diff -- admin/ skills/ deploy/ --stat` 只包含本次 sync 明确允许的变更。
- [ ] 没有新增 dependency。
- [ ] 没有新增 schema migration，除非 upstream 自身引入并已通过 migration review。

## 失败处理

核心 gate 失败时，默认判断是 ebrain wrapper/shim 破坏了 upstream 行为契约。优先改 ebrain 适配 upstream，不要为了 ebrain 让 upstream 行为退回旧版本。G2 的教训是：OAuth wrapper 必须 preserve upstream register/verify contract，再追加 executive binding。

merge conflict 难解时，不要在冲突状态中继续扩大修改。可以：

```bash
git merge --abort
```

然后重新评估是否改成 cherry-pick 模式，只拉 security fix、OAuth fix 或 serve-http fix 等明确 commit。

`tests/ebrain/` 失败时，说明 ebrain business code 受 upstream 影响。修 ebrain 业务代码，并保留 upstream 新行为。

`bun run ebrain:smoke` 失败时，不要只看测试输出。检查 PGLite 真实 artifacts：`enterprise_ingest_sources`、`enterprise_ingest_objects`、`pages` enterprise fields、`facts`、`enterprise_fact_claims_view`。如果没有真实 row/payload 证据，不要宣称 sync 完成。

helm dry-run 失败时，通常是 values 或 template schema drift。只修 chart，不要把 chart workaround 写进 runtime business code。

## Drift report 解读

`scripts/check-upstream-drift.sh` 每次输出：

- 当前 repo、HEAD、upstream ref、merge-base。
- upstream 自 merge-base 后的新 commit 数。
- 每个 tracked overlap file 的 upstream commit 数。
- 对非零 commit 文件给出 latest commit 和风险描述。

exit code 语义：

- `0`：tracked overlap files 没有 drift。
- `1`：至少一个 tracked overlap file 有 upstream drift，需要人工 review。
- `2`：环境或使用错误，例如不在 git repo、remote 缺失、fetch 失败、ref 不存在。

这个脚本只回答“upstream 有没有改到 ebrain 改过的 gbrain core 文件”。它不会判断所有 merge 风险，也不会替代 test、smoke 或人工 code review。

## 逐文件手解指南

### `src/core/operations.ts`

目标：保持 upstream operation registry 的完整顺序，再追加 ebrain operations。

合并时检查：

- upstream 新增 operation 是否改变了全局数组末尾位置。
- ebrain operations 是否仍然带 `scope` 和 `localOnly`。
- ebrain operation 的 handler 是否仍然通过 dispatch path 进入，不绕过 upstream validation。
- 没有把 upstream operation 的 optional field 改成 required。

常见正确解法是：接受 upstream registry 主体，把 ebrain block 移到新 upstream entries 之后。

### `src/core/operations-descriptions.ts`

目标：description registry 与 `operations.ts` 保持一致，且 ebrain descriptions 不覆盖 upstream keys。

合并时检查：

- upstream 新 description 是否被保留。
- ebrain DESCRIPTION const 是否仍在文件末尾附近，避免插入 upstream block 中间。
- map/object key 没有重复。

### `src/core/oauth-provider.ts`

目标：保留 upstream OAuth 安全修复，同时保留 ebrain executive binding。

合并时检查：

- `verifyAccessToken` 的 upstream token lookup、scope parsing、revocation、expiry 和 confidential-client 逻辑是否全部保留。
- ebrain 的 `executive_id` 读取仍然是 additive，不能让没有 executive binding 的 upstream token path 崩掉。
- 如果 upstream 改 JOIN 结构，优先照 upstream 新结构重建 ebrain `LEFT JOIN executives`。
- 重跑 `bun test test/oauth.test.ts test/http-transport.test.ts`。

不要为了让 ebrain 测试过而删除 upstream 新安全检查。

### `src/core/types.ts`

目标：shared public contract 保持 backward-compatible。

合并时检查：

- `AuthInfo` 上 ebrain 字段仍为 optional。
- `OperationContext` 上 ebrain 字段仍为 optional。
- `Operation` metadata 中 ebrain-required 规则只通过 ebrain lint/test 强制，不改变 gbrain 公共类型 requiredness。
- upstream 新 union member 或 interface 字段全部保留。

### `src/commands/serve-http.ts`

目标：HTTP transport 的 upstream auth/CORS/body/rate-limit/audit 行为先于 ebrain route convenience。

合并时检查：

- `/health`、`/mcp`、OAuth/DCR/admin route 顺序没有让 ebrain route 绕过 auth middleware。
- upstream body cap、rate limit、CORS、audit log 的新增逻辑仍对 ebrain admin bridge 生效，除非该 route 明确应该 public。
- ebrain bridge route 返回的数据来自真实 backend helper，不返回 fake success。
- 重跑 `test/serve-http-ebrain-bridge.test.ts` 和 `test/serve-http-ebrain-write.test.ts`。

### `src/commands/auth.ts`

目标：auth CLI 保持 upstream 行为，再追加 ebrain executive binding。

合并时检查：

- upstream `auth create/list/revoke` flags 仍兼容。
- ebrain `--executive-id` 或 dispatch case 不影响没有 executive binding 的 upstream auth flows。
- CLI invalid input 的 exit code 保持非零。

### `src/commands/jobs.ts`

目标：Minions/job dispatch 保留 upstream lifecycle，ebrain handlers 只注册自己的 cases。

合并时检查：

- upstream 新 job handler registration 全部保留。
- ebrain handler 仍然 lazy import，避免 CLI startup 拉业务依赖。
- upstream 如果改 `SubagentHandlerData` 或 job payload shape，逐个检查 D2/F2/E2/J2 handlers。
- 不要把 ebrain handler 写进 upstream generic branch 里。

### `src/cli.ts`

目标：CLI dispatch 先匹配 upstream commands，再保留 ebrain subcommands，不改变 upstream exit behavior。

合并时检查：

- upstream 新 command cases 全部保留。
- ebrain command cases 仍为 additive。
- async command 的 exit code 使用 upstream 当前模式，不退回 `process.exitCode` 失效路径。

## 风险分级

drift report 的风险不是绝对 severity，而是 merge-review 优先级：

| 风险 | 文件/场景 | 处理要求 |
|---|---|---|
| HIGH | `oauth-provider.ts`, `serve-http.ts` | 先读 upstream commit，再合并；必须跑 OAuth/HTTP/bridge/write gates。 |
| MEDIUM | `operations.ts`, `operations-descriptions.ts`, `types.ts`, `jobs.ts`, `auth.ts`, `cli.ts` | 通常可手解，但要确认 append-only 和 backward compatibility。 |
| LOW | tracked file 无 upstream commit | 可继续 sync，但仍跑完整 gate。 |

如果 HIGH drift 和 schema migration 同时出现，不要在同一个 commit 中处理业务修复。先做 upstream sync compatibility commit，再做 ebrain adaptation commit。

## 推荐记录格式

每次 sync 完成后，在阶段记录或 PR 描述中留下以下信息：

```text
Upstream sync date:
Previous merge-base:
Upstream target:
Drift check:
- operations.ts:
- operations-descriptions.ts:
- oauth-provider.ts:
- types.ts:
- serve-http.ts:
- auth.ts:
- jobs.ts:
- cli.ts:

Conflict resolution summary:
- 

Verification:
- bun test test/oauth.test.ts test/http-transport.test.ts:
- bun test test/serve-http-ebrain-bridge.test.ts test/serve-http-ebrain-write.test.ts:
- bun test tests/ebrain/:
- helm template aliyun/aws:
- bun run ebrain:smoke:
- bun run verify:

Runtime artifact evidence:
- 
```

Keep the artifact evidence concrete. For ebrain smoke or E2E, cite actual DB row counts, API response fields, page paths, generated brief paths, or queue/job payload fields. A green build alone is not sufficient for a sync that claims to preserve runtime workflows.

## 不要做

- 不要让 drift detector 自动 merge、rebase、checkout、stage、commit 或 create remote。
- 不要把 upstream sync 和 new feature work 混在一个 commit。
- 不要把 upstream behavior 改成 ebrain 特例，除非 PM 明确决定 fork divergence。
- 不要新增 schema migration 来解决纯 merge conflict。
- 不要用 full `bun test test/` 作为默认本地 gate；该 repo 已记录 OOM 风险。使用上面的 focused gates。
- 不要忽略 `PASS_WITH_DRIFT`：drift 是 actionable signal，需要人读 report。
