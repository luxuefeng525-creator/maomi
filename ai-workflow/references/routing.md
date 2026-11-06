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
| 从零写新功能 / 要测试先行 / 补单元测试 | `tdd`：先说定 seam → 一条会红的测试 → 最小实现转绿 → 垂直切片重复（不许批量先写测试）→ 重构交给审查阶段 | L1 |
| 要理清接口 / 模块该切成什么 / 术语统一 | `domain-modeling`：深模块、信息隐藏、错误要显式；接口设计五问 | L1 |
| 讨论要落成文档 / 出规格 / 写 PRD | `grilling`（把需求问清）→ `to-spec`（综合成规格，不重新访谈；seam 定稿即合约） | L2 |
| 计划要拆成可执行项 / 排依赖 | `to-tickets`：曳光弹垂直切片 + 前置边；大范围改走扩张—收缩 | L2 |
| 查资料 / 核实说法 / 要权威出处 | `research`：来源 A/B/C/D 分级，只用 A/B 定结论，每条挂原始链接 | L1 |
| 上下文要满 / 换会话 / 交班 | `handoff`：压成交接单（目标·已完成·现状·下一步·坑），引用已有产物不复制 | 任意 |
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

## 自动调用三档（先跑脚本，再自己判）

1. **route 命中**（score ≥ 3）：直接按 Top1 载技能，Top2/3 只在 Top1 明显不对时备选。不等用户点名。
2. **route 沉默**（`ROUTE_NONE`）：**不等于没有技能可用**——只表示触发词表没覆盖这个说法
   （口语换说法的实测覆盖上限约 4 成）。此时读 `references/dispatch-table.md`（40 行，约 3.6k 字符 ≈ 1.8k token；整列读完比自己逐个读 40 个 description 便宜一个数量级），
   按第二列「什么时候用」自己判语义，选中就载。
3. **表里也没有**：如实说「无匹配技能，按通用工程纪律执行」，不假装已加载、不编造。

用户点名技能 > 1 > 2 > 3。别把 2 跳过直接进 3 —— 这是自动调用最常断的一环。

## 自动加载规则
- 单 SKILL.md > 30KB（如 `finesse-ui`）先 `Read limit:80` 取路由，再定点读所需章节，不全量载入。
- 本包技能在 `skills/<名>/SKILL.md`；若宿主技能目录已单独安装同名技能，优先宿主版（更新更全）。
- route 沉默先读 `references/dispatch-table.md` 自选（见上「自动调用三档」）；表里也没有才说「无匹配技能」。
- 不假装已加载，不编造结论。

## route.mjs 打分逻辑（零 LLM、确定性、跨宿主一致）
对 `<一句话>` 与每个候选技能（本包 `skills/` + 宿主技能目录）打分：
- 触发词命中：+5～+9（按词长分档；口语填词「帮我/一下/先/这个…」先剥离再匹配一次）
- 技能名出现：+9
- 结构化构式加成：+6～+8（如"大屏/上位机/子代理并行/先定位"这类构式对任何模型都成立）
- description 2-gram 覆盖率：≥25% 起给 +3，最高 +9（描述是作者写的"什么活归我"，是最宽的口语信号）
- 负向闸门：纯问答/字面替换/起名/转交等非开发意图 → 直接 `ROUTE_NONE`

默认 `--min 3`（召回优先，负向闸门负责误触发）。**沉默时输出弱候选 + 指路派发表**，而不是宣称"无技能"。

## 技能全量索引

**不在此处维护**——见 `references/dispatch-table.md`（每增删技能跑 `node scripts/build-catalog.mjs` 自动重生成）。
本文件只维护「消息类型 → 链路」的意图映射，不再手抄技能清单，避免两处漂移。
