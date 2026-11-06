# 派发表（自动生成，勿手改 · 由 scripts/build-catalog.mjs 生成）

用法：先 `node scripts/route.mjs "<一句话>"` 拿 Top3，再只读命中的 SKILL.md 正文。
没命中不要硬套技能；用户点名技能以点名为准（点名的优先级高于任何打分）。

| 技能 | 关键词（前 4） | 宿主依赖 |
|---|---|---|
| agent-dispatch | 派子代理 / 子代理 / 并行干 / 拆分任务 | any |
| agent-review | 独立审查 / 两阶段审查 / 交叉审查 / 子代理审 | any |
| bigscreen-studio | 大屏 / 数据大屏 / 可视化大屏 / 运营中心 | playwright |
| cavecrew | cavecrew / cavecrew-investigator / cavecrew-builder / cavecrew-reviewer | subagent |
| caveman | caveman / 原始人 / 压缩回复 / 少废话 | any |
| caveman-commit | 提交 / commit / commit message / 拆分提交 | any |
| caveman-compress | 压缩记忆文件 / 压缩claude.md / 压缩清单 / 省输入token | any |
| caveman-explore | 探索代码库 / 仓库导览 / 定位在哪 / 跨文件 | any |
| caveman-help | caveman 帮助 / 命令卡 / 怎么用 caveman | any |
| caveman-review | 代码审查 / 过一遍代码 / 找问题清单 / review | any |
| caveman-stats | 统计 / 用了多少token / 会话统计 / stats | hooks |
| design-system-lead | 设计系统 / 组件库 / design token / 规范 | any |
| diagnose | 查问题 / 修bug / 报错 / 异常 | any |
| domain-modeling | - | any |
| finesse-brief | 工作台规格 / 需求写清楚 / 一句话变需求 / workbench | any |
| finesse-term | 术语 / 文案 / 命名 / 微文案 | any |
| finesse-ui | 落地页 / dashboard / 后台 / 界面 | playwright |
| frame-smith | 视频 / 宣传片 / 片头 / 动效视频 | any |
| goal-tracker | 长任务 / 续跑 / 断点 / 接着做 | any |
| grill-me | grill me / 对我说no / 残酷追问 | skill-tool |
| grilling | 拷问 / 压力测试想法 / 挑战方案 / 反问 | any |
| handoff | - | any |
| industrial-screen | 工业大屏 / scada / hmi / 上位机 | any |
| investigate-first | 先查清 / 原因不明 / 偶发 / 间歇 | any |
| lean-build | 做过头的风险 / 最小实现 / 先做能用 / lean | any |
| megacave | megacave / 文言文 / 古文 | any |
| migration | 迁移 / 升级依赖 / 改表 / 数据结构变更 | any |
| product-designer | 产品设计 / 原型 / 交互设计 / 设计稿 | any |
| product-manager | 需求 / prd / 排期 / 优先级 | any |
| product-strategist | 产品战略 / 市场分析 / 竞品 / 定位 | any |
| research | - | any |
| safe-refactor | 重构 / 整理代码 / 抽函数 / 解耦 | any |
| surgical-patch | 小改 / 改一处 / 最小改动 / 定点修复 | any |
| tdd | - | any |
| to-spec | - | any |
| to-tickets | - | any |
| token-guard | 省token / token 预算 / 上下文太长 / 载入太多 | any |
| ultracave | ultracave / 极限压缩 / 最省字 | any |
| ux-researcher | 用户研究 / 访谈 / 可用性测试 / 问卷 | any |
| verify-and-stop | 验收 / 完成了吗 / 是否真的完成 / 给我证据 | playwright |
