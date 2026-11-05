# Changelog

## 3.1.0 (2026-11-05)

对标 Anthropic Agent Skills 最佳实践、Claude Code 子代理、Aider/Cursor 上下文工程，做一次系统性升级。核心原则：**速度只砍仪式，质量闸门一个不砍**。

### Added
- `scripts/context.mjs`：仓库地图（文件 + 顶层符号，有界输出），替代整份读文件；对标 Aider repo-map / Cursor 索引的轻量替代。
- `scripts/validate-skill.mjs`：技能自校验（frontmatter/命名/描述长度/正文行数/引用路径），作者自检用。
- `references/context.md`：上下文工程协议（先地图后定点读、预算纪律、与子代理配合）。
- `references/hooks.md`：钩子接入（SessionStart / PreToolUse / PostToolUse / Stop）示例与红线。
- `SKILL.md` 新增「速度 ≠ 降质量」：可砍仪式 vs 不可砍质量闸门 + 按档质量矩阵。
- `SKILL.md` 新增 gotchas 段（zip 前缀 / 安装器假成功 / porcelain 首行 trim / --no-deps / 跨工具 /tmp / 中文路径）。
- `references/parallel.md` 新增「何时不要用子代理」与「结构化上下文传递（task/scope/constraints/acceptance/output_schema）」。

### Changed
- `SKILL.md` 重写为「给强模型的纪律骨架」：去掉手把手式说教，突出不变式、闸门、gotchas、输出形状；正文仍 <500 行、<8KB。
- `references/workflow.md`：验收环新增「L1 多文件 / L2 先派只读子代理独立审 diff（两阶段）」；验证按档位比例。
- 子代理审查改为**全新只读子代理**（不看实现过程，专挑漏洞），对标 Claude Code「独立审查」。

### Fixed
- 此前「提速」会把验证一起砍掉的风险：现明确「确定性检查/先证后言/独立审查/不可逆才停」为每档必过闸门。

## 3.0.0
- 首个自包含、可独立安装的跨平台技能包：六步、定档 L0/L1/L2、渐进披露、8 环交付、三处必停、记忆、eval、原子提交、并行拆解、大屏技能。
