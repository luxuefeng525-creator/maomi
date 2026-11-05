# Clarification Doors

> 摘自 SKILL.md，按需阅读（渐进披露）。

### 0.D1 Door D — one routing question, covering both domains

**A question you must have answered before you can produce anything is a question that costs a round.** There is exactly one such question in Door D:

```
这个台子主要管什么？
工作 · 学习 · 创作 · 健康 · 财务 · 家庭 · 阅读 ·
客户/订单/库存这类业务 · AI 和自动化 · 一堆数据要盯着 · 别的都行

顺便一句，不答也行：这事你现在是拿什么在凑合？备忘录、Excel、飞书表格，
还是好几个后台来回切？答了这版就照你的来，不答我先给个通用的，你再改。
```

The optional second question is the makeshift tool — the highest-yield evidence there is, free to ask, **explicitly skippable**, and it works in both domains (「三个后台来回切」 is exactly as diagnostic as 「一个备忘录」). Answered, the V0 is *his*. Skipped, you still ship a V0.

**His answer routes:** a personal word → Door Q, assert next turn. A system word → Door S, ask §0.D2. **Never hold the draft hostage to the optional answer.**

### 0.D2 Door S — the two-question round, and then you're done asking

Full protocol in `references/system-domain.md` §1. The budget is **two messages, and often one**, because a system workbench genuinely can't be guessed the way 「养宠物」 can: the same word 「CRM」 covers a solo consultant's contact page and a forty-seat sales floor, and those are different products.

**Message one — two questions, one message:**

```
两个问题就够了：

1. 这个台子主要围着什么转？（客户 · 订单 · 项目 · 设备 · Agent · 内容 · 学员 · 别的）
   ——就是那种你会说「一共有多少个」的东西。

2. 平时谁在用？就你自己 · 一个小组几个人 · 好几种岗位（比如销售和主管看的不一样）
```

**Message two — one question, and it decides the first screen:**

```
最后一个：每天在上面最常做的是哪两三件？
推进某个东西往下一步 · 看今天的数 · 录入或导入数据 · 审批 ·
处理异常和告警 · 配置调参 · 和 AI 对话
```

**Then the whole spec. No third round.**

Three rules keep this from turning into the interview it replaces:

1. **Already-known is never re-asked.** 「我想做个 CRM，我们十个销售」 answers 主对象 (客户) and 谁在用 (一个小组). **Only question 3 is left — ask it alone, in one line.** Re-asking what he just told you is the single fastest way to look like a form.
2. **Merge when you can.** If he gave you two of three, both remaining questions go in one message and you assert next turn.
3. **Never ask a fourth.** Everything else — 要不要移动端 · 要不要导出 · 权限怎么分 — is a *refinement to a spec he's looking at*, and it costs three words to answer there instead of a round to answer here (§0.E).

### 0.E Assert first, refine forever — the principle behind every door

> **The moment you know enough, produce the whole thing. Then never go back to asking; only to revising.**

**A short input is not a thin brief; it is a normal one.** 「养宠物」 carries a structure, a moment, a hook shape and a field set that are the same for almost everyone who says it — the ones that aren't (猫 vs 狗 vs 异宠) are fill-in slots, not a reason to interview him. **In the system domain the same holds one level up:** 「AI Agent 工作台」 carries a structure (`console`), a subject (Agent), a module set (总览 · Agent · 运行记录 · Workflow · 用量) and an entity skeleton (Agent, Run, Tool) that are the same for nearly everyone who says it. The two questions in §0.D2 exist to fill the slots that genuinely vary — **not to discover what a CRM is.**

> **He never sees that a starter library exists — and that includes saying it doesn't cover him** (§0.H). Showing the list turns this back into the category menu §0.B bans; announcing a *miss* is worse, because now he's guessing keywords instead of reacting to a workbench.

**Why this works:** a person cannot specify a workbench from nothing, and he can find ten things wrong with one in front of him in fifteen seconds. **Objections are cheap to produce and expensive to elicit.** 「不对，我不管模型费用」 is specific, volunteered and concrete — more than three polite answers to questions asked before he had anything to react to.

**Every subsequent turn revises the whole definition, never just answers the question.** He says 「其实是给我自己看的，不用给老板交」 — you don't reply 「好的，明白了」; you reissue the definition with the 日报 module gone and the hook rewritten, and note in one line what moved. **He should always be looking at a single artifact getting better.**

**Why this doesn't reopen the data-floor hole:** every starter and every category skeleton arrives with its fields already bound to writers and its day-one line already written. The fast lane is fast because the skeleton is **pre-solved**, not because §3 was skipped. **Speed comes from having the answer ready, never from lowering the bar.**

**The obligation the fast lane adds:** change at least one thing using something he actually said. **A skeleton delivered verbatim is the 品类平均款** — precisely what he could have downloaded.

### 0.F `sketch` — when he'd rather see it than read it

「先给我看看效果」·「直接做出来我看看」·「能不能先出个样子」. Take it literally. **Many people cannot evaluate a spec and can evaluate a screen instantly.**

The path: **skeleton → fill → spec (fast) → hand straight to finesse-ui → label it a starting point.**

```
先给你看个样子 —— 这是起点，不是定论。看到实物你大概会立刻发现哪儿不对，
那时候说的比现在猜的准。

{hand off to finesse-ui with the spec}
```

Three rules keep it honest:

1. **Label it, every time.** A rendered page reads as finished whether or not it is.
2. **The gates still ran.** Fields bound, day-one line written, module mix legal. `sketch` skips the *conversation*, never §3.
3. **The first objection is the real brief.** Route it back through the verbs — 「每天没啥可看的」 → `hook`; 「太多了」 → `narrow`; 「不像我们的业务」 → the personalization obligation wasn't met.

> **In the system domain `sketch` still costs the two questions.** A guessed 主对象 produces a page about the wrong noun, and that isn't a starting point he can correct — it's a page he has to throw away. Ask the two, then go straight through.

### 0.F2 How to actually ask — the mechanics, in every host

This skill runs in Claude Code, Cursor, Trae, CodeBuddy, Copilot, 元宝, 豆包 and web assistants. **Only some of them have a structured question tool, and the questions in §0.D1/§0.D2 are shaped like multiple choice** — so this needs saying:

1. **If a structured question tool (`AskUserQuestion` or equivalent) exists, use it** for the routing question and the system-domain round. Those are the only places in the whole method where one belongs.
2. **If it doesn't, ask the identical question as plain text** — the option list written inline, exactly as it appears in §0.D1/§0.D2. **Never degrade the question into an open one** (「你想做个什么样的工作台？」) because the tool is missing; the options are what make it answerable in one word.
3. **One message, then STOP and wait.** Do not ask the question and then keep going into a V0 built on a guessed answer. **Never treat a file on disk, a prior session, or your own inference as the answer to a question you asked this turn.**
4. **Never use a structured question tool anywhere else.** Not for 「这样对吗？」, not for confirming the spec, not for the handoff offer. Everything after the V0 is a revision to an artifact he's looking at, and turning that into a poll is the interview §0.E exists to prevent.

### 0.G Say it in words he can act on

`structure=console`, `CADENCE=daily`, `Record 频道`, `data floor`, `L2` are internal vocabulary. **First time a term must appear in user-facing text, follow it with a one-clause plain gloss; after that use it bare — or better, don't use it at all.** Reason in whatever vocabulary you like; write to him in his.

**The one exception is the spec file itself**, which is written for a builder and where `entities`, `pages` and `L1/L2/L3` are the point — and even there, `## 给实现方` translates them (§8).

### 0.H Never narrate the method

§0.G governs *words*. This governs *whole sentences* — and it's the more commonly broken of the two, because the material is genuinely interesting and it's the easiest thing in your context to hand over.

> **Everything the user reads must be about his workbench. Nothing he reads may be about how you arrived at it.**

| Banned | Why it leaks | Instead |
|---|---|---|
| Mentioning the starter library **at all, including by negation** — 「没有现成的『工作日』骨架，我给你组合一个」 | Denying a list still reveals the list, and the session turns into guessing keywords | Just compose it and show it. A composed skeleton passes the same gates |
| Structure names, dials, type labels **anywhere in user-facing text** — 「(结构：台账为主 + 复盘为辅)」·「这天然就是个『知识频道』」 | §0.C's ban is about the *reader*, not that one code fence | 「主要是攒记录，顺带每周回看一次」 |
| Explaining a rule of this skill — 「录入 30 秒，回报是一份周报，这样才活得过第二周」·「菜单只会让你随手点第一行」 | That's §1.B and §0.B recited to the person they were written to protect. Reads as a competent lecture, delivers nothing actionable | Apply the rule silently. If it needs defending, defend it in his terms: 「记多了你一周就烦了，所以我只要一句话」 |
| Announcing the domain fork — 「这属于系统型工作台，所以我要多问两个问题」 | §0.A is a classification *you* run. Saying it out loud makes him audit your taxonomy instead of answering | Just ask the two questions. 「两个问题就够了」 is a promise about his time, which is legal |

**Two exceptions, both narrow.** State a *consequence* he must judge — 「录入我压在你崩掉的那个阈值以下」 — that's about his week, not your method. And label a `sketch` output as a starting point, which is a status, not a rationale.

**The test:** delete the sentence. Is his workbench any worse defined? No → it was for you, not him.

---
