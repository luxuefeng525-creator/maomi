# Starters — Pre-Bound Skeletons for the Two-Word Entry

The fast lane. A user types 养宠物 and expects to see something, not to be interviewed. This file is what lets you **assert a complete workbench from one or two words in a single turn** — without dropping the data floor, because every skeleton here arrives with its fields already bound.

> **This file covers the personal domain.** If the input passed SKILL.md §0.A's test — 「一共有 N 个 X」, 「CRM」, 「Agent 工作台」, 「给工厂做个看板」 — **go to `system-domain.md` instead.** Its §6 is the same idea one level up: a per-category skeleton (主对象 · 结构 · 模块 · 结论条形状 · 最常见的失败) that you assert from. The difference is that a system workbench costs **two questions first** (`system-domain.md` §0), because the same word covers products that aren't alike — and a wrong 主对象 produces a page about the wrong noun, which is not a starting point he can correct.
>
> **Everything else transfers unchanged:** never show the list, one skeleton not a menu, personalize at least one thing, and the gates still run.

---

## 1. What these are, and the one way to misuse them

**A starter is a first move, not an answer.** It is the median workbench for a domain: correct structure, legal channel mix, a hook with real variables, fields already bound, a written day-one line. It is *good enough to show* and **not good enough to ship**.

> **The rule that keeps this from becoming the category menu `discovery.md` §1 bans: never show the list.** The user types a word; you return **one** filled-in workbench. He never sees that a table existed. A menu asks him to choose; a starter asks him to react — and reacting is what produces information.
>
> **"Never sees" includes never being told his word missed.** 「没有现成的『工作日』骨架，我给你组合一个」 leaks the whole mechanism: he now knows there's a skeleton library, that some inputs hit it, and that his didn't — so he starts hunting for a word that lands instead of reacting to the workbench in front of him. **A composed starter (§4) is not a downgrade and must not be announced as one** — it runs the same gates and arrives just as filled-in. Show it exactly the way you'd show a matched one, and say nothing about where it came from (SKILL.md §0.H).

**And always change at least one thing using something he said.** A starter delivered verbatim is the 品类平均款 — exactly what he could have downloaded, and exactly what this skill exists to beat. Rename it with his subject's name (豆豆, not 宠物), or move the moment, or cut a channel his one sentence made irrelevant. **If he gave you nothing to personalize with, say so and ask for the one thing that would**:

> 这是个起点，还不是你的。告诉我一件事我就能改准：{the highest-yield question for this domain}

---

## 2. How to run the fast lane

```
short input ("养宠物" / "记账" / "陪孩子学习")
  → match a starter (§3)                       — one, not a list
  → fill in what he gave you                   — name, subject, moment
  → output the V0 (SKILL.md §0.C)              — Read with REAL values,
                                                  then the buildable definition
  → then one of:
      "看着对" → refine → spec → offer to build
      "不对"   → he'll tell you why; that objection is worth more
                  than three evidence questions would have been
      "先给我看看" → sketch (SKILL.md §0.F): spec + hand straight to finesse-ui,
                     labeled a starting point
```

**No match?** Don't force one. Identify the structure from the words he used (`workbench-types.md` §choosing), then compose from `grammar.md` — the starters cover common domains, not all domains, and a forced match is worse than an honest composition.

### 2.A When the input is a domain, not a category — narrow it yourself, don't ask

Door D returns one word from a *routing* list: **工作 · 学习 · 创作 · 健康 · 财务 · 家庭 · 阅读** (the personal half; the system half — 客户/订单/库存这类业务 · AI 和自动化 · 一堆数据要盯着 — routes to `system-domain.md` instead). None of the personal ones matches a skeleton, and none of them is a workbench — 「健康」 contains a hundred. **The wrong move is to hand the breadth back to him** (「健康具体是指哪方面呢？运动、睡眠、还是体检？」): that's the category menu one level down, and it costs the round §0.D1 just saved.

**Pick the most common workbench inside that domain, build it, and say what you assumed in one clause.** He corrects a concrete guess instantly; he answers a scoping question slowly and often wrongly.

| He said | Assume | Because |
|---|---|---|
| 工作 | 今天做了什么 → 自动周报（ledger + review） | the near-universal pain is 周报时想不起来干了啥, and it's the one with a real weekly payoff |
| 学习 | 距目标日 + 今天该做的（cycle + runbook）；**if a child is mentioned, `workbench-types.md` §6.A applies** | almost always aimed at an exam or a course with an end date |
| 创作 | 灵感捕捉 → 选题池 → 发布进度（ledger + operation） | the bottleneck is retrieval, not writing |
| 健康 | 今天的一个数 + 它的曲线（ledger） | the payoff is a curve he can't hold in his head |
| 财务 | 记一笔 → 这个月花在哪（ledger） | already the 记账 starter — use it |
| 家庭 | whichever member he mentions, else 家里的事该谁做（runbook + care） | it's a care structure with a subject who can object — §6.A |
| 阅读 | 在读的 + 读完的 + 划的线（ledger + review） | 第二大脑 without the retrieval problem is just a bookshelf |

**Say the assumption in one clause inside the V0, never as a preamble:** 「先按最常见的那种做了 —— 每天记一句今天干了啥，周五自动攒成周报。要是你想管的是别的，说一声。」 One line, inside the artifact, and he corrects it against something real.

**Multiple matches?** Pick the one his words point at hardest and say what you assumed. 「学习」 could be his own study or his kid's; pick, name the assumption in one clause, move on.

---

## 3. The starters

Format per entry: `structure · moment · hook · bound fields · day-1 · channels (type) · seam`.
Channel types: `T`oday · `R`ecord · `V`iew(review) · `K`nowledge · `O`utward · `X`(tool).

---

### 经期 · 姨妈

- **structure** cycle + state · **moment** 早上醒来
- **hook** `黄体期第 3 天 · 今天容易累，别排硬任务`
- **fields** `cycle_start`(user, 每次来时点一下) · `avg_len`(derived, 3 次后自动) · `feeling`(user, 一天一次一个表情)
- **day-1** `先记一下这次月经开始那天，我就能告诉你现在在哪一段、接下来几天会怎样。`
- **channels** 今日体感(T) · 周期日历(R) · 情绪波动(R) · 疼痛急救(K) · 暖宫食谱(K) · 运动建议(K) · 我的周期报告(V)
- **seam** 我的周期报告 → goods(暖宫贴/红糖姜茶) · **banned** 疼痛急救
- **highest-yield question** 你更想要提前预警，还是当天不舒服时的应对？

### 增肌 · 健身

- **structure** ledger + runbook · **moment** 练完那一下
- **hook** `今天推日 · 卧推上次 60kg×8，今天试 62.5`
- **fields** `split`(derived, 周几→部位) · `last_set`(user, 练完一键) · `bodyweight`(user, 每周)
- **day-1** `先记一次卧推，我就能告诉你下次该加多少。`
- **channels** 今日训练(T) · 力量曲线(V) · 动作库(K) · 蛋白计算(X) · 体态照片(R) · 打卡墙(V)
- **seam** 力量曲线 → plan(付费计划) / goods(补剂)
- **note** 饮食记录是这个域最大的弃用源。**默认不放**，他主动要才加(`hook-engineering.md` §3)。
- **highest-yield question** 你之前有没有用崩过某个健身 App？为什么？

### 睡眠

- **structure** state + runbook · **moment** 睡前 / 早上第一眼
- **hook** `昨晚 5h20m，比你这周平均少 40 分钟 · 今晚 22:30 开始收尾`
- **fields** `sleep_time`(user 一键 或 external 手环) · `wake_time`(同上) · `caffeine_last`(user, 喝的时候点一下)
- **day-1** `今晚睡前点一下"我睡了"，明早就有第一条。`
- **channels** 昨夜复盘(T) · 睡眠仪式(R) · 咖啡因倒计时(X) · 助眠音频(K) · 梦境日记(R) · 睡眠周报(V)
- **seam** 助眠音频 → curation(会员)
- **dies by** 每天结论都一样 —— 让**后半句**(今晚怎么办)变化，而不是前半句。

### 备考 · 上岸

- **structure** cycle + ledger · **moment** 早上开始学之前
- **hook** `距考试 118 天 · 昨天 30 题正确率 73%，今天先补行测判断`
- **fields** `exam_date`(user, 一次) · `daily_count`(user, 一键) · `weak_topic`(derived, 错题聚类)
- **day-1** `告诉我考试哪天，我就把倒计时和每天的量算好。`
- **channels** 今日刷题(T) · 错题本(R) · 时政日报(K) · 上岸日记(R) · 提分曲线(V) · 院校情报(O)
- **seam** 提分曲线 → plan(规划) · **banned** 上岸日记(他情绪低时写的)
- **note** situational name —— 考完那天要有个终局页(`grammar.md` §2)。

### 英语 · 背词

- **structure** ledger + runbook · **moment** 通勤
- **hook** `今天 5 个新词 + 12 个该复习了 · 昨天跟读得分 82`
- **fields** `known_words`(user, 每次学完自动) · `review_due`(derived, 遗忘曲线) · `streak`(derived)
- **day-1** `先测 20 个词，我就知道你在哪一档、每天该给你几个。`
- **channels** 今日 5 词(T) · 复习队列(R) · 影子跟读(R) · 词汇量曲线(V) · 场景对话(K) · 打卡墙(V)
- **seam** 词汇量曲线 → plan / curation

### 养宠 · 毛孩子（**物种是填空，不是预设**）

- **structure** care + ledger · **moment** 早上喂完那一下
- **hook** `豆豆今天该驱虫了 · 体重 4.2kg（比上月 +0.1）`
- **fields** `birthday`(user, 一次) · `last_deworm`(user, 完成时点一下) · `weight`(user, 每周)
- **day-1** `先记一下它的生日和上次驱虫时间，我就能开始提醒你。`
- **channels** 今日投喂(T) · 体重曲线(V) · 疫苗驱虫(R) · 成长相册(V) · 口粮红黑榜(K) · 宠物医院(O)
- **seam** 口粮红黑榜 → goods · **banned** 宠物医院
- **highest-yield question** 什么宠物？叫什么？几岁？
- **⚠ 别把这个骨架当成猫台。** 上面六条对猫、狗、兔、鼠、龟都成立 —— 生日、驱虫、体重、口粮是所有伴侣动物共用的底座，所以频道名保持物种中立（`口粮`，不是 `猫粮`）。**物种是他一句话就能填的空，也是最省力的那次个性化**（§1）：
  - **猫** —— 加 `猫砂/如厕`(R)；体重曲线的意义是**早期肾病/甲亢信号**，钩子可以说「比上月 −0.3kg，猫掉秤要留意」；室内为主，`今日投喂` 就是 Today
  - **狗** —— Today 换成 `今日遛狗`（时长/次数比投喂更是他每天真正在做的那件事）；加 `训练/社交`(R)；体重看的是**超重**不是掉秤
  - **兔 / 鼠 / 龟等异宠** —— `口粮红黑榜` 的价值权重更高（信息稀缺、踩坑代价大），`宠物医院` 要改成 `能看异宠的医院`，这是这类主人真实的痛点
  - **多只** —— 「我有两只」是最常见的第一个反对意见。别做成两个台子：主体从一只变成一个**列表**，钩子只播报**今天有事的那只**（`豆豆该驱虫了 · 花花一切正常`），否则每天的钩子会被摊平成一张表

### 育儿 · 0–3 岁

- **structure** care + ledger · **moment** 哄睡后
- **hook** `第 187 天 · 今天可以练扶站了 · 昨天睡了 11h（比上周少 40min）`
- **fields** `birth_date`(user, 一次) · `sleep`(user, 一键) · `feed`(user, 一键) · `milestone`(derived, 按月龄)
- **day-1** `告诉我他的生日，我就能按天告诉你现在该关注什么。`
- **channels** 今日发育(T) · 喂养记录(R) · 睡眠作息(R) · 成长报告(V) · 长牙/黄疸科普(K) · 亲子游戏(K)
- **seam** 成长报告 → artifact(成长册) / goods(辅食) · **banned** 长牙/黄疸科普
- **note** 两个 Record 已是上限；再加一个就是 input debt(`day-two.md` D3)。科普内容必须有真实来源(D12)。

### 陪孩子学习 · 学龄

- **structure** care + ledger · **moment** 孩子写完作业那一下
- **hook** `这周读了 4 天 · 昨天新学的 12 个词今天该过一遍`
- **fields** `read_today`(**孩子自己点** 或 家长一键) · `new_words`(user, 拍作业本) · `weekly_test`(user, 每周一次)
- **day-1** `先记一次今天读了什么，一句话就行。`
- **channels** 今天读了什么(T) · 词句本(R) · 每周一张画/一段话(V) · 成长时间线(V) · 学习方法(K)
- **seam** 成长时间线 → artifact(年度作品册) · **banned** 所有含"落后/差距/排名"的位置
- **⚠ 主体有自主意识 —— 这个 starter 的约束和上面两个 care 完全不同。** 读者是两个人(妈妈和孩子),钩子说的是**进展不是缺口**,记录默认**孩子可见**。完整规则:`workbench-types.md` §6.A 与 `day-two.md` D13。**默认降到周级 CADENCE**,记结果不记过程 —— 日级过程记录几乎必然滑向监督。
- **highest-yield question** 这个台子孩子自己看不看？

### 家庭饮食 · 一家三餐

- **structure** care + ledger · **moment** 做饭前
- **hook** `今天 1250/2000 kcal · 晚餐还有 750，冰箱里有西兰花和鸡胸`
- **fields** `meals`(user, 拍照识餐) · `target`(user, 一次) · `stock`(user, 采购时)
- **day-1** `先拍一顿饭，我就能开始帮你算。`
- **channels** 今日菜单(T) · 拍照识餐(R) · 采购清单(X) · 低脂餐谱(K) · 宝宝辅食(K) · 本周复盘(V)
- **seam** 采购清单 → goods

### 理财 · 早八财经

- **structure** feed + state · **moment** 早上通勤
- **hook** `今天 3 条跟你持仓有关的 · 一句话：你那只医药昨天的跌是行业性的，不是公司出事`
- **fields** `holdings`(user, 一次+调仓时) · `news`(external) · `relevance`(derived, 持仓×新闻)
- **day-1** `告诉我你拿了哪几只，我就只给你看跟你有关的。`
- **channels** 今日必读(T) · 持仓体检(R) · 认知笔记(R) · 早报(K) · 复盘周记(V)
- **seam** 认知笔记 → curation · **banned** 任何含买卖建议的位置
- **⚠** 内容不能编造,必须有真实来源(`day-two.md` D12)。**不提供投资建议** —— 翻译和关联,不是荐股。

### 摆摊 · 小店

- **structure** operation + feed · **moment** 收摊后
- **hook** `今日流水 486 · 明天有雨，建议多备热饮少备冰粉`
- **fields** `revenue`(user, 收摊时一次) · `cost`(user, 进货时) · `weather`(external) · `waste`(user, 一键)
- **day-1** `今天收摊记一笔流水就行，三天后我就能看出规律。`
- **channels** 今日流水(T) · 进货清单(R) · 月度账本(V) · 选址天气(O) · 爆品情报(K) · 文案生成(X)
- **seam** 进货清单 → goods/tools
- **note** 记账必须比本子快,否则他就回去用本子(`workbench-types.md` §7)。

### 独居 · 一人生活

- **structure** state + runbook · **moment** 睡前
- **hook** `今天你记了 3 件小事 · 这周第 4 天，比上周多一天`
- **fields** `mood`(user, 一天一个表情) · `three_things`(user, 可选) · `streak`(derived)
- **day-1** `今天怎么样？点一个表情就行，别的都不用。`
- **channels** 今日情绪(T) · 三件小事(R) · 一人食(K) · 呼吸练习(X) · 年度回顾(V)
- **seam** **none yet** —— 情绪域的变现几乎总是掠夺性的,默认不做(`monetization.md` §5)。
- **note** INPUT 必须极低(一个表情)。这个域的用户在状态最差时最需要它,而状态最差时录入意愿为零。

---

## 4. Composing a starter for an uncovered domain

The starters are common domains, not all domains. For anything else, compose in this order — it takes about as long as reading one starter:

1. **Structure** — what would he lose if it vanished for a month? (`workbench-types.md` §choosing)
2. **Moment** — when in his existing day? (`SKILL.md` §4)
3. **Hook** — the structure's shape, with real values (`hook-engineering.md` §6)
4. **Fields** — derive first, ask-once second, one-tap third (`hook-engineering.md` §3)
5. **Channels** — one T, ≥1 R, ≥1 V, K ≤⅓, 4–9 total (`grammar.md` §4.A)
6. **Seam** — from a channel, or `none yet` (`monetization.md`)

**Then run the same day-one line and the same fortune-cookie test.** A composed starter gets no discount on the gates; the fast lane is fast because the skeleton is pre-solved, not because the checks were skipped.
