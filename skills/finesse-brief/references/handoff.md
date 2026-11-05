# Handoff — `.workbench/spec.md` and the Move to the Builder

The definition ends as one artifact: **YAML frontmatter the builder reads mechanically, prose the human reads.** Splitting them into two would drift apart within one revision.

---

## 1. Where it goes

`.workbench/spec.md` in the project root. Create the directory if absent. One workbench per file; a second workbench (from a `discovery.md` §5 fork) is `.workbench/spec-{slug}.md`.

### 1.A When there is no filesystem

**A large share of the people using this skill are in a chat product, not an editor** — 元宝, 豆包, a web assistant, a phone app. There is no project root, nothing to write, and their handoff is a **copy-paste into another AI**. Writing a file is the delivery mechanism, not the deliverable; don't let its absence degrade the output, and never claim to have written a file you didn't.

Then:

1. **Print the whole spec in one fenced block** — frontmatter and prose together, nothing interleaved, no commentary inside the fence. Chat UIs put a copy button on a code block; anything outside it will be lost in transit.
2. **Say in one line what to do with it**: 「整段复制给任何会写页面的 AI 就能开工」. One line, not a tutorial.
3. **§3.A is mandatory here**, not optional. In a file-based project the builder is usually finesse-ui; in a chat it is whatever he pastes into, and that agent has never heard of this vocabulary.

Don't split it across messages to be readable. A spec he has to reassemble from four bubbles arrives at the builder incomplete, and the missing part is always the frontmatter.

---

## 2. The schema

**One schema, two profiles.** Everything in §2.A applies to every workbench. §2.B adds the four fields a system workbench cannot be built without — `subject`, `roles`, `entities`, `channels[].pages` — and they are **not optional there**: a spec with module names and no page tree is a table of contents, and the builder will render nine identical tables because nothing told him otherwise.

### 2.A Personal profile — the full example

```yaml
---
name: 毛孩子工作台
domain: personal                    # personal | system  ← SKILL.md §0.A; decides which
                                    #   profile, which blacklist, which checklist
purpose: 一个替你记住豆豆哪天该驱虫、体重有没有变化的页面   # one sentence: why it exists
owner: 豆豆（猫，2 岁）              # the person or object in the title
user: 一个上班族，自己养一只猫，晚上到家喂食  # ONE person, never a segment — 「养宠人群」 is a SaaS
surface: phone                      # phone = 手机浏览器里的 H5 页面
                                    # desktop = 电脑浏览器里的 Web 页面
                                    # 永远是网页，不是 App —— 没有推送可以兜底
structure:
  primary: care
  secondary: ledger
moment: 早上喂完那一下                 # must exist in his real day
dials:
  cadence: 8
  input: 4
  depth: 7                          # input < depth, always

hook:
  text: "豆豆今天该驱虫了 · 体重 4.2kg（比上月 +0.1）"
  shape: state                      # state | delta | imperative
  fields:
    - name: last_deworm
      writes: user
      when: 每次完成后点一下
      day_one: 上次驱虫是什么时候？记一下我就能提醒你
    - name: weight
      writes: user
      when: 每周称一次
      day_one: 先称一次，之后我给你画曲线

cold_start:
  day_1: 先记一下豆豆的生日和上次驱虫时间，我就能开始提醒你了。
  day_2: 豆豆 2 岁 3 个月。今天正常喂就行，下次驱虫还有 24 天。
  day_7: 这周喂了 14 次，体重 4.2kg。下个月 3 号该驱虫。
  re_entry: 距上次记录 5 天 —— 直接记今天的就行，不用补。

home:                               # what the first screen shows, top to bottom.
  - hook                            # always first — the sentence above everything
  - 今天喂了没 + 一个「喂了」按钮        # 3-5 blocks. Without this the builder
  - 下次驱虫倒计时                     # invents six identical cards under the hook
  - 体重最近三次的小曲线
  - 最近一张照片

channels:
  - { name: 今日投喂, type: today,     weight: primary,    does: 点一下记录喂食，看今天喂过几次 }
  - { name: 体重曲线, type: review,    weight: regular,    does: 每周一次的体重，画成一条线 }
  - { name: 疫苗驱虫, type: record,    weight: regular,    does: 记每次疫苗和驱虫，自动算下一次 }
  - { name: 成长相册, type: review,    weight: regular,    does: 按月份排的照片墙 }
  - { name: 口粮红黑榜, type: knowledge, weight: occasional, does: 他自己记的哪款粮吃了拉肚子 }
  - { name: 宠物医院, type: outward,   weight: occasional, does: 存好的两家医院电话和地址 }

mvp:                                # what v1 must contain to be the thing at all
  - 今日投喂
  - 疫苗驱虫
later: [体重曲线, 成长相册, 口粮红黑榜, 宠物医院]

visual: 手账感，暖色，圆角，照片占比大    # one direction + why it fits this owner
                                    # 与「一个上班族晚上到家喂猫」相称，不做成数据后台

seam:
  channel: 口粮红黑榜
  type: goods
  trigger: 他主动查粮的时候
  banned_channels: [宠物医院]

excluded:                           # what he vetoed — keeps it from creeping back
  - 社交/晒猫功能：他明确说不想发出去
deferred:                           # forks recorded, not lost
  - 记账台：证据也指向这个，他选了先做养宠
---
```

**Every field above is load-bearing.** Six that get dropped and shouldn't be:

- **`home`** — the first screen top to bottom. `hook` fixes line one; without `home` the builder invents whatever goes under it, and what it invents is six identical cards. **This is the single most useful field for anything generating HTML** and the one most often left blank.
- **`channels[].does`** — a name is not a capability. 「时间分布」 could be a chart, a table, or a weekly summary; one clause settles it and costs nothing.
- **`user`** — **singular, and a person rather than a segment.** A page for 一个上班族晚上到家喂猫 and a page for 一个开宠物店的 don't look alike, so the field earns its place — but write 「养宠人群」 and the definition starts acquiring users, then roles, then settings, and the scope is gone (SKILL.md §2, §6). One workbench, one user, described concretely.
- **`visual`** — finesse-ui derives its own direction from `owner` and `structure`; **every other builder needs to be told.** Omit it and you get default-dashboard blue regardless of whether the owner is a cat or a market stall.
- **`cold_start.re_entry`** — the line that makes returning after a gap cost nothing. Omit it and it gets invented badly at build time, if at all (`hook-engineering.md` §5).
- **`excluded`** — a veto with no written record comes back as a "good idea" two revisions later.

Plus **`weight`**: without it the builder renders a uniform rail, which is the visual form of never having decided what matters (`grammar.md` §5).

**`mvp` / `later` is not the same as `deferred`.** `later` is inside this workbench — channels that exist in the definition and ship in v2. `deferred` is a *different workbench* the evidence also pointed at (`discovery.md` §5). Conflating them loses the second workbench.

### 2.B System profile — the four fields that make it buildable

Everything in §2.A still applies, with two substitutions: `owner` → **`subject`**, and `user` → **`roles`**. Then four additions.

```yaml
---
name: 销售工作台
domain: system
subject: 商机                        # THE noun. 「一共有多少个」 的那个东西。
                                    # 围着客户转和围着商机转是两个不同的产品 —— 定死它
purpose: 让销售一眼看出哪几单该推了、哪几单在烂掉
surface: desktop
structure: { primary: pipeline, secondary: registry }
moment: 上班坐下第一件事
dials: { cadence: 9, input: 5, depth: 8 }

roles:                              # ≤4. 两个角色看到的东西一样 → 就是一个角色
  - { name: 销售,    opens_daily: true,  does: 推进自己手上的单、记跟进、加客户 }
  - { name: 销售主管, opens_daily: false, does: 周一看全组卡住的单，指派人 }
                                    # opens_daily: true 的那个人 = hook、首屏、
                                    # primary 模块都为他而建

hook:
  text: "本月 ¥86 万 / 目标 ¥120 万 · 12 个待跟进 · 报价阶段 3 个超 10 天没动"
  shape: delta                      # 2-4 clauses，其中至少一条指向今天要处理的事
  fields:                           # 每一条都要能追到一个字段 + 一个写入方
    - { name: opp.amount,           reads: 本月 ¥86 万,    writes: user,   when: 建单/改价时 }
    - { name: settings.month_target, reads: 目标 ¥120 万,   writes: user,   when: 每月填一次 }
    - { name: opp.stage,            reads: 12 个待跟进,     writes: user,   when: 拖一次看板卡片 }
    - { name: opp.last_activity_at, reads: 3 个超 10 天没动, writes: system, when: 保存一条跟进记录时自动写 }
                                    # ↑ 这一条是整个台子成立的关键：没人会去填
                                    #   「最后联系时间」，但人人都会写跟进记录

entities:                           # 数据模型 —— 让 hook 里的数字变成真的
  - name: Opportunity
    fields: [id, customer_id, title, amount, stage, owner, last_activity_at, created_at, closed_at]
    written_by:
      { title: user, amount: user, stage: user,
        last_activity_at: system, closed_at: system, created_at: system }
    relations: [Opportunity n-1 Customer, Opportunity 1-n Activity]
  - name: Customer
    fields: [id, name, phone, company, source, created_at]
    written_by: { name: user, phone: user, source: user, created_at: system }
    relations: [Customer 1-n Opportunity, Customer 1-n Contact]
  - name: Activity
    fields: [id, opportunity_id, type, content, next_step, created_by, created_at]
    written_by: { type: user, content: user, next_step: user, created_at: system }
                                    # 4-8 个实体就够。20 个是在做数据库设计，太早了

depends_on:                         # 还没接上的外部数据 —— 写下来，别烂在对话里
  - { field: 回款状态, source: 财务系统, exists_today: false,
      until_then: 先不放进首屏那条，「已成交」模块里手工标记 }

home:                               # 首屏从上到下
  - hook                            # 永远第一行
  - 我今天要跟的 5 个（按停留天数倒序）
  - 阶段漏斗小图
  - 本月成交列表

channels:                           # 系统域下 = 左侧主导航模块
  - name: 商机
    type: today
    weight: primary
    does: 拖动阶段推进商机、记跟进、看谁卡住了
    pages:                          # ← 没有这个，builder 只能给你九张一样的表
      - { level: L1, shows: 看板，列=阶段，卡片=商机（客户名·金额·停留天数）,
          filters: [负责人, 金额区间, 是否超期], actions: [新建, 拖动改阶段] }
      - { level: L2, shows: 商机详情 + 关联客户 + 全部跟进记录时间轴,
          actions: [记一次跟进, 改金额/阶段, 标记赢单/丢单] }
      - { level: L3, shows: 单条跟进记录（时间·方式·内容·下一步）, actions: [编辑, 删除] }
  - name: 客户
    type: record
    weight: regular
    does: 查客户、看跟他聊过什么、新建
    pages:
      - { level: L1, shows: 列表 + 搜索，默认按最近联系倒序,
          filters: [来源, 负责人], actions: [新建, 导入 Excel] }
      - { level: L2, shows: 客户档案 + 联系人 + 挂在他身上的商机,
          actions: [编辑, 新建商机] }
  - { name: 跟进记录, type: record,    weight: regular,
      does: 按时间看全部跟进，找上次说了什么,
      pages: [{ level: L1, shows: 时间轴列表, filters: [人, 时间段] }] }
  - { name: 月度复盘, type: review,    weight: regular,
      does: 看这个月成了几单、卡在哪个阶段最多、平均停留多久,
      pages: [{ level: L1, shows: 漏斗 + 阶段停留时长条形图 + 赢单/丢单原因 }] }
  - { name: 话术库,   type: knowledge, weight: occasional,
      does: 存常用报价说辞和异议处理,
      pages: [{ level: L1, shows: 分类列表 }, { level: L2, shows: 单条正文 }] }
  - { name: 设置,     type: knowledge, weight: occasional,
      does: 改阶段名称、加人、设超期天数,
      pages: [{ level: L1, shows: 分组表单 }] }      # 设置只有 L1

mvp: [商机, 客户, 跟进记录]
later: [月度复盘, 话术库]
visual: Linear 感，信息密度高，看板卡片克制，超期用一个颜色标出来就够
seam: { type: none, why: 内部工具，钱不在这一页上收 }
excluded:
  - 客户公海/抢单：他说十个人不需要抢
deferred:
  - 回款台：财务那边的事，等财务系统能给数据再说
---
```

**Why each of the four is non-negotiable:**

| Field | Without it the builder… |
|---|---|
| **`subject`** | builds modules around activities (数据管理 · 报表中心 · 系统设置) instead of the object, because nothing told him what the page is *about* |
| **`roles`** | invents a login and a permission matrix, or invents neither and then can't decide whose data a list shows |
| **`entities`** | invents a schema, and the schema he invents won't produce the 结论条 — **this is the field that makes the hook's numbers real** |
| **`channels[].pages`** | renders nine identical tables (`day-two.md` S2). **A module name is not a screen**: 「客户」 could be a table, a kanban or a map |

**Three rules on filling them:**

1. **`pages[].shows` names a shape**, not a topic. `表格` · `看板，列=阶段` · `卡片列表` · `时间轴` · `漏斗图`. One clause, and it's the clause that stops S2.
2. **`written_by` covers every field**, and the ones marked `system` are the spec's best work (`hook-engineering.md` §3 move 0). If everything is `user`, you've specified a data-entry job.
3. **`depends_on` is written even when it's empty-ish.** An integration that "we'll hook up later" is a load-bearing assumption; unwritten, it becomes a zero on the launch-day screen.

---

## 3. The prose half

Below the frontmatter, written **in Chinese, for the human**:

```markdown
## 这个台子是给谁的
{one paragraph — the person, the subject, and the evidence it came from.
 Quote his own words. This is the part that makes it feel like his,
 and the part he'll check first.}

## 每天怎么用
{the moment, the open, the hook, the one input. Narrate one ordinary day
 end to end — it's the fastest way for him to notice something's wrong.}

## 为什么是这几个频道
{one line per channel: what it's for and why it earned a slot.
 Name what was deliberately left out and why.}

## 已经想过但没做的
{the excluded and deferred items, with reasons. Prevents re-litigating.}
```

**The prose is not documentation of the YAML.** It carries what YAML can't: the evidence, the reasoning, and the rejected alternatives. A spec with only frontmatter passes to the builder and fails the human — and the human is the one who has to confirm it's right.

### 3.A `## 给实现方` — the section that makes the spec portable

`structure: care`, `type: today`, `shape: delta`, `weight: primary` are this method's private enums. **finesse-ui knows them; nothing else does.** §4 below is the translation table — and it lives in *this file*, which does not travel with the spec. So a spec handed to Cursor, v0, 通义 or a human contractor arrives with its most load-bearing fields unreadable, and the builder quietly renders six identical tabs and a greeting strip.

**Fix it inside the artifact.** Last section of the prose half, always written, no exceptions — it costs fifteen lines and it is the difference between a brief and a puzzle:

```markdown
## 给实现方（不熟悉本规范的 AI 或开发，照这段做即可）

- **首屏就按 home 里的顺序从上到下排**，第一行是 hook 那句话 —— 它是整个页面
  最重要的一行，不要缩成卡片标题，不要塞进顶部问候栏。
- **没有数据时显示 cold_start.day_1 那句话**，不要显示「暂无数据」「--」或空白。
  第一次打开的人只看得到这一屏，跳出了就没有第二天。
- **页面主体形态由 structure 决定**：
  cycle → 日历 · ledger → 曲线 · state → 今日结论卡 · runbook → 清单
  feed → 列表 · care → 时间轴 + 一条曲线 · operation → 大字数字看板
- **channels 就是导航**：≤5 个用底部 TabBar，6–9 个用侧边栏（或 TabBar + 更多）。
  - 每个频道里要做什么，看它的 `does`
  - `weight: primary` 的是默认打开项，视觉上明显重于其他，不是五等分里的一个
  - `type` 决定这个频道长什么样：today=每天内容都变 · record=录入 ·
    review=回看汇总 · knowledge=固定资料 · tool=计算器类 · outward=跳出去
- **第一版只做 mvp 里的频道**，later 里的先在导航上留位或者干脆不放。
- **录入入口的显眼程度看 dials.input**：6 分以上要有常驻按钮（FAB 或底部固定条），
  不能藏在二级页里。
- **每个频道都要有空状态**，文案写成一句能让人下一步动起来的话。
- **视觉方向按 visual 那一行**；它是从 user 和 owner 推出来的 —— 这个台子是给
  {user} 用的，不是通用后台，别做成默认蓝。
```

Fill the enum lines with **only the values this spec actually uses** — a `care` workbench's builder doesn't need the other ten structures. The list above is the menu you pick from, not the text you paste.

### 3.B `## 给实现方` for a system workbench

Same rule, different lines. A system spec's private vocabulary is `subject`, `entities`, `written_by`, `pages`, `L1/L2/L3`, `depends_on` — and a builder who ignores any of them ships the back office nobody uses.

```markdown
## 给实现方（不熟悉本规范的 AI 或开发，照这段做即可）

- **这是一个网页**（电脑浏览器里打开的 Web 页面），不是 App。没有推送，所以首屏
  最上面那条 hook 是唯一让人明天还回来的东西 —— 它是整页最重要的一行，
  不要缩成卡片标题，不要塞进顶部问候栏。
- **首屏按 home 的顺序从上到下排**，第一行是 hook。
- **hook 里每个数字都在 hook.fields 里标了来源**。`writes: system` 的字段是
  程序在某个动作发生时自己写的（比如保存一条跟进记录时顺手盖上时间），
  不要做成需要人填的表单项 —— 做成表单它就永远是空的。
- **depends_on 里的字段现在还没有数据源**。别在首屏显示它，也别显示 0，
  按 until_then 那一行处理。
- **数据库照 entities 建**：字段、关系都在里面。written_by 决定哪些字段有输入框、
  哪些是程序写的。
- **channels 就是左侧主导航**，每个的 `does` 是它能干什么。
  - `weight: primary` 的那个是默认落地页，视觉上明显重于其他，不是九等分里的一个
  - **每个模块的页面按 pages 建**：L1 是模块首页，L2 是单个对象的详情，
    L3 是详情里的子记录。**没有 L3 的模块就只做两层，不要为了对称硬造。**
  - **`shows` 那句话定了这一屏长什么样** —— 写「看板，列=阶段」就做看板，
    不要做成带状态列的表格。**不要九个模块九张一样的表。**
  - `actions` 是这一屏上要有的按钮
- **空数据时显示 cold_start.day_1 那句话**，它是一个动作（导入名单 / 建第一个 /
  录一条），不是「暂无数据」。**不要塞假的示例数据充场面** —— 真上线时会连假数据一起上。
- **roles**：opens_daily 的那个角色是主要用户，首屏为他建。角色之间只有数据范围
  差别的（「只看自己的」），做成筛选就行，不要做一整套权限系统。
- **第一版只做 mvp 里的模块**，later 的先在导航上留位或者干脆不放。
- **视觉方向按 visual 那一行。** 别做成默认后台蓝。
```

**Same rule as §3.A: paste only the lines this spec needs.** A spec with no `depends_on` doesn't need that line; a single-role spec doesn't need the roles line.

---

## 4. The mapping finesse-ui reads

This table is for the two skills to meet on; it stays here and does **not** go in the spec. §3.A/§3.B are the versions that ship inside the artifact, for everyone else.

| Spec | finesse-ui | Notes |
|---|---|---|
| `surface: phone` | register **`h5`** → morphology **A (app shell)** | a page in a phone browser; the rail becomes a bottom bar. **Not a native app** — no push, no splash, no store |
| `surface: desktop` | register **`product`** → sidebar shell | a page in a desktop browser. Almost every system workbench is this |
| `surface: both` | `product` + finesse-ui's `mobile-floor.md` | rarer than it sounds — pick one primary and say so |
| `channels[]` | the navigation | **≤5 → bottom bar; 6–9 → sidebar.** The count is a shell decision, not a detail |
| `channels[].weight` | visual hierarchy in the rail | `primary` is not one tab of five equals |
| `channels[].pages` | **the routes, and the depth the shell must support** | L2 needs a detail route and a back affordance; L3 needs a nested one. A shell built for L1 only has to be rewritten |
| `channels[].pages[].shows` | **what each screen actually is** | the single field that prevents nine identical tables |
| `hook.text` | **the first screen, above everything** | the page's most important element, not a greeting strip |
| `home[]` | the rest of the first screen, in order | fixes what sits *under* the hook |
| `channels[].does` | what each screen contains | a name alone leaves the screen to the builder's imagination |
| `entities` | **the tables, the forms, the columns, the filters** | and `written_by` decides which fields get an input at all |
| `depends_on` | what must not be rendered as a number yet | otherwise it ships as a hard-coded 0 |
| `roles` | whether there's a login and what it gates | roles differing only by data scope → a filter, not a permission system |
| `mvp` / `later` | build scope for v1 | `later` may hold a nav slot; `deferred` is a different workbench entirely |
| `visual` | the Design Read's starting direction | finesse-ui can derive one from `owner`/`subject` + `structure`; other builders can't |
| `cold_start.day_1` | **the empty state** | see §5 |
| `structure.primary` | the dominant data display | cycle → calendar · ledger → curve · state → verdict block · runbook → checklist · feed → list · care → timeline + curve · operation → figures · **pipeline → board · registry → list+detail · console → fleet cards sorted by failure · monitor → figures + anomaly list + drilldown** |
| `dials.input` | how prominent the entry affordance is | INPUT 6+ needs a permanent action button, not a buried form |
| `owner` / `subject` | the soul input | 毛孩子 and 摆摊 are different worlds; 围着客户转 and 围着商机转 are different products. This is what stops every workbench coming out the same shade of blue |

### The one thing to flag when handing off

**`structure.primary` should reach finesse-ui's Design Read.** A `ledger` workbench whose main screen isn't a curve, a `cycle` one without a calendar, **a `pipeline` one whose home page is a table, or a `monitor` one with no anomaly list** — all have lost their structure in translation, and it's a defect the builder can't detect on its own, because the page will look fine.

---

## 5. Cold start is the empty state, and the empty state is an image slot

`cold_start.day_1` becomes the screen he sees on his very first open — the highest-stakes screen in the whole workbench, since nobody who bounces there ever reaches day two.

Note what happens on the other side: **finesse-ui treats an empty state as a real image slot**, so its Design Read will name it in the `Images:` line and ask where the picture comes from before writing the layout. That's the intended behavior — the two skills meet exactly here. Make sure `cold_start.day_1` carries the *sentence*; the builder handles the picture, with its own ask-first gate.

Same for `channels[].type: review` — 成长相册 and 年报 are image-bearing by definition, and they're where a `care` workbench earns its recommendation.

---

## 6. Handing off — offer, then stop

```
spec 写好了：.workbench/spec.md

要我现在照这个把界面做出来吗？（会用 finesse-ui，先给你一个设计读解等你点头，
再开始写代码）还是你先看看这份定义，改完再做？
```

**Offer it and wait.** Building is a separate, expensive yes — he may want to sit with the definition, take the spec somewhere else, or build it himself. Auto-running a UI build off a freshly-approved definition spends his time on a decision he hasn't made, and the definition is the thing most worth sleeping on.

> **The exception is `sketch`, and it is not a loophole: he already said yes.** 「先给我看看效果」 *is* the go-ahead — asking again ("要我做出来吗？") after he asked to see it is the ceremony this rule exists to prevent, not the caution. Go straight through: starter → spec → build. **Then label what he's looking at** (SKILL.md §0.F): a rendered page reads as finished whether or not it is, and the whole point of the fast lane is that he objects to something concrete — which only works if he knows objecting is still expected.

**In a chat product (§1.A)** the closing line is different, because there's no file and the build isn't yours to run:

```
定义好了，上面整段复制走就能开工 —— 给 finesse-ui、给任何会写页面的 AI，
或者给写代码的人，都能直接读。

要改哪儿？（最常见的是那句每天看到的话，和左边的频道）
```

**If finesse-ui isn't installed:** say so plainly and hand him the spec anyway. With §3.A written, it is a genuinely complete brief for any builder — human or otherwise — and that section is the reason the claim is true rather than polite.

---

## 7. Revising a spec — every new fact reissues the whole thing

**The spec is the conversation.** After the V0 exists, the user is never answering questions into a void again — he is amending a document. So when he says 「其实是给我自己看的，不用给老板交」:

- **Wrong:** 「好的，明白了，那我们继续」 — now the fact lives in the chat history and the artifact is stale.
- **Wrong:** printing only the changed line — he has to hold the merge in his head.
- **Right:** reissue the spec with the 日报 channel gone, the hook rewritten, `excluded` updated, plus **one line naming what moved**. He looks at one thing, and that thing is better than it was.

This is what makes late questions safe. Asking 「要不要支持手机上用」 *before* a V0 is an interview; asking it under a definition he's already looking at is a refinement, and he answers it in three words because he can see what it changes.

On any later `hook` / `channels` / `narrow` / `monetize` run: read the spec first, change only the affected keys, and keep `excluded` and `deferred` intact — **those two fields are the memory of decisions already made**, and re-litigating them is how a tight definition slowly turns back into an app.

**Reissue cost is not a reason to skip it.** In a chat product that means printing the whole block again (§1.A). It is long; it is still cheaper than a user reassembling five messages into a mental spec, which is exactly the work this file exists to do for him.

If the UI is already built when the spec changes, say which built screens the change invalidates. A spec edit that silently desyncs from a shipped page leaves two sources of truth, and the page always wins by default.
