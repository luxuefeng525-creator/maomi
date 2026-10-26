# PLAN · 合并 ai-workflow 的 34 个子技能进本包

日期：2026-10-27 · 档位：L2 · 状态：执行中

## 1 目标

让「装 `maomi` 一次」= 拥有完整技能集，不再依赖另行安装 `ai-workflow` 包。

现状：本包自带 6 个技能；另 34 个（`grilling` / `diagnose` / `finesse-*` / `caveman-*` / 产品五件套 / 纪律 6 件）在
`~/.trae-cn/skills/ai-workflow/skills/` 单独存在。用户装本包后看到的 40 个技能里，34 个不属于本包，
自更新只覆盖 6 个，另外 34 个会漂移。

## 2 边界

- 只搬技能目录，不改技能正文（除必要的路径歧义修正，逐条记录）。
- 不搬 `ai-workflow` 本体（`SKILL.md` / `WORKFLOW.md` / `RULES.md` / `INSTALL.md`）。
  原因：本包已有 `rules/agent-rules.md` 作为规则单一来源，再引入一套会形成第二口径（此前已踩过）。
- 不搬 `.agent-install.json`、不搬任何凭据。
- 上游 `~/.trae-cn/skills/ai-workflow/` 保持原样，不动（避免破坏已装的其他工具链）。

## 3 实测约束

| 项 | 实测 |
| --- | --- |
| 技能目录数 | 34 |
| 文件数 | 153 |
| 总体积 | 1.99 MB |
| SKILL.md 超 8KB | **10 个**（`finesse-ui` 77KB / `finesse-brief` 70.3KB / `frame-smith` 32.2KB / `design-system-lead` 12.8KB / `product-designer` 12.4KB / `finesse-term` 12.2KB / `caveman-learn` 11.1KB / `product-strategist` 11.1KB / `caveman-setup` 10.3KB / `ux-researcher` 9.2KB） |
| `index-skills.mjs` 阈值 | 硬编码 `bytes > 8192` → 生成 warning；`--check` 据此 exit 1 |

## 4 取舍：8KB 阈值怎么处理

8KB 的原始意图是「SKILL.md 只放元数据与路由，正文按需读 references」。但这 10 个技能是既有资产，
正文就在 SKILL.md 里，拆 references 属于重写技能，超出本次范围。

**决定：分级，而非一刀切**

| 档 | 条件 | 行为 |
| --- | --- | --- |
| notice | 8KB < size ≤ 128KB | 提示「建议拆 references」，**不计入失败** |
| warning | > 128KB | 计入失败，需人工确认 |
| 其余 | 缺 frontmatter / name 与目录不一致 / 描述过短 / 重名 / 重触发词 | 仍为失败（结构性错误） |

理由：体积是性能取舍，不是正确性错误；把它当 fail 会让 40 技能包永远红。
保留 128KB 上限，防止真异常膨胀。

## 5 影响面

| 文件 | 变更 |
| --- | --- |
| `skills/<34 个目录>` | 新增（152 文件） |
| `skills/registry.json` | 重生成，6 → 40 条 |
| `scripts/index-skills.mjs` | 体积阈值分级 + 新增 `--max-bytes`（默认 128KB） |
| `README.md` | 技能表从 6 行扩到分组说明（6 自有 + 34 内置） |
| `package.json` | 版本 → 0.21.0（新增 34 技能属功能级变更） |
| `CHANGELOG.md` | 记录合并与阈值变更 |
| `tests/run.mjs` | 新增断言：技能总数 = 40、体积分级不导致 fail |

## 6 验收标准（可测）

1. `node scripts/validate.mjs` → `FAIL=0`
2. `node scripts/index-skills.mjs --check` → `skills=40`，且超 8KB 的 10 个为 notice 不导致 exit 1
3. `node tests/run.mjs` → 全 PASS
4. 40 个技能目录的 `SKILL.md` 全部存在，`name` 与目录名一致
5. 安装到项目级后 `.trae/skills` 有 40 个技能目录，`.agent-install.json` 的 `skills` 记录 40 条
6. 全局安装后 `~/.trae-cn/skills` 本包 owned 计数从 5 升到 39（`code-review` 为异源保留，不计入）
7. GitHub 本地 HEAD = 远端 HEAD，零差异

## 7 回滚

复制是纯新增，无覆盖。回滚 = `git revert` 或删除 34 个目录 + 重生成 registry。
源目录 `~/.trae-cn/skills/ai-workflow/skills/` 全程只读，不受影响。
