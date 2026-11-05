---
name: token-guard
description: '载入前先算 token。用于长会话/大仓库/要爆上下文时：估开销、分段读、用派发表取代扫描述、压输出。'
---

# Token guard

花钱在推演上，不花在把仓库读进上下文。

## 载入前
- `node scripts/agent.mjs budget [路径]` 先估；单文件 > 40K token 不许整份读。
- 大文件：读前 80 行拿结构 → `grep` 定位符号 → 只读命中段 ±20 行。
- 路由靠 `references/dispatch-table.md` + `scripts/route.mjs` 打分，**不要**逐个读技能描述的正文。

## 常驻开销
- 技能 `description` 是永久成本：≤250 字、只留触发词，细节放正文。
- 正文只在命中后载（L0=0｜L1=1｜L2=1–2），产出技能必载但不占预算。
- 已知大户：`finesse-ui`、`finesse-brief` 正文各 1 万+ token，按节读。

## 输出
- 命令加 `| head -40`、`--stat`、`--oneline`；日志先 `grep -c` 再决定读不读。
- 子代理回报只收结论 + 证据，不收过程流水。
- 长任务把状态写进 `.ai-workflow/`，别靠对话历史记着。

