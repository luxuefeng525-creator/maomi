# Workbench Types — Eleven Structures, Not an Audience List

> **Classify by how it works, not by who it's for.** Audiences are infinite — 经期 / 增肌 / 考公 / 养宠 / 记账 / 摆摊 / CRM / ERP / 医疗 / 教育 / 工厂 / 电商 — so a list of them is a marketing sheet: it grows forever and tells you nothing about how to build the next one. **Structures are eleven.** The structure determines the hook shape, the first screen's dominant display, the data floor, the data-model skeleton, the retention mechanic, the revenue seam, and the specific way it dies. **Two workbenches from entirely different industries that share a structure share their engineering** — that is the whole return on classifying this way.

Pick the **primary** structure right after the Workbench Read is confirmed. Most real workbenches are **primary + one secondary**; the primary owns the hook and the first screen.

| | Structures |
|---|---|
| **个人域主导** | `cycle` · `ledger` · `state` · `runbook` · `care` |
| **跨域** | `feed` · `operation` |
| **系统域主导** | `pipeline` · `registry` · `console` · `monitor` |

The domain a structure *usually* lives in is a tendency, not a rule. 个人知识库 is `registry` with one user; 一家三餐台 is `care` with two. **Run SKILL.md §0.A's test (「一共有 N 个 X」) to set the domain, then pick the structure — in that order**, because the domain decides how many questions you're allowed and the structure decides what you build.

---

## Part I — 个人域主导

### 1. `cycle` — an external rhythm the system can compute

**Engine:** an anchor date plus a known period. The system always knows where you are in it.
**Hook:** `你在第 N 天/段 → 因此今天…` (state)
**Data floor:** one anchor date, entered once, occasionally corrected. **Cheapest floor of all seven** — this is the structure to reach for when input tolerance is low.
**Retention:** the phase changes on its own, so the hook is different tomorrow whether or not he does anything. Unusually forgiving.
**Review channel:** 周期年报 · 这一年的规律
**Seam:** phase-matched physical goods (暖宫贴, 红糖姜茶) — but see the pain rule in `monetization.md` §3.
**Dies by:** the anchor never gets entered, so N never exists and every screen degrades to generic advice. **Day one must be the anchor request and nothing else.**
**Examples:** 姨妈台 · 孕周台 · 上岸倒计时 · 疫苗驱虫周期

### 2. `ledger` — daily entries whose value is the accumulated curve

**Engine:** repeated small entries; the payoff is the shape over time, not any single row.
**Hook:** `今天 X / 目标 Y，差 Z` (delta)
**Data floor:** a daily user write. **The most expensive floor** — every design decision here is about lowering the per-entry cost (`hook-engineering.md` §3).
**Retention:** the curve itself, cashed out in a Review channel. **A ledger without a Review channel is a data-entry chore and will be abandoned by week three** — this is the structure the mix rule (`grammar.md` §4.A) exists to protect.
**Seam:** goods that serve the goal (补剂, 器材), or a paid plan that sets the target.
**Dies by:** **input debt.** A three-day gap makes the curve feel ruined and he stops rather than face it. Mandatory countermeasure: the no-backfill re-entry line (`hook-engineering.md` §5).
**Examples:** 增肌台 · 体重 · 记账 · 背单词 · 刷题

### 3. `state` — today's condition, no accumulation required

**Engine:** yesterday (or right now) converted into a readable verdict plus a consequence.
**Hook:** `昨晚/今天你是 X，所以 Y` (state → imperative)
**Data floor:** one recent reading — often derivable (wearable, phone screen time, weather) or a single tap.
**Retention:** the verdict changes daily on its own. **Works with near-zero input, which makes it the best structure for a low-tolerance user.**
**Seam:** relief and improvement products matched to the verdict (助眠音频会员, 白噪音).
**Dies by:** **the verdict is the same every day.** 「昨晚睡得一般」 for the fortieth time is not information. Countermeasure: make the *consequence* clause specific and actionable, and let the verdict carry a real number rather than an adjective.
**Examples:** 安睡台 · 情绪台 · 持仓体检 · 今日复盘

### 4. `runbook` — a prescribed sequence for today

**Engine:** a plan, generated or authored, that turns into today's list.
**Hook:** `今天这 N 件事` (imperative)
**Data floor:** the plan (once) plus a completion tap (daily, cheap).
**Retention:** progress through the plan, and the plan adapting to what he actually did.
**Seam:** the plan itself — the most honest paid thing in the category (付费训练计划, 备考规划).
**Dies by:** **the list is identical every day**, at which point an alarm would have done the job for free. Countermeasure: today's list must react to yesterday's completion — that reaction *is* the product.
**Examples:** 训练计划 · 睡眠仪式 · 每日刷题 · 学习路径

### 5. `care` — another being's state

**Engine:** the subject is not the user: a pet, a baby, a plant, a parent.
**Hook:** `它/他第 N 天 · 今天该…` (state + imperative)
**Data floor:** usually a birth/adoption date (free, one-time) plus light observations. **Logging someone else is materially easier than logging yourself** — less self-judgment, more affection — so input tolerance runs higher here than any other structure.
**Retention:** the subject visibly changes, and the emotional return is the highest in the category. 成长相册 is both a Review channel and the reason the whole thing gets recommended to friends.
**Seam:** goods for the subject (粮, 辅食, 用品) — reliably the least resented seam, because it's spending on someone he loves.
**Dies by:** **milestones only, no daily reason to open.** 疫苗/驱虫 fires four times a year; that's a calendar, not a workbench. Countermeasure: pair with a `ledger` secondary (体重曲线, 投喂记录) so there's a daily surface.
**Examples:** 毛孩子台 · 新手爸妈台 · 一家三餐台

#### 5.A The fork inside `care`: does the subject have a will of his own?

Everything above assumes a subject who **cannot object to being recorded** — a cat, a six-month-old, a plant. A huge share of real care workbenches have a subject who can: **a school-age child, a teenager, an aging parent.** 妈妈给孩子做的学习记录台 is one of the most common briefs in this whole category, and it is **not** a variant of the pet台 — several of its constraints are inverted.

| | Subject can't object (cat · infant · plant) | **Subject has a will** (school-age child · teen · parent) |
|---|---|---|
| Who acts | the user acts *on* the subject; she logs **her own** actions | the subject acts; she'd be logging **his** behavior |
| Input tolerance | high — logging someone else is easy | **low** — watching to log is surveillance, and it's exhausting for both |
| Readers | one | **two**, and the same sentence must work for both (`hook-engineering.md` §7) |
| Cadence | daily, comfortably | **usually weekly** — see below |
| Dies by | milestones only | **it becomes a supervision tool** (`day-two.md` D13) |

**Where the data comes from is the first design decision, and there are only three answers:**

1. **She watches and logs.** Highest fidelity, and it is surveillance. The input cost is brutal and the relationship cost is worse. **Almost never right**, and never the default.
2. **He logs it himself.** Then he is a second reader with his own reasons to open it — legitimate and in scope (SKILL.md §9), but the hook now has to be worth *his* while, not just hers. If he gets nothing from it, he stops, and the data floor collapses.
3. **Log outcomes, not process — weekly, not daily.** 一周读了几天 · 这周的一篇作文 · 这次测验. **This is the usual correct answer**, and it means dropping CADENCE to 3–5 and building a weekly workbench on purpose. **A weekly workbench she opens beats a daily one that made everyone miserable.**

**The rule that follows from all of it:** in this fork, the hook states **progress, not deficit**, and the record is **visible to the subject by default**. A sentence you would not read aloud to him is one you should not have written — and 「他今天又没背完」 is a sentence nobody reads aloud. Full detection and fix: `day-two.md` D13.

**Examples:** 陪孩子学习台 · 孩子成长记录 · 爸妈吃药提醒

---

## Part II — 跨域

These two work identically for one person and for forty. Only the scale of the data floor changes.

### 6. `feed` — external information selected and translated

**Engine:** an outside stream, filtered for him and rewritten in plain language.
**Hook:** `今天这 3 条 + 一句人话解读` (imperative)
**First screen:** a list, three to five items, each with its translation visible without a click.
**Data floor:** **the external source, not the user.** He feeds nothing — which sounds easy and is the trap: with no user data, *selection* is the entire product, and selection is hard. Writer is `integration` almost by definition, so §3.C's dependency rule applies at full force.
**Retention:** the world changes daily. Free cadence, expensive quality.
**Seam:** paid depth, courses, tools.
**Dies by:** **generic content he could get anywhere.** Without personalization there's no reason it's *his*台. Countermeasure: bind the feed to something he holds — his 持仓, his 行业, his 备考科目 — which quietly makes this a `feed + ledger` composite, and that's usually correct.
**Also:** never invent the content. This structure's material must come from a real source (SKILL.md §9).
**Examples:** 早八财经 · AI 工具速递 · 爆品情报 · 企业内的行业情报台

### 7. `operation` — money and stock moving

**Engine:** money in, money out, stock up, stock down.
**Hook:** `今日流水 X · 库存告警 Y · 今天建议 Z` (delta + imperative)
**First screen:** big figures, then what needs attention.
**Data floor:** money and quantity. **Non-negotiable input** — no entries, no workbench — so the DEPTH bar is correspondingly brutal.
**Retention:** money is its own motivation; the 月度账本 is a real artifact with real stakes.
**Seam:** supply, tools, a paid version. He's a business — willingness to pay is the highest of all eleven.
**Dies by (personal scale):** **the accounting costs more than a notebook.** Countermeasure: give back something a notebook cannot — 今天下雨，建议主推热饮 · 损耗提醒 · 竞品价格. **Advice, not just arithmetic**, is the entire justification for this structure.
**Dies by (system scale — ERP, 进销存, 电商后台):** **the stock number is wrong from week one and then nobody trusts any number on the page.** One unreconciled channel (a manual sale, a return, a sample) desyncs it permanently. Countermeasure: name the reconciliation moment in the spec (盘点 · 对账 · 日结) as an actual module, and make the hook show 「未对账 N 笔」 rather than pretending the total is true.
**Examples:** 摆摊台 · 小店台 · 进销存 · ERP · 电商后台

---

## Part III — 系统域主导

These four only appear once SKILL.md §0.A's test comes back **system**. All four need `subject`, `entities` and `pages` (`system-domain.md` §5) — without those, none of them is buildable.

### 8. `pipeline` — objects advancing through ordered stages

**Engine:** a set of objects, each sitting in exactly one of N ordered stages, that a human moves forward.
**Hook:** `N 个待推进 · M 个卡在 {stage} 超 K 天 · 今天先看这几个` (delta + imperative)
**First screen:** **a board, columns = stages.** Not a table. If the first screen of a pipeline workbench is a table with a 状态 column, the structure has been lost in translation and the page will look fine while doing nothing.
**Data floor:** `stage` (writer `user`, but cheap — one drag) + `last_activity_at` (**writer `system`**, written whenever any activity row is saved — `system-domain.md` §4.A move 1). **超期 is `derived` and free.** This is the cheapest high-value floor in the system domain and the reason `pipeline` workbenches succeed more often than `registry` ones.
**Retention:** things move. Something is always closer to done or newly stuck, so the hook is different tomorrow without anyone maintaining it.
**Review module:** 月度复盘 — 成了几个、卡在哪个阶段最多、平均停留多久. **A pipeline with no review module teaches nobody anything**, same failure as a ledger with no curve.
**Seam:** usually `none` (it's an internal tool). If it's the product: seats.
**Dies by:** **nobody moves the cards.** Every object sits in stage 1 forever, the board is a lie, and the 结论条 reports a fiction. Countermeasures, in order: make the stage change a side effect of an action he already takes (记一次跟进 → 询问是否推进), keep stages to **five or fewer**, and put 「多久没动」 on the card face so a stale board is visibly stale rather than quietly wrong.
**Entity skeleton:** `Thing(stage, owner, last_activity_at)` 1-n `Activity`
**Examples:** CRM 商机 · 订单履约 · 客服工单 · 招聘候选人 · 内容 从选题到发布 · 审批单 · 项目任务

### 9. `registry` — a searchable catalogue of objects

**Engine:** a body of objects worth keeping, findable later. CRUD plus detail plus search.
**Hook:** `新增 N 条 · M 条缺 {关键字段} · 最近改过的这几条` (state)
**First screen:** list or card wall with **search first**, and a default sort by *recency or incompleteness* — never by 创建时间倒序 for its own sake.
**Data floor:** the objects themselves, writer `user` or `integration` (an import). **The floor is the whole problem** — an empty registry is not a small version of a full one, it's a different and useless product.
**Retention:** **the weakest of all eleven, and this must be designed for explicitly.** A catalogue has no reason to be opened daily; it gets opened when someone needs something. Countermeasures: pair it with a `pipeline` or `feed` secondary that *does* have a daily reason, or make the hook point at maintenance work (「12 条缺标签」「8 条超过一年没更新」) which is a genuine daily reason for the person who owns the library.
**Review module:** 最近新增 · 最常被查的 · 该清理的
**Seam:** paid content, paid capacity, or `none`.
**Dies by:** **it starts empty and stays that way.** Day one must be an import path or a two-field create form, not a description of emptiness (`system-domain.md` §7.3). Second death: it becomes a place people only reach through search, at which point it isn't a workbench, it's a database with a skin — and the fix is the maintenance hook above.
**Entity skeleton:** `Thing(...)` n-n `Tag`, 1-n `Version`
**Examples:** 客户档案 · 商品库 · 知识库 · Skill 市场 · 素材库 · 学员档案 · 病历 · 个人知识库

### 10. `console` — a fleet of running things you can intervene in

**Engine:** N things that run on their own and occasionally need you. Start, stop, configure, retry.
**Hook:** `N 个在跑 · M 个失败（{最近那个} {时间}）· 消耗 X` (state + imperative)
**First screen:** **a fleet of cards or rows, sorted by "needs attention" first** — failures at the top, healthy below. Never alphabetical, never by creation date.
**Data floor:** **almost entirely `system`-written** — a run finishes, a row appears. This is the cheapest floor of the four system structures and the reason console workbenches feel effortless when the thing being managed actually exists. The trap is the inverse (§below).
**Retention:** things fail, and failures are interesting. The hook writes itself — **as long as something occasionally goes wrong.**
**Review module:** 运行记录 with filters, plus a weekly 成功率/耗时/花费 summary.
**Seam:** usage-based, or `none`.
**Dies by:** **the green wall.** When nothing ever fails, every open shows the same all-healthy screen and it stops being information — the `state` structure's disease, in a fleet. Countermeasure: the hook must surface *deltas and costs*, not just health — 「比上周慢了 40%」「本月花费已超预算 80%」 — so there's something to read on a good day. **Second death, and the more common one at definition time: the fleet doesn't exist yet.** A console for zero agents is an empty page; day one must be 建第一个 with a working two-field path.
**Entity skeleton:** `Thing(status, config)` 1-n `Run(status, started_at, finished_at, cost)`
**Examples:** AI Agent 控制台 · Workflow 编排台 · 定时任务 · 设备/服务运维 · 爬虫管理

### 11. `monitor` — metrics with anomalies, drillable to detail

**Engine:** numbers aggregated from somewhere else, with thresholds that decide what's wrong.
**Hook:** `今日 X / 目标 Y · 异常这 N 处 → {最严重那个}` (delta + imperative)
**First screen:** a few large figures, **then the anomaly list**, then trend. The anomaly list is not optional — it's what separates this from wallpaper.
**Data floor:** **`integration` almost entirely**, which makes this the structure most likely to be specced beautifully and ship blank. §3.C's dependency rule is doing more work here than anywhere else in the method: **name the source system and whether it exists today, for every figure.**
**Retention:** the numbers change. But see below — changing is not the same as mattering.
**Review module:** 周报/月报, and 「上次的异常后来怎么样了」 — the loop nobody builds and everybody wants.
**Seam:** `none`, almost always.
**Dies by:** **totals without anomalies — it becomes wallpaper.** A screen of accurate numbers that never says which one is wrong gets glanced at for a week and then ignored. Countermeasure: **every figure ships with a threshold or a comparison**, and the hook names the worst one by name. **Second death: no drilldown.** A number that raises a question the page can't answer sends the user back to the source system, and after three of those he stops coming. **L2 must be reachable from every figure on L1** — that's a structural requirement, not a nice-to-have.
**Entity skeleton:** `Metric(value, ts, dimension)` + `Threshold` + `Anomaly(metric, ts, severity, status)`
**Examples:** BI 看板 · 驾驶舱 · 工厂大屏 · 运维监控 · 运营数据台 · 持仓体检

---

## Composition — primary + secondary

Most real workbenches are two structures. The primary owns the hook and the first screen; the secondary contributes one or two channels/modules.

| Workbench | Primary | Secondary | Why |
|---|---|---|---|
| 增肌台 | ledger | runbook | the curve is the point; today's session is the plan |
| 毛孩子台 | care | ledger | 体重曲线 gives care a daily surface |
| 姨妈台 | cycle | state | the phase computes itself; 今日体感 adds today's texture |
| 上岸台 | cycle | ledger | countdown is free; 刷题量 is the accumulation |
| 早八财经台 | feed | state | the news + 持仓体检 makes it his |
| 安睡台 | state | runbook | last night's verdict + tonight's ritual |
| 摆摊台 | operation | feed | the books + 天气/爆品情报 turns arithmetic into advice |
| CRM | pipeline | registry | the board is the job; 客户档案 is what it runs on |
| AI Agent 控制台 | console | registry | the fleet is the job; 知识库/工具 is what it consumes |
| 智慧工厂 | monitor | console | the line's numbers, plus the ability to act on a device |
| 电商后台 | operation | pipeline | money and stock, plus 订单履约 moving through stages |
| 知识库 | registry | feed | the catalogue, rescued from having no daily reason by 最近更新 |
| 教务系统 | registry | pipeline | 学员档案, plus 作业批改/排课 that actually moves |
| 审批 / OA | pipeline | — | rare single-structure case: 待我审 is the entire product |

**Rules:**

- **The primary owns the hook and the first screen's shape.** A `pipeline` workbench whose home page is a table, or a `ledger` one with an imperative hook, has lost its structure in translation — and the page will look fine, which is why this check has to happen here.
- **Three structures means three workbenches.** Say so and make him pick one to build first (`discovery.md` §5). The merged version has no single hook and no single moment.
- **A weak structure is usually rescued by the right secondary, not by more modules.** `care` with no daily surface needs one ledger channel, not four Knowledge ones. `registry` with no daily reason needs a `feed` or `pipeline` secondary, not a better search box.
- **`registry` and `monitor` should almost never be alone.** Both have known retention holes — an empty catalogue, a wall of totals — and both are usually fixed by the secondary rather than by anything inside themselves.

---

## Choosing when it's ambiguous

Ask what would be lost if it disappeared for a month:

| Lost | Structure |
|---|---|
| 不知道自己在哪个阶段了 | **cycle** |
| 那条曲线断了 / 记录没了 | **ledger** |
| 不知道今天状态怎么样 | **state** |
| 不知道今天该干嘛 | **runbook** |
| 错过了消息 | **feed** |
| 它/他的成长没人记 | **care** |
| 账对不上 | **operation** |
| 不知道哪些卡住了、该推谁 | **pipeline** |
| 东西找不着了 | **registry** |
| 不知道昨晚哪个挂了 | **console** |
| 出事了没人第一时间知道 | **monitor** |

**Then check the input tolerance against the structure's floor.**

- **Personal domain:** a user with a documented abandonment story (`discovery.md` §2) plus a `ledger` primary is a known collision — lower the entry cost to one tap, or move the primary to `state`/`cycle` and keep the ledger as secondary.
- **System domain:** a `monitor` or `feed` primary whose figures all come from integrations that don't exist yet is the same collision in corporate clothes. Either the integration is real, or the number leaves the hook (`system-domain.md` §4.A). Deciding this here is free; discovering it on launch day is not.
