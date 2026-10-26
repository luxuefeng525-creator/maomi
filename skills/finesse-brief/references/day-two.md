# Day Two — The Abandonment Blacklists

`finesse-ui` has a cheapness blacklist: the ways a page looks cheap. This is its counterpart one level up: **the ways a good-looking workbench is dead on arrival.**

**Two lists, one per domain.** Run the one that matches (SKILL.md §0.A), before writing the spec and again in `audit`. Failing any item is a definition-level defect — fix it here, where fixing costs a sentence.

| | **D-list — personal** | **S-list — system** |
|---|---|---|
| The test | It is Thursday. He opened it Monday and Tuesday, skipped Wednesday. **Does today's screen have anything to say to him?** | It is launch day and the database is empty except for real data from real work. **Does the first screen say anything true?** Then: it is week three. **Is there any screen here that states a conclusion rather than listing rows?** |
| Kills by | nobody opens it | it renders blank, or every module is the same table |

**Composite workbenches run both.** A `care` workbench for a small clinic is personal in its hook and system in its registry; the lists are cheap to run and the overlap is small.

> **One failure happens earlier than either list, and isn't on them, because by the time they run it has already happened: he never got a workbench at all.** He asked, got questions back, answered some, got more questions, and left. **The definition never existed, so it can't be defective.** SKILL.md §0.D–§0.E is what catches that, and it is the more common way this skill fails a person. Everything below assumes a V0 exists to inspect.

---

# Part I — The D-list (personal)

## The thirteen

### D1 · The fortune-cookie hook — *the #1 killer*
**Symptom:** the hook has no variable (`今天也要加油哦`), or a variable nothing produces (`黄体期第 3 天` with no anchor date anywhere in the definition).
**Detect:** render it for day 40 with nothing logged. Identical to day 1 → fail. Or: point at the clause that will differ tomorrow. Can't → fail.
**Fix:** `hook-engineering.md` §3 — derive, ask-once, one-tap, or change the hook.
**Why it survives review:** it reads beautifully in a proposal. Nobody rejects 「今天也要加油哦」 in a slide; everybody ignores it on Thursday.

### D2 · The encyclopedia rail
**Symptom:** more than ⅓ of channels are Knowledge type (科普 · 指南 · 红黑榜 · 动作库).
**Detect:** count. Knowledge > ⅓ → fail.
**Fix:** merge them into one 科普 channel; spend the freed slots on Record and Review.
**Why it survives:** knowledge channels are free to name, require nothing from anyone, and make the rail look substantial. They are the padding of this category.

### D3 · Input debt
**Symptom:** `INPUT ≥ DEPTH` (SKILL.md §1.B), or three separate channels each demanding a daily write.
**Detect:** add up the daily seconds across all channels. Over ~60s for a personal workbench → fail unless the domain is `operation`.
**Fix:** derive, default, one-tap, or cut the channel. Cutting is the fix people skip and it is often correct.

### D4 · No Review channel
**Symptom:** he feeds it every day and nothing ever hands the accumulation back.
**Detect:** zero Review-type channels on a `ledger` or `care` workbench → fail.
**Fix:** add one — 曲线 · 周报 · 相册 · 年报. It's also usually the honest revenue seam (`monetization.md`).
**Why it matters:** week three is when he notices he's been feeding a database. The Review channel is the payout that makes the deposits make sense.

### D5 · The fake Today
**Symptom:** a 「今日 X」 channel whose content is identical every day.
**Detect:** write out Monday's and Thursday's contents. Same → it's a Knowledge channel wearing a Today label.
**Fix:** make it react to yesterday (`runbook` countermeasure in `workbench-types.md`), or rename it honestly and let a real Today channel exist.

### D6 · The blank cold start
**Symptom:** day one is `--`, an empty chart, or a six-field setup wizard.
**Detect:** is there a written day-1 line? (`hook-engineering.md` §4)
**Fix:** day one asks for **one** input and says what that input buys. Never a demo number — a fabricated figure discovered later poisons everything else on the page.
**Why it's fatal:** he never reaches day two, so none of the other twelve items ever get a chance to matter.

### D7 · The ten-channel rail
**Symptom:** more than 9 channels.
**Detect:** count. > 9 → fail. 8–9 → justify each.
**Fix:** merge by the moment test (`grammar.md` §4.B) — two channels opened in the same moment for the same reason are one channel.

### D8 · The pasted-on seam
**Symptom:** a 商城 tab attached to no channel, or a product pushed on a channel he opens while hurting.
**Detect:** name the channel the seam grows from. Can't → fail. Is that channel opened in pain or anxiety → fail (`monetization.md` §3).
**Fix:** move the seam to the Review or Knowledge channel, or record `seam: none yet` honestly.

### D9 · The imaginary moment
**Symptom:** the named moment doesn't exist in his actual day — 「每天早上冥想 20 分钟」 for someone who wakes at 8:40 for a 9:00 start.
**Detect:** ask him to describe yesterday. Is the moment in it?
**Fix:** attach the workbench to a moment that already exists (通勤, 睡前刷手机, 练完那一下, 收摊后). **Never ask him to create a new habit in order to use the thing that was supposed to help him.**

### D10 · Scope inflation — a personal workbench growing an org chart
**Symptom:** a one-person life workbench acquiring 「XX 管理系统」, roles, 设置中心, a login page, 「以后还能给别人用」.
**Detect:** does the title name a person or object? (`grammar.md` §2.A) And does the domain test still come back *personal* — is there still no 「一共有 N 个 X」, no page tree?
**Fix:** rename to a person or object; delete every feature that only makes sense for a second **account**.
**The two things this must not be confused with:**
- **A workbench with two readers** (妈妈 + 孩子, 子女 + 爸妈) is not scope inflation. One owner, one domain, one hook, nobody logging in as a *type*. Two readers is a writing constraint (`hook-engineering.md` §7), not an architecture one.
- **A genuine system workbench is not scope inflation either — it's a different domain.** 「我们十个销售要一个跟客户的台子」 has roles legitimately, and **flagging it here is the mistake that used to make this skill refuse half the category.** Roles are a spec field now (`system-domain.md` §3). Run SKILL.md §0.A: if it's system, switch to the S-list and stop applying D10.

### D11 · The streak punisher
**Symptom:** 「已断签 3 天」, a broken flame, a graph with a visible hole, backfill required before today's entry.
**Detect:** is there a written re-entry line for a returning user?
**Fix:** `hook-engineering.md` §5. The gap already happened; the only live question is whether he comes back. Make coming back cost nothing.

### D12 · Fabricated substance
**Symptom:** a 科普 · 报告 · 情报 channel whose content the model would invent — plausible-sounding medical, financial or legal claims with no source.
**Detect:** for every Knowledge and feed channel, name where the content comes from. "The model writes it" → fail.
**Fix:** name the real source, or narrow the channel to something that can be honestly produced (his own recorded data, a public dataset, a curated link list). **A Knowledge channel containing a confident fabrication is worse than no Knowledge channel** — and unlike a design flaw, this one can actually hurt him.

### D13 · It became a supervision tool
**Applies to:** any `care` workbench whose subject has a will of his own — 学龄孩子, 青春期, 爸妈 (`workbench-types.md` §6.A).
**Symptom:** the hook reports **deficits** (今天又没背完 · 这周有 3 天没读 · 落后同龄人). The record is kept *about* the subject and not visible *to* him. Someone is watching in order to log.
**Detect — read the hook aloud to the subject, in your head.** If that would be humiliating, or if she'd rather he didn't see the page at all, it has already happened. Second check: is anyone required to *observe* the subject in order to fill a field? Observation-as-input is surveillance with a nicer name.
**Fix:** state progress instead of deficit (`这周读了 4 天`, same data, survives being read aloud) · default the record to subject-visible · drop from process-logging to **outcome-logging at weekly cadence**, which is the usual correct answer and means deliberately building a weekly workbench.
**Why it's the worst one on this list:** the other twelve end with an app nobody opens. This one ends with a damaged relationship, and the workbench dies too — because she stops opening a thing that makes her feel like a supervisor, and he was never going to open it at all. **It is also the one most likely to look like success early**: compliance is high in week one, and compliance is not the same as it working.

---

# Part II — The S-list (system)

Detection and fixes are in `system-domain.md` §7; this is the reasoning behind the ones that get skipped most.

### S1 · The demo-data lie — *the #1 killer, and the direct analogue of D1*
**Symptom:** the 结论条 shows `12 个待跟进 · 3 个超期`, and nothing in the spec produces a 12 or a 3.
**Detect:** **render the first screen against an empty database.** If anything other than the cold-start line appears, the numbers came from your imagination. Then trace every remaining figure to a field with a writer (`system-domain.md` §5.B).
**Fix:** any figure that can't be traced comes out of the hook.
**Why it survives review:** unlike a fortune-cookie hook, it *looks* rigorous — real-seeming numbers, plausible labels. It reads like a finished product right up until launch day, which is the most expensive possible moment to find out.

### S2 · The list-page hellscape
**Symptom:** every module's L1 is a table with a search box and pagination. Nine modules, nine identical screens, and no screen anywhere that states a conclusion.
**Detect:** read every `pages[L1].shows`. Three or more saying 表格 → fail.
**Fix:** the `primary` module's L1 is a **board · triage list · curve · fleet of cards** — whatever the structure demands (`workbench-types.md` Part III). Tables belong to `registry` modules and secondary lookups, and even there the default sort is by *what needs attention*, not 创建时间倒序.
**Why it matters:** this is what makes a back office feel like a back office. A workbench is distinguished from a database viewer by exactly one thing — **somewhere on it, something says what to do** — and a wall of tables never does.

### S3 · The empty back office
**Symptom:** `cold_start.day_1` describes the empty page instead of naming a first action.
**Detect:** does day one contain a verb the user performs?
**Fix:** name one concrete action with a visible affordance — 导一份 Excel · 建第一个 Agent · 录一个客户，只要名字和电话 (`hook-engineering.md` §4.A).
**Why it's fatal:** `registry` and `console` workbenches are useless when empty, not merely sparse. **This is D6 with higher stakes**, because in a company the person who bounces on day one is the person who decides whether the tool gets adopted at all.

### S4 · The noun module
**Symptom:** 客户管理 · 订单管理 · 数据管理 · 系统管理.
**Detect:** any module name ending in 管理, or any `does` with no verb in it.
**Fix:** `system-domain.md` §2.B — name the object, put the verbs in `does`.
**Why it survives:** it sounds like a real module set. It's the enterprise equivalent of 「今天也要加油哦」: unobjectionable, and it tells the builder nothing.

### S5 · The permission hallucination
**Symptom:** three roles in the spec; every role sees the same screens.
**Detect:** find one module where two roles' `shows` or `actions` differ. Can't → fail.
**Fix:** merge into one role, or state the real difference (usually a filter: 「只看自己的」). **A login guarding nothing costs a build week and buys nothing.**

### S6 · The unbuilt integration
**Symptom:** the hook depends on data from 「ERP」「支付系统」「设备上报」 that has no API, no owner and no date.
**Detect:** for each `written_by: integration`, ask whether that system is running and reachable **today**.
**Fix:** `depends_on` with `exists_today: false` and an `until_then`, and the number leaves the hook (`system-domain.md` §4.A).
**Why it's the expensive one:** it is invisible at definition time and unfixable at build time. The builder can't invent the integration, so he ships the page with a zero in it, and a zero that should be a number is worse than an honest empty state.

### S7 · The orphan module
**Symptom:** a module with no relation to `subject` — 公司公告 in a CRM, 员工考勤 in a factory dashboard.
**Fix:** cut it, or recognize it as a second workbench and record it in `deferred`.

### S8 · The symmetrical page tree
**Symptom:** every module has exactly L1/L2/L3.
**Fix:** 设置 is L1 only. A module whose objects have no genuine sub-record stops at L2. **Depth follows the data, not the layout.**

### S9 · Roles as an org chart
**Symptom:** five or more roles at definition time.
**Fix:** mark exactly one `opens_daily: true` and build for him; the others get a line each. He's describing a company, not a workbench.

### S10 · No Review module
**Symptom:** every module either lists things or accepts input; nothing ever turns accumulation into a conclusion.
**Detect:** zero Review-type modules → fail.
**Fix:** add one — 月度复盘 · 周报 · 成功率与耗时 · 生产报表.
**Why it gets skipped in the system domain specifically:** it feels like someone else's job (「报表有 BI 做」). It isn't — **the review module is what makes the workbench worth opening on a quiet day**, and without it the tool is a data-entry surface with a nice header. This is D4, and it is skipped more often here than there.

### S11 · Everything is primary
**Symptom:** no `weight`, or all modules equal.
**Fix:** exactly one `primary` — the module the `opens_daily` role lands in. **A uniform rail is the visual form of never having decided what matters**, and in a nine-module sidebar it's how the important screen becomes the sixth item down.

---

## The scan, as a checklist

**Run first, both domains:**

```
[ ] D0  a V0 exists at all — personal: ≤1 question before a whole workbench;
        system: ≤2 messages (SKILL.md §0.D). Checked first because
        everything else has nothing to inspect without it.
[ ] D0' the spec can be built from, not just read: `home` fixes what sits
        under the hook, every channel/module says what it does, `visual` is set
```

**D-list (personal):**

```
[ ] D1  hook has a variable, and a field produces it
[ ] D2  Knowledge channels ≤ ⅓
[ ] D3  daily input < payoff, and under ~60s
[ ] D4  at least one Review channel
[ ] D5  the Today channel differs Monday vs Thursday
[ ] D6  day-1 line written, asks for one thing, no fake data
[ ] D7  4–9 channels
[ ] D8  seam attaches to a named, non-painful channel (or: none yet)
[ ] D9  the moment exists in his real day
[ ] D10 title names a person or object — but check §0.A first: a real
        system workbench is a different domain, not scope inflation
[ ] D11 re-entry after a gap costs nothing
[ ] D12 every Knowledge/feed channel has a real source
[ ] D13 (care with a willful subject) hook states progress, record is
        subject-visible, nobody observes in order to log
```

**S-list (system):**

```
[ ] S1  every number in the 结论条 traces to a field with a writer
[ ] S2  the primary module's L1 is not a table
[ ] S3  day one names a first action, with an import path if one exists
[ ] S4  no module named 「XX 管理」; every `does` has a verb
[ ] S5  any two roles differ somewhere, or they are one role
[ ] S6  every `integration` field exists today, or is in `depends_on`
        and out of the hook
[ ] S7  every module relates to `subject`
[ ] S8  page depth follows the data (设置 is L1 only)
[ ] S9  ≤4 roles, exactly one `opens_daily`
[ ] S10 at least one Review module
[ ] S11 exactly one module is `primary`
```

---

## Reporting findings in `audit`

Read-only. Report in his language, **never in D- or S-numbers**, ordered by what would kill it soonest.

Personal:
```
这个构思有 3 个地方大概率会让它活不过第二周：

1. 每天那句话不会变 —— 「今天也要加油」不管第 1 天还是第 40 天都一样，
   开两次就没人开了。得让它读到点什么（比如上次练了多少）。
2. 七个频道里五个是科普 —— 这样它更像一本百科，而百科没人天天翻。
3. 你每天要录三样东西（饮食、体重、心情），大概 90 秒。
   你之前删掉那个 App 就是因为每组点四下 —— 这个比那个还重。
```

System:
```
这版上线第一天就会露馅的有两处，另外一处是三周后的事：

1. 首屏那三个数（12 个待跟进、3 个超期、本月 86 万），现在没有任何字段
   能算出来 —— 「超期」要靠「最后跟进时间」，而这个字段没人写。
   最省事的做法：销售存一条跟进记录时，系统自己把时间盖上去。
2. 库存那个数说是从 ERP 同步 —— 那个接口现在有吗？没有的话首屏先别放这个数，
   放上去就是一直显示 0，比空着更糟。
3. 六个模块点进去都是一张表加搜索框。真正每天要用的是「商机」那个，
   它应该是个看板，能拖；剩下的做成表没问题。
```

**Rank by time-to-death, not by abstract severity.** S1/S6 and D1/D6 kill on day one; S2 and S10 are three-week problems; D8/S7 are slow leaks. Say which is which — he has limited attention for fixes and should spend it in order.
