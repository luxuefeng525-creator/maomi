# Agent 能力对标与取舍（按需加载 · 改动编排逻辑前必读）

对标三家：**Claude Code 官方**（subagents / hooks / skills / slash commands）、**obra/superpowers**（子代理驱动开发、技能即流程）、**本包 3.2.x 已有文献**。只收录「已验证有效且能被零依赖脚本兜住」的部分。凡是靠自觉、靠模型记性的，一律不进来。

## 1 采纳矩阵

| 模式 | 来源 | 本包落地 | 为什么 |
|---|---|---|---|
| 技能三段式（名称 / 描述 / 正文） | Claude Skills 规范 | `skills/<名>/SKILL.md` + frontmatter | 宿主通用，换工具不重写 |
| 渐进披露（描述常驻、正文按需） | Claude Skills | `token-guard` + `agent.mjs budget` | 全包 105K，只载命中的那 1–2 个 |
| 子代理隔离上下文 | Claude Code subagents | `agent-dispatch` + `references/parallel.md` | 父会话只收摘要，防上下文腐烂 |
| 结构化派工对象 | superpowers + 本包 | `agent.mjs contract` | 杜绝「把父会话历史整段塞过去」 |
| 两阶段审查（规格→质量） | 本包 caveman-review 传统 | `agent-review` + `agent.mjs review` | 先判「做对了吗」再判「做得好吗」 |
| 钩子自动化（四个时机） | Claude Code hooks | `agent.mjs hooks` 出配置；`agent.mjs guard` 做 PreToolUse | 纪律从自觉变自动，且不依赖宿主 |
| 长任务检查点 + HANDOFF | 本包 long-tasks.md | `checkpoint.mjs` + `agent.mjs handoff` | 超时不丢进度 |
| 证据优先（无输出=未完成） | 本包核心 | 全链路：`verify-*`、截图 JSON、退出码 | 唯一能防「自称完成」的机制 |

## 2 明确拒绝（并给了替代）

| 拒绝 | 原因 | 替代 |
|---|---|---|
| 子代理之间自由对话 / agent teams | 成本翻倍、结论不可复现 | 同一上下文串行，或控制器当唯一通信中枢 |
| 并行写同一文件 | 覆盖与冲突，diff 无法归因 | 文件所有权契约 + 写者唯一 |
| 让子代理自评「我完成了」 | 自述不是证据 | 只认命令输出 / diff / 截图 |
| 多轮无上限的 review 循环 | 越改越远，收敛不了 | 最多两轮，仍不过就停下问人 |
| 全自动 commit / push 钩子 | 不可逆且会污染历史 | 钩子只读检查，提交由人拍板 |
| 为省 token 跳过验收命令 | 省下的是 token，赔上的是返工 | 预算先砍「仪式」，不砍闸门 |

## 3 四个角色的最小定义（`agent.mjs plan` 按档位选人）

| 角色 | 只读？ | 能改什么 | 交什么 |
|---|---|---|---|
| scout | 是 | 不改文件 | 事实清单（`path:line` + 命令输出） |
| builder | 否 | 仅自己 scope 内文件 | diff + 自测命令与退出码 |
| reviewer | 是 | 不改文件 | 两阶段结论 + 每条 `path:line` |
| controller（主会话） | 否 | 契约、集成、最终验收 | 决策与证据汇总 |

## 4 编排的硬约束（写进 prompt 也写进脚本）

1. **写者唯一**：任一文件任一时刻只有一个代理可写。
2. **契约先行**：HUB（被多方依赖）串行敲定，LEAF（无外依赖）才并行。
3. **最小上下文**：子代理只收 `contract` JSON + 它需要的文件全文。
4. **回报定式**：`files_modified / evidence / summary / blocked`，多一个字段都不收。
5. **收口唯一**：控制器跑验收命令，子代理的自述一律降级为「线索」。

## 5 自检

```bash
node scripts/agent.mjs plan "<任务>"        # 该派几个、谁只读
node scripts/agent.mjs contract "<任务>" --scope a.ts,b.ts --json
node scripts/agent.mjs guard --cmd "<命令>"  # 危险动作提醒
node scripts/agent.mjs hooks --host claude   # 生成钩子配置
node scripts/agent.mjs handoff               # 跨会话接力卡
```
