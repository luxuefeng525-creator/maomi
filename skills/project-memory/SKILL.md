---
name: project-memory
description: 项目记忆读写协议与工具。任务结束、拍板决策、踩坑修复、口径变更、恢复上下文、整理记忆时加载。规定写什么、写多细、怎么检索、如何失效而不删除。默认根目录 .agent-memory/，随仓库走。
---

# Project Memory

触发词：记忆 / 上下文 / 踩坑 / 决策 / 交接 / 恢复任务

文件是真源，索引可重建。只追加，不改写历史；结论作废用 invalid 标记，不删除。

## 1. 目录结构

| 层 | 文件 | 作用 | 谁维护 |
| --- | --- | --- | --- |
| L0 索引 | `project_memory.md` | 硬规则、通用坑、主线、分卷导航 | 人或 Agent 精简维护 |
| L1 分卷 | `volumes/*.md` | 按主题沉淀的细节 | 定期从日志合并 |
| L2 日志 | `<YYYYMMDD>/topics.md` | 当日条目，追加式 | 脚本 `append` |
| L3 交接 | 任务目录 `tasks.json` + `HANDOFF.md` | 跨会话断点 | 总控 Agent |

索引超过 200 行就先合并进分卷，禁止把细节堆在 L0。

## 2. 初始化

```powershell
node scripts/memory.mjs init --root .agent-memory
```

`--root` 是唯一必需的参数：项目级用 `.agent-memory`，跨项目用你自己的目录。脚本不猜路径。

## 3. 写入（四类，只写有证据的）

| 类型 | 触发 | 粒度 |
| --- | --- | --- |
| `decision` | 用户拍板、方案取舍、口径变更 | 一句结论 + 理由 + 影响面 |
| `pitfall` | 踩坑并已修 | 现象 + 根因 + 修法 |
| `fact` | 实测事实（端口、版本、路径、表结构） | 数值逐字照抄 |
| `open` | 未完成、待确认、已知风险 | 一句待办 + 阻塞点 |

```powershell
node scripts/memory.mjs append --root .agent-memory --type decision --text "结论" --evidence "docs/xx.md" --impact "影响面"
```

- 同一条只写一次；脚本按文本哈希幂等去重，重复返回 `SKIP`。
- 一次写整段，不逐句落盘；先在对话里收敛结论。
- 证据可给文件路径、命令名或截图名；没有证据的事实不写。
- 修正用新条目 + `invalidate` 旧 id，不回头改历史。

## 4. 检索（先索引，后分卷，最后日志）

1. 读 `project_memory.md` 索引，定位关键词对应的分卷。
2. 按关键词 Grep 指定分卷，单次 ≤40 行。
3. 仍缺再查最近 30 天日志。

```powershell
node scripts/memory.mjs search --root .agent-memory --query "关键词 关键词" --limit 10 --days 30
```

预算：单轮 ≤2 次检索、≤40 行结果。查不到就报「记忆无记录」，禁止编造。

## 5. 失效与维护

- 作废：`invalidate --id <目标ID> --reason "..."`，追加失效条目，保留原条目与时间戳。
- 查重：`report --threshold 0.85`，输出疑似重复对；合并动作由人确认后写进分卷。
- 合并：近 30 天同主题条目提炼成一条规则进 `volumes/`，日志保留原文供回查。
- 触发：条目 >200、同主题 ≥3 条、索引 >200 行时做一次维护。

## 6. 禁止

- 不引入向量库、embedding、常驻记忆服务。
- 不删除旧结论，不改写别人写的条目。
- 不把聊天全文灌进记忆；只写结论、事实、待办。
- 不擅自写入用户偏好；偏好必须由用户明说。

## 7. 自检

- `append` 连跑两次，第二次必须 `SKIP`。
- `search` 命中刚写的条目并给出 `文件:行号`。
- `invalidate` 后原条目仍在，`report` 不把失效条目当重复源。
