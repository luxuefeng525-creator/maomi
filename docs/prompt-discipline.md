# 提示词纪律：从 TRAE 提示词库到 Agent 执行规则

> 2026-10-26。4 份父项目文档（`docs/Trae-提示词精简版-153条.md`、`docs/Trae-教程提示词-248条.md`、`docs/Trae-提示词优化合并建议.md`、`docs/ui-ux-对标与去AI味.md`）没有整份搬进包；只把 agent 适用部分提炼成可执行规则与技能。

## 落点

| 层 | 文件 | 作用 |
| --- | --- | --- |
| 每步注入 | `rules/agent-rules.md` | 4 条硬规则 + 5 条推理纪律 + 8 条工作方法；`agent.mjs run` 每步注入并留 sha256 指纹 |
| 按需加载 | `skills/prompt-discipline/SKILL.md` | 需求四段、反偷懒协议、推理深度分档、沉淀机制、交付检查表 |
| 模板 | `skills/prompt-discipline/references/templates.md` | 需求、Bug、方案评审、深推、复盘、技能沉淀 6 个可复制模板 |
| 界面域 | `skills/ui-ux-benchmark/` | 文案具体化、去 AI 味判定项、视觉可判定规则 |
| 进化 | `scripts/evolve.mjs` | 记忆坑 + 评测失败 + 闸门拦截聚类成规则候选，人工确认后写规则 |

## 注入映射

| 153 编号 | 准则 | 落点 |
| --- | --- | --- |
| C05 | 开工前复述目标、边界和验收标准 | 规则 5 / 10 |
| C08 | 复杂需求先出方案再写代码 | 规则 11；L2 模板 T2 设计文档 |
| C09 | 需求不明确先反问或给 2–3 个方案 | 规则 10 |
| C21 | 批量改文件前先拿 1 个样本试跑 | 规则 12 |
| C33 | 修 Bug 先列 3 个可能原因再动手 | 规则 13 |
| C34 | 写完对抗式自查、列未完成项 | 规则 17 + `stop-gate` |
| C38 | 项目背景、偏好、进度写进记忆 | `skills/project-memory` |
| C41 | 复杂需求拆小步，每阶段单独验收 | `agent.mjs` 阶段模板 |
| C44 | 追问时带上原文引用 | 会话约定，不注入执行器 |

未注入的 135 条是 TRAE 界面操作、模型选择、语音输入、云端记忆等，和执行器行为无关；整份塞进每步提示词只会浪费上下文。

## 反偷懒与推理强度

规则 5–9 强制：先写目标/边界/验收 → 列 ≥2 个可证伪假设 → 每次工具调用说明要验证什么 → 失败写「观察到 → 假设 → 下一验证」→ 结论带证据、未验证单列。

执行器侧推理强度写进 `tests/behavior/providers.json`，两条通道均实测退出码 0：

- `codex`：`-c model_reasoning_effort=high`
- `mimo-agnes`：`--variant high`

## 沉淀与进化闭环

1. 同一提示词第 3 次 → 存成模板或命令（`templates.md`）。
2. 同一流程第 3 次 → 新建 Skill，必须写触发词、适用/禁用、最小示例（门禁 `validate.mjs` + `index-skills.mjs --check`）。
3. 同一坑第 2 次 → `memory.mjs append --type pitfall` → `evolve.mjs` 聚类 → 人工确认后写 `rules/agent-rules.md`。
4. `agent run` 出现 blocked 且项目有 `.agent-memory/` 时，自动跑一次 `evolve.mjs` 只报告候选，不自动改规则。

`evolve.mjs` 三个来源：记忆 pitfall、`logs/external-results.jsonl` 的 fail 明细、`.agent-runs/guard.log` 的 ask/deny。默认只收**最近 7 天**（`--days 0` 取全量），同来源同出处的重复条目自动去重；`infra_fail` 不计入。提案仍需人工确认后才写规则。
