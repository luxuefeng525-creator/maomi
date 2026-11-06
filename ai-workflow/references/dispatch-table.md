# 派发表（自动生成，勿手改 · 由 scripts/build-catalog.mjs 生成）

用法：先 `node scripts/route.mjs "<一句话>"` 拿 Top3，命中就只读那些 SKILL.md 正文。

**route 沉默 ≠ 没有技能**：触发词只覆盖调过的那批说法（口语换说法的实测覆盖约 4 成）。
沉默时**通读第二列**判语义（整列读完约 3KB，比逐个读 40 个 description 便宜一个数量级）；选中后只读那一个 SKILL.md。
本表也没有对得上的，才走通用纪律。
用户点名技能以点名为准（点名的优先级高于任何打分）。

| 技能 | 什么时候用 | 宿主依赖 |
|---|---|---|
| agent-dispatch | 拆活派子代理。用于 任务跨多文件/多模块、需要并行调研、或上下文要爆时：先定档再决定派几个、谁只读谁写、怎么收口 | any |
| agent-review | 独立审查改完的活。用于 提交前/宣称完成前：全新只读子代理两阶段（规格合规 → 代码质量），每条约给 path:line 证据 | any |
| bigscreen-studio | 生成通用/商业数据大屏（看板、3D 数字孪生，以看数据为主，无设备控制）。用于 数据大屏、运营中心、指挥中心、智慧园区/港口/政务大屏、复刻某大屏 | playwright |
| cavecrew | 何时把活派给子代理 cavecrew-investigator/builder/reviewer，而不是自己干；其输出压缩，主上下文更耐用。 | subagent |
| caveman | 极简腔：结论先行、去掉客套、技术事实不丢。用于 /caveman、简短点、省 token | any |
| caveman-commit | 写只保留意图的 Conventional Commits 提交信息。用于 写提交信息、/commit | any |
| caveman-compress | 把 CLAUDE.md、todo 等记忆文件压成 caveman 格式省输入 token，保留可读备份。 | any |
| caveman-explore | 只读仓库探索：冷启动定位、跨文件搜索、直接搜不到时用。已点名文件或符号就别用。只回 path:line。 | any |
| caveman-help | 三个 caveman 技能与命令的速查卡。 | any |
| caveman-review | 压缩式代码审查：一条一行，含位置、问题、改法。用于 审 PR、审 diff | any |
| caveman-stats | 当前会话的输出与缓存读取 token 用量及模式归属，或定位宿主原生用量报告。 | hooks |
| design-system-lead | 设计系统：组件库、design token、文档、设计与研发协作。用于 建组件库、定 token、统一视觉规范 | any |
| diagnose | 硬 bug 与性能回归的诊断环：复现、最小化、假设、埋点、修复、回归测试。用于 报错、崩溃、白屏、卡死、滑不动、说不清原因的性能问题 | any |
| domain-modeling | 用领域语言磨接口：深模块、信息隐藏、错误要显式。用于 接口设计、模块怎么切、起名字统一、术语表、设计 API、这个类该放什么 | any |
| finesse-brief | 把一句模糊需求变成可直接开工的工作台规格（先定规格再动手），区分个人工作台与系统工作台，锁定结构、数据底座、节奏与交接。用于 工作台、打卡页、记录页、设置页、发布流，或开工前先出规格 | any |
| finesse-term | 界面说法层：把说不准的界面描述换成能直接发给 Agent 的准确需求，统一术语、命名与微文案。用于 文案、术语、命名、需求转写、按钮与提示语打磨 | any |
| finesse-ui | 高质感 Web 与移动界面，拒绝廉价感。用于 落地页、官网、后台、dashboard、工作台、H5、活动页、电商 PDP/结算，要求高级感或炫酷动效 | playwright |
| frame-smith | 用 Remotion 做动效宣传片：电影感片头、产品与发布视频、社交短剪。用于 视频、片头、宣传片、动画、开场、产品视频 | any |
| goal-tracker | 长任务不丢进度。用于 跨多轮/多会话的目标：拆步骤落账本、每步留 note、中断后 resume、卡住两轮就停手报告 | any |
| grill-me | 别名技能：对方案做不客气的逐个追问，仅在用户点名 grill-me 时使用；泛需求走 grilling。 | skill-tool |
| grilling | 对方案、决策、想法做高强度追问，压出漏洞。用于 拷问、追问、挑战方案、质疑、理清思路 | any |
| handoff | 把当前会话压缩成交接文档，让新的代理或下一轮会话能原样接手。用于 交接、换个会话继续、上下文要满了、存档这次进展、写交接单 | any |
| industrial-screen | 工业监控大屏与 SCADA/HMI，核心是控制与操作防误（SBO 两步确认、联锁闭锁、ISA-101 灰度）。用于 工业大屏、上位机、就地控制屏、水务/化工/能源监控 | any |
| investigate-first | 编辑前先查清原因不明的失败。用于 原因不明、偶发、间歇、性能回归、需要证据排序假设的排查 | any |
| lean-build | 防止过度扩张的功能实现：先复用仓库现有、严格范围、明确停手条件。用于 新行为、产品切片、第三方集成 | any |
| megacave | 文言文腔的 Caveman：更少字符，术语照原样。仅用 /megacave 或 /caveman wenyan 调用。 | any |
| migration | 可回滚、兼容优先的迁移实施。用于 表结构、数据、API、协议、配置、依赖升级，需回滚方案与不丢数据证明 | any |
| product-designer | 产品设计：UI/UX、原型、设计系统、设计思维。用于 交互稿、原型、设计评审 | any |
| product-manager | 产品管理：路线图、需求优先级、干系人。用于 PRD、需求文档、排期与取舍 | any |
| product-strategist | 产品战略：市场分析、竞争定位、上市路径、增长。用于 要不要做、产品与技术选型、演进路线、遗留系统走向 | any |
| research | 对一个问题做高可信来源调研，把结论落成带出处的一页。用于 调研、查资料、对比事实、核实说法、找权威来源、摸清某个领域现状 | any |
| safe-refactor | 行为不变的结构调整。用于 抽取、合并、换归属、清理、合并分支与解冲突，结构改动前后都要验证 | any |
| surgical-patch | 在最窄责任层修 bug 与小改动。用于 加一个按钮、样式错位、单点修复，需回归证明且周边行为不变 | any |
| tdd | 测试驱动开发：红→绿→重构的垂直切片循环。用于 从零写新功能、先写测试、TDD、红绿重构、补单元测试、要集成测试，以及"先证明它能失败再让它通过" | any |
| to-spec | 把当前讨论综合成一份规格（不访谈），并发布到规格库。用于 整理成规格、写成 PRD、定下来写成文档、把刚才聊的落成需求文档、需求规格化 | any |
| to-tickets | 把计划/规格拆成一张张曳光弹工单，每张声明拦它的前置工单。用于 拆任务、拆工单、拆成可执行项、排依赖、开工前分工 | any |
| token-guard | 载入前先算 token。用于 长会话/大仓库/要爆上下文时：估开销、分段读、用派发表取代扫描述、压输出 | any |
| ultracave | 最高压缩的 Caveman：碎片化，一词够用就一词，每个事实只说一次。仅用 /ultracave 调用。 | any |
| ux-researcher | 用户研究：方法选择、可用性测试、数据综述、研究运营。用于 用户访谈、可用性测试、调研设计 | any |
| verify-and-stop | 只证明现有工作满足验收，绝不扩范围。用于 验收、完成度检查、闸门跑测、补测试与最后一步证据 | playwright |
