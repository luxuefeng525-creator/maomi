---
description: 环境体检。查依赖/门禁/技能表/Hook 是否真在跑/账本/索引/记忆，给三态结论与下一步。用户说「检查环境 / 怎么不生效 / doctor」时用。
---

# /ai-doctor · 环境体检

```powershell
node {{PKG_ROOT}}/scripts/doctor.mjs --cwd .
```

八层逐项给 `ok / degraded / fail`，末行 `VERDICT` + `NEXT`。

## 读法与处置

| 输出 | 含义 | 处置 |
| --- | --- | --- |
| `ok node` | Node 版本满足 | 无 |
| `fail validate` | 技能结构门禁不过 | 看 FAIL 明细，修对应 SKILL.md |
| `registry` 有 `WARN` | 技能重名 / 重触发词 / 缺描述 | 按 WARN 逐条修 |
| `registry` 只有 `NOTICE` | 体积超 8KB 或无中文触发词 | **不算错**，属正常形态 |
| `DEGRADED hook ...宿主机从未触发` | Trae 没启用 Hook，闸门与自举都在空转 | 「设置 → Hooks → 项目 → 启用 → 重启」 |
| `OK hook ...已触发 N 次会话` | Hook 真在跑（有真实回执） | 无 |
| `degraded ledger` | 无账本或账本不合法 | 建账本 / 修 JSON |
| `degraded index` | 索引过期或未建 | `node {{PKG_ROOT}}/scripts/repo-index.mjs build` |
| `degraded memory` | 记忆索引缺失 | `node {{PKG_ROOT}}/skills/project-memory/scripts/memory.mjs init --root .agent-memory` |

## Hook 专项（最容易被误判）

`doctor` 接受两种「真生效」证据：

1. `SessionStart` 真实会话回执（`source=startup`）
2. `PreToolUse` 心跳（`.agent-runs/hook-heartbeat.json`，24h 内）

两者都没有 = 确实没跑，不是配置问题就是宿主没启用。**不要**因为 `.trae/hooks.json` 里三事件齐全就说「已生效」。

再补一层细查：

```powershell
node {{PKG_ROOT}}/scripts/check-hook.mjs --cwd .
```

它把命令交给**宿主真实 shell**（Windows = PowerShell）执行。`FAIL ... ParserError` 说明命令写法在该 shell 不合法（典型：`"node.exe" "x.mjs"` 缺调用运算符 `&`）。

## 禁止

- 只看 `hooks.json` 存在就断言 Hook 生效
- 把 `NOTICE` 当 `FAIL` 报给用户
- 体检失败还继续宣称「环境没问题」
