# 任务账本（跨会话断点）

没有账本，长任务跨会话就会重读全仓、重复做已完成的事。账本只记「下一步做什么」，不记过程。

## 文件

`docs/<任务>/tasks.json`

```json
{
  "task": "配送时段筛选",
  "tier": "L2",
  "updated": "2026-10-26",
  "tasks": [
    { "id": "T1", "title": "需求对标与拍板", "deps": [], "status": "done", "evidence": "docs/配送时段筛选/DESIGN.md" },
    { "id": "T2", "title": "接口契约与数据模型", "deps": ["T1"], "status": "done", "evidence": "docs/配送时段筛选/DESIGN.md#接口" },
    { "id": "T3", "title": "后端实现 + 单测", "deps": ["T2"], "status": "doing", "evidence": "" },
    { "id": "T4", "title": "浏览器验收", "deps": ["T3"], "status": "todo", "evidence": "" }
  ]
}
```

## 规则

- `status` 只有 `todo / doing / blocked / done`，`doing` 同时最多一条。
- 只做「全部 deps 都是 done」的第一条；`blocked` 必须写清阻塞点与解锁条件。
- `done` 必须带 `evidence`（文件、命令输出或截图路径），空证据不算完成。
- 每完成一条立刻更新文件，不要攒到最后批量写。
- 恢复上下文时先读账本，再读记忆索引，不重读全仓。

## 用命令推进（禁止手改 status）

```powershell
node scripts/task.mjs init     --file docs/<任务>/tasks.json --task "名称" --tier L1
node scripts/task.mjs add      --file docs/<任务>/tasks.json --id T1 --title "需求" --deps ""
node scripts/task.mjs next     --file docs/<任务>/tasks.json
node scripts/task.mjs start    --file docs/<任务>/tasks.json --id T1
node scripts/task.mjs done     --file docs/<任务>/tasks.json --id T1 --evidence "docs/x.md"
node scripts/task.mjs block    --file docs/<任务>/tasks.json --id T1 --reason "等接口"
node scripts/task.mjs validate --file docs/<任务>/tasks.json
node scripts/task.mjs status   --file docs/<任务>/tasks.json
```

脚本会拦：依赖未完成就 start、同时两条 doing、done 无 evidence、blocked 无原因、依赖循环、依赖不存在。

## 交接

任务中断超过一轮，写 `docs/<任务>/HANDOFF.md`：当前档位、已完成条目、下一步、未决问题。只写这四项，不写叙事。
