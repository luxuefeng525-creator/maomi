# ai-workflow 使用手册（拿到压缩包的人看这里）

> 你手上是一个 `ai-workflow-v3.3.1.zip`。它是一套**自包含的 AI 工作流技能包**：装到你的 AI 编程工具里，之后在会话里输入 `ai-workflow`，它就会带着 AI 走完整流程（先想清楚 → 自动挑技能 → 干活 → 自检收尾），不用你每次手动指挥。
>
> 不需要联网、不需要装数据库、不需要改你的项目代码。只要有 Node.js 和一个支持 Skills 的 AI 工具即可。

---

## 0. 60 秒极速版（只想赶紧能用）

```bash
# 1) 解压后进入 ai-workflow 目录（Windows 用 Git Bash 或 CMD 均可）
cd ai-workflow

# 2) 安装到你电脑上所有 AI 工具（推荐，一次装好，任何项目都能用）
node install.mjs --global

# 3) 验证装好了（看到 F1=1.00 即成功）
node scripts/eval.mjs trigger
```

然后打开你的 AI 工具（WorkBuddy / Claude Code / Cursor / Trae 等），**新开一个会话**，输入：

```
ai-workflow
```

就自动进入工作流了。下面是要点和排错。

---

## 1. 先确认前置条件

| 需要 | 检查命令 | 说明 |
|---|---|---|
| Node.js ≥ 18 | `node -v` | 没有就去 https://nodejs.org 装 LTS 版（装完重开终端） |
| 一个支持 Skills 的 AI 工具 | —— | 见下方「支持哪些工具」 |

> 没有 Node.js 也能用 `install.sh`（macOS / Linux / Git Bash），但它内部仍会调用 node 做自检；建议直接装 Node。

---

## 2. 解压

- **Windows**：右键 zip →「全部解压缩」→ 得到一个 `ai-workflow` 文件夹。
- **macOS / Linux**：
  ```bash
  unzip ai-workflow-v3.3.1.zip
  ```
- 解压后目录里应能看到 `install.mjs`、`SKILL.md`、`scripts/`、`skills/` 等。**以下命令都在这个 `ai-workflow` 目录里执行。**

---

## 3. 安装（两种方式，选一种）

### 方式 A：全局安装（推荐）

装到「用户目录」下所有已识别 AI 工具的技能目录。**装一次，任何项目、任何会话都能用。**

```bash
node install.mjs --global
```

成功会逐行打印 `OK   <路径>`，最后是 `完成：安装到 N 个宿主目录`。

### 方式 B：项目级安装

只想让某个项目用，就 `cd` 到那个项目根目录再装（它会自动找该项目里已有的 AI 工具目录）：

```bash
cd /path/to/your-project
node /path/to/ai-workflow/install.mjs
```

### 其它常用参数

```bash
node install.mjs --host trae        # 只装到 Trae（可选：agents/claude/trae/traecn/workbuddy/cursor/codex/windsurf/opencode）
node install.mjs --target /abs/dir  # 装到任意指定目录（其下会再建 ai-workflow/）
node install.mjs --no-deps          # 只装编排器，不带 36 个依赖技能（宿主已装齐兄弟技能时才用）
```

> **注意**：`--no-deps` 有前提。如果目标宿主目录里没有配套的兄弟技能，路由会大面积失配（实测 `F1` 掉到 0.40）。**不确定就别加它**，默认带上依赖最稳。

---

## 4. 验证是否装好

```bash
node scripts/eval.mjs trigger
```

看到类似下面这行就是成功：

```
TRIGGER n=13 acc=1.00 P=1.00 R=1.00 F1=1.00 | TP=8 TN=5 FP=0 FN=0
MISS(0) 全部用例符合预期
```

> 这行是**在技能包里**跑的；它验证的是「路由逻辑本身正常」。装到宿主后，若想再确认，可在宿主技能目录里对 `ai-workflow/scripts/eval.mjs` 跑同样命令。

---

## 5. 怎么用

装好后，**重载 IDE 或新开一个会话**（重要：旧会话不会热加载），然后输入任意一个：

```
ai-workflow
/ai-workflow
进入工作流
开工流程
走流程
```

它就会自动连续执行六步（见第 7 节），并在开发过程中**按需自动调用命中的技能**，不需要你逐个点名。

你也可以直接说需求，例如：

- 「做一个智慧园区运营中心的数据大屏」→ 自动用大屏技能
- 「这个接口报错了帮我查为什么」→ 自动用诊断技能
- 「帮我把改动拆成原子提交」→ 自动用提交流程
- 「做一个新功能，先把需求拷问清楚」→ 自动用需求梳理技能

想指定某个技能，也可以直接点名（点名优先于自动路由）。

---

## 6. 装到哪里了（路径对照）

| 工具 | 项目级路径 | 全局（用户级）路径 |
|---|---|---|
| 通用标准 | `.agents/skills/ai-workflow/` | `~/.agents/skills/ai-workflow/` |
| Claude Code | `.claude/skills/ai-workflow/` | `~/.claude/skills/ai-workflow/` |
| Trae / Trae-CN | `.trae/skills/ai-workflow/` | `~/.trae-cn/skills/ai-workflow/`（或 `~/.trae/`） |
| WorkBuddy | `.workbuddy/skills/ai-workflow/` | `~/.workbuddy/skills/ai-workflow/` |
| Cursor | `.cursor/skills/ai-workflow/` | `~/.cursor/skills/ai-workflow/` |
| Codex | `.codex/skills/ai-workflow/` | `~/.codex/skills/ai-workflow/` |
| Windsurf | `.windsurf/skills/ai-workflow/` | `~/.windsurf/skills/ai-workflow/` |
| OpenCode | `.opencode/skills/ai-workflow/` | `~/.opencode/skills/ai-workflow/` |

- Windows 下 `~` 通常是 `C:\Users\你的用户名`。
- 装完后每个 `ai-workflow/` 里应有 `SKILL.md`、`scripts/`、`references/`、`skills/`。

---

## 7. 它到底做了什么（六步）

输入 `ai-workflow` 后，它会按顺序执行：

1. **自举**：读项目状态（版本 / 记忆 / 待办），不瞎猜。
2. **定档**：判断任务大小（L0 小改 / L1 单模块 / L2 大任务），据此控制要加载多少技能，避免浪费 token。
3. **查记忆**：只在需要时检索历史记录，不整份塞进上下文。
4. **自动调用技能**：按你的话匹配到具体技能并加载（不等你点名）。
5. **按档执行**：小改只做必要步骤；大任务走完整交付链路（含 UI 截图自检）。
6. **收尾自检**：先给证据再说完成；提交前做原子提交规划与卫生检查。

**三处会主动停下来问你**（不会边问边改）：需求不清 / 不可逆或危险操作（如删除、强制推送）/ 验收没通过。

---

## 8. 内置了哪些能力（不用记，用到自动调）

共 36 个技能，覆盖：诊断排错、需求梳理、UI 设计、重构（行为不变）、原子提交、验收自检、可视化大屏、工业 SCADA/HMI 大屏等。重点两个：

- 说「大屏 / 数据大屏 / 运营中心 / 指挥中心 / 数字孪生 / 3D 大屏」→ **bigscreen-studio**
- 说「工业大屏 / SCADA / HMI / 上位机 / 工控屏」→ **industrial-screen**

> 大屏技能的渲染引擎体积大、需联网构建，**没有放进包**。首次生成时会自动尝试克隆到本地缓存（`~/.bigscreen-ai/cache/`）；公司内网无外网时，需要提前把引擎放好或由项目自带。

---

## 9. 常用命令速查（都在 `ai-workflow` 目录执行）

| 目的 | 命令 |
|---|---|
| 全局安装 | `node install.mjs --global` |
| 项目级安装 | `node install.mjs` |
| 验证路由命中率 | `node scripts/eval.mjs trigger` |
| 看项目状态 | `node scripts/start.mjs` |
| 一轮快速自检（推荐） | `node scripts/fast.mjs "你的需求"`（合并自举/定档/记忆/路由，只出 4 行） |
| 仓库地图（大项目必用） | `node scripts/context.mjs --dir <仓库根>`（先看有什么，再定点读） |
| 校验某个技能 | `node scripts/validate-skill.mjs skills/<名>` |
| 浏览器 E2E（点击/填表/断言） | `node scripts/browser.mjs --url <地址> --steps <json>` |
| 长任务断点续跑 | `node scripts/checkpoint.mjs start/done/status/resume` |
| 判断任务档位 | `node scripts/classify.mjs "你的需求"` |
| 查历史记忆 | `node scripts/memory.mjs search "关键词"` |
| 记一条长期记忆 | `node scripts/memory.mjs add "键 | 值"` |
| 分析模块依赖（并行参考） | `node scripts/decompose.mjs --dir /abs/repo` |
| 原子提交规划（只看不改） | `node scripts/git-atomic.mjs plan` |
| UI 截图自检 | `node scripts/verify-visual.mjs --url <地址或HTML>` |
| 环境/包完整性自检（8 项，FAIL 即退出 1） | `node scripts/doctor.mjs` |
| 发布前一键过闸（8 道闸 + 打包） | `node scripts/release.mjs --pack` |
| 只验某个 zip 有没有夹带工作产物 | `node scripts/release.mjs --zip <路径>` |
| 重新打压缩包（自动排工作产物） | `node scripts/pack.mjs` |
| 连 `.ai-workflow/`、`eval-results/` 一起打（内部留档） | `node scripts/pack.mjs --with-work` |
| 派工规划 / 结构化契约 / 危险动作预检 | `node scripts/agent.mjs plan` `/ contract` `/ guard` |
| 生成宿主钩子配置 / 跨会话接力卡 | `node scripts/agent.mjs hooks` `/ handoff` |
| 存版本快照 / 跨版本对比（0 LLM） | `node scripts/eval.mjs snapshot <目录>` `/ diff <目录>` |

> 这些脚本都**不会自动改你的代码、不会自动提交、不会自动删除**。`git-atomic` 默认只做预演（dry-run）。

**关于 `pack.mjs` 的排除规则**：默认不打包 `.git/`、`node_modules/`、`.ai-workflow/`、`eval-results/`、`HANDOFF.md`、`.env*` 和任何 `*.zip`——与 `.gitignore` 一致，分发件里不该有会话账本和凭据。要连工作产物一起留档时加 `--with-work`，脚本会打印 `WORK_EXCLUDED=` 说明排掉了什么。`release.mjs --pack` 打包后会自动复查 zip 里有没有混入这些路径，混入即 `RELEASE BLOCKED`。

---

## 10. 常见问题（FAQ）

**Q：输入 `ai-workflow` 没任何反应？**
1. 确认装到了**当前工具**的技能目录（对照第 6 节路径，看里面有没有 `ai-workflow/SKILL.md`）。
2. **重载 IDE / 新开会话**——旧会话不会热加载。
3. 确认 `node install.mjs --global` 输出里有 `OK`，没有 `FAIL`。

**Q：`node` 命令不存在？**
装 Node.js LTS（https://nodejs.org），装完**重开终端**再试。Windows 若用 PowerShell 报「禁止运行脚本」，别跑 `.ps1`，直接 `node install.mjs --global` 即可。

**Q：装的时候某行 `FAIL` 了？**
多为目标目录无写权限或路径不存在。用 `--target` 指到一个你有权限的绝对目录，或检查该目录是否存在。脚本会明确打印缺了哪些文件。

**Q：能同时装多个工具吗？**
`--global` 会一次装到所有已识别宿主，互不影响。

**Q：会不会很费 token？**
不会。它是“渐进披露”：平时只加载一小段入口说明，只有命中某个技能时才读取那个技能的正文，细节在 `references/` 里按需取。不开评测就不会额外跑 LLM。

**Q：为什么感觉越用越慢？**
长会话每轮都要重新处理全部历史，越往后越慢。**一个任务开一个新会话**；小改（单文件 / 无 UI）直接说需求即可，工作流会走 L0 直通、不加载技能、不截图。L1/L2 也只需跑一次 `node scripts/fast.mjs "<需求>"`，不要再把四个脚本各跑一遍。

**Q：中文路径 / 带空格的路径有问题吗？**
安装器已处理常见中文路径；装到自定义位置时把路径用引号包起来，例如 `--target "D:\我的 项目\skills"`。

**Q：怎么更新到新版本？**
拿新的 zip，解压后重新跑一遍 `node install.mjs --global`，会覆盖旧版本（你的记忆/评测结果若在宿主目录里，覆盖前先备份）。

**Q：怎么卸载？**
删掉对应宿主目录下的 `ai-workflow` 文件夹即可，例如 `~/.workbuddy/skills/ai-workflow`。全局安装就删各宿主里的同名目录。

**Q：这个包会改我的项目吗？**
不会。它只往“技能目录”复制文件；干活时是否改代码，取决于你让它做什么。脚本默认都是只读/预演。

---

## 11. 包里都有什么

```
ai-workflow/
├── MANUAL.md          ← 本手册（你正在看的）
├── README.md          ← 开发者向：设计对标、目录结构、高级特性
├── SKILL.md           ← 技能入口（AI 工具读取的入口）
├── install.mjs/.sh    ← 安装器
├── references/        ← 按需加载的详细协议（工作流/路由/并行/提交/评测/记忆）
├── scripts/           ← 零依赖脚本（自举/定档/路由/记忆/打包/评测等）
├── evals/             ← 命中率用例集
├── eval-results/      ← 真实 A/B 评测数据（可删，不影响使用）
└── skills/            ← 36 个依赖技能，每个都可单独安装
```

---

## 12. 最小可行路径（再强调一次）

```bash
cd ai-workflow
node install.mjs --global
node scripts/eval.mjs trigger        # 看到 F1=1.00 就对了
# 然后新开会话，输入：ai-workflow
```

就这些。遇到问题先看第 10 节 FAQ。
