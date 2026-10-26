# Hook Engineering — Making the Opening Line Still True on Day 40

The hook is the product. Everything else is what has to exist for the hook to keep working. **In a web page there is no push notification to rescue a weak one** (SKILL.md §4) — the line at the top of the first screen is the entire retention mechanism. This file is the gate: **no hook ships without a bound field, a named writer, a cadence, and a day-one line.**

The gate is identical in both domains. What differs is *who writes the field* (§1.B) and how many clauses the line carries (§6).

---

## 1. The binding table (mandatory, per hook)

Write this out. Not in your head — in the spec, where it can be checked.

**Personal:**

| Field | Reads | Written by | When | Day-one (empty) | Skipped-day |
|---|---|---|---|---|---|
| `cycle_start` | 黄体期第 3 天 | user | once per cycle | 先记一下上次月经开始那天 | last known + 推算, marked as 推算 |
| `split` | 今天推日 | **derived** from weekday | free | works immediately | n/a |
| `protein_today` | 蛋白缺口 42g | user | after each meal | 今天还没记，先记一顿？ | shows 0g eaten, not stale |

**System:**

| Field | Reads | Written by | When | Day-one (empty) | Stale/disconnected |
|---|---|---|---|---|---|
| `opp.stage` | 12 个待跟进 | user | 拖一次看板卡片 | 还没有商机 —— 导份名单或先建一个 | n/a |
| `opp.last_activity_at` | 3 个超 7 天没动 | **system** | 保存一条跟进记录时自动写 | n/a | n/a |
| `run.status` | 1 个昨晚失败 | **system** | 每次运行结束落一行 | 先建第一个 Agent，跑完这儿就有数了 | n/a |
| `usage.cost` | 本月 ¥320 | **integration** (模型接口回传) | 每次调用后 | 用量还没接上 | 上次同步 3 小时前 |

Reading the columns:

- **Reads** — the exact clause of the hook this field produces. If a clause maps to no field, the hook is asserting something nothing computes. **That's the whole failure**, and it looks the same whether the missing thing is a diary entry or a database column.
- **Written by** — see §1.B. **Every `user` row is a tax; count them.** Two `user` rows in one hook is usually one too many.
- **When** — a real moment in someone's day, not "as needed". If you can't name the moment, nobody will find one either.
- **Day-one** — see §4. Never `--`, never a blank, never a zero-row table, never a fabricated number.
- **Skipped-day / stale** — see §5. The most-skipped column and a common silent bug: yesterday's number rendered as today's, or a dead integration's last successful sync rendered as live.

**A hook whose table has an empty cell is not approved.** Change the hook (§3, move 4) rather than leaving the cell hopeful.

### 1.B The four writers

| Writer | Means | Cost | The trap |
|---|---|---|---|
| `user` | a person types or taps it | **the most expensive thing in a spec** | Count them. In the system domain, three `user` fields per module across nine modules is a full-time data-entry job nobody agreed to. |
| `derived` | computed at read time from other fields (weekday → 推日; now − last_activity_at → 超期; target − actual → 缺口) | free | Only as real as its inputs. Derived from an unbuilt integration is fictional, not free. |
| `system` | the workbench writes it as a side effect of an action already happening — a run finishes, a card is dragged, a note is saved | free | Almost never fails. **This is the writer to design toward** (§3, move 0). |
| `integration` | another system supplies it — 支付回调 · 模型用量 · 设备上报 · ERP 同步 · 一次性 Excel 导入 | **the field exists only if that integration is actually built** | The commonest lie in a system spec. 「从 ERP 来」 with no API, no owner, no date. |

**The rule that comes out of this table:** any `integration` field in the hook names its source system and whether it exists today. If it doesn't exist, **the number leaves the hook** and moves to a module where an empty state is survivable (`system-domain.md` §4.A). A first screen that renders blank on launch day loses the user before anything else in the spec gets a chance to work.

`external` in older specs means `integration`; treat them as the same thing.

---

## 2. The fortune-cookie test

> **Render the hook as it would appear on day 40, on a day he logged nothing. If it reads the same as day 1, it is not a hook.**

```
✗  今天也要加油哦 ✨                    no variable → says nothing, forever
✗  记得多喝水，保持好心情                 same
✗  你已经很棒了，继续保持！               same, plus it's a claim with no evidence
✓  今天推日 · 卧推上次 60kg，今天试 62.5   reads history, changes every session
✓  豆豆第 187 天 · 今天可以练握手了        derived from one date, changes daily, free
✓  今天下雨 · 建议主推热饮                外部数据驱动，用户零输入
```

**A hook with no variable is banned outright.** It's the most common failure in this category and the hardest to catch, because it *reads beautifully in a proposal*. Encouragement is not information. The test is mechanical: point at the part of the sentence that will be different tomorrow. If you can't, rewrite.

### 2.A The system-domain version: the stat strip

The corporate form of the fortune cookie is subtler, because it *does* contain variables. It just contains only totals.

```
✗  共 1,284 个客户 · 本月新增 32 · 系统运行正常
      changes, technically. Says nothing to do. He reads it twice and stops.
✗  今日订单 128 · GMV ¥45,600 · 转化率 3.2%
      an accurate stat strip. Which of these is wrong? The page doesn't say.
✓  12 个商机待跟进 · 3 个卡在报价超 10 天 · 本月 ¥86 万 / 目标 ¥120 万
      one thing to do today, one thing rotting, one gap. All three are actionable.
✓  4 个在跑 · 1 个昨晚失败（数据同步 03:12）· 本月 ¥320 / 预算 ¥500
      names the failure. That clause is the reason he opens it tomorrow.
✓  产量 8,420 / 计划 10,000 · 3 号线停机 12 分钟 · 2 台待保养
      an anomaly with a name and a number.
```

> **A 结论条 must contain at least one clause that points at something needing action today** — 待跟进 · 超期 · 失败 · 告警 · 缺货 · 待审 · 落后目标. Totals alone are a stat strip, not a hook, and a stat strip is what a `monitor` workbench dies of (`workbench-types.md` §11).

**The mechanical check:** for each clause, ask 「看到这个数，他现在会做什么？」 If the answer for every clause is 「知道了」, the hook has no imperative in it and needs rewriting before anything else in the spec matters.

**Second, sharper version — the two-day test:** write out day 1 and day 2 side by side, with plausible data. If a stranger couldn't tell which is which, the variable is technically present but too slow to carry a *daily* hook. Either drop CADENCE (weekly workbench, and say so) or find a faster-moving field.

---

## 3. When the field needs input he won't give

The real work. Five moves, **in this order** — always exhaust the cheap ones first.

### Move 0 — Attach it to an action already happening (system domain, and it's the best move there is)

**Nobody is going to fill in 「最后联系时间」.** He *is* going to write a 跟进记录 after a call, because that's the job. So `last_activity_at` is written by the **system** when the 跟进记录 is saved — and now 「3 个超 7 天没动」 is real, free, and impossible to forget to maintain.

| Don't ask for | Write it as a side effect of |
|---|---|
| 最后联系时间 | 保存一条跟进记录 |
| 当前阶段 / 状态 | 拖动看板卡片（one drag, not a form） |
| 是否已发货 | 打印面单 / 扫码出库 |
| 运行成功还是失败 | 运行本身结束时落一行 Run |
| 这个 Agent 花了多少钱 | 每次调用回传的用量 |
| 库存数量 | 出入库单据过账 |

**Most good system-domain hooks are built entirely on this move.** Look at the actions the user already performs for his own reasons, and ask what each one could write for free. A field acquired this way costs nobody anything and never goes stale — which is the opposite of every `user` field in the spec.

### Move 1 — Derive it

The best field is one nobody types.

| Instead of asking | Derive from |
|---|---|
| 今天练什么 | weekday × a split chosen once |
| 距考试还有几天 | one exam date, entered once |
| 宝宝第几天 | one birth date |
| 该驱虫了吗 | last-done date + a fixed interval |
| 今天冷不冷 / 下雨吗 | location + weather (external) |
| 现在是不是黄体期 | cycle start + average length |

**One-time input generating daily output is the highest-leverage structure in this whole category.** 距考试 118 天 costs the user a single date and pays out every morning for four months. Hunt for these first, in every domain.

### Move 2 — Ask once, not daily

Anchor dates, the pet's birthday, the goal weight, the split, 老公的微信. Entered at setup, edited rarely. **Setup input is nearly free; daily input is the scarcest thing you have.** Spend the setup budget aggressively — a 60-second setup that removes a 20-second daily tax pays for itself on day three.

### Move 3 — Make the daily input one tap

If a field genuinely must be written daily:

- **One tap, not a form.** 「练完了」 · 「和昨天一样」 · three mood faces.
- **Pre-fill with the last value.** Most days are like yesterday; make that the free path.
- **Accept a photo instead of numbers** when the domain allows — a plate of food, the scale display, the cat. Photos cost one second and carry a timestamp for free. (They pay off later in the Review channel too — 成长相册 is the same data, cashed out.)
- **Never require a unit, a category and a note** for the same entry. That's the four-taps-per-set failure that killed the app he already deleted (`discovery.md` §2).

> **The input budget is set by his abandonment story, not by your judgment.** If he quit something over four taps per set, the new design's daily cost is *below* that — and you say the number out loud in the Workbench Read so he can check it.

### Move 4 — Change the hook

If moves 1–3 can't feed the sentence, **the sentence is wrong.** Write one the available data supports.

```
wanted:  今天蛋白缺口 42g          needs every meal logged — he won't
instead: 今天推日 · 上次卧推 60kg×8，今天试 62.5
         needs only the "完成" tap he already gives after training
```

**This is a success, not a compromise.** A true smaller sentence beats a false bigger one every day of the week: the false one becomes visibly false around day four, and it takes the user's trust in the whole surface with it.

---

## 4. Cold start — day 1, day 2, day 7

Most definitions describe the steady state, which the user reaches only if he survives the empty one. **Write all three explicitly; they go in the spec and become the empty state in the UI.**

| Day | Reality | The line must |
|---|---|---|
| **1** | nothing entered | ask for the **one** input that unlocks the most, and say what it unlocks |
| **2** | one entry exists | show that entry back with the first hint of a pattern, however thin |
| **7** | enough for a trend | show the first real computed thing — the moment the workbench proves itself |

```
day 1   先记一次卧推，我就能告诉你下次该加多少。
day 2   昨天卧推 60kg×8。今天是拉日 —— 练完点一下就行。
day 7   这周三次训练，卧推 60→62.5。下周推日建议 65 试一组。
```

**Rules:**

- **Day one asks for exactly one thing.** A setup wizard with six fields is where most of them die — and they die before the product has ever shown its value, which is the worst possible ordering.
- **Say what the input buys.** 「先记一次卧推」 alone is a chore; 「我就能告诉你下次该加多少」 is a trade.
- **Never show `--`, `0%`, an empty chart, or a skeleton on day one.** An empty state that looks like a broken state is indistinguishable from a broken product.
- **Never fabricate a demo number to make day one look full.** He will believe it, then discover it was fake, and everything else on the page becomes suspect.
- **Day 7 is a promise you're making at definition time.** If you can't write a real day-7 line, DEPTH is lower than you think — recheck the balance rule (SKILL.md §1.B).

### 4.A Cold start in the system domain — an action, not a description

**Every system workbench launches against an empty database, and this is the failure that kills `registry` and `console` outright** (`workbench-types.md` §9, §10). The rule is stricter than the personal one: **day one names a concrete first action with a visible affordance**, not a description of the emptiness.

```
✗  暂无数据                              a broken state
✗  还没有任何客户信息                      accurate, and he closes the tab
✓  先导一份客户名单（Excel 拖进来就行），或者手动建第一个 —— 只要名字和电话。
✓  先建第一个 Agent —— 挑个模型、写句系统提示词就能跑，跑完这儿就有数了。
✓  还没接生产数据。先手动录今天的产量，接上之后这条会自动更新。
```

**Three system-specific rules:**

1. **Name the import path if one exists.** 「Excel 拖进来」 is worth more than any onboarding copy — a `registry` workbench whose day one is a one-record form starts a job nobody finishes.
2. **Never seed fake demo rows to make the page look alive.** The system-domain version of the fabricated number, and worse, because a builder handed a spec full of sample data will ship the sample data.
3. **A disconnected integration gets its own line, distinct from "empty".** 「用量还没接上」 and 「本月还没有花费」 mean completely different things, and showing `¥0` for the first one is a lie the user acts on.

**And write `day_7` for the system domain too.** It's the line that proves the workbench does something the source systems didn't already do — 「这周 3 个商机卡在报价超过 10 天，比上周多 2 个」. If you can't write it, the workbench is a viewer, not a workbench.

---

## 5. Skipped days and broken streaks

The steady state includes gaps. Three failures, all common, all decided here rather than in code:

1. **Stale data shown as today's.** If he logged nothing today, the hook must not display yesterday's number as if it were current. Mark it (上次记录 · 3 天前) or switch to the re-entry line.
2. **Punishing the gap.** 「你已断签 3 天」 with a broken flame is how a ledger workbench loses a user who was about to come back. **The gap already happened; the only remaining question is whether he returns.** Design the return: `距上次 3 天 —— 直接记今天的就行，不用补`.
3. **Requiring backfill.** Never gate today's entry behind filling the missing days. That's exactly the moment a curve stops feeling like his and starts feeling ruined.

> **The single most valuable line in a ledger workbench is the one that makes coming back after a gap cost nothing.** Write it explicitly in the spec; it will otherwise be invented badly at build time, if at all.

---

## 6. The three legal hook shapes

| Shape | Form | Fits | Example |
|---|---|---|---|
| **State** | 你现在是 X（所以 Y） | cycle · state · care · registry · console | 黄体期第 3 天 · 今天容易累，别排硬任务 |
| **Delta** | 今天 X / 目标 Y，差 Z | ledger · operation · monitor · pipeline | 今天 1250/2000 kcal，晚餐还有 750 |
| **Imperative** | 今天该做 X | runbook · feed · care · pipeline | 今天推日 6 组 / 今天这 3 条必读 |

**Match the shape to the structure** (`workbench-types.md`) — a ledger with an imperative hook stops reflecting the data, and a runbook with a state hook forgets to tell him what to do. When in doubt, `state + 所以 imperative` is the strongest general form: it shows it knows something, then converts that into an action.

**Density floor:**

- **Personal — 1–2 varying values.** Zero is a fortune cookie. Three or more is a dashboard, and he'll read none of them.
- **System — 2–4 clauses, and the composition is fixed:** **one 大盘数 · one thing needing action · optionally one cost or comparison.** More than four and it becomes the stat strip (§2.A). Fewer than two and a system workbench isn't earning its first screen.

**The system-domain composition rule, stated as a formula:**

```
{进度或总量，带对比} · {需要今天处理的那一类，带数量} · {最严重的那一个，点名}

本月 ¥86 万 / 目标 ¥120 万 · 12 个待跟进 · 报价阶段有 3 个超 10 天没动
产量 8,420 / 计划 10,000  · 2 台待保养  · 3 号线停机 12 分钟
```

**The third clause — naming the single worst thing — is what separates a workbench from a report.** A count tells him there's work; a name tells him where to start, and it's the clause most often dropped.

---

## 7. Who is the hook talking to?

Most workbenches have one reader and this question never comes up. **`care` workbenches whose subject has a will of his own have two** — 妈妈 and 孩子, 子女 and 爸妈 — and the same sentence lands completely differently on each.

```
「今天背了 20 个词」     to 妈妈: a record.        to 孩子: a score.
「这周读了 4 天」        to 妈妈: progress.        to 孩子: 少了 3 天。
「他今天又没背完」       to 妈妈: information.     to 孩子: evidence against him.
```

**The test, and it is not a metaphor: would you read this sentence aloud to the subject, in front of him?** If not, don't write it. He will see it eventually — on her phone, over her shoulder, or because he uses it too — and the first time he does is the day the workbench becomes a thing that is done *to* him.

Three rules for the two-reader case:

1. **State progress, not deficit.** `这周读了 4 天` not `这周有 3 天没读`. Same data, and only one of them survives being read aloud.
2. **Default the record to visible.** A log the subject can't see is a file kept on him. Visibility is also the cheapest protection against the whole thing drifting into supervision.
3. **If he has to write anything, the hook must pay *him* too.** A second reader who is only a data source stops being one. Give him a sentence that's his — 你这周比上周多读了一天 — or don't ask him to write.

This is a **writing** problem, not an architecture one: two readers do not mean two accounts, two roles, or a permissions model (SKILL.md §9).
