# 双代理并行演练 · 2026-10-26

## 目的

验证三件事：依赖分层能分车道、不同文件可同时认领、同文件会被拦。用两个真实子代理各写一个文件，账本留证。

## 账本与调度输出

```text
INIT docs/drill/tasks.json
ADD T1（files: docs/drill/agent-a.md）
ADD T2（files: docs/drill/agent-b.md）

LEVEL 1
  lane1: T1
  lane2: T2

CLAIM T1 by agent-A
CLAIM T2 by agent-B
```

## 子代理产出

`agent-a.md`：

```text
# Agent A 产出
任务: T1
结论: 双代理并行演练中，A 只写本文件。
```

`agent-b.md`：

```text
# Agent B 产出
任务: T2
结论: 双代理并行演练中，B 只写本文件。
```

两个子代理回报均为 OK，且未改动其他文件。

## 收尾

```text
DONE T1（evidence: docs/drill/agent-a.md）
DONE T2（evidence: docs/drill/agent-b.md）

{
  "total": 2,
  "todo": 0,
  "doing": 0,
  "blocked": 0,
  "done": 2,
  "agents": [],
  "conflicts": []
}
```

## 结论

- 并行可行：同层不同文件分成两车道，两个子代理同时执行并各自落盘。
- 冲突闸门有效：同文件认领在评测 `agents_claim_conflict` 中必须失败。
- 账本闭环：认领、完成、证据齐全，状态无冲突。

## 限制

- 这是调度与冲突层演练，不是运行时沙箱；真正的并发由宿主子代理执行。
- 子代理未在隔离工作树中运行，文件隔离靠事先划界（本次两文件不相交）。
- 未演练「同文件合并冲突」；该场景被规则禁止，不做自动合并。
