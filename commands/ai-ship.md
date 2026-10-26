---
description: 交付前验收。结构门禁 + 单测 + 账本闸门一次跑完，缺证据不许宣称完成。用户说「做完了吗 / 能交付吗 / 验收」时用。
---

# /ai-ship · 交付前验收

**先证后言**：没有命令输出，不算完成。

## 1 三道门禁一次跑

```powershell
node {{PKG_ROOT}}/scripts/selfcheck.mjs --cwd .
```

四项全 `PASS` 才算环境侧过关：`registry` / `validate` / `unit` / `hook`。

单项细查：

```powershell
node {{PKG_ROOT}}/scripts/validate.mjs          # 技能结构门禁
node {{PKG_ROOT}}/tests/run.mjs                 # 单测
node {{PKG_ROOT}}/scripts/index-skills.mjs --check
```

## 2 账本闸门（防「未完成就宣称完成」）

```powershell
# 预演：不阻断，只看会不会拦
node {{PKG_ROOT}}/scripts/stop-gate.mjs --cwd . --no-block
```

输出含义：

| 输出 | 含义 |
| --- | --- |
| `{"continue":true}` | 账本已结清，可交付 |
| `WOULD_BLOCK 仍有可执行任务未完成：T7 ...` | 还有 todo，补完再交 |
| `WOULD_BLOCK 证据文件不存在：T3(...)` | 账本写了证据但文件不在，补证据或改状态 |
| `{"decision":"block","reason":...}` | 真模式下的阻断（Hook 会用它拦结束） |

## 3 交付话术模板

只报有证据的部分，四段：

1. **改了什么**：逐文件 + 一句话作用
2. **验证输出**：贴真实命令与结果（`PASS=n FAIL=0`、`VERDICT ok`、截图路径）
3. **没做什么**：明确列出被排除项与原因
4. **风险**：已知未验证的地方

## 4 宣称完成的红线

以下任一存在就**不许**说「完成」：

- 有 `todo` / `doing` / `blocked` 任务
- `done` 任务的 `evidence` 指向的文件不存在
- 门禁 `FAIL` 或 `VERDICT fail`
- 浏览器验收有未定性异常
- 只在 mock / 假数据上验过

## 5 交付物给链接

文件产物用 `computer://`，源码引用用 `file:///`，不要只报路径文字。

## 禁止

- 「应该没问题」「看起来可以」这类无证据结论
- 把 `NOTICE` / `degraded` 说成 `fail` 吓用户，或把 `fail` 说成正常
- 环境没跑通就催用户「你再试试」
