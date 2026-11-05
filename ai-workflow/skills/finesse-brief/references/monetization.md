# The Revenue Seam — Growing It Out of a Channel

Load this **after the channels are stable**, never before. A workbench designed around its seam is an ad with navigation.

---

## 1. The seam grows out of a channel, or it doesn't exist

暖宫贴 belongs on 疼痛急救 because that channel is already about relief. 补剂 belongs on 蛋白计算 because he is already looking at a gap and wondering how to close it. A standalone 商城 tab belongs nowhere, which is exactly what it reads as.

**The test:** name the channel the seam attaches to and the sentence that leads into it. If you can't, there is no seam yet — write `seam: none yet` in the spec and move on. **That is an honest answer and a common one.** A personal workbench that never sells anything is a fine outcome; a personal workbench with a fake shop is worse than both.

---

## 2. Seam types, by structure

| Structure | Natural seam | Attaches to | Why it works |
|---|---|---|---|
| `cycle` | phase-matched goods | the Review channel (年报), or a phase he's **not** currently suffering through | the phase predicts the need before it's urgent |
| `ledger` | goods serving the goal · a paid target/plan | the Review channel (曲线) | he's looking at progress and wants more of it |
| `state` | relief & improvement products | the verdict, when the verdict is mediocre-not-terrible | the product is the answer to the sentence he just read |
| `runbook` | **the plan itself** | the Today channel | the most honest paid thing in the category — he's paying for the thing he actually uses |
| `feed` | paid depth · courses · tools | the item he clicked | interest already demonstrated, at the moment it's demonstrated |
| `care` | goods for the subject | 红黑榜 (Knowledge) · 投喂 (Record) | spending on someone he loves; the least resented seam of all seven |
| `operation` | supply · tools · a paid tier | 进货清单 · 竞品价格 | he's a business; willingness to pay is highest here |

**The Review channel is the general-purpose honest seam.** He opens it deliberately, in a good mood, to look at something he's proud of. A recommendation there is read as a suggestion. The same recommendation on 疼痛急救 is read as exploitation, because it is.

---

## 3. The bans

### Never monetize a channel he opened while hurting or afraid

疼痛急救 during cramps · 宠物医院 at 2am · 情绪 on a bad day · 长牙/黄疸科普 with a crying baby · **任何跟孩子学习进度有关的位置**. These are the moments of highest conversion and highest damage.

> **Education anxiety deserves naming, because it is the largest version of this trap and an entire industry runs on it.** 「你孩子已落后同龄人 30%」 · 「同龄孩子这个阶段已经能…」 · a progress bar that sits below where it should be, next to a course link. It converts extremely well, it is the standard move in the category, and it is the one thing guaranteed to turn a 陪孩子学习台 into `day-two.md` D13 — a supervision tool that the mother resents opening and the child resents existing. **A comparison against other children is not information; it is a lever.** If the workbench has a subject who can be found lacking, no channel that measures him carries commerce. The Review channel — 这是他这一年写的 — is the honest seam, and it is a better one. **The conversion is real, which is why the rule has to be explicit** — and the damage is to the daily habit that the entire workbench depends on. You are trading the product for one sale.

Rule: **a channel whose reason-for-opening is distress carries no commerce.** It may carry information, including information that mentions a product exists. It does not carry a buy button.

### Never let the seam bend the advice

The moment 建议主推热饮 is influenced by who's paying for placement, the workbench is a different product and he will eventually notice. In a personal workbench the advice *is* the value; there is nothing left if it's for sale.

**Concretely:** the seam sits *beside* a recommendation, never *inside* it. 「今天该驱虫了」 is the advice. 「今天该驱虫了，用这款」 has merged the two, and now every future piece of advice is suspect.

### Never charge for the data he entered

His own records, exported or reviewed, are his. A paywall on 我的年报 after he spent a year feeding it is the most resented pattern in this category — and it converts badly on top of that, because the resentment arrives before the payment.

Chargeable: **computation, curation, plans, goods.** Not: **his own history handed back to him.**

### No fake urgency, no fake scarcity

仅剩 2 件 · 今日特价 on a page he opens every morning. He'll see the same "今日特价" tomorrow and the day after, and the credibility loss is permanent. (This mirrors the dark-pattern bans in finesse-ui's `commerce-ui.md` §6 — same principle, and here it's worse, because the surface is one he trusts daily.)

---

## 4. Seam shapes, ranked by how well they survive

| Shape | Survives | Notes |
|---|---|---|
| **The plan / the program** | best | he's paying for the thing he uses; no conflict of interest |
| **The artifact** — a printed 年报, a photo book | very well | one-time, joyful, made of his own data (sold as *production*, not as *access*) |
| **Goods for a subject he loves** (pet, baby, household) | well | affection absorbs commerce |
| **Goods for himself, on a Review channel** | okay | timing does the work |
| **Curated depth** (paid feed tier) | okay | only if the free tier is genuinely useful alone |
| **Placement / advertising** | badly | bends the advice (§3) |
| **Paywall on his own data** | worst | banned above |

---

## 5. When the workbench has no seam — say so

Many good personal workbenches have none: 独居工作台, 情绪台, 睡眠台 at small scale. **Write `seam: none yet` and one clause of why.** It's a decision the user can veto, and stating it prevents the reflex to invent one — which is how a shop tab appears on a mood tracker.

If he specifically wants revenue and the structure doesn't offer a natural seam, the honest options are:

1. **Change the structure** — add a `runbook` secondary, since plans are the cleanest paid object.
2. **Build the artifact** — the Review channel's output, made physical or sharable.
3. **Accept that it's a tool, not a business.** For a personal workbench this is the usual answer, and saying it plainly is more useful than engineering a seam that will make the thing worse.

---

## 5.A The system domain — `none` is the default, and inventing one is a defect

> **A CRM's revenue model is that someone paid for the CRM. A factory dashboard's is that it prevents downtime. Neither of those is a seam on the page, and putting one there makes the tool worse.**

**Write `seam: { type: none, why: 内部工具，钱不在这一页上收 }` and move on.** An internal workbench with an in-page 增值服务 module is the enterprise form of the pasted-on shop tab (`day-two.md` D8/S7): it's an orphan module, nobody uses it, and it tells the people who *do* use the tool that the tool is not on their side.

**Two genuine exceptions:**

1. **The workbench is itself the product, sold to outside users.** Then the seam is a commercial model — 席位 · 用量 · 模块解锁 · 存储容量 — and it goes in the spec as **one line**, because the pricing page is not this workbench and designing it is out of scope (SKILL.md §9). It still names the module it attaches to: usage-based pricing attaches to the `console` module that shows usage; seat pricing attaches to 设置/成员.
2. **The workbench serves someone who buys things to do the job** — 采购台 · 进销存 · 摆摊. Then supply is a legitimate seam and §1–§4's rules apply unchanged.

**The distress rule carries over intact, and in a work context it has a specific shape:** the module someone opens because something is on fire — 告警 · 故障 · 超时工单 · 事故 — carries **no** commerce and no upsell prompt. 「升级到专业版可查看完整告警历史」 on an incident screen is the exact move that gets a tool ripped out after the first real incident.

---

## 6. Recording it in the spec

```yaml
seam:
  channel: 口粮红黑榜        # the channel/module it grows from — required unless type: none
  type: goods                # plan | artifact | goods | curation | seats | usage | none
  trigger: 他主动查粮的时候    # when it appears, in his terms
  banned_channels: [宠物医院]  # distress channels, explicitly listed
```

```yaml
seam: { type: none, why: 内部工具，钱不在这一页上收 }   # the common system-domain answer
```

`banned_channels` is written down rather than remembered, because at build time — or in a later `monetize` run — the highest-converting placement will look attractive again, and the reason it was rejected will not be visible unless someone wrote it here.
