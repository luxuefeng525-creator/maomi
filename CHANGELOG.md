# Changelog

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
