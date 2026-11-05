# 评测与量化（按需加载 · 省 token 第一位）

对标 `anthropics/skills · skill-creator` 的 eval/benchmark 内核，**砍掉重资产**：不派双跑子代理、不起 HTML viewer、不用 Python 聚合、不调 LLM。
理由：完整方案本身极耗 token，与「省 Tokens 第一位」冲突。保留的是**可量化、可复现、确定性**的那一半。

## 何时用（仅用户要求时，不进每轮六步）
用户说「评测 / 命中率 / 基准测试 / A-B 对比 / 工作流有没有变好 / 省了多少 token」时才读本文并跑脚本。
**禁止**把评测塞进每轮六步——那会让每轮都变重。

## 三层量化（按 token 成本从低到高）

| 层 | 命令 | 成本 | 量化什么 |
|---|---|---|---|
| ① 触发准确率 | `node scripts/eval.mjs trigger` | **0 额外 token**（纯本地确定性打分，复用真实 `route.mjs`） | 技能「命中」准不准：precision / recall / F1 / 误命中清单 |
| ② 任务断言 | `node scripts/eval.mjs record ...` | 0（只记宿主实测值，不重跑任务） | 客观断言通过率 `pass_rate` |
| ③ 产出对比 | `node scripts/eval.mjs compare` | 0（只做统计） | with_skill vs baseline 的 pass / tokens / time **delta** |

第 ① 层是性价比最高、也最贴合「命中」诉求的一层：**改触发词或 description 后立刻能测出变好还是变坏**，且完全不消耗 token。

## 用例集 `evals/evals.json`
```json
{
  "skill_name": "ai-workflow",
  "trigger_cases": [
    {"id": 1, "query": "真实用户会说的一句话", "expect": "skill-name", "should_trigger": true},
    {"id": 2, "query": "含关键词但其实不该触发的 near-miss", "expect": null, "should_trigger": false}
  ],
  "task_cases": [
    {"id": 1, "prompt": "真实任务", "expected_output": "期望结果", "assertions": ["可客观验证的断言"]}
  ]
}
```
**负例必须 near-miss**（共享关键词/概念但语义不同）——skill-creator 明确指出，明显无关的负例测不出任何东西。

## A/B 同轮原则（对标 skill-creator）
同一迭代里 with_skill 与 baseline **必须同轮采集**，否则环境漂移会污染 delta。
- 新建技能：baseline = 无技能；改进技能：baseline = 改前快照（`cp -r` 到 `eval-results/skill-snapshot/`）。
- task 结束时宿主给出的 `total_tokens` / `duration_ms` **只在当时可得、不落盘就丢** → 立刻 `record`，不要事后补、更不要估算（禁猜）。
- 结果按 `eval-results/iteration-<N>/<config>/eval-<id>.json` 归档，`--iter` 控制迭代号。

## 断言写法
字段固定 `text` / `passed` / `evidence`（skill-creator 的 viewer 依赖这三个字段名，沿用以免分叉）。
断言必须**客观可验证**：文件存在、命令退出码、输出包含某串、数值区间。
**主观质量（文风、设计美感）不做断言**——交给人工定性评审，硬做成断言只会造假精度。

## 迭代循环
```text
改 SKILL.md / triggers.json → trigger 测命中率（0 token）→ 真实任务同轮采 A/B → record → compare 看 delta → 再改
```
结论口径：`pass_rate` 上升且 `tokens` 下降才算「工作流让产出更好」；单次结果不下结论，至少跨 2 次迭代看趋势。

## 红线（出现即纠）
- 禁编造 / mock 评测结果，禁把预期值当实测值写入 `record`
- 禁主观断言、禁单次下结论、禁只报 with_skill 不采 baseline
- 禁整份 dump 结果文件进上下文（默认只回 ≤6 行摘要，`--json` 才展开）
- 禁为了「全绿」删掉 near-miss 负例——**误命中被暴露正是评测的价值**
- 评测脚本绝不自动改技能、不自动提交、不调 LLM
- 禁不经控制变量就宣称「新版本更好」：必须同一用例集 + 同一技能集合；禁拿 F1 冒充「产出质量更好」

## 版本对比（0 token · blind comparison 的确定性替代）
`skill-creator` 的 blind comparison 要派独立子代理盲评两份产出——耗 token。这里用**确定性断言**替代：同一用例集、同一技能集合，跑两版路由，直接量化差异。
```bash
node scripts/eval.mjs snapshot ../ai-workflow-snapshot-v1   # 改包之前先存快照（放包同级）
node scripts/eval.mjs diff ../ai-workflow-snapshot-v1        # 改完对比，0 LLM
```
- `snapshot` 只复制文本脚本 + 用例 + 每个技能的 `SKILL.md`（`route.mjs` 仅读它），**不搬 77MB 资源**；两版技能集合一致 = 控制变量。快照放**包同级**，两版的宿主目录扫描也一致。
- `diff` 输出 `old F1 → new F1`、`ΔF1`、用例级 `GAIN/LOSS`（如 `#9 FP→TN`）、`VERDICT`（更好 / 无显著差异 / 存在回归）。**只有 F1 上升且 LOSS=0 才允许宣称新版本更好**。
- 已实测复现上一轮迭代：`old F1=0.76 → new F1=1.00 | ΔF1=+0.24 ΔFP=-5 | GAIN(5) LOSS(0) | VERDICT 新版本更好`。
- 这是**触发层**的量化；产出质量仍需 `record/compare` 的真实 A/B（那部分确实要花 token），不要拿 F1 冒充「产出更好」。

## 省 token 小结
细节只在命中时读；触发评测零 LLM；`record` 只记不重跑；默认输出极简；评测本身不进常驻入口（`SKILL.md` 只留一句指路）。
