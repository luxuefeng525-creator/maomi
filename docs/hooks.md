# Hook：会话开始自动注入「下一件」

## 宿主事实（已核对 TRAE 官方文档）

- 事件：`SessionStart`，创建会话后、第一次对话前触发。
- 项目级配置：`<项目>/.trae/hooks.json`；全局：`%USERPROFILE%/.trae-cn/hooks.json`。
- 格式：`{ "version": 1, "hooks": { "<事件名>": [ { "hooks": [ { "type": "command", "command": "...", "timeout": 30 } ] } ] } }`
- 输出：`SessionStart` 支持纯文本 stdout，内容作为附加上下文注入模型。
- 启用：TRAE「设置 → Hooks」里确认项目级配置已启用；运行方式可选沙箱或本地自动。

## 本包的接法

```powershell
node scripts/install-hook.mjs --target trae-project --cwd <项目目录>
# 预览
node scripts/install-hook.mjs --target trae-project --cwd <项目目录> --dry-run
# 卸载
node scripts/install-hook.mjs --target trae-project --cwd <项目目录> --remove
```

写入内容等价于：

```json
{
  "version": 1,
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "node \"<包绝对路径>/scripts/session-start.mjs\"", "timeout": 20 } ] }
    ]
  }
}
```

## 注入内容示例

```text
[SESSION] /path/to/project
CONFIG .agent/project.md OK
LEDGER docs/任务/tasks.json | todo=1 doing=0 blocked=1 done=4 | invalid=0
NEXT T3 | 后端实现
MEMORY .agent-memory/project_memory.md 128 行
```

## Stop 闸门（验收阻断）

`Stop` 在智能体准备结束时触发。`stop-gate.mjs` 查账本：

- 账本不合法、仍有 doing、仍有可执行 todo、done 的证据文件不存在 → 输出 `{"decision":"block","reason":"..."}`，智能体必须继续处理。
- 全部完成且证据存在 → 输出 `{"continue":true}`，允许结束。
- 连续阻断由 `loop_limit` 控制（默认 5），避免无限循环。

```json
{
  "Stop": [
    { "loop_limit": 5, "hooks": [ { "type": "command", "command": "node \"<包>/scripts/stop-gate.mjs\"", "timeout": 30 } ] }
  ]
}
```

注意：`stop-gate.mjs` 依据「最近修改的 `docs/*/tasks.json`」判断；多任务并行时用 `--file` 指定，或保证账本路径唯一。

## PreToolUse 守卫（危险命令 / 越界写入 / 自改规则）

官方契约（TRAE「Hook 配置详解」）：`PreToolUse` 在工具调用发起后、执行前触发；stdin 含
`tool_name` 与 `tool_input`；stdout 返回
`{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow|deny|ask","permissionDecisionReason":"..."}}`，
取值优先级 `deny > ask > allow`；退出码 `2` 等价 `deny`。

本包 `pre-tool-guard.mjs` 的规则：

| 类别 | 行为 | 例子 |
| --- | --- | --- |
| 危险命令 | deny | `rm -rf /`、`git reset --hard`、`git push --force`、`DROP TABLE`、`pm2 delete all`、`curl ... \| bash` |
| 需确认命令 | ask | 非根目录 `rm -rf`、`Remove-Item -Recurse -Force`、`npm publish`、`docker system prune` |
| 越界写入 | deny | 写到工作区外（临时目录除外） |
| 保护目录 | deny | `.git`、`node_modules`、`dist`、`.env*` |
| 修改自身规则 | deny | `.trae/skills`、`.agent/skills`、`.trae/hooks.json`、`.agent/guard.json`（确需改动设 `AGENT_GUARD_ALLOW_SELF=1`） |

自定义规则放 `.agent/guard.json`：

```json
{
  "denyCommands": ["\\bgit\\s+push\\b"],
  "askCommands": ["\\bnpm\\s+install\\b"],
  "protectPaths": ["server/migrations"],
  "disabled": false
}
```

约定：

- 内部异常一律放行（fail-open），不让守卫把会话锁死；异常写 stderr。
- deny/ask 追加一行 JSON 到 `.agent-runs/guard.log`，用于事后核验。
- `tool_input` 路径字段名以 `file_path` / `path` 等为主；未知字段时对非 Shell 工具做扩展名启发式识别。字段名如有差异，以 `guard.log` 实际记录为准。
- 与 SessionStart/Stop 相同：**只写 `hooks.json` 不会被加载**，必须在「设置 → Hooks」启用。

## 任务快照与回滚

```powershell
node scripts/snapshot.mjs create  --cwd <仓库> --label T1
node scripts/snapshot.mjs list    --cwd <仓库>
node scripts/snapshot.mjs restore --cwd <仓库> --id <id> --prune
```

- 以 git 工作区为基线，只快照「已改动 + 未跟踪」文件，不复制整仓；非 git 目录直接报错。
- 排除 `.agent-runs`、`node_modules`、`dist`、`logs`、`uploads`、`cert`、`.env*`；单文件超过 `--max-bytes`（默认 5MB）只登记 skipped。
- 回滚前自动再拍一张 `pre-restore` 快照；快照之后新增的未跟踪文件需显式 `--prune` 才删除。
- `HEAD` 变化时回滚需 `--force`，避免把别的提交一起卷进来。

## 行为约定

- 只读账本；每次运行追加一条回执到 `<项目>/.agent-runs/session-start.log`（`--no-receipt` 可关），用于事后判断 Hook 是否真的触发。
- 始终退出码 0，不阻断会话。
- 无账本时输出 `LEDGER NONE`，不报错。
- 账本不合法时输出 `invalid=N`，不代替 `task.mjs validate` 的拦截。
- 配置存在多个账本时取最近修改的一份；也可用 `--file` 指定。

## 注意

- **只写 `hooks.json` 不会被 TRAE 加载**。必须在「设置 → Hooks → 项目」点「创建/启用」，由 TRAE 写入登记；启用后通常需要重启一次。状态库 `ItemTable` 中 hook 键为 0 即为未登记。
- 命令里写的是**包目录绝对路径**。移动包目录后需重跑 `install-hook.mjs`。
- 若宿主用沙箱运行 Hook 且读不到项目目录，改成「本地自动运行」或在沙箱允许列表加入项目根。
- SessionStart / Stop 只依赖 `cwd`；PreToolUse 依赖官方字段 `tool_name` 与 `tool_input`。若宿主字段名有差异，以 `.agent-runs/guard.log` 的实际记录为准。
- Hook 运行日志：TRAE「设置 → Hooks → 查看日志」→ 输出面板 `Agent Hooks`。
