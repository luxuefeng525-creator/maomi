# agent-workbench

能直接干活的 AI Agent 与 Skills 集合：把「需求 → 计划 → 实现 → 测试 → 验收 → 交付」做成可执行的门禁，每一步都要能被命令验证。

不提供人设表演，也不承诺一键生成整个项目。提供三样东西：调度规则、可运行检查脚本、可追溯记忆。

## 30 秒安装

```powershell
# 预览
node scripts/install.mjs --target trae-user --dry-run

# 安装到 Trae 用户级（三个技能 + Agent 人格）
node scripts/install.mjs --target trae-user

# 或安装到当前仓库
node scripts/install.mjs --target project --tool trae
node scripts/install.mjs --target project --tool generic
```

安装后重载 IDE，技能列表出现 `project-orchestrator`、`project-memory`、`ui-ux-benchmark`。

## 三个技能

| 技能 | 解决什么 | 关键约束 |
| --- | --- | --- |
| `project-orchestrator` | 长任务跑偏、跳步、交付无证据 | 定档 L0/L1/L2；8 环；三处必停；汇报六段 |
| `project-memory` | 跨会话丢上下文、重复踩坑 | 四类条目；只追加；失效不删除；关键词检索 |
| `ui-ux-benchmark` | 「好看点」无法验收、AI 味模板 | 3 家对标；文案三检查；15 项闭环；三处签收 |

## 设计原则（可被脚本检查）

1. 没有命令输出，不算完成。
2. 先定档再动手；升档要说明原因。
3. 一次只改一个模块；同一文件不并行改。
4. 真环境验收，禁 mock；造数用后回滚，零残留。
5. 三处必停：需求不清、不可逆操作、验收不过。
6. 记忆只追加；结论作废用 invalid 标记。
7. 规则写成可判定项，不写形容词。

## 命令

```powershell
node scripts/index-skills.mjs --check    # 技能注册表：重名/重触发词/缺描述/超 8KB
node scripts/validate.mjs                # 结构门禁：frontmatter、禁词、越权指令、引用路径
node scripts/session-start.mjs           # 会话自举：下一件任务 + 状态（Hook 自动调）
node scripts/doctor.mjs --cwd .          # 一键诊断：ok / degraded / fail + 下一步
node scripts/fingerprint.mjs create --cwd . --dirs app/src   # 验收指纹（sha256 清单）
node scripts/fingerprint.mjs diff --cwd . --before <清单>     # 改没改按哈希说话
node scripts/selfcheck.mjs --cwd .       # 自检汇总：注册表/门禁/单测/Hook 配置
node scripts/check-hook.mjs --cwd .      # Hook 格式 + 命令目标 + 真实执行三层检查
node scripts/stop-gate.mjs --cwd .       # Stop 闸门：未完成/证据缺失则阻断结束
node scripts/repo-index.mjs build        # 建仓库符号索引 .agent-index/{repo.json,MAP.md}
node scripts/repo-index.mjs query --term <符号>
node scripts/repo-index.mjs audit          # 解析率、路由缺失、别名清单
node scripts/repo-index.mjs context --term <符号> --budget 4000   # 符号级片段 + 引用入度，预算内
node scripts/context-budget.mjs --sections <sections.json> --budget 4000   # 分段注入预算：必需段必留
node scripts/agents.mjs plan --file docs/<任务>/tasks.json   # 依赖分层 + 文件冲突分车道
node scripts/install-hook.mjs --target trae-project --cwd .   # 安装 SessionStart / PreToolUse / Stop Hook
node scripts/pre-tool-guard.mjs --event <事件.json>           # PreToolUse 守卫：deny / ask / allow
node scripts/snapshot.mjs create --cwd . --label T1           # 任务前快照（git 基线，只存改动）
node scripts/snapshot.mjs restore --cwd . --id <id> --prune   # 回滚（自动先拍 pre-restore）
node skills/project-orchestrator/scripts/task.mjs next --file docs/<任务>/tasks.json
node tests/run.mjs                       # 单元自测 29 项
node tests/eval.mjs                      # 判分式场景自测：pass / partial / fail / infra_fail
node tests/behavior/rerun.mjs --times 3  # 行为场景回放：每场景 3 次，比对判定漂移
node scripts/behavior-external.mjs list  # 跨模型适配器：codex / mimo / 自定义
node scripts/behavior-external.mjs matrix --providers codex,mimo-deepseek --scenarios B14-long-context-extract,B15-json-only
node scripts/run-log.mjs start --root .agent-runs --task "任务名" --tier L1
node scripts/evolve.mjs --root .agent-memory --min 2   # 重复踩坑 → 规则候选
node skills/ui-ux-benchmark/scripts/ui-audit.mjs --files "src/pages/order.vue"
node skills/project-memory/scripts/memory.mjs search --root .agent-memory --query "关键词"
```

## 能力与差距

| 能力 | 状态 |
| --- | --- |
| 定档与 8 环 | 有，技能内规则 |
| 任务账本 | 有格式，`task.mjs` 负责推进与校验 |
| 技能注册表 | 有，机器可校验 |
| 判分式自测 | 有，29 个场景 |
| 运行轨迹 | 有，JSONL + 汇总 |
| 自进化提案 | 有，pitfall 聚类 |
| 仓库索引 | 有，符号 + 别名解析 + 页面/接口路由 + 引用入度排序的预算 MAP |
| 符号级检索 | 有，`repo-index context`：精确/前缀/包含命中 + 依赖方补片段，预算内输出 |
| 上下文预算 | 有，必需段必留、低优先截断给 `完整见 <路径>`，SessionStart 已接入 |
| 多代理调度 | 有，并行认领 + 文件冲突拦截（已演练） |
| 宿主 Hook | 有，SessionStart 自举 + Stop 验收阻断（需在设置启用） |
| PreToolUse 守卫 | 有，危险命令 deny / 递归强删 ask / 越界写入与自改规则 deny（需在设置启用） |
| 任务快照回滚 | 有，git 工作区快照 + 自动 pre-restore + `--prune` 清新增未跟踪文件 |
| 自动执行 | 有，协议 + selfcheck 汇总门禁；`rules/agent-rules.md` 每步注入并留 sha256 指纹（`--dry-run` 可预览） |
| 模型行为评估 | 有，16 场景 / 79 断言；宿主 48 会话 48/48 pass；夹具复跑 48/48 稳定 |
| 提示词纪律 | 248 条 TRAE 提示词 → 153 条精简；9 条注入 `rules/agent-rules.md`，反偷懒协议与 6 个模板沉淀为 `skills/prompt-discipline/`；执行器推理强度 `high` |
| 自进化 | `evolve.mjs` 聚类记忆坑 + 评测失败 + 闸门拦截，产出规则候选；人工确认后才写规则 |
| 跨模型评测 | 有适配器 + 协议；两条通道实测：`mimo-agnes` 17 场景 **16 pass / 1 partial**、`codex`（代理 57321）16 场景 **14 pass / 2 partial / 1 fail**；`--with-rules` 注入硬规则后 B13 双方 5/5 合规 |
| 一键诊断 | 有，node / 门禁 / 注册表 / Hook / 账本 / 索引 / 记忆 七层三态 + NEXT |
| 验收指纹 | 有，sha256 清单 `create` / `diff`，未改动按哈希判定 |

完整对照见 [docs/benchmark-vs-github.md](docs/benchmark-vs-github.md)。

## 项目配置

技能本体不绑定框架。复制 `AGENTS.md` 到目标仓库，按需新建 `.agent/project.md` 写四类事实：技术栈与目录、构建/测试命令、端口、可调用项目技能。没有该文件时，技能会探测仓库并把结论写进 `docs/<任务>/STACK.md`。

## 兼容性

| 形态 | 路径 | 状态 |
| --- | --- | --- |
| Trae 用户级 | `~/.trae-cn/skills`、`~/.trae-cn/agents` | 本机实测 |
| 项目级（Trae） | `.trae/skills` | 由安装器写入 |
| 项目级（通用） | `.agent/skills` + `AGENTS.md` | 由安装器写入 |
| Claude Code / Cursor | 未提供适配 | 需按 Agent Skills 规范手工复制 |

技能格式：一个目录一个 `SKILL.md`，frontmatter 只放 `name` 与 `description`，正文按需读取。

## 目录

```text
agent-workbench/
├─ AGENTS.md
├─ agents/orchestrator.md
├─ skills/
│  ├─ project-orchestrator/
│  ├─ project-memory/
│  └─ ui-ux-benchmark/
├─ scripts/install.mjs
├─ tests/run.mjs
└─ docs/
```

## 边界

- 记忆是关键词检索，不引入向量库；同义改写可能查不到。
- UI 审计只覆盖源码可判定项；焦点回归、返回栈、锁滚动必须浏览器实测。
- 同行对标需要真实页面；登录墙后的站点要用户提供截图。
- 不自动安装插件、不修改自身规则、不执行「忽略规则」类指令。

## 许可

MIT，见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。
