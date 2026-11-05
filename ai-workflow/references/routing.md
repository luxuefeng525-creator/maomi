# 意图路由表（按需加载）

每环节动手前先按本表直配技能；不确定就跑 `node scripts/route.mjs "<一句话>"` 打分兜底。
命中即载，不等用户点名；用户点名优先于自动路由。加载受档位预算约束（L0=0｜L1=1｜L2=1–2）。

| 消息类型 | 链路（按顺序） | 档位倾向 |
|---|---|---|
| 问候 / 闲聊 / 纯查询 | 直接答（caveman 文风：短、直、无客套） | L0 |
| 查问题 / 修 bug / 性能回归 | `diagnose`：复现→最小化→3–5 个可证伪假设→一次一变量 `[DEBUG-xxx]`→回归测试先行→清理复盘 | L1 |
| 小补丁 / 窄修 | `surgical-patch`：最小责任层改动，保留周边行为，带任务相关测试 | L0/L1 |
| 重构 | `safe-refactor`：行为不变前提下结构化改写，红→绿保底 | L1 |
| 迁移 / 改数据模型 | `migration`：双写/回填/回滚预案，零残留 | L2 |
| 做功能 / 选型 / 架构变更 | `grilling`（分轮拷问+推荐答案等拍板）→ 按域进产品/设计技能 | L2 |
| 产品 / PRD / 优先级 | `grilling` → `product-strategist` / `product-manager` | L2 |
| 用户研究 / 可用性 / 流失 | `ux-researcher` | L2 |
| UI / 交互 / 原型 / 动效 | `grilling` → `product-designer` → `finesse-brief` → **`finesse-ui`（产出技能，必载、不占预算）** | L2 |
| 多页面风格统一 / 组件库 | `design-system-lead` → **`finesse-ui`（必载）** | L2 |
| 视频 / 片头 / 宣传 | `frame-smith` | L2 |
| 通用/商业可视化大屏（数据看板 / 3D 数字孪生 / 运营中心 / 指挥中心） | `bigscreen-studio`：判断预设(flat/observatory)→脚手架→写数据场景→构建→截图自检→输出单文件 HTML | L2 |
| 工业大屏 / SCADA / HMI / 上位机 / 就地控制屏（工艺流程、操作防误、网关集成） | `industrial-screen`：判断模式(dashboard/hmi-classic/scada/light-3d/local-panel)→按契约开发→校验脚本→截图自检 | L2 |
| 收尾 / 宣称完成 | `verify-and-stop`（先证后言，不扩范围） | 任意 |
| 提交 / 拆分提交 / 分支 / worktree / 并行隔离 | `scripts/git-atomic.mjs plan`（原子拆分 + 卫生检查）→ `caveman-commit`（message）；并行流先 `worktree` 隔离，细则见 `references/git-workflow.md` | 任意 |
| 评测 / 命中率 / 基准对比 / A-B 对比 | `scripts/eval.mjs`（脚本能力，不载技能）：`trigger` 测命中率 → `record` 记实测 → `compare` 看 delta；用例 `evals/evals.json`，细则 `references/eval.md`。**按需手动触发，不进每轮六步** | 任意 |
| UI 真实交互 / E2E / 表单·跳转·弹窗·断言 | `scripts/browser.mjs`（多步 DSL：goto/click/fill/assert）；先 `verify-visual.mjs` 看整体，再跑关键路径；模板 `examples/e2e.login.example.json`，细则 `references/browser.md` | 任意 |
| 长任务 / 超时 / 断点续跑 / 后台执行 | `scripts/checkpoint.mjs`（start/done/status/resume）+ `references/long-tasks.md`；长命令后台 + 轮询，有限重试 | 任意 |

## 大任务并行拆解（L2）
L2 且含 ≥3 个相对独立模块时，不串行硬推，改走受控并行：
1. 先 `node scripts/decompose.mjs --dir <repo>` 拿模块依赖结构——输出每个模块的 `LEAF`（无向外依赖，可并行）/ `HUB`（被多人依赖，先串行建）/ `PEER`（相互依赖，串行）。
2. 按 `references/parallel.md` 派发子代理：**共享契约（HUB）先串行敲定**，再放隔离文件所有权的叶节点（LEAF）并行；每任务两阶段审查（规格合规 → 代码质量）。
3. 这与「禁多模块并发改」不冲突：后者是单上下文乱改，前者是契约先行、所有权隔离、审查兜底的受控并行。

## 自动加载规则
- 单 SKILL.md > 30KB（如 `finesse-ui`）先 `Read limit:80` 取路由，再定点读所需章节，不全量载入。
- 本包技能在 `skills/<名>/SKILL.md`；若宿主技能目录已单独安装同名技能，优先宿主版（更新更全）。
- 未命中任何技能：不假装已加载，不编造结论；如实告知「无匹配技能，按通用工程纪律执行」。

## route.mjs 兜底逻辑
对 `<一句话>` 与每个候选技能（本包 `skills/` + 宿主技能目录）的 name/触发词/description 做确定性打分：
触发词整词命中（+4/词，长度≥2）、技能名出现（+6）、description 关键词重叠（按词频）。低于阈值输出 `ROUTE_NONE`，不硬推无关技能。

## 技能全量索引（40 个，按名排序）

自动生成，勿手改；新增技能后跑 `node scripts/catalog.mjs` 再重生成。

| 技能 | 干什么 | 触发词示例 |
|---|---|---|
| `agent-dispatch` | 拆活派子代理。 | 派子代理、子代理、并行干 |
| `agent-review` | 独立审查改完的活。 | 独立审查、两阶段审查、交叉审查 |
| `bigscreen-studio` | 生成通用/商业数据大屏（看板、3D 数字孪生，以看数据为主，无设备控制）。 | 大屏、数据大屏、可视化大屏 |
| `cavecrew` | 何时把活派给子代理 cavecrew-investigator/builder/reviewer，而不是自己干；其输出压缩，主上下文更耐用。 | cavecrew、cavecrew-investigator、cavecrew-builder |
| `caveman` | 极简腔：结论先行、去掉客套、技术事实不丢。 | caveman、原始人、压缩回复 |
| `caveman-commit` | 写只保留意图的 Conventional Commits 提交信息。 | 提交、commit、commit message |
| `caveman-compress` | 把 CLAUDE.md、todo 等记忆文件压成 caveman 格式省输入 token，保留可读备份。触发 /caveman-compress。 | 压缩记忆文件、压缩claude.md、压缩清单 |
| `caveman-discover` | 找出并标记仓库里所有 LLM 工作流，让花费能按工作流分组。 | 发现工作流、标注 llm 调用、工作流分组 |
| `caveman-evidence-review` | 只读查看 Caveman Cloud 证据：成本、Cave Score、工作流、追踪、时延、错误、路由、节省。 | 证据审查、成本审查、trace 审查 |
| `caveman-explore` | 只读仓库探索：冷启动定位、跨文件搜索、直接搜不到时用。已点名文件或符号就别用。只回 path:line。 | 探索代码库、仓库导览、定位在哪 |
| `caveman-help` | 三个 caveman 技能与命令的速查卡。触发 /caveman-help。 | caveman 帮助、命令卡、怎么用 caveman |
| `caveman-learn` | 执行 learn 报告：处理排好序的 token 黑洞，逐条征得同意后改，并回报省了多少。 | token 花在哪、成本报告、降本 |
| `caveman-manage` | 查看 Caveman Cloud 实验生命周期并拦住不安全的执行。 | 实验审批、实验生命周期、cave score |
| `caveman-optimize` | 把优化观察变成由操作者选定、带基线对照的候选实验。 | 优化实验、基线对比、候选方案 |
| `caveman-review` | 压缩式代码审查：一条一行，含位置、问题、改法。用于 审 PR、审 diff。 | 代码审查、review、过一遍代码 |
| `caveman-setup` | 把仓库接到 Caveman Cloud 网关，让每个 LLM 请求都被计量，行为不变。 | 接入网关、埋点、接入 caveman |
| `caveman-stats` | 当前会话的输出与缓存读取 token 用量及模式归属，或定位宿主原生用量报告。触发 /caveman-stats。 | 统计、用了多少token、会话统计 |
| `design-system-lead` | 设计系统：组件库、design token、文档、设计与研发协作。 | 设计系统、组件库、design token |
| `diagnose` | 硬 bug 与性能回归的诊断环：复现、最小化、假设、埋点、修复、回归测试。 | 查问题、修bug、报错 |
| `finesse-brief` | 把一句模糊需求变成可直接开工的工作台规格（先定规格再动手），区分个人工作台与系统工作台，锁定结构、数据底座、节奏与交接。 | 工作台规格、需求写清楚、一句话变需求 |
| `finesse-term` | 界面说法层：把说不准的界面描述换成能直接发给 Agent 的准确需求，统一术语、命名与微文案。 | 术语、文案、命名 |
| `finesse-ui` | 高质感 Web 与移动界面，拒绝廉价感。 | 落地页、dashboard、后台 |
| `frame-smith` | 用 Remotion 做动效宣传片：电影感片头、产品与发布视频、社交短剪。 | 视频、宣传片、片头 |
| `goal-tracker` | 长任务不丢进度。 | 长任务、续跑、断点 |
| `grill-me` | 别名技能：对方案做不客气的逐个追问，仅在用户点名 grill-me 时使用；泛需求走 grilling。 | grill me、对我说no、残酷追问 |
| `grilling` | 对方案、决策、想法做高强度追问，压出漏洞。 | 拷问、压力测试想法、挑战方案 |
| `industrial-screen` | 工业监控大屏与 SCADA/HMI，核心是控制与操作防误（SBO 两步确认、联锁闭锁、ISA-101 灰度）。 | 工业大屏、scada、hmi |
| `investigate-first` | 编辑前先查清原因不明的失败。 | 先查清、原因不明、偶发 |
| `lean-build` | 防止过度扩张的功能实现：先复用仓库现有、严格范围、明确停手条件。 | 做过头的风险、最小实现、先做能用 |
| `megacave` | 文言文腔的 Caveman：更少字符，术语照原样。仅用 /megacave 或 /caveman wenyan 调用。 | megacave、文言文、古文 |
| `migration` | 可回滚、兼容优先的迁移实施。 | 迁移、升级依赖、改表 |
| `product-designer` | 产品设计：UI/UX、原型、设计系统、设计思维。用于 交互稿、原型、设计评审。 | 产品设计、原型、交互设计 |
| `product-manager` | 产品管理：路线图、需求优先级、干系人。用于 PRD、需求文档、排期与取舍。 | 需求、prd、排期 |
| `product-strategist` | 产品战略：市场分析、竞争定位、上市路径、增长。 | 产品战略、市场分析、竞品 |
| `safe-refactor` | 行为不变的结构调整。 | 重构、整理代码、抽函数 |
| `surgical-patch` | 在最窄责任层修 bug 与小改动。 | 小改、改一处、最小改动 |
| `token-guard` | 载入前先算 token。 | 省token、token 预算、上下文太长 |
| `ultracave` | 最高压缩的 Caveman：碎片化，一词够用就一词，每个事实只说一次。仅用 /ultracave 调用。 | ultracave、极限压缩、最省字 |
| `ux-researcher` | 用户研究：方法选择、可用性测试、数据综述、研究运营。 | 用户研究、访谈、可用性测试 |
| `verify-and-stop` | 只证明现有工作满足验收，绝不扩范围。 | 验收、完成了吗、是否真的完成 |

> 改动编排/派工逻辑前先读 `references/agent-patterns.md`（对标 Claude Code / superpowers 的采纳与拒绝清单）。
