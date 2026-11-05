# 原子提交与 worktree 隔离（按需加载）

对标 `addyosmani/agent-skills · git-workflow-and-versioning` + `obra/superpowers · using-git-worktrees`。
只在**要提交 / 拆分提交 / 开并行分支**时读本文件。commit message 写法在捆绑技能 `caveman-commit`，不重复。

## 何时用
- 交付前提交：走「原子化检查 → 分批提交」，见下方 §1。
- L2 大任务 / 子代理并行（见 `references/parallel.md`）：先开 worktree 隔离，见 §2。
- 已有脏工作树要拆成干净提交：用 `node scripts/git-atomic.mjs plan`。

## §1 原子提交（每个 commit 一件事）
1. **一逻辑一事**：`feat / fix / refactor / test / docs / chore / build / ci / style / perf / revert`。
   重构与功能分开、格式化与行为分开、依赖升级与业务分开。混了就拆。
2. **切片即提交**：实现一片 → 测 → 验 → 提交 → 下一片。攒一大坨 = 无法 review / revert。
3. **尺寸**：目标 ~100 行/提交，>300 行需理由，>1000 行必拆。
4. **message 讲 why 不讲 what**：`<type>(<scope>): <祈使句>`，≤50 字（硬顶 72），无句号。
   详见 `skills/caveman-commit/SKILL.md`。
5. **提交前卫生**（脚本 `plan` 自动查）：
   - 两轮密钥扫描：文件名（.env/secret/credential/.pem/token）+ **内容级**（`apiKey: "..."`、`sk-…` 常量），只有真值才拦；
   - NUL 字节（会让 git 判二进制，diff/blame 全废）；
   - `[DEBUG-` 残留、build 产物、`node_modules/`、`.env`。

## §2 worktree 隔离（并行不冲突）
短分支 + trunk-based，`main` 始终可部署，分支 1–3 天合并，合并后删。命名 `feature/xxx`、`fix/xxx`、`chore/xxx`。

```bash
node scripts/git-atomic.mjs worktree <name>     # 输出创建命令（默认 dry-run）
node scripts/git-atomic.mjs worktree <name> --exec   # 真执行 git worktree add
node scripts/git-atomic.mjs list                 # 列现有 worktree
```

- 每个并行流（子代理 / L2 大任务）**一个 worktree、一个短分支、独占目录**——与
  `references/parallel.md` 的「隔离文件所有权」是同一原则在磁盘层的落地。
- 实验失败直接删 worktree，主线零污染；改动只在显式合并后进入主线。
- 合并/PR/丢弃属**不可逆决策**：脚本只给选项不代执行，走「三处必停」等指令。
- 进 worktree 先跑一次测试基线（superpowers 要求），确认起点绿再动手。

## §3 红线
巨型提交｜`fix / update / misc` 式 message｜格式化混行为｜提交 `.env`/密钥/产物｜
长命分支｜强推共享分支｜**不确认就 merge/force push/reset --hard**｜
两个并行流共用一个分支或目录（必冲突）。

## §4 变更摘要（每次提交后一行给全）
`改了什么 / 故意没碰什么 / 潜在风险` —— 「没碰什么」证明守了范围，别顺手装修。
