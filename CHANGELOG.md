# Changelog

## 3.3.1 (2026-11-05)

### Added
- `evals/heldout.json` 留出集（42 触发 + 11 定档）：**不参与调参**，衡量真实泛化。
- `eval.mjs` 触发判定支持 `accept`（多可接受命中），语义近义对不再为标签硬改触发词。
- `release.mjs` 新增「留出集 F1≥0.80」闸门，把真实泛化纳入发布门槛。

### Fixed
- **「起个数据看板的名字」误命中 bigscreen-studio**：`route.mjs` 的负向闸门（硬编码 NEG）补 `naming` 构式；「看板」不再是唯一信号。
- **路由有两套负向规则**：`triggers.json.__negative_intents` 与 `route.mjs` 硬编码 NEG 脱节，已在 `route.mjs` 收敛。
- **`内存泄漏` 被 24 词截断挤掉**：diagnose 关键词重排，`内存泄漏/leak` 提前。
- **定档漏判「重做/整个重做」为 L2**：`classify.mjs` 的 `big` 补「重做/推翻重来/整个…重做」。
- `catalog.json` 重建（触发词改动后未同步，会导致路由走旧词表）。

### Changed
- GitHub 分支保护 `enforce_admins` 由 false → **true**（管理员也不能绕过 CI 直推 main）。

### Honest note
- 留出集 F1=0.97（trigger 42 条 / tier 11 条）。仍有 2 条口语长句漏命中（「盘一下结构」「简洁点」），是**零 LLM 关键词路由的召回上限**，暂不强凑。真突破需给 route.mjs 加轻量语义（嵌入/同义词典），列下一步。

## 3.3.0 (2026-11-05)

### Added
- **Agent 编排四件套技能**：`agent-dispatch`（定人/派发）、`agent-review`（两阶段独立审查）、`goal-tracker`（断点账本）、`token-guard`（载入前算 token）。
- `scripts/agent.mjs`（零依赖、零 LLM、只读仓库）：`plan` / `contract` / `review` / `budget` / `guard` / `hooks` / `handoff` / `check`。
  - `plan`：按档位确定性定人（L0=0、L1=1 审查、L2=三段式），实测大屏任务出 3 个代理、问答出 0 个。
  - `contract`：生成结构化派工对象（task/scope/constraints/acceptance/output_schema/forbid），禁止整段父会话历史下传。
  - `guard`：PreToolUse 危险动作提醒（递归删除、强推、破坏性 SQL、明文密钥、管道执行远程脚本、吞输出）。
  - `hooks`：生成 Claude Code 四钩子配置（SessionStart/PreToolUse/PostToolUse/Stop）。
  - `handoff`：生成跨会话接力卡 HANDOFF.md（进度 + 下一步 + 未提交改动 + 坑）。
- `scripts/doctor.mjs`：环境与包完整性自检（node 版本 / 核心文件 / catalog 一致性 / frontmatter / 描述长度 / gitignore / 零依赖 / smoke），FAIL 即 exit 1。
- `references/agent-patterns.md`：对标 Claude Code、superpowers 与本包旧文献的采纳矩阵与「明确拒绝」清单。
- `references/routing.md` 技能全量索引：40/40 覆盖（原仅 18 个）。

### Fixed
- **catalog 描述带尾引号**（自首次压缩起存在）：构建正则把 YAML 收尾 `'` 吃进 desc，40 个技能持续浪费字符 —— 去引号 + 空白归一。
- **触发词被静默截断到 24 条**：`surgical-patch` 等超长技能尾部触发词永不生效 —— 重排优先级，关键构式留前 24。
- `checkpoint.mjs` / `memory.mjs` 新增 `--root`：子代理在别的 cwd 运行不再把账本写错地方。
- **`validate-skill.mjs` 误报包根引用**：`token-guard` 里写的 `references/dispatch-table.md`、`scripts/route.mjs` 指向**包根**而非技能目录，校验器只查技能目录 → 40/40 审计被一条假 FAIL 挡住。改为「先查技能目录，再回退包根」，且仅当包根确实有 `scripts/` 或 `SKILL.md` 时才回退（负向测试：故意引用不存在文件的技能仍 FAIL）。
- **`eval.mjs snapshot` 漏拷 `catalog.json`**：`route.mjs` 首选 `catalog.json`，快照里没有它就会退回只读 `SKILL.md`，丢掉触发词/syncs/negatives，同一份代码 `diff` 出 `ΔF1=-0.47` 的**假回归**。快照现一并复制 `catalog.json`，复测 `ΔF1=0`、GAIN 0 / LOSS 0。
- **`pack.mjs` 把工作产物打进分发件**：上版 zip 含 `.ai-workflow/`（会话账本）、`HANDOFF.md`、`eval-results/`，与 `.gitignore` 自相矛盾。现默认排除上述路径 + `.env*` + `*.zip`，新增 `--with-work` 供内部留档，并打印 `WORK_EXCLUDED=`。

- **`install.mjs` 漏拷 `catalog.json`，装到宿主的包路由近乎全灭**：`COPY` 列表没有 `catalog.json`，而 3.3.0 的触发词**只**存在于 `catalog.json`、40 个 `SKILL.md` 里已无「触发词」行 —— 回退路径读到空 `keywords`，`route.mjs` 只剩 desc 的 ≤2 分，`--min 5` 下多数查询直接 `ROUTE_NONE`。实测装到 `~/.claude/skills/` 后：「上下文快满了怎么拆任务」本应命中 `agent-dispatch`(7) → 返回 `ROUTE_NONE`；「重构支付回调，涉及多个文件，先派子代理」丢掉 `agent-dispatch`(13) 只剩 `cavecrew`(7)；大屏查询分数由 20 掉到 8。3.3.0 的分发件验证走的是「zip 解到临时目录」，zip 里 `catalog.json` 由 `pack.mjs` 带入，正好绕开 `install.mjs`，所以没暴露。现 `COPY` 补上 `catalog.json`；重装后 4/4 条路由与原仓库逐字一致。

### Changed
- **`release.mjs` 从 5 道闸加到 8 道**：新增「定档 acc」「环境自检 doctor」「泄漏检查」；`--zip <路径>` 可只验某个历史产物是否夹带工作产物。任一闸红即 `RELEASE BLOCKED`（负向测试：`--with-work` 造出的脏包被当场拦下，exit 1）。
- `MANUAL.md`：命令速查补 `doctor` / `release` / `agent` / `eval snapshot·diff`，并写明 `pack.mjs` 的排除规则与 `--with-work` 用途。
- `SKILL.md`：子代理章节改为「先 plan 再派」，钩子改为脚本生成，工具速查 +9 条，gotchas +3 条（触发词截断、catalog 引号、自述不算证据）。
- `.gitignore`：忽略 `.ai-workflow/`、`HANDOFF.md`、`eval-results/*`、`node_modules/`、`.env*`。

### Evals
- 触发 n=71：acc/P/R/F1 = 1.00；定档 n=16：16/16，混淆 0。
- **分发件回溯验证**：zip 解到干净临时目录后重跑 `doctor` / `audit-skills` / `trigger` / `tier`，全部通过（254 文件，零依赖，不需网络）。
- `doctor` 8 pass / 0 warn / 0 fail；`eval snapshot` + `diff` 零回归。
- **安装路径回归（补）**：`install.mjs --global --host claude` 装到用户级后，装目录 `doctor` 8 pass / 0 fail，4 条查询与原仓库路由逐字比对一致 —— 分发件验证只覆盖 zip，不覆盖 install，本次已补。
- 提醒：本轮 6 条新用例为「先修后测」，存在解题痕迹，真实泛化估计 0.9 左右，出包前应补一批未参与调参的留出句。

## 3.2.7 (2026-11-05)

### Added
- `scripts/audit-skills.mjs`：发布前全量技能审计（36/36 PASS 才放行）。
- `scripts/sync-hosts.mjs`：安全同步宿主——默认 **dry-run**，`--apply` 才写，`--backup` 备份，`--skip` 保护定制技能（修复「整目录覆盖冲掉 bigscreen 引擎候选逻辑」的隐患）。
- `scripts/release.mjs`：发布前一键过闸（版本 / CHANGELOG / 技能审计 / F1 / 打包），**不做外部 push**。

### Changed
- `SKILL.md`：收尾环加「发布前 `release.mjs --pack`」；工具速查新增三项；gotchas 增「同步先 dry-run、别手工多步发布」。

## 3.2.6 (2026-11-05)

### Fixed
- **全部 36 个技能通过规范校验（36/36）**：
  - `validate-skill.mjs` 修正 YAML 解析：支持 `description: >` 折叠块与单双引号；引用检查跳过通配（`references/*.md`）和占位符（`<id>.*`）。
  - 4 个技能 `description` 超 1024 字符 → 精简（finesse-ui 732 / finesse-brief 472 / finesse-term 105 / frame-smith 304），保留关键触发词。
  - 3 个技能正文超 500 行 → 按渐进披露移出章节：design-system-lead 453、finesse-ui 496、finesse-brief 481。
  - 5 个技能指向不存在的 `references/*.md` → 删除悬空「Reference Materials」附录；design-system-lead 同时生成 `references/component_patterns.md`。
  - bigscreen-studio 的 `assets/vendor/d3.min.js` 改为「引擎自带」表述（包内不含大资源，不再误报缺文件）。

## 3.2.5 (2026-11-05)

### Fixed
- **UI 技能不被自动调用**：`L1≤1 / L2≤2` 的技能预算被过程技能（`grilling`、`product-designer`）吃满，链路末尾的产出技能 `finesse-ui` 永远轮不到。现明确：**预算只限「过程技能」；`finesse-ui` / `bigscreen-studio` / `industrial-screen` / `frame-smith` 属「产出技能」，必载、不占预算**。同步更新 `references/routing.md` 与 `SKILL.md` gotchas。

## 3.2.4 (2026-11-05)

### Added
- `examples/e2e.order.example.json`：登录 → 立即购买 → 确认页 → 提交（下单）的脱敏模板。
- `examples/README.md` 补充下单段落：**先建单后支付**、支付 503 ≠ 下单失败、必须用订单接口核验、测试单要取消清理。

## 3.2.3 (2026-11-05)

### Fixed
- `install.sh` 补齐 `MANUAL.md`、`CHANGELOG.md`、`examples/`，与 `install.mjs` 对齐；补上漏掉的 `.trae-cn/skills`（国内 Trae）目标。
- `install.mjs` 复制清单补 `CHANGELOG.md`、`examples/`。

### Added
- `examples/e2e.login.example.json`：脱敏的 uni-app H5 登录 E2E 模板（占位符，不含真实账号）。
- `examples/README.md`：用法 + uni-app E2E 踩坑（history 路由、placeholder 非 input 属性、token 断言、下单需确认）。
- `references/routing.md` 新增「UI 真实交互 / E2E」「长任务 / 超时」两条路由，使能力可被自动指向。

## 3.2.2 (2026-11-05)

### Added
- `browser.mjs` 新增 `{"assertEval":["表达式","期望"]}` 步骤：把页面内求值结果作为断言（如登录后 `!!localStorage.ws_token`、购物车含商品 id），让 E2E 的成败可被脚本判定而非肉眼判断。

### Verified
- 真实项目实测（桶装水 H5 `localhost:5190`）：登录（13800138000）+ 加购（商品 26）全链路通过，`ok:true`，0 控制台报错。注意 uni-app H5 的 placeholder 不是 input 属性、路由是 history 模式，选择器用 `input[type=number]` / `input[type=password]`，路由不带 `#`。

## 3.2.1 (2026-11-05)

### Fixed
- `browser.mjs` 依赖解析：技能装在全局/独立目录时，`import('playwright')` 找不到项目自己的 `node_modules`。改为用 `createRequire` 从 `--module-dir` / 当前目录 / `app` / `server` 依次解析，再动态导入。
- `browser.mjs` 新增 `--channel chromium|msedge|chrome`；默认 chromium 启动失败时自动回退系统 Edge/Chrome，避免「有依赖但没浏览器二进制」直接失败。
- 已实测：对 `http://localhost:5190` 真实打开页面（标题「猫咪集市」）、控制台 0 报错、截图成功。

## 3.2.0 (2026-11-05)

### Added
- `scripts/browser.mjs`：真正的浏览器控制（导航/点击/填表/按键/等待/断言文本·可见性·URL/截图），多步 E2E；单步与总超时；缺 `playwright/puppeteer` 时返回 `NO_BROWSER_DEP` 并优雅退出，不阻塞主流程。补上「只有截图、没有交互控制」的缺口。
- `scripts/checkpoint.mjs`：长任务断点账本（start/done/status/resume/note/reset，`.ai-workflow/checkpoint.json`），任务超时/中断后可续跑，不丢进度。
- `references/browser.md`：浏览器控制协议（步骤 DSL、超时、降级、安全红线）。
- `references/long-tasks.md`：长任务与超时策略（检查点、后台+轮询、有限重试、拆分、HANDOFF）。

### Changed
- `SKILL.md` 收尾环：UI 先 `verify-visual` 截图，再 `browser.mjs` 跑关键路径 E2E。
- `references/workflow.md`：验收环加 E2E 要求；实现环加检查点提示。
- 质量闸门矩阵维持不变：这两项是**加验收能力**，不是放松闸门。

## 3.1.1 (2026-11-05)

### Added
- `context.mjs` 新增 `--focus <关键词>`：只列「路径或顶层符号」命中关键词的文件，大仓库定向查看更省上下文；无匹配时给出提示而非空输出。

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
