---
description: 按账本逐步执行（会真的改文件）。缺 PLAN.md 会被 GATE BLOCK 拦住。用户说「开始做 / 跑起来 / 执行任务」时用。
---

# /ai-run · 按账本执行

**这条命令会真的改文件。** 执行前确认两件事：账本已建、`PLAN.md` 已写。

## 1 前置检查

```powershell
# 账本在不在、下一件是什么
node {{PKG_ROOT}}/scripts/agent.mjs status --slug <slug>

# 文档在不在（缺了 run 会拦，提前补省一轮）
Test-Path docs/<slug>/PLAN.md
```

## 2 预览（不改文件）

```powershell
node {{PKG_ROOT}}/scripts/agent.mjs run --slug <slug> --dry-run
```

`--dry-run` 只打印每步会注入的规则与提示词，**不动文件**。先让用户看一遍。

## 3 真跑

```powershell
# 默认执行器 mimo-agnes，最多 3 步，单步超时 120s
node {{PKG_ROOT}}/scripts/agent.mjs run --slug <slug> --max-steps 3

# 换执行器（见 tests/behavior/providers.json 里的 id）
node {{PKG_ROOT}}/scripts/agent.mjs run --slug <slug> --executor codex --max-steps 2
```

每步会：

1. 把 `rules/agent-rules.md`（4 硬规则 + 5 推理纪律 + 8 工作方法）**置顶注入**
2. 进入实现步前校验 `docs/<slug>/PLAN.md` → 缺失打印 `GATE BLOCK` 并停住
3. 成功后回写账本 `status` + `evidence`，失败记 `blocked` + `note`
4. 全部跑完自动过 `stop-gate.mjs` 验收

## 4 单步模式（想自己盯每步）

```powershell
node {{PKG_ROOT}}/scripts/agent.mjs step --slug <slug>
```

## 5 收尾

```powershell
node {{PKG_ROOT}}/scripts/agent.mjs finish --slug <slug>
```

会做 `stop-gate` 验收 + 汇总 `todo/doing/blocked/done` + 有阻塞项时给出 `WARN` 清单。

## 6 执行器不可用时

`run` 依赖外部 CLI（`mimo` / `codex`）。报「未知 executor」或子进程失败时：

- 查 `tests/behavior/providers.json` 里该执行器的 `cmd` 是否真存在
- 都不通就退回 Trae 对话模式：用 `/ai` 定档，我直接在会话里逐步做，账本照样推进

## 禁止

- 无账本就 run（会先 GATE BLOCK 或建空账本）
- 缺 PLAN.md 时用 `--no-plan-gate` 绕过（那是给对照实验用的，不是给你省事的）
- 跑完不看 `stop-gate` 输出就宣称完成
