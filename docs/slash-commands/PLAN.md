# PLAN · 给本包补斜杠命令入口

日期：2026-10-27 · 档位：L2 · 状态：执行中

## 1 问题

开源用户装完本包后，**没有任何一键入口**：

- 全局 `~/.trae-cn/commands/` 有 77 个命令，**没有一个属于本包**。
- 本包没有 `commands/` 目录，`install.mjs` 也不装命令。
- 用户只能自己去翻 README 抄 `node opensource/agent-workbench/scripts/xxx.mjs`，路径还得对。

对照：同仓其他工具链（hookify / prp / multi-*）都提供 `/xxx` 命令。缺这一层 = 「装完不知道怎么用」。

## 2 目标

装完即可用 6 个斜杠命令，不需要记 Node 路径：

| 命令 | 作用 | 底层 |
| --- | --- | --- |
| `/ai` | 开工总入口：自举（报做到哪/下一件）+ 定档 + 说明本轮怎么走 | `session-start.mjs` + `project-orchestrator` |
| `/ai-next` | 只报进度：账本状态、下一件、其余未完成账本 | `session-start.mjs` |
| `/ai-doctor` | 环境体检：含 Hook 是否**真在跑**（不是只配了文件） | `doctor.mjs` |
| `/ai-plan` | 出 `docs/<任务>/PLAN.md`（L1/L2 硬闸门前置） | `writing-plans` + `project-orchestrator` |
| `/ai-run` | 按账本逐步执行，缺文档会被 `GATE BLOCK` 拦 | `agent.mjs run` |
| `/ai-ship` | 交付前验收：结构门禁 + 单测 + Stop 闸门，缺证据不许宣称完成 | `selfcheck.mjs` + `stop-gate.mjs` + `verify-and-stop` |

命名全部带 `ai-` 前缀：全局已有 `plan.md` / `code-review.md` 等同名命令，不前缀会撞。

## 3 边界

- 命令只做「路由 + 必要前置检查」，**不复制技能正文**（否则形成第二口径）。
- 命令内写绝对可执行的相对路径（`opensource/agent-workbench/scripts/...`），并声明「路径不存在时的兜底：`npx` 不用、直接报缺」。
- 不改 77 个既有命令。
- 项目级 `.trae/commands/` 是否被 Trae 扫描**未验证**：本包仍会写一份到该目录，但文档只承诺全局路径生效。

## 4 影响面

| 文件 | 变更 |
| --- | --- |
| `commands/ai.md` 等 6 个 | 新增 |
| `scripts/install.mjs` | 新增 `--with-commands`（trae-user → `~/.trae-cn/commands`；project → `.trae/commands`），写入安装清单 `commands` 归属表，`--remove` 同步清理 |
| `package.json` | `files` 加 `commands`；版本 → 0.22.0 |
| `README.md` | 顶部加「装完 3 步上手」+ 命令表 |
| `tests/run.mjs` | 新增：命令文件齐全且 frontmatter 有 description、install 把命令写到目标目录、`--remove` 清掉 |

## 5 验收标准

1. `commands/` 6 个文件，每个有 `description` frontmatter
2. 安装到 `trae-user` 后 `~/.trae-cn/commands/ai*.md` 6 个存在，清单记 `commands` 6 条
3. `--remove` 后 6 个被删，且**不动**其他 77 个命令
4. `node tests/run.mjs` 全 PASS（新增 ≥3 条）
5. `node scripts/validate.mjs` `FAIL=0`
6. README 上手段能在 60 秒内照做（命令逐字可复制）
7. GitHub 本地 = 远端

## 6 回滚

命令是纯新增文件；`git revert` 即可。不改既有 77 个命令，`--remove` 只删清单记录的本包命令。
