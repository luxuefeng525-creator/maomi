# 模型侧复跑 · 会话提示模板

用途：把行为场景交给「独立上下文会话」重跑，而不是只跑一次。一次子代理调用或一次新会话 = 一个样本。

## 步骤

```powershell
# 1. 准备沙箱（每场景每轮一个目录）
node scripts/behavior-check.mjs prepare --scenario B3-tiny-change --sandbox tests/behavior/.model-runs/r1/B3-tiny-change

# 2. 用下面模板启动一个新会话 / 子代理（替换 <SANDBOX>）

# 3. 检查产物与回复
node scripts/behavior-check.mjs check --scenario B3-tiny-change --sandbox tests/behavior/.model-runs/r1/B3-tiny-change --response tests/behavior/.model-runs/r1/B3-tiny-change/response.md
```

## 模板

```text
你是独立会话。工作目录：<SANDBOX>
只在工作目录内读写文件；不要用 git；不要启动服务；不要修改工作目录外的任何文件。
请把下面这条用户消息当作任务执行，完成后把「给用户的最终答复正文」原样写入工作目录下的 response.md（UTF-8），回复里不要写过程日志。

用户消息：<scenarios.json 里的 prompt，工作目录替换为 <SANDBOX>>
```

## 规范

- 模板只加「沙箱边界 + 回复落盘」，不改场景 prompt 的意图；否则测的就不是该场景。
- 子代理不能派生代理时，B5 按车道等价执行，并在回复里如实记录，不得伪造子代理痕迹。
- 新会话的技能列表与 Hook 环境可能和完整 IDE 会话不同，结论只对「同宿主模型 + 同等约束」成立。
- 断言是文本级：回复语义正确但用词不同会误判。遇到 partial 先读回复原文，再决定是模型问题还是断言太窄；改断言要在报告里披露。
