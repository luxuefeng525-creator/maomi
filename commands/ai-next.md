---
description: 只报进度，不改任何文件。看「做到哪、下一件、还有哪些账本没结」。用户问「做到哪了 / 还有什么事 / 进度」时用。
---

# /ai-next · 进度播报

只读，**不修改任何文件**。

```powershell
node {{PKG_ROOT}}/scripts/session-start.mjs
node {{PKG_ROOT}}/scripts/session-start.mjs --json    # 需要结构化字段时
```

回复固定三段，不写过程叙事：

1. **主账本**：`docs/<任务>/tasks.json`，`todo/doing/blocked/done` 各几个
2. **下一件**：`NEXT <ID> <标题>`；若 `NEXT NONE` 就明说「全部完成或全部阻塞」
3. **其他未完成账本**：`LEDGERS` 行列出的每一个都必须报，并标注各自 todo/doing/blocked

## 附加（用户问得更细时）

- 要「为什么阻塞」：读账本里 `status: blocked` 的 `note` 字段，如实转述
- 要「证据在哪」：读对应任务的 `evidence`，只报真实路径；文件不存在就说不存在
- 要「哪些是别的会话的」：比对账本 `mtime` 与当前时间，5 分钟内有改动就标注「可能正被其他会话推进」

## 禁止

- 凭记忆说「大概做完了」——一律以账本字段为准
- 把 `done` 但没有 `evidence` 的任务说成已完成（这属于账本缺陷，要指出）
