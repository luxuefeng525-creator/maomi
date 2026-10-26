# 兼容性

## 已验证

| 环境 | 路径 | 验证方式 | 日期 |
| --- | --- | --- | --- |
| Trae（Windows） | `~/.trae-cn/skills`、`~/.trae-cn/agents` | 本机安装后技能进入列表 | 2026-10-26 |

## 约定适配

| 环境 | 做法 | 风险 |
| --- | --- | --- |
| 任意读取 `AGENTS.md` 的 Agent（Codex、Cursor 等） | 把 `AGENTS.md` 放到仓库根，技能目录放 `.agent/skills`，由 Agent 自行读取 | Agent 不一定会按需加载技能，需要提示词显式点名 |
| Claude Code | 把 `skills/*` 复制到 `~/.claude/skills` | 未在本机验证 |
| 其他 IDE | 按 Agent Skills 规范：目录名即技能名，`SKILL.md` frontmatter 只放 `name` / `description` | 工具名、子代理能力可能不同 |

## 不支持的形态

- 需要常驻服务的记忆后端（本项目刻意不做）。
- 需要自动安装插件的流程（被规则拒绝）。
- 依赖特定框架的视觉组件库（技能只给判定标准，不给组件）。

## 工具差异处理

技能正文不写死工具名。子代理章节只说三类角色（只读、实现、浏览器），由宿主自行映射。Agent 人格文件里的 `tools` 字段是宿主格式，换工具时按宿主语法调整，不影响技能。

## 升级

1. 拉取新版本，跑 `node tests/run.mjs`。
2. `node scripts/install.mjs --target <目标> --force` 覆盖技能。
3. 记忆目录不动：`.agent-memory` 是数据，不是代码。
