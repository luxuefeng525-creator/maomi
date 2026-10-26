# 怎么用这个 Agent

一条命令让 Agent 自己干活，还是分步指挥，取决于你要多强的控制。下面按「最小上手 → 进阶」排。

## 0. 前置

- Node.js ≥ 18，**零第三方依赖**，不用 `npm install`
- 在仓库根执行；所有路径参数默认当前目录，可用 `--cwd` 改

## 1. 最小上手：让它自己干

```powershell
node scripts/agent.mjs run --task "新增 xxx 技能：<一句话说明>" --files 2 --slug my-task
```

Agent 会自动：定档 → 建账本 → 逐步调执行器 → 判产物 → 记账 → 闸门验收。

典型输出：

```
[档位] L1 · 单端 · 2 个文件
[执行器] mimo-agnes · 最多 6 步 · 单步超时 480000ms
LEDGER docs/my-task/tasks.json 共 3 件

--- T1 实现 开始 ---
DONE T1 | 变更 1 个文件
--- T2 测试 开始 ---
DONE T2
--- T3 验收 开始 ---
DONE T3
RUN 结束 | 执行 3 步 | todo=0 blocked=0 done=3
STOPGATE ALLOW
```

**关键参数**

| 参数 | 作用 | 默认 |
| --- | --- | --- |
| `--task` | 自然语言目标（必填） | — |
| `--files <n>` | 预计改几个文件 → 决定档位 | 1 |
| `--cross <n>` | 涉及几个端（H5/后台/服务端） | 0 |
| `--schema` / `--api` / `--route` | 动库表 / 改对外接口 / 新增路由 → 强制 L2 | 关 |
| `--executor <id>` | 用哪个模型干活 | `mimo-agnes` |
| `--max-steps <n>` | 最多执行几步（防跑飞） | 6 |
| `--timeout <ms>` | 单步超时 | 480000 |
| `--slug <name>` | 账本目录名 | 时间戳 |
| `--keep` | 保留执行器自身产物（`.mimocode` / `response.md`） | 默认**清理** |

## 2. 换执行器（同一任务横向比模型）

执行器定义在 `tests/behavior/providers.json`，`run` 直接读它，不另造配置。

```powershell
node scripts/agent.mjs run --task "..." --executor codex   --slug t-codex
node scripts/agent.mjs run --task "..." --executor mimo-agnes --slug t-agnes
```

现有执行器与**实测状态**（2026-10-26）：

| id | 命令 | 状态 |
| --- | --- | --- |
| `mimo-agnes` | `mimo.exe -m agnes/agnes-3.0-flash` | 正常，可完整跑完 3 步 |
| `codex` | `codex.cmd exec -m agnes-3.0-flash` | 通道可用；工具调用不稳，常被判「无产物变更」 |
| `mimo-deepseek` | `mimo.exe -m deepseek/deepseek-v4-pro` | 不可用（key 401） |
| `mimo-glm` | `mimo.exe -m modelscope/ZhipuAI/GLM-4.5` | 不可用（模型无 provider） |

换执行器不改代码，只加 `providers.json` 条目。

## 3. 分步指挥（要人工把关时）

```powershell
node scripts/agent.mjs plan  --task "..." --files 3 --slug my-task   # 定档 + 建账本
node scripts/agent.mjs step                                           # 拿下一件 + 闸门预检
node scripts/agent.mjs guard --tool Write --input '{"file_path":"src/a.ts"}'   # 单独预判
node scripts/agent.mjs status                                         # 账本全景
node scripts/agent.mjs finish                                         # 验收（不过则 exit=1）
```

手工推进任务状态用 `task.mjs`：

```powershell
node skills/project-orchestrator/scripts/task.mjs start  --file docs/my-task/tasks.json --id T1
node skills/project-orchestrator/scripts/task.mjs done   --file docs/my-task/tasks.json --id T1 --evidence "src/a.ts"
node skills/project-orchestrator/scripts/task.mjs block  --file docs/my-task/tasks.json --id T1 --reason "缺接口文档"
```

注意：`blocked` 必须带原因（字段 `note`），否则账本非法。

## 4. 清理多余数据

Agent 与执行器会堆临时产物，一个命令收干净：

```powershell
node scripts/agent.mjs clean --dry-run     # 先预览，不删任何东西
node scripts/agent.mjs clean               # 清理 7 天前的（默认）
node scripts/agent.mjs clean --days 0      # 全清
```

清理范围**只限工具自身产物**，绝不触碰源码与提交：

| 目标 | 是什么 |
| --- | --- |
| `tests/behavior/.external` | 跨模型评测沙箱（含千文件夹具） |
| `tests/behavior/.model-runs` | 宿主模型会话产物 |
| `tests/behavior/.rerun` `tests/behavior/.sandbox` | 夹具复跑与场景沙箱 |
| `tests/.tmp` `tests/.eval` | 单测与评测临时目录 |
| `.mimocode` | 执行器会话库（实测能堆到 50MB） |
| `response.md` | 执行器最后一条回复 |

## 5. 判读结果

| 输出 | 含义 | 该怎么办 |
| --- | --- | --- |
| `DONE Tn \| 变更 k 个文件` | 该步有真实产物 | 继续 |
| `BLOCK Tn \| 无产物变更（疑似假完成）` | 模型说做了但没落盘 | 换执行器或手工补 |
| `BLOCK Tn \| 执行器超时或无法启动` | 模型/通道问题 | 调 `--timeout` 或换 executor |
| `WARN n 个任务阻塞未完成` | 交付不完整 | 看账本 `note` |
| `STOPGATE BLOCK` | 还有没做完的活 | 继续跑或补账本 |
| `STOPGATE ALLOW` | 所有可执行任务已完成 | 可交接 |

## 6. 常见坑

1. **`run` 会续跑**：账本已存在时沿用进度，不会重来。要重建加 `--force`。
2. **执行器自身产物不算产物**：`response.md`、`.mimocode/`、账本目录已被排除，不会造成假完成。
3. **模型可能改账本**：提示词已明令禁止，但若发现状态被篡改，用 `task.mjs validate` 核对。
4. **codex 走本地代理**：代理不转原生 `tool_calls` 时，模型会输出文本而不落盘，表现为「无产物变更」。
