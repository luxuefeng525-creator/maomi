# PLAN — doctor 向上查父级 hook 回执

> 档位 L1（2 文件）· 2026-10-27

## 一、问题（实测）

`opensource/agent-workbench` 下执行 `node scripts/doctor.mjs` 恒报：

```
DEGRADED hook | 3/3 已配置，但宿主机从未触发（回执 0 条真实会话、无心跳）
```

但实测同一时刻父目录 `F:\开发软件\桶装水开发\.agent-runs` 有：
- `session-start.log`：3 条 `event=SessionStart, source=startup` 的真实会话回执
- `hook-heartbeat.json`：`PreToolUse/RunCommand/allow`

也就是说 **Hook 一直在跑**，只是宿主（Trae）打开的项目根是**父目录**，回执写在父级 `.agent-runs`，本包 cwd 里看不到。

后果：任何「把本包放在大仓库子目录」的使用者都会收到这条误报，并按 NEXT 提示去重复启用 Hook。

## 二、目标

doctor 在本目录无回执时，**向上最多 5 级**查找父目录的 `.agent-runs`；命中真实会话或新鲜心跳（≤1440 分钟）则判 `ok`，并在 detail 写明「回执在父级 <路径>」，说明宿主项目根是父目录。

## 三、边界（不做的事）

- 不改 `countHostFires` / `readHeartbeat` 的判定口径（合成回执仍排除，不许因此造假绿）。
- 不向上无限遍历（硬上限 5 级，且到盘符根即停）。
- 不改 `--no-hook` 语义、不改退出码语义（`ok` / `degraded` 都为 0，`fail` 为 1）。
- 不做缓存、不新增依赖、不写任何文件（doctor 保持只读）。

## 四、验收标准

1. 造「父目录有真实回执、子目录无」的临时目录树 → doctor 判 `hook=ok`，detail 含「父级」与父目录名。
2. 父目录**只有合成回执**（`source=check` / `session=check-hook`）→ 仍判 `degraded`（不得假绿）。
3. 父目录心跳过期（>1440 分钟）且无真实回执 → 仍判 `degraded`。
4. 真实场景：`opensource/agent-workbench` 下 doctor 由 `degraded` 变 `ok`，detail 指向父级路径。
5. 现有 82 条单测 + 29 个场景全绿；CI 四组合仍全绿。

## 五、影响面

- 文件：`scripts/doctor.mjs`（新增 1 个函数 + else 分支 3 行）、`tests/run.mjs`（新增 1 组用例，PASS 82 → 83~84）。
- 使用者影响：子目录场景误报消失；单仓库根场景行为完全不变。
- 成本：doctor 多 1~5 次 `fs.existsSync`，忽略不计。
- 回滚：`git revert` 单个 commit。

## 六、风险

- 父目录回执可能属于**另一套** hook 配置（不同脚本）：因此 detail 必须写明来源路径，且只在「本目录配置齐全但无回执」时才向上找，不覆盖本目录已有的判据。
