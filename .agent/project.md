# agent-workbench · 项目配置

新会话先读本页。规则本体在仓库根 `AGENTS.md`，技能本体在 `skills/`，本文件只放**项目事实**（技术栈、命令、端口、可调用技能），技能里不复制这些内容。

## 技术栈与目录

- 运行时：Node.js ESM（`.mjs`），**零第三方依赖**（`package.json` 无 `dependencies`）
- `scripts/`：工具脚本（`doctor` / `session-start` / `stop-gate` / `repo-index` / `behavior-*` 等）
- `skills/`：可加载技能，清单见 `skills/registry.json`（当前 3 个）
- `tests/`：`run.mjs` 单元、`eval/` 自检评测、`behavior/` 行为场景（含跨模型）
- `docs/`：协议与对标文档（`hooks.md`、`troubleshooting.md`、`benchmark-vs-github.md`）
- `agents/`：人格文件

## 构建 / 测试命令

```powershell
node tests/run.mjs                      # 单元 + 自检
node tests/eval.mjs                     # 评测套件
node scripts/validate.mjs               # 技能结构与引用校验
node scripts/index-skills.mjs --check   # registry.json 与 SKILL.md 一致性
node scripts/doctor.mjs                 # 8 层三态体检（ok/degraded/fail + NEXT）
node scripts/selfcheck.mjs              # 交付前自检
node tests/behavior/rerun.mjs --times 1 # 行为夹具复跑（确定性）
node scripts/behavior-external.mjs run --scenario B17-large-repo-drift --provider mimo-agnes --timeout 400000
```

## 端口

无长驻服务、无监听端口。所有工具均为 CLI，退出即结束。

## 可调用项目技能

| 技能 | 触发词（见 registry.json） |
| --- | --- |
| `project-orchestrator` | 做项目 / 新功能 / 全流程 / 端到端 / 交付功能 |
| `project-memory` | 记忆 / 上下文 / 踩坑 / 决策 / 交接 |
| `ui-ux-benchmark` | 好看点 / 像 XX / 界面需求 |

未命中触发词不加载；技能数量变更须同步 `skills/registry.json` 与本表。

## 记忆

memory_root: .agent-memory/
