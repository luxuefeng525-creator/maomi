# ai-workflow · 跨平台全流程工作流技能包

> **第一次使用 / 刚拿到压缩包的人，请先看 [MANUAL.md](MANUAL.md)** —— 面向使用者的安装、验证、使用、排错与 FAQ。本文是开发者向的设计说明与高级特性。

一套**自包含、零仓库依赖、可独立安装**的 Agent Skills 包。输入 `ai-workflow` 即自动进入全流程，开发中按需自动调用内置 36 个技能（含大屏技能），无需点名。遵循 Anthropic **Agent Skills 开放标准**（2025-12 发布），一次编写，可在 40+ 工具运行。

## 设计对标（来自 GitHub 顶尖同类）
- **Agent Skills 开放标准**（`anthropics/skills`）：`SKILL.md` + `scripts/` + `references/` 渐进披露，启动只载入 `name/description`，命中才读正文，细节按需取。这是省 token 的根基。
- **caveman**（`JuliusBrussee/caveman`，58k★）：说话像 caveman，省 65% token——本包汇报采用短、直、无客套文风。
- **claude-mem**（`thedotmack/claude-mem`）：持久记忆——本包 `scripts/memory.mjs` 做索引式检索，从不整份载入。
- **planning-with-files**（`OthmanAdi`）：长任务存活于压缩——`HANDOFF.md` 中断续命。
- **superpowers**（`obra`）/ **gstack**（`garrytan`）：先想后写、角色化工作流——本包「定档 + 8 环 + 三处必停」即此精神。
- **superpowers · subagent-driven-development**（`obra`，282k★）：子代理驱动开发——本包 `references/parallel.md` 取其「每任务全新上下文 + 两阶段审查（规格合规→代码质量）+ 进度账本存活压缩」内核，并修正其过严的一条：**隔离文件所有权 + 共享契约先建 + 叶节点并行**，既提速又不冲突（对标原意：superpowers 本身禁止并行派发怕冲突，本包把冲突根因——所有权重叠——灭掉，放出安全的并行）。
- **git-workflow-and-versioning**（`addyosmani/agent-skills`）/ **using-git-worktrees**（`obra/superpowers`）：原子提交 + worktree 隔离——本包 `references/git-workflow.md` + `scripts/git-atomic.mjs` 取其「一逻辑一提交、关注点分离、短分支 trunk-based、worktree 并行隔离、提交前卫生检查」；`caveman-commit` 复用为 message 技能不重复造。
- **webapp-testing**（`anthropics/skills`）/ **big-screen**（`alinkiot/big-screen`）：浏览器截图自检——本包 `scripts/verify-visual.mjs` 跑 1920×1080 截图，检测控制台报错与面板溢出，`ok:true` 才算交付。
- **skill-creator · eval/benchmark**（`anthropics/skills`）：评测闭环——本包 `references/eval.md` + `scripts/eval.mjs` 取「用例集 / 同轮 A-B / 断言 `text·passed·evidence` / 及时捕获 tokens·duration / benchmark delta / 迭代」内核，**砍掉双跑子代理 + HTML viewer + Python 聚合**（那些本身极耗 token，与「省 Tokens 第一位」冲突）。`trigger` 复用真实 `route.mjs` 确定性打分，**零 LLM、0 额外 token** 即可量化命中率。首轮实测暴露 5 条 near-miss 误触发 → 据此加负向意图闸门 → **F1 0.76→1.00**，既有 8 个路由场景零回归。另加 `snapshot`/`diff` 做**确定性跨版本对比**（同一用例集 + 同一技能集合、控制变量、0 token），替代其耗 token 的 blind comparison。

## 目录结构
```
ai-workflow/
├── SKILL.md              # 轻量入口（~3.2KB）：六步 + 三处必停 + 禁令
├── references/           # 按需加载的细节（命中才读）
│   ├── workflow.md       # 8 环交付链路 + 定档判据 + 闸门（含视觉自检）
│   ├── routing.md        # 意图路由表（13+ 类场景，含大屏 + 并行 + 提交）
│   ├── parallel.md       # 子代理并行拆解协议（L2 大任务提速，对标 superpowers）
│   ├── git-workflow.md   # 原子提交 + worktree 隔离（对标 addyosmani）
│   ├── eval.md           # 评测与量化协议（对标 skill-creator，命中才读）
│   └── memory-spec.md    # 长期记忆规范（省 token）
├── scripts/              # 自包含、跨平台、零依赖
│   ├── start.mjs         # 自举：报 LEDGER/NEXT/VERSION
│   ├── classify.mjs      # 定档 L0/L1/L2
│   ├── memory.mjs        # 长期记忆 add/search/prune/index
│   ├── route.mjs         # 意图→技能 确定性打分
│   ├── decompose.mjs     # 模块依赖结构分析，给并行/串行建议（LEAF/HUB/PEER）
│   ├── git-atomic.mjs    # 原子提交计划 + 卫生检查 + worktree 隔离（默认 dry-run）
│   ├── verify-visual.mjs # 浏览器 1920×1080 截图自检（控制台+溢出）
│   ├── eval.mjs          # 评测/基准：trigger / record / compare / snapshot / diff（全零 LLM）
│   └── triggers.json     # 触发词清单（主路由）+ 负向意图闸门
├── evals/                # evals.json：种子用例（含 near-miss 负例）
├── skills/               # 36 个依赖技能，每个都是独立可装包
│   ├── bigscreen-studio/ # 通用/商业可视化大屏（数据看板 / 3D 数字孪生）
│   └── industrial-screen/# 工业大屏 / SCADA / HMI（操作防误、ISA-101）
├── install.mjs           # 跨平台安装（Windows / 通用）
├── install.sh            # POSIX 安装
└── README.md
```

## 安装（任何电脑、任何软件）
本包可装到任意 Agent Skills 宿主。各宿主技能目录约定：

| 宿主 | 项目级路径 | 用户级（全局）路径 |
|---|---|---|
| 通用标准 | `.agents/skills/` | `~/.agents/skills/` |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Trae / Trae-CN | `.trae/skills/` | `~/.trae-cn/skills/` 或 `~/.trae/skills/` |
| WorkBuddy | `.workbuddy/skills/` | `~/.workbuddy/skills/` |
| Cursor | `.cursor/skills/` | `~/.cursor/skills/` |
| Codex | `.codex/skills/` | `~/.codex/skills/` |
| Windsurf | `.windsurf/skills/` | `~/.windsurf/skills/` |
| OpenCode | `.opencode/skills/` | `~/.opencode/skills/` |

**自动探测安装**（推荐）：
```bash
# 项目级：装到当前仓库检测到的宿主
node install.mjs
# 或 POSIX
./install.sh

# 用户级全局：所有电脑所有项目都能用
node install.mjs --global
./install.sh --global
```

**指定宿主 / 目录**：
```bash
node install.mjs --host trae          # 只装 Trae
node install.mjs --target /abs/path/skills   # 装到任意目录
```

安装内容：把 `SKILL.md` + `scripts/` + `references/` + `evals/` 复制为 `<宿主>/skills/ai-workflow/`。`skills/` 依赖包默认一并复制（离线自包含）；加 `--no-deps` 则只装编排器，技能改由宿主已装版本提供。

> **实测教训（2026-11-05）**：`--no-deps` 只在宿主同级**已装齐兄弟技能**时才安全。曾有一层宿主目录里只有 `ai-workflow` 自己，结果 34 个（当时规模）技能全路由不到（`eval.mjs trigger` 报 `F1=0.40`、6 个正例漏命中）；补全量依赖后 `F1=1.00`。**装完跑一次 `node scripts/eval.mjs trigger` 即可自检**，这是评测最省 token 的用途。

## 使用
在任意会话输入 `ai-workflow`（或 `/ai-workflow`、进入工作流、开工流程、走流程）即加载并自动连续执行六步。开发中按 `references/routing.md` 自动调用命中技能，不等你点名；也可直接点名某技能（优先）。

## 大屏技能（来自 alinkiot/big-screen，已纳入本包）
输入含「大屏 / 数据大屏 / 运营中心 / 指挥中心 / 数字孪生 / 3D 大屏」→ 自动路由到 **bigscreen-studio**（通用/商业可视化大屏，flat 数据看板或 observatory 3D 孪生）。
输入含「工业大屏 / SCADA / HMI / 上位机 / 工控屏 / 就地控制屏」→ 自动路由到 **industrial-screen**（5 种工业模式 + 操作防误，遵循 ISA-101）。

两个大屏技能**自包含其生成逻辑与规范**（SKILL.md + scripts + references），但渲染引擎（vizlab / industrial）体积大、且需联网构建，**不进包**：
- bigscreen-studio 的 `scaffold.mjs` / `verify.mjs` 在本地 `../vizlab` 缺失时，自动 `git clone --depth 1` 到 `~/.bigscreen-ai/cache/bigscreen-engine` 作为回退；亦可手动把引擎放到技能同级。
- industrial-screen 的 `validate-*.js` 是纯 Node 校验脚本，自包含；其生成的大屏引用本地 Vue 3 / ECharts 5 / Three.js（需随交付包提供或由宿主工程提供）。
- 已**排除** `industrial-screen/assets/iotview-icons/`（1530 个 PNG 图标库，运行时按 `<img>` 引用，体积数百 MB）——需要写实设备图标时，从该上游仓库单独取，或让技能自绘。

## 视觉自检（对标 webapp-testing / big-screen）
Web/UI 交付物在收尾环节统一跑：
```bash
node scripts/verify-visual.mjs --url https://example.com
node scripts/verify-visual.mjs --file dist/index.html --out ./out
```
输出 JSON：`ok`（控制台零报错 + 面板零溢出才为 true）、`errors`、`audit.overflow`、`audit.console`、`screenshot`。未装 Playwright 时脚本优雅提示并退出，不阻塞流程。

## 子代理并行拆解（L2 大任务提速，对标 superpowers subagent-driven-development）
大屏 / 复杂功能往往含多个独立模块（多个数据场景、多个页面区块、前后端多域）。这类 L2 任务可走受控并行，而不是单线硬推：

```bash
# 1) 先拿结构依据：扫描仓库模块，给出 LEAF(可并行)/HUB(共享契约先建)/PEER(耦合串行)
node scripts/decompose.mjs --dir /abs/repo
node scripts/decompose.mjs --dir /abs/repo --json   # 机器可读

# 2) 按 references/parallel.md 派发子代理：
#    - 共享契约（HUB，如公共类型/接口/路由/设计令牌）先串行敲定并通过编译
#    - 叶节点（LEAF）按隔离文件所有权并行派发，每个子代理 = 全新上下文 + 只给所需全文
#    - 每任务两阶段审查：规格合规 → 代码质量；状态四态 DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED
#    - 集成后用分支/worktree，跑全量测试 + verify-visual 截图自检 + 8 环验收
```

协议要点（`references/parallel.md` 全文）：
- **安全并行 = 隔离文件所有权**，两个子代理写同一批文件 = 必丢改动，绝不允许；
- **共享契约先建**，再放并行叶节点（契约未定就并行 = 各写各的必冲突）；
- **进度账本** `.ai-workflow/sdd/progress.md` 使长任务在上下文压缩后续命；
- 与「禁多模块并发改」不冲突——那是单上下文乱改，这是契约先行、所有权隔离、审查兜底的受控并行。

## 原子提交 + worktree 隔离（对标 addyosmani / superpowers）
交付提交前，用脚本一次拿到结论（**只回精简摘要，不把整个 diff 灌进上下文 = 省 token**）：
```bash
node scripts/git-atomic.mjs plan                    # 按「目录×类型」给原子提交分组 + 卫生检查
node scripts/git-atomic.mjs plan --verbose          # 出每组 git add 清单
node scripts/git-atomic.mjs plan --json             # 机器可读
node scripts/git-atomic.mjs worktree order-split    # dry-run 出创建命令（短分支 feature/xxx）
node scripts/git-atomic.mjs worktree order-split --exec   # 真创建（隔离目录在仓库 ../）
node scripts/git-atomic.mjs list                    # 列现有 worktree
node scripts/git-atomic.mjs clean <worktree路径>    # 只给 remove 命令，不代执行（不可逆）
```
- **原子提交**：一逻辑一提交，重构/功能/格式化/依赖分开；切片即提交；目标 ~100 行、>1000 行必拆。message 复用捆绑技能 `caveman-commit`（讲 why 不讲 what）。
- **卫生检查**（`plan` 自动）：两轮密钥（文件名 + 内容级 `apiKey`/`sk-…`）、**NUL 字节**（会让 git 判二进制）、`[DEBUG-xxx]` 残留（排除 .md 规则文本，防假警报）、超千行文件。
- **worktree 隔离**：每个并行流/子代理一个短分支 + 独占目录，与 `references/parallel.md` 的隔离所有权同一原则；实验失败删 worktree，主线零污染。
- **安全**：脚本默认 dry-run，绝不自动 `add/commit/merge/push/reset`；合并/PR/丢弃属不可逆决策，只给命令走「三处必停」。细则见 `references/git-workflow.md`。

## 评测与量化（对标 skill-creator，省 token 第一位）
**按需手动触发，不进每轮六步**。完整 skill-creator 方案（双跑子代理 + HTML viewer + Python 聚合）本身极耗 token，本包只取可量化内核，全部零 LLM：
```bash
node scripts/eval.mjs trigger                    # 命中率：复用真实 route.mjs，0 额外 token
node scripts/eval.mjs trigger --json             # 明细（含误命中项）
node scripts/eval.mjs record with_skill 1 --pass 3/4 --tokens 12345 --ms 23400
node scripts/eval.mjs record baseline  1 --pass 2/4 --tokens 18900 --ms 31100
node scripts/eval.mjs compare                   # pass / tokens / time 的 delta + verdict
node scripts/eval.mjs snapshot ../aw-snapshot-v1                  # 改包前存快照（放包同级，仅文本）
node scripts/eval.mjs diff ../aw-snapshot-v1                      # 0 LLM 跨版本对比 F1 + GAIN/LOSS
```
- 用例在 `evals/evals.json`，含 **near-miss 负例**（共享关键词但不该触发）。断言字段 `text/passed/evidence`；A/B **同轮**采集；`total_tokens` / `duration_ms` 只在任务结束时可得 → 立刻 `record`，**禁估算**（缺实测值脚本直接报错）。
- 结果写 `eval-results/iteration-<N>/<config>/`，`--iter` 控迭代、`--out` 换目录；脚本绝不自动改技能、不提交、不调 LLM。
- **已跑通一轮真实迭代**：首轮 `F1=0.76`（8 正全中、5 负全误触发）→ 评测暴露问题 → 加 `__negative_intents` 负向意图闸门（纯问答/文本替换/转交文件且无开发动作词 → 不载技能）→ `F1=1.00`（TP=8 TN=5 FP=0 FN=0），既有 8 个路由场景零回归。
- **跨版本对比（0 token）**：`snapshot` 只搬文本脚本 + 用例 + 各技能 `SKILL.md`（不搬 77MB 资源），两版同用例集/同技能集合 = 控制变量；`diff` 给 `old→new F1`、`ΔF1`、用例级 `GAIN/LOSS` 与 `VERDICT`。实测复现上一轮迭代：`F1 0.76→1.00 | ΔF1=+0.24 ΔFP=-5 | GAIN(5) LOSS(0)`。**只有 F1↑ 且 LOSS=0 才能宣称新版本更好**；这是触发层量化，不冒充产出质量。
- 结论口径：`pass↑ 且 tokens↓` 才算「工作流让产出更好」；单次不下结论。红线见 `references/eval.md`。

## 长期记忆（省 token）
```bash
node scripts/memory.mjs add "口径 | 后端端口3000 库springboot_db3309"
node scripts/memory.mjs search "端口"
node scripts/memory.mjs prune          # 自动剪枝旧条目
```
记忆是索引不是上下文——`search` 只回命中行，从不整份载入。

## 单独安装某个依赖技能
`skills/` 里每个子目录都是独立可装包。挑一个装到宿主即可：
```bash
cp -r skills/diagnose /abs/host/skills/diagnose
cp -r skills/bigscreen-studio /abs/host/skills/bigscreen-studio
```
