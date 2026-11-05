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
| UI / 交互 / 原型 / 动效 | `grilling` → `product-designer` → `finesse-brief` → `finesse-ui` | L2 |
| 多页面风格统一 / 组件库 | `design-system-lead` → `finesse-ui` | L2 |
| 视频 / 片头 / 宣传 | `frame-smith` | L2 |
| 通用/商业可视化大屏（数据看板 / 3D 数字孪生 / 运营中心 / 指挥中心） | `bigscreen-studio`：判断预设(flat/observatory)→脚手架→写数据场景→构建→截图自检→输出单文件 HTML | L2 |
| 工业大屏 / SCADA / HMI / 上位机 / 就地控制屏（工艺流程、操作防误、网关集成） | `industrial-screen`：判断模式(dashboard/hmi-classic/scada/light-3d/local-panel)→按契约开发→校验脚本→截图自检 | L2 |
| 收尾 / 宣称完成 | `verify-and-stop`（先证后言，不扩范围） | 任意 |
| 提交 / 拆分提交 / 分支 / worktree / 并行隔离 | `scripts/git-atomic.mjs plan`（原子拆分 + 卫生检查）→ `caveman-commit`（message）；并行流先 `worktree` 隔离，细则见 `references/git-workflow.md` | 任意 |
| 评测 / 命中率 / 基准对比 / A-B 对比 | `scripts/eval.mjs`（脚本能力，不载技能）：`trigger` 测命中率 → `record` 记实测 → `compare` 看 delta；用例 `evals/evals.json`，细则 `references/eval.md`。**按需手动触发，不进每轮六步** | 任意 |

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
