# 钩子接入（可选 · 宿主支持时启用）

钩子把「纪律」从「靠自觉」变成「自动触发」：会话开始自动自举、工具调用后自动检查、收尾自动验证。对标 Claude Code 的 hooks（SessionStart / PreToolUse / PostToolUse / Stop）。**宿主不支持钩子时，退化为手动执行本文命令，不影响使用。**

## 建议的四个钩子

| 钩子 | 时机 | 跑什么 | 作用 |
|---|---|---|---|
| SessionStart | 会话开始 | `node scripts/start.mjs`（或 `fast.mjs`） | 注入 VERSION/记忆/待办，开局不瞎猜 |
| PreToolUse | 写文件/执行前 | 密钥/危险命令检查 | 拦住 `rm -rf`、硬编码密钥 |
| PostToolUse | 改完文件后 | `node scripts/validate-skill.mjs` / 类型检查 | 改完立刻校验，问题不过夜 |
| Stop | 声称完成时 | `node scripts/git-atomic.mjs plan` + 测试 | 没证据不许收尾 |

## Claude Code 示例（`settings.json`）

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "node scripts/start.mjs" } ] }
    ],
    "PostToolUse": [
      { "matcher": "Edit|Write",
        "hooks": [ { "type": "command", "command": "node scripts/git-atomic.mjs plan --json" } ] }
    ]
  }
}
```

## 其它宿主

- **WorkBuddy / Trae / Cursor**：钩子机制与字段名不同，且部分版本不开放 shell 钩子。先查该宿主文档；不支持就**跳过钩子**，靠 `SKILL.md` 手动纪律兜底。
- 钩子脚本必须**零依赖、快速返回**（<2s），否则拖慢每次工具调用——这正是本包脚本零依赖的原因。
- 钩子**不得**自动 `git commit/push/reset`、不得自动装插件、不得改技能/规则文件（安全红线）。

## 红线

- 钩子失败不能静默吞掉：打印错误并以非零退出，让宿主可见。
- 不要给每个工具都挂钩子——只挂「写文件后」和「会话开始」，挂太多反而更慢。
- 钩子只是**加速纪律**，不能替代 `SKILL.md` 的质量闸门（类型/测试/独立审查）。
