# 长期记忆规范（省 token 设计）

原则：**记忆是索引，不是上下文**。永远不全量载入，按关键词取命中行，单行紧凑，自动剪枝。
对标 `claude-mem`（持久记忆）+ `planning-with-files`（压缩存活）+ caveman（省 token）。

## 存储
- 项目记忆：`<项目根>/.ai-workflow/memory.md`（首次 add 自动建）。
- 跨项目偏好：用户级 `MEMORY.md`（各宿主约定位置，如 `~/.workbuddy/MEMORY.md`）。
- 每条一行，格式：`YYYY-MM-DD | <类别> | <一句话事实>`。
  例：`2026-11-05 | 口径 | 桶装水后端端口 3000，库名 springboot_db3309`
- 单条 ≤ 120 字；只存**跨会话有用且难重新推导**的事实（端口/库/约定/踩坑/决策），不存临时路径或工具报错。

## 操作（scripts/memory.mjs）
- `memory.mjs add "<类别> | <事实>"`：追加一行（自动日期）。
- `memory.mjs search "<kw>"`：grep 命中行，最多回 8 行；无命中回 `NONE`。
- `memory.mjs prune`：保留最近 200 条 / 90 天内；旧条目打 `stale` 标记而非删除（可恢复）。
- `memory.mjs index`：重建首行索引（类别→行号），加速检索。

## 省 token 铁律
1. **禁止整份读 memory.md**——只读 `search` 命中行。上下文里 memory 占比 < 5%。
2. **不重复写**：add 前先 search，已存在近似条目则更新而非新增。
3. **压缩存活**：长任务中断写 `HANDOFF.md`（档位/已完成/下一步/未决），重启时读它而非翻历史。
4. **作废用标记**：错误结论打 `invalid`，不删行（留痕防复犯）。
5. **跨项目隔离**：项目事实进项目 memory，通用偏好进用户级 MEMORY.md，不混。

## 反模式
整份 dump 进提示词、每条写成长段落、存一次性报错、把 memory 当聊天记录。
