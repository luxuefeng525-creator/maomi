---
name: investigate-first
description: '编辑前先查清原因不明的失败。用于 原因不明、偶发、间歇、性能回归、需要证据排序假设的排查。'
---

# Investigate first

Gather evidence before changing product code.

- Separate observed symptom from inferred cause.
- Trace inputs, state transitions, ownership boundaries, and failure output.
- Rank hypotheses by evidence and cheap falsification value.
- Do not edit until one credible mechanism explains evidence.
- Stop exploration when evidence is sufficient to name cause or exact blocker.

Report cause and proof. Make no fix unless task authorizes implementation.
