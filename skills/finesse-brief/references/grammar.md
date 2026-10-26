# Workbench Grammar — The Five Parts and the Channel Mix

How a workbench is actually assembled. Every workbench in this category — 姨妈台, 增肌台, 毛孩子台, 摆摊台, CRM, Agent 控制台, 工厂看板 — is the same five parts with different values. **The parts and their order are identical in both domains**; what changes is what fills part 1 (a person, or a `subject`) and how deep part 4 goes (a channel, or a module with a page tree).

---

## 1. The five parts, in build order

| # | Part | Answers | Fails as |
|---|---|---|---|
| 1 | **Identity** | 这是谁的台子？围着什么转？ | a "系统" for nobody |
| 2 | **Hook** | 打开它跟我说什么？ | a fortune cookie / a stat strip |
| 3 | **Data floor** | 这句话凭什么成立？ | a hook nothing produces |
| 4 | **Channels / Modules** | 我还能干什么？ | a features menu / nine identical tables |
| 5 | **Revenue seam** | 它靠什么活？ | a pasted-on shop tab |

> **The order is the method.** The instinct is to start at 4 — channels are concrete and fun to list. Do that and you will produce a rail, then write a hook that "covers" it. A hook written to cover a rail is generic by construction, because its job was breadth rather than truth. **Write the opening line first. The rail is then simply whatever must exist for that line to keep working.**

---

## 2. Identity — put a person, a named object, or a subject in the title

### 2.A Personal — a name fixes the scope

「小暖的姨妈工作台」 beats 「经期健康管理系统」, and not for warmth.

**A named owner fixes the scope.** 小暖 has one body, one cycle, one partner who needs briefing. Every definition question has a single correct answer. A 「系统」 has *users* — so it needs roles, then settings, then a settings page, then an onboarding flow — and within ten minutes you're defining a product for nobody. **The name is the cheapest scope defense available; use it.**

Three legal identity shapes:

| Shape | Example | Use when |
|---|---|---|
| **Person's** | 小暖的姨妈工作台 · 阿力的增肌工作台 | the subject is the user himself |
| **Object's** | 毛孩子工作台 · 一家三餐工作台 | the subject is a being or a household he tends |
| **Situational** | 上岸工作台 · 独居工作台 | the subject is a phase of life with a natural end |

Banned **in the personal domain**: 「XX 管理系统」, 「XX 助手 Pro」, 「智能 XX 平台」. All three announce a multi-user product and drag the definition with them.

**Situational names carry a built-in expiry — treat that as a feature.** 上岸工作台 ends on exam day. Design the ending: the last screen should be a Review artifact (一份三个月的复盘), not a page that silently stops being relevant. A workbench that ends well is more likely to be recommended than one that just goes quiet.

### 2.B System — `subject` does the job the name used to do

A system workbench legitimately has several users, so a personal name can't fix its scope. **The `subject` does** — the one noun everything on the page revolves around, and the thing you can say 「一共有多少个」 about.

**Name the subject and the modules derive themselves** (`system-domain.md` §2.A). Fail to name it and you get 「数据管理 · 报表中心 · 系统设置」, the three modules that mean nobody decided anything.

| Instead of | Name the subject |
|---|---|
| 「销售管理系统」 | 围着**商机**转 → 看板是主屏，客户是它的档案 |
| 「销售管理系统」 | 围着**客户**转 → 档案是主屏，商机是他身上挂的一条线 |
| 「工厂管理平台」 | 围着**设备**转 → 告警和保养；围着**产线**转 → 产量和停机 |

**The same title, two subjects, two different products.** That's why the subject question is worth a round and 「你们是什么行业」 isn't.

**Titles here may be plain.** 「销售工作台」「Agent 控制台」 are fine — they're what people will call it anyway. What is *not* fine is letting the plain title stand in for the missing subject: the title goes in `name`, the noun goes in `subject`, and only the second one is load-bearing.

---

## 3. The daily hook

Full engineering: `hook-engineering.md`. The grammar-level rules:

- **One sentence, one screen, before anything else.** Not a paragraph, not three cards.
- **It must contain at least one value that changes.** No variable → banned (`hook-engineering.md` §2).
- **Its tense follows the moment.** Morning → imperative (今天该练推). Evening → reflective (昨晚你睡了 5h20m). Getting this backwards makes an otherwise correct hook feel wrong for reasons the user can't name.
- **It may carry a second clause, never a third.** `今天推日 6 组 · 蛋白缺口 42g` works. Adding `· 体重 -0.3kg · 该补剂了` turns a hook into a dashboard and nothing is read.

---

## 4. Channels — six types, and the mix is what matters

This is the part that separates a workbench from a table of contents. **Every channel is one of six types**, and the *mix* — not the list — decides whether the thing is alive.

| Type | What it does | Examples | Input? | Cap |
|---|---|---|---|---|
| **Today** | the hook's landing page — today's plan/state in full | 今日训练 · 今日菜单 · 今日刷题 | reads | **exactly 1** |
| **Record** | he writes into it; the data floor lives here | 喂养记录 · 今日流水 · 拍照识餐 · 体感 | writes | **≥1, ideally ≤2** |
| **Review** | time turned into an artifact — the reason to stay | 力量曲线 · 周报 · 成长相册 · 年度回顾 | reads | **≥1** |
| **Tool** | computes or converts on demand | 蛋白计算 · 咖啡因倒计时 · 文案生成 | ad hoc | ≤2 |
| **Knowledge** | stable reference material | 妇科科普 · 动作库 · 补剂科普 | reads | **≤1/3 of the rail** |
| **Outward** | points at someone or somewhere else | 老公须知 · 宠物医院 · 选址天气 | reads | ≤1 |

### 4.A The mix rule (mandatory)

> **Exactly one Today · at least one Record · at least one Review · Knowledge ≤ ⅓ of the rail.**

Each clause prevents a specific death:

- **Exactly one Today.** Zero → the hook lands nowhere and the rail has no focus. Two or more → he doesn't know where "today" lives, and both go stale.
- **At least one Record.** No Record channel means **no data floor**, which means the hook is a fortune cookie no matter how it's phrased. This is the clause that catches an all-reading rail — and an all-reading rail is the most common shape a first draft takes, because reading channels are easy to name.
- **At least one Review.** Accumulation with no moment of return is unpaid chores. The Review channel is where the ledger *pays out*; without it, week three is when he notices he's been feeding a database. It is also, usually, the honest revenue seam (`monetization.md`).
- **Knowledge ≤ ⅓.** More than that and it's a 百科. Nobody opens an encyclopedia daily, and knowledge channels are seductive precisely because they're free to name and require nothing from anyone.

### 4.B Count bounds: 4–9, and the number means something

- **< 4** — probably not a workbench; it's a single feature. Either widen (`workbench-types.md` — add the secondary structure) or accept it's one screen and say so.
- **4–7** — the healthy range. Fits in a bottom bar or a short sidebar; he can hold it in his head.
- **8–9** — acceptable only if the domain genuinely has that many *distinct* jobs. Check for merge candidates first.
- **> 9** — becomes a menu he stops reading. Cut. The usual surplus is Knowledge channels that could be one, plus two Tools that are one tool.

**Merge test:** if two channels would be opened in the same moment for the same reason, they are one channel. 疼痛急救 and 情绪波动 both fire on a bad day — merge into 今天不舒服 unless the domain really separates them.

### 4.C How the six types map to the system domain

The types are the same; the names change and the mix rule tightens. **A system module set is derived from the subject (`system-domain.md` §2.A), then type-checked against this table** — deriving first and checking second, never the reverse.

| Type | System-domain form | Example (CRM · Agent 台 · 工厂) | Rule |
|---|---|---|---|
| **Today** | the module the `opens_daily` role lands in — the board, the fleet, the big screen | 商机看板 · Agent · 总览大屏 | **exactly 1, and it is `weight: primary`** |
| **Record** | where objects get created or advanced | 跟进记录 · 新建 Agent · 报工 | **≥1** — no Record module means no data floor, same as personal |
| **Review** | the module that turns accumulation into a conclusion | 月度复盘 · 运行记录+周报 · 生产报表 | **≥1** — a system workbench with no review module teaches nobody anything |
| **Knowledge** | reference the work depends on | 话术库 · 知识库 · 作业标准 | **≤⅓** |
| **Tool** | computes or converts on demand | 报价计算 · Prompt 调试 · 排产模拟 | ≤2 |
| **Outward** | leaves for another system | 跳客服系统 · 跳模型控制台 · 跳 MES | ≤1 |
| **设置 / 配置** | **not a type — a corner.** It exists in almost every system workbench and it is `weight: occasional`, L1 only | 设置 | never `primary`, never counted toward "distinct jobs" |

**Two system-specific mix failures the personal rule doesn't catch:**

- **No Review module.** In a company this feels optional because someone else makes the reports. It isn't: the review module is what makes the workbench worth opening on a slow day, and without it the tool is a data-entry surface with a nice header (`day-two.md` S-list).
- **Two Today modules.** 「总览」 and 「工作台首页」 and 「我的待办」 all competing to be the landing page. Pick one, make it `primary`, fold the others into it.

### 4.D Naming

- **Plain words, 2–5 characters.** 今日投喂 beats 智能喂养管理.
- **Say what he does or sees**, not what the system does. 力量曲线 (what he sees) beats 数据分析 (what it does).
- **No 我的 prefix on everything.** 我的报告 / 我的记录 / 我的设置 — the whole thing is his; the prefix carries zero information and eats the character budget.
- **The Today channel is named for the domain's unit**, not "今天": 今日训练 · 今日菜单 · 今日投喂 · 商机看板.
- **System domain: no 「XX 管理」.** 客户管理 · 订单管理 · 数据管理 · 系统管理 — **a noun plus 管理 is the absence of a decision.** Name the object (`客户`) and put the verbs in `does` (`system-domain.md` §2.B).

---

## 5. The rail is not a navigation menu

One consequence worth stating, because it changes the handoff: **channels have unequal weight.** The Today channel is where 80% of opens land; Knowledge might be opened twice ever. A rail that renders all seven identically is technically a navigation bar and functionally a wall.

Record this in the spec — each channel gets a `weight: primary | regular | occasional` — so finesse-ui can build hierarchy instead of a uniform list. **A uniform rail is the visual form of "we never decided what matters."**

---

## 6. Assembling — the worked path

```
① identity      毛孩子工作台            (object-owned; scope = one animal)
② hook          豆豆今天该驱虫了 · 体重 4.2kg（比上月 +0.1）
③ data floor    驱虫日期(一次性录入 + 每次完成后更新) · 体重(每周一次，用户录)
                → hook works weekly, degrades gracefully on off days   ← §3 gate, hook-engineering.md
④ channels      今日投喂(Today) · 体重曲线(Review) · 疫苗驱虫(Record) ·
                成长相册(Review) · 口粮红黑榜(Knowledge) · 宠物医院(Outward)
                mix check: Today 1 ✓ · Record 1 ✓ · Review 2 ✓ · Knowledge 1/6 ✓ · count 6 ✓
⑤ seam          口粮红黑榜 → 复购提醒 + 粮食带货（Knowledge 型，他主动查的时候才出现）
                NOT on 宠物医院 — 那是他半夜慌的时候点的   ← monetization.md §3
```

Note ③ came before ④, and note that ④'s content is *determined* by ③: 体重曲线 exists because the hook reads a weight field, and something has to make entering that weight worth it.

### 6.A The same path, system domain

```
① identity      销售工作台 · subject: 商机          (the noun, not the title, is load-bearing)
② hook          本月 ¥86 万 / 目标 ¥120 万 · 12 个待跟进 · 报价阶段 3 个超 10 天没动
③ data floor    opp.stage(user，拖一次卡片) · opp.amount(user，建单时)
                opp.last_activity_at(**system**，保存跟进记录时自动写)  ← §3 gate
                超期 = derived，免费。目标 = user，一个月填一次。
                → every clause traced to a field with a writer. Nothing waiting on an
                  integration that doesn't exist.
④ modules       商机看板(Today, primary) · 客户(Record/Registry) · 跟进记录(Record) ·
                月度复盘(Review) · 话术库(Knowledge) · 设置(occasional)
                mix: Today 1 ✓ · Record 2 ✓ · Review 1 ✓ · Knowledge 1/6 ✓ · count 6 ✓
   pages        商机 L1 看板(列=阶段) → L2 商机详情+跟进时间轴 → L3 单条跟进
                客户 L1 列表+搜索 → L2 客户档案+挂着的商机   （设置只有 L1）
⑤ seam          none —— 这是内部工具，钱在别处收   ← monetization.md §5
```

**Two things to notice.** ② has three clauses because the system rule allows 2–4 (`hook-engineering.md` §6), and the third one *names* the worst case rather than counting it. And ③'s middle line is the whole trick: `last_activity_at` is `system`-written, so 「超 10 天没动」 stays true without anyone maintaining it — that single decision is what makes this workbench survive contact with a sales team.

---

## 7. What "done" looks like

A composed workbench is ready for the spec when all of these hold:

**Both domains**

- [ ] One hook, with **real values filled in** — not a template.
- [ ] Every value in the hook has a bound field, a **named writer**, a cadence, and a day-one line (`hook-engineering.md` §1).
- [ ] Exactly one Today · ≥1 Record · ≥1 Review · Knowledge ≤⅓ · count 4–9.
- [ ] Each channel/module has a `weight`, and exactly one is `primary`.
- [ ] `INPUT < DEPTH` (SKILL.md §1.B).
- [ ] A named moment that exists in someone's actual day.
- [ ] The seam attaches to a specific channel, or is honestly recorded as `none`.
- [ ] `day-two.md` scanned clean — the list for this domain.

**Personal adds**

- [ ] Identity names a person or object; not a 系统.
- [ ] Hook is ≤2 clauses, INPUT stated in seconds.

**System adds**

- [ ] `subject` named — one noun, countable.
- [ ] Hook is 2–4 clauses and **at least one points at something needing action today** (`hook-engineering.md` §2.A).
- [ ] `entities` written, with a writer per field, and **every number in the hook traces to one of them**.
- [ ] Every module has `pages` with at least L1, and each L1 says **what shape it is**.
- [ ] No module name ends in 管理; every `does` contains a verb.
- [ ] `roles` ≤4, exactly one with `opens_daily: true`, and any two roles that see the same thing are merged into one.
- [ ] Every `integration` field either exists today or is recorded in `depends_on` and taken out of the hook.
