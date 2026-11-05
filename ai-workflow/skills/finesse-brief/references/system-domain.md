# The System Domain — 围着一个业务对象转的工作台

Load this for **Door S**, and for anything that passed SKILL.md §0.A's test: **能不能说出「一共有 N 个 X」**.

The personal track works because 「养宠物」 carries almost everything: one person, one moment, a known field set. **The system track can't be guessed the same way** — the word 「CRM」 covers a solo consultant's contact page and a forty-seat sales floor, and those are different products. So this track buys three facts with **at most two messages**, then asserts the whole spec.

**It buys three facts. Not five, not a discovery phase.** Everything else is a refinement to a spec he's already looking at, and it costs him three words there instead of a round here.

---

## 0. The two messages, literally — copy these

Everything after §0 is reasoning material. **It must not reach the user.** A model that reads this file end to end and hands back an organized summary of the system-domain method has produced a lecture, not an opening.

**Message one:**

```
两个问题就够了：

1. 这个台子主要围着什么转？（客户 · 订单 · 项目 · 设备 · Agent · 内容 · 学员 · 别的）
   ——就是那种你会说「一共有多少个」的东西。

2. 平时谁在用？就你自己 · 一个小组几个人 · 好几种岗位（比如销售和主管看的不一样）
```

**Message two:**

```
最后一个：每天在上面最常做的是哪两三件？
推进某个东西往下一步 · 看今天的数 · 录入或导入数据 · 审批 ·
处理异常和告警 · 配置调参 · 和 AI 对话
```

**Then the whole spec.** No third round, no 「还有几个细节想确认一下」.

### 0.A The three rules that keep this from becoming a form

1. **Already-known is never re-asked.** 「我想做个 CRM，我们十个销售」 has already answered 主对象 (客户) and 谁在用 (一个小组). **Ask question 3 alone, in one line**, and assert next turn. Re-asking what he just told you is the fastest way to look like a wizard he'll close.
2. **Merge whenever possible.** Two of three known → both remaining questions in one message → assert next turn. All three known or confidently inferable → **assert immediately, no questions at all.**
3. **Never ask a fourth.** 要不要手机上看 · 要不要导出 · 权限怎么分 · 用什么技术栈 — all of these are refinements. Put your best guess in the spec, mark it in one clause, and let him correct it against something concrete.

### 0.B Why exactly these three

| Question | What it actually buys | What goes wrong without it |
|---|---|---|
| **主对象** | The noun that derives the modules, the entities and the first screen (§2) | You build modules around *activities* instead of the object, and end up with 「数据管理」「报表中心」「系统设置」 — the three modules that mean nobody decided anything |
| **谁在用** | Whether `roles` is one line or four, and whether the primary module is the *doer's* screen or the *watcher's* (§3) | You build a manager's dashboard for a person whose actual job is entering orders — a page he opens once |
| **每天最常做** | Which module is `primary`, what shape its L1 is, and what the 结论条 points at | Every module weighs the same, every L1 is a table, and the top of the page is a stat strip instead of a hook (§7) |

Notice what is **not** on this list: 行业, 公司规模, 技术栈, 竞品, 预算. None of them change the spec, and each one costs a round.

---

## 1. The domain test, once more, because the fork is expensive

| Signal | Personal | System |
|---|---|---|
| 「一共有 N 个 X」 | only his own entries | **N customers / orders / agents / devices / students / articles** |
| Who writes the data | him | **partly a system, an integration, or another person** |
| Page depth | one screen per channel | **list → detail → sub-record** |
| The word he used | 我的 · 记 · 每天 | 管理 · 后台 · 系统 · 平台 · 控制台 |

**Borderline resolves toward system when there is a page tree.** 「个人知识库」 is `registry` — N 篇笔记, list, detail, search — even though one person owns it. 「摆摊工作台」 is personal — one person, one moment, his own entries, no depth — even though it's a business.

**Count the objects and count the levels. Not the users.** A two-person tool with no page depth is personal; a one-person tool with 800 objects and a detail page is system.

---

## 2. 主对象 — the noun that derives half the spec

> **Name the subject and the modules stop being a guess.**

Two CRMs, same word, different subject:

| | `subject: 客户` | `subject: 商机` |
|---|---|---|
| What it's for | 关系和历史 —— 这个人是谁，我们聊过什么 | 推进和成交 —— 这单走到哪了，卡在哪 |
| Structure | `registry` + `pipeline` | `pipeline` + `registry` |
| First screen | 最近联系过的 + 很久没联系的 | 看板：各阶段几个 + 卡住的 |
| 结论条 | 「38 个客户 · 12 个超过一个月没联系 · 今天有 3 个生日」 | 「本月 ¥86 万 / 目标 ¥120 万 · 7 个卡在报价超 10 天」 |
| Core entity | Customer (1-n Contact, 1-n Interaction) | Opportunity (n-1 Customer, 1-n Activity) |

**Same industry, same word, two products.** This is why the question is worth a round and 「你们是做什么行业的」 isn't.

### 2.A Deriving the modules from the subject

A module set is not brainstormed. It's read off the subject in five slots:

| Slot | Question | Example (subject = Agent) |
|---|---|---|
| **1. 总览** | What does someone need to know before touching anything? | 总览 — 在跑/失败/用量 |
| **2. 主对象本身** | Where do you list, create and configure the subject? — **this is almost always `primary`** | Agent |
| **3. 主对象的产物或历史** | What does the subject *produce*, one row per occurrence? | 运行记录 |
| **4. 主对象的原料** | What does the subject consume or depend on? | 知识库、工具、模型 |
| **5. 设置 / 配置** | The things set once — **and if this is the only place anything is configured, it isn't a module, it's a corner of one** | 设置 |

Then **add at most two** that the third question (每天最常做) demanded — 审批 if he approves things, 告警 if he handles exceptions, 对话 if he talks to an AI.

**5–9 modules. Under 5 and it's a page, not a workbench. Over 9 and it's a menu he stops reading.**

### 2.B The noun-module ban

「客户管理」「订单管理」「数据管理」「系统管理」 are not modules. **A noun plus 管理 is the absence of a decision** — it tells the builder nothing about what the screen contains or what happens on it.

**Every module's `does` contains a verb someone performs**, and the module name should too where the language allows it:

| Banned | Fixed |
|---|---|
| 客户管理 | **客户** — `does: 查客户、看聊过什么、记一次跟进` |
| 数据管理 | **导入导出** — `does: 从 Excel 导客户名单，导出本月成交` |
| 报表中心 | **月度复盘** — `does: 看这个月成了几单、卡在哪个阶段最多` |
| 系统管理 | **设置** — `does: 加人、改阶段名称、设提醒规则` |

---

## 3. Roles — a field, not a reason to refuse the job

The old version of this method treated 「有角色」 as out of scope. **That threw out most of the category.** Roles are now a spec field with three rules:

1. **At most four at definition time.** More than four means he's describing an org chart. **Ask which one opens it every day and build for that one first**; the others get a line each and their differences noted per module.
2. **Every role names what it *does*, not what it *is*.** 「主管」 is a title. 「主管：每周一早上看全组卡了多少单，给卡住的指派人」 is a screen.
3. **If two roles see the same screens, there is one role.** Write one. A spec with three identical roles is the permission hallucination (§7) and it produces a login page guarding nothing.

```yaml
roles:
  - { name: 销售,   opens_daily: true,  does: 推进自己手上的单、记跟进、加客户 }
  - { name: 销售主管, opens_daily: false, does: 周一看全组卡住的单，指派人 }
```

**`opens_daily: true` marks whose workbench this actually is.** The hook, the first screen and the `primary` module are all built for him. The other roles get their differences noted, and where the difference is only 「看得到别人的数据」, say exactly that — it's a filter, not a second product.

---

## 4. The four writers — the section that prevents the beautiful empty console

SKILL.md §3.C is the summary. This is why it's the most load-bearing part of the system track.

**In a personal workbench there is one writer and the risk is that he won't bother.** In a system workbench there are four, and the risk is different and worse: **everyone assumes some other party fills the field, and the answer turns out to be nobody.** The page ships, the tables render zero rows, and no one can point at the decision that caused it — because it was never made.

| Writer | Means | Real cost | Where it fails |
|---|---|---|---|
| `user` | a person types or clicks it | **the most expensive thing in a spec** | Three `user` fields per module across nine modules is a full-time data-entry job. **Count them and say the number.** |
| `system` | the workbench writes it as a side effect of something already happening — a run finishes → a Run row; a card is dragged → `stage` + `last_activity_at`; an order is paid → `paid_at` | free | Almost never fails. **This is the writer to design toward.** |
| `integration` | another system supplies it — 支付回调, 模型用量, 设备上报, ERP 同步, 一次性 Excel 导入 | **the field exists only if that integration is actually built** | The commonest lie in a system spec. 「从 ERP 同步过来」 with no API, no owner, no date. |
| `derived` | computed at read time — 超期 = now − last_activity_at > 7d; 缺口 = target − actual; 转化率 | free | As real as its inputs. Derived from an unbuilt integration is not free, it's fictional. |

### 4.A The two moves that save a system workbench

**Move 1 — turn `user` fields into `system` fields by attaching them to an action he already takes.** He isn't going to fill in 「最后联系时间」. He *is* going to write a 跟进记录 after the call. **So `last_activity_at` is written by the system when the 跟进记录 is saved** — and now 「12 个超过 7 天没动」 is real without anyone maintaining it. **Most good system hooks are built on exactly this trick.**

**Move 2 — declare unbuilt integrations, in the spec, as dependencies.** Not as a caveat in conversation — in the file:

```yaml
depends_on:
  - { field: 库存数量, source: 现有 ERP, exists_today: false,
      until_then: 手工录入，首页那条改成「库存待接入」而不是显示 0 }
```

**The rule: a number whose source doesn't exist yet does not go in the 结论条.** Put it in a module where an empty state is survivable. A hook that renders blank on launch day loses the user before anything else in the spec gets a chance to work.

---

## 5. Modules → pages → entities

This is the depth that separates a system spec from a wish list. **A module name is not a screen.** 「客户」 could be a table, a kanban, a map or a card wall.

### 5.A The three levels

| Level | Is | Must specify |
|---|---|---|
| **L1** | the module's own screen — list, board, or overview | **what shape it is** (表格 · 看板 · 卡片 · 曲线 · 时间轴), what filters exist, what actions sit on it |
| **L2** | one object, opened | what's shown about it, what can be done to it, what sub-records it lists |
| **L3** | one sub-record of that object | only if a genuine sub-record exists |

**Three levels are not a target.** A module with no real sub-record stops at L2, and inventing an L3 for symmetry is a blacklist item (§7). 设置 usually has only L1.

```yaml
- name: 商机
  type: today
  weight: primary
  does: 拖动阶段推进商机、记跟进、看谁卡住了
  pages:
    - { level: L1, shows: 看板，列 = 阶段，卡片 = 商机（客户名 · 金额 · 停留天数）,
        filters: [负责人, 金额区间, 是否超期], actions: [新建, 拖动改阶段] }
    - { level: L2, shows: 商机详情 + 关联客户 + 全部跟进记录时间轴,
        actions: [记一次跟进, 改金额/阶段, 标记赢单/丢单] }
    - { level: L3, shows: 单条跟进记录（时间 · 方式 · 内容 · 下一步）, actions: [编辑, 删除] }
```

**The `shows` clause is what stops nine modules becoming nine identical tables.** It costs one line and it is the difference between a spec and a table of contents.

### 5.B Entities — the data model that makes the hook real

Every entity: fields, **the writer of each field**, and relations.

```yaml
entities:
  - name: Opportunity
    fields: [id, customer_id, title, amount, stage, owner, last_activity_at, created_at, closed_at]
    written_by:
      title: user
      amount: user
      stage: user            # 拖动看板卡片时
      last_activity_at: system   # 保存一条跟进记录时自动写 —— §4.A move 1
      closed_at: system
    relations: [Opportunity n-1 Customer, Opportunity 1-n Activity]
```

**The test that makes this worth writing: point at every number in the 结论条 and find the field.** 「7 个卡在报价超 10 天」 = `count(stage='报价' AND now − last_activity_at > 10d)`. Both fields are above, both have writers, one is free. **If you can't trace a number to a field, the number comes out of the hook** — that's §3, applied to a database instead of a diary.

**Keep it to the entities the spec actually needs.** Four to eight. A twenty-entity model at definition time is a database design, and it's premature: the builder will extend it, and every entity you invent now is one he has to reconcile.

---

## 6. Category → structure — the map, kept internal

**Never show this table to a user.** It's a category menu (SKILL.md §0.B), and a menu returns its first row. It exists so that when he *says* 「CRM」 you already know what to assert.

| 品类 | 常见主对象 | 结构（主 + 副） | 模块骨架 | 结论条形状 | 最常见的失败 |
|---|---|---|---|---|---|
| **CRM / 销售管理** | 客户 或 商机 | pipeline + registry | 总览 · 商机 · 客户 · 跟进记录 · 月度复盘 · 设置 | 本月 X/目标 Y · N 个卡住超 K 天 | 没人拖卡片，所有单永远停在第一阶段 |
| **AI Agent 工作台** | Agent | console + registry | 总览 · Agent · 运行记录 · Workflow · 知识库 · 模型与用量 · 设置 | N 个在跑 · M 个失败 · 本月 ¥X | 全绿的墙，没有异常就没有信息 |
| **数据看板 / BI / 驾驶舱** | 指标 | monitor | 总览 · 各主题看板 · 异常 · 明细下钻 · 报表订阅 | 今日 X/目标 Y · 异常这 N 处 | 只有总数没有异常 → 壁纸；不能下钻 → 提出的问题自己答不了 |
| **智慧工厂 / IoT** | 设备 或 产线 | monitor + console | 总览大屏 · 设备 · 告警 · 工单 · 保养计划 · 报表 | 产量 X/计划 Y · N 处告警 · 3 号线停机 12 分钟 | 设备不上报，页面靠人填 → 数据永远是昨天的 |
| **ERP / 进销存** | 订单 或 SKU | operation + pipeline | 总览 · 订单 · 库存 · 采购 · 供应商 · 对账 · 设置 | 今日流水 X · N 个待发 · M 个 SKU 低于安全库存 | 库存数字从第一天起就不准，然后没人再信它 |
| **电商后台** | 订单 | operation + pipeline | 总览 · 订单 · 商品 · 库存 · 售后 · 营销 · 数据 | 今日 N 单 ¥X · M 个待发 · K 个待处理售后 | 商品和订单两个中心，谁都不是主对象 |
| **项目 / 任务管理** | 任务 | pipeline + registry | 总览 · 看板 · 我的 · 项目 · 成员 · 复盘 | 我今天 N 件 · 逾期 M 件 · 本周关掉 K 件 | 是别人的进度表不是他的今天 → 他不打开 |
| **内容创作中心** | 内容 | pipeline + registry | 总览 · 选题 · 草稿 · 待发 · 已发数据 · 素材库 | 待发 N 篇 · 昨天那篇 X 阅读 · 选题池剩 M 个 | 只做编辑器不做流转，写完就没下文了 |
| **知识库 / 素材库 / Skill 市场** | 文档 / Skill | registry + feed | 总览 · 全部 · 分类 · 最近 · 收藏 · 导入 | 新增 N 条 · M 条缺标签 · 最近改的这几条 | 空库，没有导入路径，第二天没理由打开 |
| **运营后台** | 活动 或 用户 | monitor + operation | 总览 · 活动 · 用户 · 内容 · 数据 · 配置 | 今日 DAU X（环比 Y）· 活动 N 个在跑 · 异常这处 | 变成一堆报表，没有一屏在说该干什么 |
| **教务 / 教育平台** | 学员 或 课程 | registry + pipeline | 总览 · 学员 · 课程 · 排课 · 作业批改 · 学情 | 今天 N 节课 · M 份作业待批 · K 个学员连续缺勤 | 围着课程转还是围着学员转没定，两套都做半套 |
| **医疗 / 诊所** | 患者 | registry + pipeline | 总览 · 患者 · 今日就诊 · 病历 · 随访 · 药品 | 今天 N 位 · M 个待随访 · K 个复查超期 | 内容实质靠模型编（SKILL.md §9 硬边界） |
| **金融 / 持仓** | 持仓 或 标的 | monitor + state | 总览 · 持仓 · 交易 · 观察池 · 复盘 | 今日 ±X% · N 个触发条件 · 集中度告警 | 只显示涨跌，不显示「所以该干什么」 |
| **客服 / 工单** | 工单 | pipeline | 总览 · 待处理 · 全部工单 · 客户 · 知识库 · 统计 | 待处理 N · 超时 M · 今天解决 K | SLA 靠人记，超时永远发现得太晚 |
| **HR / 招聘** | 候选人 | pipeline + registry | 总览 · 候选人 · 职位 · 面试安排 · 人才库 | 在流程 N 人 · M 个待安排面试 · K 个超 5 天没动 | 建成人事档案库，招聘的流转反而没有 |
| **审批 / OA** | 申请单 | pipeline | 待我审 · 我发起的 · 全部 · 规则配置 | 待我审 N 件 · 最久的等了 M 天 | 只有列表没有「待我审」→ 就是个查询系统 |

**Reading a row correctly:** the 结论条 column is the *shape*, and you must fill it with plausible real numbers before showing it (SKILL.md §0.C). The 最常见的失败 column is what you actively design against in that category — it's the row's most valuable cell.

---

## 7. The dead-console blacklist

SKILL.md §6.B is the checklist. This is the detection and the fix.

### 7.1 The demo-data lie
**Detect:** render the first screen against an empty database. If the 结论条 shows anything other than the cold-start line, the numbers came from your imagination.
**Fix:** trace every figure to a field with a writer (§5.B). Any figure that can't be traced comes out of the hook.

### 7.2 The list-page hellscape
**Detect:** read every module's L1 `shows`. If three or more say 表格, this is it.
**Fix:** the `primary` module's L1 is a **board, a triage list, a curve or a fleet of cards** — a shape that expresses the structure. Tables are for `registry` modules and secondary lookups, and even there, sort the default view by *what needs attention*, not by 创建时间倒序.

### 7.3 The empty back office
**Detect:** `cold_start.day_1` describes what the empty page looks like instead of naming an action.
**Fix:** day one names one concrete first action with a visible affordance — 导入一份 Excel 名单 · 建第一个 Agent · 录一个客户试试. **`registry` and `pipeline` workbenches live and die on this**; an empty catalogue has no second visit.

### 7.4 The noun module
**Detect:** any module name ending in 管理, or any `does` with no verb.
**Fix:** §2.B.

### 7.5 The permission hallucination
**Detect:** two roles, and no module where their `shows` or `actions` differ.
**Fix:** merge them into one role, or state the real difference (usually a data filter: 「只看自己的」). A login guarding nothing costs a build week and buys nothing.

### 7.6 The unbuilt integration
**Detect:** any `written_by: integration` whose source system isn't already running and reachable.
**Fix:** `depends_on` with `exists_today: false` and an `until_then` (§4.A move 2). Then move the number out of the hook.

### 7.7 The orphan module
**Detect:** a module with no relation to `subject`. 公司公告 in a CRM. 员工考勤 in a factory dashboard.
**Fix:** cut it, or recognize it as a second workbench and record it in `deferred`.

### 7.8 The symmetrical page tree
**Detect:** every module has exactly L1/L2/L3.
**Fix:** 设置 is L1 only. A module whose objects have no sub-records stops at L2. **Depth follows the data, not the layout.**

### 7.9 Roles as an org chart
**Detect:** five or more roles.
**Fix:** `opens_daily: true` on exactly one; build for him; the rest get a line each.

### 7.10 Everything is primary
**Detect:** no `weight` field, or all `primary`.
**Fix:** exactly one `primary` — the module the `opens_daily` role lands in. Two or three `regular`. The rest `occasional`.

---

## 8. One worked example, compressed

Input: 「我想做个 AI Agent 工作台」

**Message one** (§0), **message two** (§0), answers: 主对象 = Agent · 就我自己 · 每天最常做 = 看昨晚跑得怎么样 + 调提示词.

**What that answer set decides, before writing a line:**

- `structure: console + registry` (§6) → first screen is a fleet of cards, not a table
- 「看昨晚跑得怎么样」 is the moment → **上班坐下第一件事**, hook is reflective-plus-imperative
- 「调提示词」 → the L2 of the Agent module needs an editor and a 试运行 button, and 运行记录 must be reachable *from* the Agent, not only as its own module
- one role, `opens_daily: true` → no permissions, no login-as-a-type
- INPUT 2, DEPTH 7 → balance rule passes, and the whole workbench rests on `system`-written fields (§4)

**结论条:** `4 个在跑 · 1 个昨晚失败（数据同步 03:12）· 本月 ¥320 / 预算 ¥500`

- `4 个在跑` ← `Agent.status`, writer `system`
- `1 个昨晚失败` ← `Run.status` + `Run.finished_at`, writer `system` — free, because a run already writes a row
- `¥320` ← `Run.tokens × 单价`, writer `integration` (模型接口回传). **Exists today?** Yes if he's using an API that returns usage. If not → `depends_on`, and the figure leaves the hook until it does.
- `预算 ¥500` ← `settings.budget`, writer `user`, **once**

**Day one:** 「先建第一个 Agent —— 挑个模型、写句系统提示词就能跑，跑完这儿就有数了。」 An action, not a description (§7.3).

**Modules** (§2.A): 总览 · **Agent**(primary) · 运行记录 · Workflow · 知识库 · 模型与用量 · 设置 — seven, one primary, the fifth slot earned by 「调提示词」.

**Entities:** Agent (1-n Run), Run (n-1 Agent), Workflow (1-n Step), Document. Four. Enough.

**Seam:** `none` — it's his own tool (SKILL.md §7).

**What was NOT asked:** 用什么框架 · 要不要多租户 · 要不要移动端 · 支持哪些模型. All of them are refinements he'll answer in three words while looking at the spec.
