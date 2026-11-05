---
name: agent-review
description: '独立审查改完的活。用于提交前/宣称完成前：全新只读子代理两阶段（规格合规 → 代码质量），每条约给 path:line 证据。'
---

# Agent review

`node scripts/agent.mjs review --base <ref>` 圈 diff 范围并出审查单，交给**全新、只读**的子代理。
不带自己的实现上下文——同一双手既写又验，只会盖章。

## 两阶段，不许合并
1. **规格合规**：逐条对验收条件 → `SPEC: PASS|FAIL` + 证据。顺带查有没有做了没被要求的改动。
2. **代码质量**（阶段一 PASS 后才做）：边界与空值、错误处理、并发与幂等、分层与命名、死代码、测试是否真能失败、可回滚性。
   → `QUALITY: PASS|FAIL|WARN` + findings，每条 `path:line — 问题 — 修法`。

## 硬约束
- 只读：不编辑、不 git 操作、不"顺手修"。
- `看起来没问题` 不是结论；无 path:line 的 findings 视为无效。
- 不确定就写"不确定，需要 X 才能判断"。
- FAIL 回实现修，修完**重新跑一次**审查，不复用旧结论。

