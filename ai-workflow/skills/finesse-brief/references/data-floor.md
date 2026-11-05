# The Data Floor

> 摘自 SKILL.md，按需阅读（渐进披露）。

## 3. THE DATA FLOOR (the gate this skill exists for)

Full protocol in `references/hook-engineering.md`. **This is the one check that is never skipped, in any door, in either domain, for any structure.**

**For every hook clause, and every module claiming to show 「今天的」 anything, answer all five:**

| | Question | Fails when |
|---|---|---|
| 1 | **Which field does it read?** | The sentence needs data no one ever defined |
| 2 | **Who or what writes that field?** | See §3.C — and "the user will enter it" is a wrong answer more often in the system domain than a missing one |
| 3 | **When does it get written?** | No moment in anyone's day where they would |
| 4 | **What does it say on day one, empty?** | A blank, a `--`, a zero-row table, or a lie |
| 5 | **What on a skipped day / a disconnected source?** | It silently shows stale data as if it were current |

### 3.A The fortune-cookie test

Read the hook as it would render **on day 40, on a day nothing was logged and no job ran.** If it still reads the same as day 1, it is not a hook — it's a decoration that happens to be near the top of the page.

```
今天是黄体期第 3 天 · 今日 3 件小事    ← needs: cycle start date (user, once a month)
                                        day-one: 先记一下上次月经开始那天

今天推日 6 组 · 蛋白缺口 42g          ← needs: split schedule (derived from weekday — free)
                                        + today's intake (user, after each meal — expensive)

12 个商机待跟进 · 3 个超 7 天没动      ← needs: opportunity.stage + last_activity_at
                                        writes: 销售改阶段时 / 系统在写跟进记录时自动落
                                        day-one: 还没有商机 —— 导一份客户名单，或者先建一个

4 个在跑 · 1 个昨晚失败 · 本月 ¥320   ← needs: run.status (system, 每次运行落一条)
                                        + usage (integration, 模型接口回传)
                                        day-one: 先建第一个 Agent，跑完这儿就有数了

今天也要加油哦 ✨                      ← needs: nothing. Therefore says nothing. Banned.
共 1,284 个客户 · 系统运行正常          ← a constant and a tautology. Also banned.
```

**A hook with no variable in it is banned outright.** It is the single most common failure in this category and it is invisible at definition time, because it reads fine in a slide. **The system domain has its own version: a hook made of totals.** 「共 1,284 个客户 · 本月新增 32」 changes, technically, and tells him nothing to do. **A 结论条 must contain at least one clause that points at something requiring action today** — 待跟进 · 超期 · 失败 · 告警 · 缺货 · 待审 — or it's a stat strip, not a hook.

### 3.B When the field needs input he won't give

Four moves, in this order:

1. **Derive it** (weekday → 推日/拉日; 距考试天数 from one date; 订单状态 from a payment callback; 超期 from `last_activity_at` + now).
2. **Ask once, not daily** (cycle start; pet's birthday; the exam date; the monthly target; the alert threshold).
3. **Make the daily input a single tap** with a sensible default (「和昨天一样」; a kanban card dragged one column).
4. **Change the hook** to one the available data can support. **Doing this honestly is a success, not a compromise** — a true smaller sentence beats a false bigger one.

### 3.C The four writers — and why the system domain gets this wrong

Personal workbenches have essentially one writer: him. **System workbenches have four, and assuming the first one is how you get a beautiful console that renders empty.**

| Writer | Means | Costs | The trap |
|---|---|---|---|
| `user` | a person types or clicks it | **the most expensive thing in the spec** | Assigning three fields per module to `user` quietly builds a full-time data-entry job. Count them. |
| `system` | the workbench itself writes it as a side effect of an action already happening (a run finishes → a Run row; a stage is dragged → `last_activity_at`) | free | **This is the one to reach for.** Most good system hooks read `system`-written fields. |
| `integration` | another system supplies it (支付回调, 模型用量, 设备上报, ERP 同步, 导入 Excel) | **the field exists only if that integration is actually built** | The commonest lie in a system spec: 「数据从 ERP 来」 with no ERP, no API and no plan. **Write it down as a dependency or don't put the number in the hook.** |
| `derived` | computed from other fields at read time (超期 = now − last_activity_at > 7d; 缺口 = target − actual) | free | Only as real as its inputs. A derived field whose source is an unbuilt integration is not free, it's fictional. |

**The rule:** every field in the hook names its writer, and **any field written by `integration` names the source system and whether it exists today.** A spec whose 结论条 depends on three unbuilt integrations is a spec for a page that will ship blank — and that is exactly the failure this skill was built to prevent, in its corporate form.

---
