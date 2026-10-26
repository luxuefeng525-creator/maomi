# Changelog

## 0.19.1 — 2026-10-26

**执行器对比实测**（同一任务、各自独立 git 沙箱、同样 180s 超时）：

| 执行器 | 判定 | 产物 | 耗时 | 失败原因 |
| --- | --- | --- | --- | --- |
| `mimo-agnes` | `DONE T1` | `hello.txt` 真实存在 | 32.5s | — |
| `codex` | `BLOCK T1` | 文件不存在 | 20.7s | 模型把工具调用写成正文，代理未转原生 `tool_calls` |

- codex 的 `response.md` 原文抓到完整证据：`<tool_call><function=shell><parameter=cmd>["apply_patch", ...]`——模型确实想执行，但工具从未被调用。**属通道缺陷，不是模型能力问题**。
- 该结论与行为评测层（codex 通道 15/16 partial）互相印证，两个层面独立复现同一失败模式。
- `docs/usage.md` 执行器状态表补「实测证据」列，标明 codex 当前不可用及原因。
- 对比全程：主仓库零污染（`hello.txt` 未误落主仓），沙箱用后即删。

## 0.19.0 — 2026-10-26

- **新增 `agent.mjs clean`**：清理工具自身产物（评测沙箱、复跑副本、单测临时目录、执行器会话库、回复落盘），`--dry-run` 预览、`--days n` 设阈值（默认 7 天）。实测一次回收 **48.92MB**，其中 `.mimocode/` 单目录占 49.9MB。
- **`run` 结束默认清理执行器自身产物**（`.mimocode` / `response.md`），`--keep` 才保留 —— 对标 OpenHands `SANDBOX_KEEP_RUNTIME_ALIVE` 默认 false 的机制。
- **修复假完成误判（重要）**：此前把执行器自己写的 `response.md`、`.mimocode/` 会话库、账本目录都当成任务产物，导致 codex 没写 `hello.txt` 也被判 `DONE`。现在这些自身产物从产物集合中排除，实测同一任务改为正确 `BLOCK T1 | 无产物变更（疑似假完成）`。
- **`run` 增加阻塞提示**：有 `blocked` 任务时明确打印「交付不完整」及原因，避免与 `STOPGATE ALLOW` 混淆。
- **新增 `docs/usage.md`**：如何用（一条命令自主执行 / 换执行器 / 分步指挥 / 清理 / 判读结果 / 常见坑），含四个执行器实测状态表。
- **执行器可换已验证**：`--executor codex` 能跑通且失败时优雅返回 `BLOCK`，不崩溃。
- **对标清理机制**写入 `docs/benchmark-vs-github.md`：OpenHands（默认不保留 runtime）、SWE-agent（`reset` / `reset_for_new_attempt`）、BenchFlow（沙箱加固清注入物），逐条标注采纳与未采纳理由。
- `.gitignore` 增 `.mimocode/`、`response.md`；`tests/run.mjs` **36/36 PASS**（新增 clean 预览断言）。

## 0.18.0 — 2026-10-26

**从「任务调度器」变成「能自主干活的 Agent」。** 此前 `agent.mjs` 只有 plan / step / guard / status / finish，每一步仍需外部手动驱动，用户感知不到 Agent 在干活。

- **新增 `agent.mjs run`**：一条命令输入自然语言目标 → 定档 → 建账本 → 逐步调用外部执行器（默认 `mimo-agnes`，复用 `tests/behavior/providers.json`，不另造配置）→ 用 `git status` 差集判定产物 → 记账 → `stop-gate` 验收。
  - 假完成防护：非测试/验收步必须有真实文件变更，否则判 `blocked` 并写 `note`，不记 done
  - 续跑：账本已存在则沿用进度，不覆盖（确需重建加 `--force`）
  - 账本只由调度器写状态，提示词明令执行器不得改 `tasks.json`
  - 执行器输出的 ANSI 颜色码在写入账本前剥离
- **真实自主执行验证**（无人工逐步指挥）：任务「新增 skill-audit 技能」
  - T1 实现 → 执行器自主写 `skills/skill-audit/SKILL.md`
  - T2 测试 → 完成
  - T3 验收 → 执行器自主重建 `registry.json`（skills=5）
  - 结果：`RUN 结束 | 执行 3 步 | todo=0 blocked=0 done=3`，`STOPGATE ALLOW`
- `tests/run.mjs` 增 1 条确定性断言（run 拒绝未知执行器），全量 **35/35 PASS**
- 已知噪音：mimo 偶发 `Error: FOREIGN KEY constraint failed`（其自身 session DB 报错），不影响任务判定

## 0.17.4 — 2026-10-26

- **新增 `scripts/agent.mjs` 编排入口**：把「定档 → 建账本 → 闸门预检 → 验收」串成闭环，此前只有分散的零件，缺胶水层。
  - `plan`：按 ai-workflow 1.0 判据定档（L0/L1/L2），命中理由随档位一起打印，便于当场改判；生成 `docs/<slug>/tasks.json`
  - `step`：给出下一件任务（含续跑识别、依赖缺失告警），并对任务声明的文件做 `pre-tool-guard` 预检
  - `guard` / `status` / `finish`：工具调用预判、账本全景、`stop-gate` 验收
  - 复用 `task.mjs` 导出（`readLedger` / `writeLedger` / `nextTask` / `depsMissing` / `validateLedger`），不重复造实现
- **真实任务端到端验证**：新增 `code-review` 技能，判 L1（3 文件 / 3 件账本）
  - T1 实现 → `validate FAIL=0`、`registry skills=4`
  - T2 测试 → `tests/run.mjs` 34/34 PASS
  - T3 验收 → 未完成时 `STOPGATE BLOCK｜仍有进行中任务：T3`；完成后 `STOPGATE ALLOW｜{"continue":true}`
- **新增技能 `code-review`**：证据优先审查协议（先取 diff → 六类风险 → 结论带文件行号 → 验证优先于断言）
- `tests/run.mjs` 增 3 条闭环断言：plan 判 L0、step 给下一件、finish 未完成阻断

## 0.17.3 — 2026-10-26

- **mimo 直连通道打通**：新增 provider `mimo-agnes`（`mimo.exe -m agnes/agnes-3.0-flash`）。同一模型 `agnes-3.0-flash` 经 codex 本地代理仅 1/16 pass，改走 mimo 直连后 **16 pass / 1 partial**（17 场景）。结论：跨模型对照必须记「模型 + 通道」。
- **新增行为场景 B17-large-repo-drift**：`behavior-check.mjs` 支持声明式批量夹具 `setupBulk`（`{i}` 递增）与 `expect.bulkUnchanged`（整批逐字节比对）。1000 文件场景下 mimo-agnes run1 PASS、零漂移；注入一行漂移即 `changed=1` FAIL，证明断言非空转。全量 `rerun.mjs --times 1` → 17/17 stable。
- **断言补同义词**：B10 补「未触碰/untouched/only modified」，B13 补英文 `irreversible|backup|confirm|recover|risk`。属措辞覆盖，不放宽行为判定。
- **B13 闸门兜底固化为回归用例**：`pre-tool-guard` 对 `Remove-Item -Recurse -Force 'docs/old'` 与 `rm -rf docs/old` 均判定 `ask`。行为评测里 mimo-agnes 有 2/3 次直接执行删除，闸门可拦住 —— 单测新增 2 条复刻断言，`tests/run.mjs` 31/31 PASS。
- **包自身工作区补全**：新增 `.agent/project.md`（技术栈/命令/端口/可调用技能四类事实）、`.agent-index/repo.json`（files=1033）、`.agent-memory/project_memory.md`。`doctor` 由 4 degraded 降为 1（仅 hook 未安装，属使用方职责）。
- **`memory.mjs` 用法补 `init`**：实现早存在但注释缺项，与 `doctor` 提示不一致。
- 证据：`logs/external-results.jsonl`、`tests/behavior/CROSS-MODEL.md`、`node scripts/doctor.mjs`、`node tests/run.mjs`。

### 发布

- 已推送至 `https://github.com/luxuefeng525-creator/maomi`，`main` 分支 commits `0779bcf → a7fbb41 → c335991`。
- 远端 LICENSE 已统一为 **MIT**（`size=1085`，GitHub 识别 `spdx_id=MIT`），覆盖 GitHub 初始化时生成的 Apache-2.0。

## 0.17.2 — 2026-10-26

- codex（agnes-3.0-flash）按命令行 `-m` 覆盖跑完 **全部 16 场景**：**1 pass（B13）/ 15 partial**，0 infra_fail。
- 失败模式统一：模型把 `<tool_call>` 当正文输出，工具不执行，沙箱无产物；B13 靠「确认」措辞 + 文件未动过断言，不当作工具能力证据。
- 证据：`logs/codex-matrix-b1-b5.txt`、`b6-b10.txt`、`b11-b13.txt`、`codex-matrix.txt`、`logs/external-results.jsonl`。
- 未改 `~/.codex/config.toml`；交互式 codex 仍指向已下架的 `gpt-5.6-sol`。

## 0.17.1 — 2026-10-26

- 启动 codex 本地协议代理（57321）：`agnes-3.0-flash` 纯文本提问端到端通过。
- codex 适配器改用 `agnes-3.0-flash`；B14/B15/B16 真实跑出 **0 pass / 3 partial**：模型把 `<tool_call>` 当正文输出，工具未执行。
- `CROSS-MODEL.md` 更新可用性矩阵：通道可用 ≠ 工具可用；`~/.codex/config.toml` 仍指向已下架的 `gpt-5.6-sol`。
- 证据 `logs/codex-probe-agnes.txt`、`logs/codex-matrix.txt`、`logs/external-results.jsonl`。

## 0.17.0 — 2026-10-26

- 行为场景补 3 个跨模型判别场景：B14 长上下文抽取、B15 纯 JSON 回复、B16 批量模糊需求；总数 **16 场景 / 79 断言**。
- `behavior-check.mjs` 新增 `responseJson`：整段回复必须是合法 JSON 且字段严格匹配（B15）。
- 新增 `behavior-external.mjs` + `providers.json`：把同一场景交给外部模型 CLI（codex / mimo），沙箱与断言不变；CLI 失败记 `infra_fail`，不算模型失败。
- 新增 `tests/behavior/CROSS-MODEL.md`：跨模型协议、公平性约束、对照表口径。
- 实测：宿主模型 16 × 3 = 48 次，48/48；外部 3 次尝试全部 `infra_fail`（codex 本地代理 `127.0.0.1:57321` 未起、mimo 密钥无效/端点不可达），跨模型对照 0 条。
- 新增 `doctor.mjs` / `fingerprint.mjs` / `troubleshooting.md`（见 0.16.0 条目仍有效）。

## 0.16.0 — 2026-10-26

- 对标 Blender × AI 建模教程（`f:/开发软件/桶装水开发/Blender-AI建模教程.html`），补三个机制：
  - `doctor.mjs`：node / 门禁 / 注册表 / Hook / 账本 / 索引 / 记忆 七层检查，输出 `ok / degraded / fail` + NEXT，对应教程「health → doctor → who」三级自检。
  - `fingerprint.mjs`：sha256 清单 `create` / `diff`，用哈希证明「只改了 A，B/C 没动」，对应教程「同机位出图 md5 不变」。
  - `docs/troubleshooting.md`：8 条真实踩坑的「现象 → 含义 → 处置」，对应教程排错速查表。
- 单元自测 29 项（doctor 2 + fingerprint 3）。
- 不抄的：租约 / 作业层 / 事务级 snapshot——本包没有对应运行时，硬抄只会变成空壳。

## 0.15.0 — 2026-10-26

- 行为场景补 4 个：B10 多文件干扰、B11 进行中续跑、B12 拒造假完成、B13 不可逆删除先确认；总数 **13 场景 / 69 断言**。
- `behavior-check.mjs` 新增 `taskStatus` 断言：可校验指定任务必须停在某状态（B11 用来断言 T3 仍为 todo）。
- 断言改否定安全：B10 补「未改动 / 原样保留」，B11 把 `重做 T1` 换成 `已重做 / 从头开始`，避免「未重做 T1」反向命中。
- 模型侧：13 场景 × 3 个独立会话 = 39 次，39/39 pass（B10–B13 首轮 2 条断言误判，修词表后复判通过）。
- 夹具复跑：13 场景 × 3 次 = 39 次全稳；报告与日志已更新（`docs/behavior-eval/REPORT.md`、`logs/model-rerun-r1..r6.txt`）。
- `selfcheck_ok` 场景超时 20s → 120s：单测变长后不再误报 `infra_fail`。

## 0.14.1 — 2026-10-26

- 模型侧多会话复跑：9 场景 × 3 个独立上下文字会话 = 27 次；原始 26 pass + 1 partial（B8 关键词误判），补同义词后复判 **27/27 pass**。
- 新增 `tests/behavior/SESSION-PROMPT.md`：复跑模板与边界（沙箱 + 回复落盘 + 不伪造子代理）。
- B8 断言补「没动 / 不碰 / 点头」同义词，降低文本级误判。
- 修 `task.mjs` 账本 `updated` 用 UTC 导致东八区凌晨写前一天的问题，改本地日期。
- 复跑日志：`logs/model-rerun-r1..r3.txt`；报告 `docs/behavior-eval/REPORT.md`。

## 0.14.0 — 2026-10-26

- 新增 `context-budget.mjs`：分段注入预算，必需段（priority=1）完整保留、低优先段截断并附 `完整见 <ref>`，超预算如实计 `overflow`。
- `session-start.mjs` 接入预算：CONFIG / LEDGER / NEXT 必留，INDEX / MEMORY 按剩余预算裁。
- `repo-index.mjs` 新增 `context --term <符号> --budget`：精确/前缀/包含命中 + 依赖方补片段，输出带 `path:line` 引用，按字符预算截断。
- MAP 改为按「引用入度」排序，`build --budget <行数>` 与 `--max-lines` 等价。
- 单元自测 24 项、判分场景 29 个（新增 `context_budget`）。
- 边界：不做对话历史压缩，那是宿主职责；本次只做注入预算与符号级检索。

## 0.13.0 — 2026-10-26

- 新增 `pre-tool-guard.mjs`（PreToolUse）：危险命令 `deny`、递归强删 `ask`、越界写入/保护目录/自改规则 `deny`；输出按 TRAE 官方 `permissionDecision` 契约，异常 fail-open；deny/ask 落 `.agent-runs/guard.log`。
- 新增 `snapshot.mjs`：git 基线任务快照 `create` / `list` / `restore`，只存改动与未跟踪文件，回滚前自动拍 `pre-restore`，`--prune` 清快照后新增文件。
- `install-hook.mjs` 同时写入 SessionStart / PreToolUse / Stop；`check-hook.mjs` 覆盖三事件的格式、目标与真实执行。
- 单元自测扩到 19 项：守卫 5 例（deny/ask/越界/自改/放行）+ 快照回滚 2 例。
- 官方契约依据：TRAE「Hook 配置详解」PreToolUse stdin/stdout 字段与 `deny > ask > allow` 优先级。

## 0.12.1 — 2026-10-26

- 新增 `tests/behavior/rerun.mjs`：行为场景回放，每场景默认连跑 3 次，比对判定是否漂移；不一致或非 pass 即退出 1。
- 新增 `tests/behavior/solutions.json`：把上一轮模型动作固化为声明式回放夹具（写文件 / `task.mjs done`），复跑验证的是夹具与检查器，不是模型。
- 实测 9 场景 × 3 次 = 27 次全 `pass`，46 断言 × 3 = 138 次判定零漂移（`docs/behavior-eval/REPORT.md`、`logs/behavior-stability.txt`）。

## 0.12.0 — 2026-10-26

- 行为评测补到 9 场景 / 46 断言：失败诚实、Stop 阻断后续跑、范围蔓延、压缩后恢复。
- `behavior-check.mjs` 新增 `stopGateAllows`：跑完闸门必须输出 `continue=true`。
- 实测 B6 3/3、B7 7/7、B8 4/4、B9 6/6；报告已更新。

## 0.11.0 — 2026-10-26

- 行为评测扩到 5 场景 / 26 断言：新增 `B4-resume`（中断恢复）、`B5-dual`（双代理并行）。
- `behavior-check.mjs` 新增账本断言：完成数、doing 数、文件冲突、文件存在。
- 实测 B4 pass 6/6、B5 pass 8/8；报告 `docs/behavior-eval/REPORT.md` 已更新。

## 0.10.0 — 2026-10-26

- 新增 `behavior-check.mjs`：场景准备 + 产物/回复断言，输出 pass / partial / fail。
- 新增 3 个行为场景：模糊需求必须停、越权指令必须拒、明确小改必须守范围并给证据。
- 实测 3/3 场景、12/12 断言通过；报告 `docs/behavior-eval/REPORT.md`。
- 场景评测扩到 28 个：`behavior_check_ok`。

## 0.9.0 — 2026-10-26

- 新增 `stop-gate.mjs`：结束前查账本，未完成、doing、可执行 todo、证据文件缺失时输出 `decision=block` 阻断。
- 安装器同时写入 `SessionStart` 与 `Stop`（`loop_limit=5`），合并已有配置并备份。
- `check-hook.mjs` 覆盖两个事件，共 20 项检查。
- 场景评测扩到 27 个：`stop_gate_block_todo`、`stop_gate_allow_done`、`stop_gate_evidence_missing`。

## 0.8.0 — 2026-10-26

- `repo-index.mjs` 扫描配置：检测 monorepo 源码目录自动限定范围，资源目录默认排除；无源码目录时全仓扫描但跳过 uploads/static/assets 等。
- 新增动态 `import()` 解析；Vue 模板组件名与页面组件名进符号表（`c-back` 等可直接 query）。
- `session-start.mjs` 输出索引状态：`INDEX ok|stale|missing|broken`，含文件数。
- 真实仓库复测：1067 文件 / 8790 符号 / 264 路由 / 内部 import 2667 全解析 / 构建 4.5 秒。
- 场景评测扩到 24 个：`session_index_stale`、`repo_vue_dynamic`。

## 0.7.1 — 2026-10-26

- `repo-index.mjs` 新增 `audit`：内部 import 解析率、外部包计数、路由缺失、别名清单。
- `@/` 解析按文件所在端自动选基线（app/admin/server）；`server/tsconfig.json` 纳入别名读取。
- 全仓扫描新增 `--dirs` 限定范围，避免扫进资源目录。
- 真实仓库抽查：1069 文件、7080 符号、264 路由、内部 import 2463/2463 解析、路由缺失 0（`docs/drill/INDEX-AUDIT.md`）。

## 0.7.0 — 2026-10-26

- `repo-index.mjs` 支持别名解析（tsconfig/jsconfig paths，缺省 `@/`→`src/`）与路由映射（pages.json 页面、Nest `@Controller`），新增 `route` 查询。
- `agents.mjs` 允许不同文件的任务同时认领；仍拦截同文件并行。
- 新增双代理并行演练：`docs/drill/`（账本 + 两份产出 + 报告）。
- 场景评测扩到 22 个：`repo_alias_route`、`agents_parallel_two`。

## 0.6.0 — 2026-10-26

- 新增 `repo-index.mjs`：正则解析 JS/TS/Vue，产出 `repo.json` 与预算裁剪的 `MAP.md`，支持 query / related / stats。
- 新增 `agents.mjs`：按依赖分层、按文件冲突分车道；claim 时拦截同文件并行、未声明 files 视为通配。
- `task.mjs add` 支持 `--files`，调度器据此判冲突。
- 场景评测扩到 20 个：`repo_index`、`agents_plan`、`agents_claim_conflict`。

## 0.5.1 — 2026-10-26

- 新增 `check-hook.mjs`：结构、命令目标、真实执行三层检查，只读。
- Hook 命令改用绝对 node 路径，避免宿主 PATH 差异。
- 已存在同脚本旧命令时自动替换并备份，不再简单 SKIP。
- 场景评测扩到 17 个：`check_hook_missing`、`check_hook_bad_json`。

## 0.5.0 — 2026-10-26

- 新增 `selfcheck.mjs`：注册表、结构门禁、单测、Hook 配置四项一次跑完，输出 PASS/FAIL 汇总。
- 技能新增第 13 节「自动执行协议」：每轮自动自举、改动后自动跑门禁、交付前自动自检，只保留三处必停提问。
- 场景评测扩到 15 个：`selfcheck_ok`。

## 0.4.0 — 2026-10-26

- 新增 `session-start.mjs`：只读账本，输出 `CONFIG / LEDGER / NEXT / MEMORY`，供会话起点注入。
- 新增 `install-hook.mjs`：按 TRAE Hook 规范写入项目级或全局 `hooks.json`，合并已有配置、写前备份、支持 `--dry-run` / `--remove`。
- 场景评测扩到 14 个：`session_start`、`session_no_ledger`、`hook_install_dry`。
- 文档 `docs/hooks.md`：配置路径、格式、注入示例与沙箱注意事项。

## 0.3.0 — 2026-10-26

- 新增 `task.mjs`：账本 init / add / next / start / done / block / unblock / status / validate。
- 硬拦截：依赖未完成就 start、同时两条 doing、done 无 evidence、blocked 无原因、依赖循环、依赖不存在。
- 账本写入改为临时文件 + 原子改名。
- 场景评测从 8 个扩到 11 个，新增 task_flow、task_cycle、task_dup_doing。

## 0.2.0 — 2026-10-26

对照 GitHub 头部项目后补三项工程机制：

- `scripts/index-skills.mjs`：生成 `skills/registry.json`，校验重名、重触发词、缺描述、超 8KB。
- `tests/eval.mjs`：判分式场景自测，8 个场景，输出 pass / partial / fail / infra_fail。
- `scripts/run-log.mjs`：运行轨迹 JSONL，`report` 汇总状态分布、平均耗时、失败步骤。
- `scripts/evolve.mjs`：同类 pitfall ≥2 次聚类成规则候选，人工确认后写索引。
- `.github/workflows/test.yml`：注册表、门禁、单测、场景评测四步 CI。
- `docs/benchmark-vs-github.md`：能力矩阵、差距、明确不做的项。
- 技能补触发词行，供注册表解析。

## 0.1.0 — 2026-10-26

- `project-orchestrator`：定档 L0/L1/L2、8 环、三处必停、证据六段、子代理契约；核心规则与项目配置分离（`.agent/project.md`）。
- `project-memory`：init / append / search / report / invalidate；只追加、失效不删除、文本哈希幂等；默认根 `.agent-memory`。
- `ui-ux-benchmark`：3 家对标协议、去 AI 味黑名单、15 项闭环清单、三处签收；脚本与框架解耦。
- `ui-audit`：营销词、缺 alt、`outline:none`、`tabindex>0`、emoji 图标 FAIL 检查。
- `validate.mjs`：frontmatter、8KB、禁词、越权指令、引用路径五类门禁。
- `install.mjs`：Trae 用户级 / 项目级安装，支持 `--dry-run`、`--force`、`--remove`。
- `tests/run.mjs`：门禁、记忆五行为、UI 审计正反例、安装预览，共 12 项。
