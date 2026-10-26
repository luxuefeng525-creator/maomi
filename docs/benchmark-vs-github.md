# 与 GitHub 头部项目的差距（2026-10-26）

对照对象：anthropics/skills、obra/superpowers、wshobson/agents、claude-task-master、SWE-agent、SWE-bench、aider、OpenHands。
只比工程机制，不比提示词写法；只记可复刻的部分。

## 能力矩阵

| 维度 | 本包现状 | 参照机制 | 差距 | 本轮动作 |
| --- | --- | --- | --- | --- |
| A 技能发现 | 人工白名单；无机器可读索引 | anthropics/skills：SKILL.md 只放元数据，按需加载；wshobson：单一源生成多端产物并查重 | 缺 registry 与触发词校验 | 已补 `index-skills.mjs` + `skills/registry.json`，重名/重触发词/超限直接失败 |
| B 任务图 | `tasks.json` + `task.mjs`：next / start / done / validate，原子写 | task-master：deps + 优先级 + next_task + 原子状态 | 缺优先级排序与跨会话自动恢复 | 已补 `task.mjs`；优先级暂不做 |
| C Hook | `SessionStart` / `PreToolUse` / `Stop` 三事件已接：自举 / 守卫 / 验收阻断 | superpowers：SessionStart 注入；Claude Code PreToolUse 权限决策；SWE-agent on_start/on_instance_completed | UserPromptSubmit / PostToolUse / Notification 未用 | 已补 `session-start.mjs`、`pre-tool-guard.mjs`、`stop-gate.mjs`，安装器合并 + 备份 |
| D 评估 | 24 项脚本断言 + 29 场景判分 + 16 行为场景 / 79 断言；宿主 48 会话 48/48；跨模型通道不可用 | SWE-bench：任务→测试→resolved/unresolved/infra；aider polyglot | 跨模型未测 | 已补 `tests/eval.mjs`、`behavior-check.mjs`、`rerun.mjs`、`SESSION-PROMPT.md` |
| E 观测 | 无轨迹 | SWE-agent inspector；SWE-bench per-instance report；task-master activity log | 无运行轨迹，失败无法归类 | 已补 `run-log.mjs`（JSONL + report：状态分布、平均耗时、失败步骤） |
| F 上下文 | `context-budget` 分段预算（必需段必留）；`repo-index context` 符号片段 + 依赖方；MAP 按引用入度排序；SessionStart 已接入 | aider RepoMap 预算；SWE-agent 折叠旧观测；wshobson 8KB/150 行 | 非 LSP，模板字符串动态路径仍可能漏；依赖方片段定位到文件头 | 已补 `context-budget.mjs` + `repo-index context` + `session-start --budget` |
| G 多代理 | `agents.mjs`：依赖分层 + 文件冲突分车道 + 并行认领 | superpowers 一域一代理；worktree 隔离 | 无 worktree 级隔离 | 已补 `agents.mjs` + 双代理演练 |
| H 沙箱权限 | `PreToolUse` 守卫：危险命令 deny / 递归强删 ask / 越界与自改 deny | SWE-agent 容器；OpenHands confirmation policy；Claude Code 权限决策 | 无进程级隔离，字段名差异需实测 | 已补 `pre-tool-guard.mjs`（fail-open + guard.log） |
| I 快照回滚 | git 工作区快照 create/list/restore，回滚前自动 pre-restore | Cline checkpoints；aider undo | 只存文本改动，不含未跟踪大文件 | 已补 `snapshot.mjs` |
| J 诊断与指纹 | `doctor` 七层三态 + NEXT；`fingerprint` sha256 清单对比 | Blender × AI 教程：health→doctor→who 三级自检；同机位 md5 指纹 | 诊断不到进程/租约级；指纹不懂语义 | 已补 `doctor.mjs` + `fingerprint.mjs` + `troubleshooting.md` |
| 自进化 | 记忆维护靠人工 | 无直接对应（多为人工 review） | 重复踩坑不会自动变成规则 | 已补 `evolve.mjs`：同类 pitfall ≥2 次生成规则候选，人工确认 |

## 本轮补的机制（含验证）

| 项 | 证据 |
| --- | --- |
| 技能注册表 | `node scripts/index-skills.mjs --check` → `skills=3 warnings=0` |
| 判分式自测 | `node tests/eval.mjs` → `S:{"pass":29}`；反例场景必须失败 |
| 任务调度器 | `task.mjs`：next / start / done / validate；依赖循环、多 doing、无证据 done 全部拦截 |
| 运行轨迹 + 自进化 | eval 场景 `runlog_report`、`evolve_proposal` 通过；`report` 输出状态分布与失败步骤 |
| PreToolUse 守卫 | 真实仓库实测：自改 `.trae/skills` → `deny`；`git reset --hard` → `deny`；日志 `.agent-runs/guard.log` |
| 任务快照 | 真实仓库 `snapshot create` → 27 文件 / 606293 B；单测含回滚 + prune 零残留 |
| 上下文预算 + 符号检索 | 真实仓库 `context focusPageHeading --budget 1500` → `CTX files=3 chars=1094/1500`；单测覆盖必需段必留、截断给引用、MAP 引用度排序 |
| 模型侧复跑 | 16 场景 × 3 次 = 48 次独立会话：原始 45 pass + 3 断言误判（B8/B10/B11），修词表后 48/48；日志 `logs/model-rerun-r1..r9.txt` |
| 一键诊断 + 验收指纹 | doctor 坏账本 → `verdict=fail` 且给 NEXT；fingerprint 改动 → `changed=1 added=1`，未改 → `unchanged=3` |
| 跨模型适配 | codex 经本地代理 57321 跑完 16 场景：**1 pass（B13）/ 15 partial**，工具调用不通；mimo 仍密钥/端点失败；`logs/codex-matrix-b1-b5.txt` 等 4 份 |
| 真实仓库实测 | doctor `VERDICT ok`（8/8 OK，Hook 3/3）；fingerprint `app/src` 307 文件 `unchanged=307`（`logs/doctor-water.txt`、`logs/fingerprint-water.txt`） |

## 仍然不足（按优先级）

1. **Hook 只接了三个事件**：SessionStart / PreToolUse / Stop 已可用，但必须在设置里启用；UserPromptSubmit / PostToolUse / Notification 未用（自动格式化、提示词拦截仍缺）。
2. **真实 Hook 未验证**：SessionStart 会注入 next，B4/B9 行为场景已 3 会话验证续跑；但注入本身能否让新会话自动续跑，仍需 Hook 在设置里启用后实测。
3. **跨模型仍未对照**：宿主 16 场景 × 3 = 48/48；外部 CLI（codex / mimo）本机通道全部不可用，跨模型对照 0 条。
4. **无轨迹查看器**：只有 JSONL 与汇总，没有回放。
5. **索引仍是正则级**：已有符号片段检索与引用入度排序，但不是 LSP；模板字符串动态路径、`<script setup>` 局部符号仍可能漏。
6. **诊断不到运行时深处**：`doctor` 只查文件与命令，没有进程 / 端口 / 租约级诊断；教程里的写租约、作业层、对象级事务没有对应运行时，未抄。

## 明确不做（附理由）

| 不做 | 理由 |
| --- | --- |
| LLM judge 打分 | 上游作者自标实验性，且单机包没有人工标注预算；自评容易自我强化 |
| 多宿主适配层 | 参照项目靠几十个插件摊薄成本；本包单形态，做适配等于自增维护债 |
| 容器沙箱运行时 | 宿主已有权限模型；本包只做规则与脚本，不接管执行环境 |
| 向量记忆 | 几十万字符规模关键词够用；引入 embedding 带来索引漂移与依赖 |

## 清理与重置机制对标（2026-10-26）

用户诉求：「要加强也得会清理不需要的东西、多余的数据」。实测本仓 `.mimocode/` 已堆到 **49.9MB**（执行器会话库），确实该管。只抄机制，不搬代码：

| 来源 | 机制（实测/文档口径） | 本包采纳 |
| --- | --- | --- |
| OpenHands | `SANDBOX_KEEP_RUNTIME_ALIVE` 默认 `false`——会话结束默认**不保留**运行时；`SANDBOX_PAUSE_CLOSED_RUNTIMES` 默认 `false`，即停止而非暂停；`DockerWorkspace` 用 context manager 自动清理容器 | **已采纳**：`agent.mjs run` 结束默认删除执行器自身产物（`.mimocode` / `response.md`），`--keep` 才保留 |
| SWE-agent | `Environment.reset()` 把环境恢复到干净状态；`reset_for_new_attempt()` 在同一实例重试前重置仓库与环境变量；`Repository.get_reset_commands()` 给出重置命令清单 | **部分采纳**：`run` 账本存在即续跑、`--force` 才重建；未引入容器级 reset（本包不接管执行环境） |
| BenchFlow | agent 与 verifier 之间「加固沙箱」防作弊：杀掉残留 agent 进程、把构建配置文件还原为 agent 前快照、删除 agent 注入的 `conftest.py` / `sitecustomize.py` / `*.pth` | **未采纳**：本项目为 Node 包，Python 注入物规则不适用；等价风险已由「执行器产物不计入任务产物」覆盖 |

新增命令：

```powershell
node scripts/agent.mjs clean --dry-run    # 预览，不删
node scripts/agent.mjs clean --days 7     # 清理 7 天前的工具产物
```

清理范围只含工具自身产物（评测沙箱、复跑副本、单测临时目录、执行器会话库、回复落盘），**不触碰源码与提交记录**。

## 复跑

```powershell
node scripts/index-skills.mjs --check
node scripts/validate.mjs
node tests/run.mjs
node tests/eval.mjs
```
