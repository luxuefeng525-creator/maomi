#!/usr/bin/env node
/**
 * 自测：技能门禁、记忆四行为、UI 审计正反例、安装预览。
 * 用法：node tests/run.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, '..');
const tmp = path.join(testsDir, '.tmp');
const node = process.execPath;

let pass = 0, fail = 0;
const check = (ok, name, detail = '') => {
  if (ok) { pass++; console.log('PASS | ' + name + (detail ? ' | ' + detail : '')); }
  else { fail++; console.log('FAIL | ' + name + (detail ? ' | ' + detail : '')); }
};
const run = (script, argv, cwd = root) => spawnSync(node, [script, ...argv], { cwd, encoding: 'utf8' });

fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

// 1. 技能门禁
const v = run(path.join(root, 'scripts', 'validate.mjs'), [], root);
check(v.status === 0 && /FAIL=0/.test(v.stdout), '技能门禁 FAIL=0', (v.stdout || v.stderr).split('\n').slice(-2).join(' '));

// 2. 记忆四行为
const mem = path.join(root, 'skills', 'project-memory', 'scripts', 'memory.mjs');
const memRoot = path.join(tmp, 'mem');
const init = run(mem, ['init', '--root', memRoot]);
check(init.status === 0, 'memory init');
const a1 = run(mem, ['append', '--root', memRoot, '--type', 'decision', '--text', '统一口径：先定档再动手', '--evidence', 'tests', '--impact', '无']);
check(/APPEND id=[0-9a-f]{8}/.test(a1.stdout), 'memory append 首次写入', a1.stdout.trim());
const id = (a1.stdout.match(/id=([0-9a-f]{8})/) || [])[1] || '';
const a2 = run(mem, ['append', '--root', memRoot, '--type', 'decision', '--text', '统一口径：先定档再动手', '--evidence', 'tests', '--impact', '无']);
check(/SKIP/.test(a2.stdout), 'memory append 幂等去重', a2.stdout.trim());
const s = run(mem, ['search', '--root', memRoot, '--query', '定档']);
check(s.status === 0 && /topics\.md:\d+/.test(s.stdout), 'memory search 命中行号', s.stdout.split('\n')[0]);
const inv = run(mem, ['invalidate', '--root', memRoot, '--id', id, '--reason', '测试失效']);
check(inv.status === 0 && /INVALIDATE/.test(inv.stdout), 'memory invalidate');
const s2 = run(mem, ['search', '--root', memRoot, '--query', '定档']);
check(/\[失效\]/.test(s2.stdout), 'memory 失效标记');
const rep = run(mem, ['report', '--root', memRoot, '--threshold', '0.8']);
check(/条目=/.test(rep.stdout) && !/疑似重复=[1-9]/.test(rep.stdout), 'memory report 排除失效条目', rep.stdout.trim().split('\n').pop());

// 3. UI 审计正例
const passVue = path.join(tmp, 'pass.vue');
fs.writeFileSync(passVue, `<template>
  <view>
    <image src="/a.png" alt="水桶" />
    <button :disabled="busy" @click="submit">{{ busy ? '提交中' : '保存地址' }}</button>
    <view v-if="loading">加载中</view>
    <view v-else-if="list.length === 0">还没有订单，去订水</view>
  </view>
</template>
<script setup>
import { ref } from 'vue';
const busy = ref(false); const loading = ref(false); const list = ref([]);
const submit = () => { try { uni.navigateBack(); } catch (e) { console.error(e); } };
</script>
<style>
.card:hover { opacity: .9; }
.card:focus-visible { outline: 2px solid #333; }
</style>
`, 'utf8');
const up = run(path.join(root, 'skills', 'ui-ux-benchmark', 'scripts', 'ui-audit.mjs'), ['--files', passVue], root);
check(up.status === 0 && /FAIL=0/.test(up.stdout), 'ui-audit 正例 FAIL=0', (up.stdout || '').trim().split('\n').pop());

// 4. UI 审计反例
const failVue = path.join(tmp, 'fail.vue');
fs.writeFileSync(failVue, `<template><view><text>一站式赋能</text><img src="/a.png"><view tabindex="2" @click="go">点</view></view></template>`, 'utf8');
const uf = run(path.join(root, 'skills', 'ui-ux-benchmark', 'scripts', 'ui-audit.mjs'), ['--files', failVue], root);
check(uf.status === 1 && /FAIL=[2-9]/.test(uf.stdout), 'ui-audit 反例必须失败', (uf.stdout || '').trim().split('\n').pop());

// 5. 安装预览
const inst = run(path.join(root, 'scripts', 'install.mjs'), ['--target', 'project', '--tool', 'generic', '--dry-run'], tmp);
check(inst.status === 0 && /DRY  COPY/.test(inst.stdout) && /\.agent/.test(inst.stdout), 'install 预览不改文件', inst.stdout.trim().split('\n').pop());
check(!fs.existsSync(path.join(tmp, '.agent')), 'install 预览零写入');

// 6. PreToolUse 守卫
const guard = path.join(root, 'scripts', 'pre-tool-guard.mjs');
const ws = path.join(tmp, 'ws');
fs.mkdirSync(ws, { recursive: true });
const evt = (name, obj) => {
  const p = path.join(tmp, 'evt-' + name + '.json');
  fs.writeFileSync(p, JSON.stringify({ cwd: ws, hook_event_name: 'PreToolUse', ...obj }), 'utf8');
  return p;
};
const decide = f => {
  const r = run(guard, ['--event', f, '--cwd', ws, '--dry-run']);
  const m = (r.stdout || '').match(/\{[\s\S]*\}$/);
  try { return JSON.parse(m ? m[0] : r.stdout).hookSpecificOutput; }
  catch { return { permissionDecision: 'parse-fail', permissionDecisionReason: r.stderr || '' }; }
};
check(decide(evt('danger', { tool_name: 'RunCommand', tool_input: { command: 'rm -rf /' } })).permissionDecision === 'deny', 'guard 危险命令 deny');
check(decide(evt('ask', { tool_name: 'RunCommand', tool_input: { command: 'Remove-Item -Recurse -Force build' } })).permissionDecision === 'ask', 'guard 递归强删 ask');
// B13 复刻：mimo-agnes 在行为评测里 2/3 次直接执行该命令；闸门必须拦成 ask
check(decide(evt('b13', { tool_name: 'RunCommand', tool_input: { command: "Remove-Item -Recurse -Force 'docs/old'" } })).permissionDecision === 'ask', 'guard B13 不可逆删除 ask');
// 相对路径 rm -rf 不能落到 allow（DEFAULT_DENY 只拦根路径，其余必须 ask）
check(decide(evt('rmrel', { tool_name: 'RunCommand', tool_input: { command: 'rm -rf docs/old' } })).permissionDecision === 'ask', 'guard rm -rf 相对路径 ask');
check(decide(evt('outside', { tool_name: 'Write', tool_input: { file_path: '../outside.txt' } })).permissionDecision === 'deny', 'guard 越界写入 deny');
check(decide(evt('self', { tool_name: 'Edit', tool_input: { file_path: '.trae/skills/x/SKILL.md' } })).permissionDecision === 'deny', 'guard 改自身规则 deny');
const okWrite = decide(evt('ok', { tool_name: 'Write', tool_input: { file_path: 'src/a.ts' } }));
check(okWrite.permissionDecision === 'allow', 'guard 正常写入 allow', okWrite.permissionDecisionReason || '');

// 7. 快照与回滚（临时 git 仓库）
const snap = path.join(root, 'scripts', 'snapshot.mjs');
const grepo = path.join(tmp, 'grepo');
fs.mkdirSync(grepo, { recursive: true });
const gitRun = argv => spawnSync('git', argv, { cwd: grepo, encoding: 'utf8' });
gitRun(['init', '-q']);
gitRun(['config', 'user.email', 'test@example.com']);
gitRun(['config', 'user.name', 'test']);
const fileA = path.join(grepo, 'a.txt');
const fileB = path.join(grepo, 'b.txt');
const fileC = path.join(grepo, 'c.txt');
fs.writeFileSync(fileA, 'base\n', 'utf8');
gitRun(['add', '.']);
gitRun(['commit', '-qm', 'base']);
fs.writeFileSync(fileA, 'changed\n', 'utf8');
fs.writeFileSync(fileB, 'new\n', 'utf8');
const created = run(snap, ['create', '--cwd', grepo, '--label', 't1']);
const sid = (created.stdout.match(/SNAPSHOT (\S+)/) || [])[1] || '';
check(created.status === 0 && !!sid, 'snapshot create', created.stdout.trim().split('\n')[0]);
fs.writeFileSync(fileA, 'changed2\n', 'utf8');
fs.writeFileSync(fileC, 'extra\n', 'utf8');
const restored = run(snap, ['restore', '--cwd', grepo, '--id', sid, '--prune']);
const aNow = fs.existsSync(fileA) ? fs.readFileSync(fileA, 'utf8') : '';
check(
  restored.status === 0 && aNow === 'changed\n' && fs.existsSync(fileB) && !fs.existsSync(fileC),
  'snapshot restore + prune 零残留',
  restored.stdout.trim().split('\n').pop(),
);

// 8. 注入预算器
const budgetScript = path.join(root, 'scripts', 'context-budget.mjs');
const secFile = path.join(tmp, 'sections.json');
fs.writeFileSync(secFile, JSON.stringify([
  { name: 'KEEP', text: '必需段 ' + 'x'.repeat(80), priority: 1 },
  { name: 'MAYBE', text: '可选段 ' + 'y'.repeat(200), priority: 2, ref: 'docs/a.md' },
  { name: 'LOW', text: '低优先 ' + 'z'.repeat(120), priority: 3 },
]), 'utf8');
const cb = run(budgetScript, ['--sections', secFile, '--budget', '160', '--json']);
let cbj = {};
try { cbj = JSON.parse(cb.stdout); } catch { /* 解析失败走断言 */ }
check(
  cb.status === 0 && cbj.kept >= 1 && cbj.dropped >= 1 && String(cbj.text || '').includes('必需段'),
  'context-budget 保必需段并裁低优先',
  `kept=${cbj.kept} dropped=${cbj.dropped} truncated=${cbj.truncated} used=${cbj.used}`,
);
check(String(cbj.text || '').includes('完整见 docs/a.md'), 'context-budget 截断段给引用');
const cbOver = run(budgetScript, ['--sections', secFile, '--budget', '60', '--json']);
let cbo = {};
try { cbo = JSON.parse(cbOver.stdout); } catch { /* 解析失败走断言 */ }
check(cbo.overflow > 0 && String(cbo.text || '').includes('必需段'), 'context-budget 必需段超预算不丢', `overflow=${cbo.overflow}`);

// 9. 符号级检索 + MAP 引用度排序
const idxScript = path.join(root, 'scripts', 'repo-index.mjs');
const idxRepo = path.join(tmp, 'idxrepo');
fs.mkdirSync(path.join(idxRepo, 'src'), { recursive: true });
fs.writeFileSync(path.join(idxRepo, 'src', 'a.ts'), 'export function fooBar() {\n  return 1;\n}\n', 'utf8');
fs.writeFileSync(path.join(idxRepo, 'src', 'b.ts'), "import { fooBar } from './a';\nexport const x = fooBar();\n", 'utf8');
const ib = run(idxScript, ['build', '--root', idxRepo, '--out', '.agent-index']);
const mapText = fs.existsSync(path.join(idxRepo, '.agent-index', 'MAP.md'))
  ? fs.readFileSync(path.join(idxRepo, '.agent-index', 'MAP.md'), 'utf8')
  : '';
check(
  ib.status === 0 && mapText.includes('src/a.ts') && mapText.indexOf('src/a.ts') < mapText.indexOf('src/b.ts'),
  'repo-index MAP 按引用入度排序',
  (ib.stdout || '').trim(),
);
const cx = run(idxScript, ['context', '--root', idxRepo, '--term', 'fooBar', '--budget', '300']);
const cxChars = Number((cx.stdout.match(/chars=(\d+)\/300/) || [])[1] || 0);
check(
  cx.status === 0 && /## src\/a\.ts:1/.test(cx.stdout) && cxChars > 0 && cxChars <= 300,
  'repo-index context 符号片段 + 预算',
  (cx.stdout || '').trim().split('\n').pop(),
);

// 10. 一键诊断（doctor）
const doctor = path.join(root, 'scripts', 'doctor.mjs');
const brokenProj = path.join(tmp, 'doc-broken');
fs.mkdirSync(path.join(brokenProj, 'docs', 'x'), { recursive: true });
fs.writeFileSync(path.join(brokenProj, 'docs', 'x', 'tasks.json'), '{"tasks":[{"id":"T1","title":"坏账本","status":"bogus"}]}\n', 'utf8');
const docBad = run(doctor, ['--cwd', brokenProj, '--no-hook', '--json']);
let docBadJson = {};
try { docBadJson = JSON.parse(docBad.stdout); } catch { /* 断言会失败 */ }
check(docBad.status === 1 && docBadJson.verdict === 'fail' && String(docBadJson.next || '').length > 0, 'doctor 坏账本判 fail 并给下一步', `verdict=${docBadJson.verdict} next=${docBadJson.next || ''}`);
const docPack = run(doctor, ['--cwd', root, '--no-hook', '--json']);
let docPackJson = {};
try { docPackJson = JSON.parse(docPack.stdout); } catch { /* 断言会失败 */ }
check(docPack.status === 0 && ['ok', 'degraded'].includes(docPackJson.verdict), 'doctor 本包不判 fail', `verdict=${docPackJson.verdict}`);

// doctor 去假绿：hooks.json 三事件齐全但宿主从未触发时，必须判 degraded 并给按钮级指引，不许报 ok
const fakeHookProj = path.join(tmp, 'doc-fakehook');
fs.mkdirSync(path.join(fakeHookProj, '.trae'), { recursive: true });
fs.writeFileSync(path.join(fakeHookProj, '.trae', 'hooks.json'), JSON.stringify({
  version: 1, hooks: {
    SessionStart: [{ hooks: [{ type: 'command', command: 'node x.mjs', timeout: 10 }] }],
    PreToolUse: [{ hooks: [{ type: 'command', command: 'node y.mjs', timeout: 10 }] }],
    Stop: [{ loop_limit: 5, hooks: [{ type: 'command', command: 'node z.mjs', timeout: 10 }] }],
  },
}, null, 2) + '\n', 'utf8');
const docFake = run(doctor, ['--cwd', fakeHookProj, '--json']);
let docFakeJson = {};
try { docFakeJson = JSON.parse(docFake.stdout); } catch { /* 断言会失败 */ }
const fakeHookCheck = (docFakeJson.checks || []).find(c => c.name === 'hook') || {};
check(fakeHookCheck.state === 'degraded' && /从未触发/.test(String(fakeHookCheck.detail || '')), 'doctor 三事件齐全但宿主未触发时判 degraded 不假绿', `state=${fakeHookCheck.state} detail=${fakeHookCheck.detail || ''}`);

// 合成回执（source=check / session=verify-*）不算真实触发；只有宿主真调过才算 ok
fs.mkdirSync(path.join(fakeHookProj, '.agent-runs'), { recursive: true });
fs.writeFileSync(path.join(fakeHookProj, '.agent-runs', 'session-start.log'),
  JSON.stringify({ ts: '2026-01-01T00:00:00.000Z', session: 'verify-001', event: 'SessionStart', cwd: fakeHookProj }) + '\n' +
  JSON.stringify({ ts: '2026-01-01T00:00:01.000Z', session: 'check-hook', event: 'SessionStart', source: 'check', cwd: fakeHookProj }) + '\n', 'utf8');
const docFake2 = run(doctor, ['--cwd', fakeHookProj, '--json']);
let docFake2Json = {};
try { docFake2Json = JSON.parse(docFake2.stdout); } catch { /* 断言会失败 */ }
const fakeHookCheck2 = (docFake2Json.checks || []).find(c => c.name === 'hook') || {};
check(fakeHookCheck2.state === 'degraded', 'doctor 合成回执不算宿主触发（仍判 degraded）', `state=${fakeHookCheck2.state}`);

// 心跳证明 Hook 在跑：SessionStart 每会话只触发一次，本会话错过时靠 PreToolUse 心跳判生效，不误报「没启用」
fs.writeFileSync(path.join(fakeHookProj, '.agent-runs', 'hook-heartbeat.json'),
  JSON.stringify({ time: new Date().toISOString(), event: 'PreToolUse', tool: 'Shell', decision: 'allow' }) + '\n', 'utf8');
const docBeat = run(doctor, ['--cwd', fakeHookProj, '--json']);
let docBeatJson = {};
try { docBeatJson = JSON.parse(docBeat.stdout); } catch { /* 断言会失败 */ }
const beatCheck = (docBeatJson.checks || []).find(c => c.name === 'hook') || {};
check(beatCheck.state === 'ok' && /心跳/.test(String(beatCheck.detail || '')), 'doctor 心跳新鲜时判 ok（区分「未启用」与「本会话错过 SessionStart」）', `state=${beatCheck.state} detail=${beatCheck.detail || ''}`);

// 10b. Hook 命令必须能被宿主真实 shell 执行（Windows 宿主是 PowerShell）
// 背景：`"node.exe" "x.mjs"` 在 cmd/bash 合法，在 PowerShell 报 ParserError，
// 导致 hook 每次 exit 1、静默空转。生成器必须加调用运算符 `&`；检查器必须真跑 shell 才能发现。
const installHook = path.join(root, 'scripts', 'install-hook.mjs');
const hookGenProj = path.join(tmp, 'hookgen');
fs.mkdirSync(hookGenProj, { recursive: true });
const genHook = run(installHook, ['--target', 'trae-project', '--cwd', hookGenProj]);
let genCmds = [];
try {
  const genCfg = JSON.parse(fs.readFileSync(path.join(hookGenProj, '.trae', 'hooks.json'), 'utf8'));
  genCmds = ['SessionStart', 'PreToolUse', 'Stop'].map(e => genCfg.hooks[e][0].hooks[0].command);
} catch { /* 断言会失败 */ }
const needCallOp = process.platform === 'win32';
check(genHook.status === 0 && genCmds.length === 3 && genCmds.every(c => (needCallOp ? c.trimStart().startsWith('& ') : true)),
  'install-hook 生成命令带宿主 shell 调用运算符（win32 必需 &）', genCmds[0] || '(空)');

const hookBrokenProj = path.join(tmp, 'hookbroken');
fs.mkdirSync(path.join(hookBrokenProj, '.trae'), { recursive: true });
const nodeExePosix = process.execPath.split(path.sep).join('/');
const ssScriptPosix = path.join(root, 'scripts', 'session-start.mjs').split(path.sep).join('/');
// 故意写成无 & 的老写法：路径都真实存在，只有 shell 语法不兼容
fs.writeFileSync(path.join(hookBrokenProj, '.trae', 'hooks.json'), JSON.stringify({
  version: 1,
  hooks: {
    SessionStart: [{ hooks: [{ type: 'command', command: `"${nodeExePosix}" "${ssScriptPosix}"`, timeout: 20 }] }],
  },
}, null, 2) + '\n', 'utf8');
const chkBroken = run(path.join(root, 'scripts', 'check-hook.mjs'), ['--cwd', hookBrokenProj]);
const brokenVerdict = needCallOp
  ? (chkBroken.status === 1 && /FAIL/.test(chkBroken.stdout) && /宿主 shell 可执行/.test(chkBroken.stdout))
  : chkBroken.status === 0; // 非 win32 的 sh 认这种写法，不强判
check(brokenVerdict, 'check-hook 真跑宿主 shell（win32 无 & 的老写法判 FAIL，不许假绿）',
  needCallOp ? 'win32/pwsh' : '非 win32 跳过语法断言');

// 11. 验收指纹（fingerprint）
const fp = path.join(root, 'scripts', 'fingerprint.mjs');
const fpRepo = path.join(tmp, 'fprepo');
fs.mkdirSync(fpRepo, { recursive: true });
fs.writeFileSync(path.join(fpRepo, 'a.txt'), 'a1\n', 'utf8');
fs.writeFileSync(path.join(fpRepo, 'b.txt'), 'b1\n', 'utf8');
const fpCreate = run(fp, ['create', '--cwd', fpRepo, '--out', '.agent-runs/fp.json']);
check(fpCreate.status === 0 && /files=2/.test(fpCreate.stdout), 'fingerprint create 清单', (fpCreate.stdout || '').trim());
fs.writeFileSync(path.join(fpRepo, 'a.txt'), 'a2\n', 'utf8');
fs.writeFileSync(path.join(fpRepo, 'c.txt'), 'c1\n', 'utf8');
const fpDiff = run(fp, ['diff', '--cwd', fpRepo, '--before', path.join(fpRepo, '.agent-runs', 'fp.json')]);
check(fpDiff.status === 1 && /CHANGED a\.txt/.test(fpDiff.stdout) && /ADDED c\.txt/.test(fpDiff.stdout), 'fingerprint diff 抓改动', (fpDiff.stdout || '').trim().split('\n').pop());
const fpAgain = run(fp, ['create', '--cwd', fpRepo, '--out', '.agent-runs/fp2.json']);
const fpSame = run(fp, ['diff', '--cwd', fpRepo, '--before', path.join(fpRepo, '.agent-runs', 'fp2.json')]);
check(fpAgain.status === 0 && fpSame.status === 0 && /unchanged=3/.test(fpSame.stdout), 'fingerprint diff 未改动判一致', (fpSame.stdout || '').trim().split('\n').pop());

// 10. agent.mjs 编排闭环（plan -> step -> finish）
const agentScript = path.join(root, 'scripts', 'agent.mjs');
const aws = path.join(tmp, 'agentws');
fs.mkdirSync(path.join(aws, 'docs'), { recursive: true });
const aPlan = run(agentScript, ['plan', '--task', '演示任务', '--slug', 'demo', '--cwd', aws, '--files', '1']);
check(aPlan.status === 0 && /\[档位\] L0/.test(aPlan.stdout), 'agent plan 单文件判 L0', (aPlan.stdout || '').trim().split('\n')[0]);
const aStep = run(agentScript, ['step', '--cwd', aws]);
check(/NEXT T1/.test(aStep.stdout), 'agent step 给出下一件');
const aFin = run(agentScript, ['finish', '--cwd', aws]);
check(aFin.status === 1 && /STOPGATE BLOCK/.test(aFin.stdout), 'agent finish 未完成时阻断');
// run 依赖外部模型，单测只验证执行器校验（确定性、不联网）
const aBadExec = run(agentScript, ['run', '--task', 't', '--executor', 'no-such-executor', '--cwd', aws]);
check(aBadExec.status === 1 && /未知 executor/.test(aBadExec.stderr || aBadExec.stdout), 'agent run 拒绝未知执行器');
const aClean = run(agentScript, ['clean', '--days', '0', '--dry-run', '--cwd', aws]);
check(aClean.status === 0 && /预览结束，未删除任何文件/.test(aClean.stdout), 'agent clean 预览不删文件');
const aDry = run(agentScript, ['run', '--task', '演示任务', '--slug', 'demo', '--cwd', aws, '--dry-run']);
check(aDry.status === 0 && /【执行规则/.test(aDry.stdout) && /推理纪律/.test(aDry.stdout) && /不可逆操作/.test(aDry.stdout), 'agent run 默认注入执行规则', (aDry.stdout || '').split('\n').find(l => l.startsWith('[规则]')) || '');
const aDryNo = run(agentScript, ['run', '--task', '演示任务', '--slug', 'demo', '--cwd', aws, '--dry-run', '--no-rules']);
check(aDryNo.status === 0 && !/【执行规则/.test(aDryNo.stdout), 'agent run --no-rules 不注入');
// 先出文档硬闸门：L1/L2 缺 PLAN.md 必须在实现步前拦住，补文档后放行
const pgDir = path.join(tmp, 'plangate');
fs.mkdirSync(pgDir, { recursive: true });
const pgA = run(agentScript, ['run', '--task', '加导出按钮', '--slug', 'g1', '--files', '3', '--cwd', pgDir, '--max-steps', '1', '--timeout', '1']);
const pgLedger = JSON.parse(fs.readFileSync(path.join(pgDir, 'docs', 'g1', 'tasks.json'), 'utf8'));
check(/GATE BLOCK T1/.test(pgA.stdout) && pgLedger.tasks[0].status === 'todo', 'agent run 缺 PLAN.md 时拦在实现步前', (pgA.stdout || '').split('\n').find(l => l.startsWith('GATE BLOCK')) || '');
fs.mkdirSync(path.join(pgDir, 'docs', 'g1'), { recursive: true });
fs.writeFileSync(path.join(pgDir, 'docs', 'g1', 'PLAN.md'), '# 目标\n加按钮\n', 'utf8');
const pgB = run(agentScript, ['run', '--task', '加导出按钮', '--slug', 'g1', '--files', '3', '--cwd', pgDir, '--max-steps', '1', '--timeout', '1']);
check(!/GATE BLOCK/.test(pgB.stdout) && /--- T1/.test(pgB.stdout), 'agent run 补 PLAN.md 后放行', (pgB.stdout || '').split('\n').find(l => l.startsWith('--- T1')) || '');
const pgC = run(agentScript, ['run', '--task', '改一行', '--slug', 'g0', '--files', '1', '--cwd', pgDir, '--max-steps', '1', '--timeout', '1']);
check(!/GATE BLOCK/.test(pgC.stdout), 'agent run L0 不要求 PLAN.md');
// 闸门证据口径：只校验 ｜ 前的文件清单，输出文本里的路径不算证据文件
const sg = path.join(root, 'scripts', 'stop-gate.mjs');
const sgDir = path.join(tmp, 'sg');
fs.mkdirSync(path.join(sgDir, 'docs', 'x'), { recursive: true });
const sgLedger = file => path.join(sgDir, 'docs', 'x', 'tasks.json');
const writeSg = evidence => fs.writeFileSync(sgLedger(), JSON.stringify({
  task: '闸门证据', tier: 'L0', tasks: [{ id: 'T1', title: '实现', deps: [], files: [], status: 'done', evidence }],
}) + '\n', 'utf8');
writeSg('执行器输出｜→ Read docs\\x\\missing.json');
const sgOk = run(sg, ['--cwd', sgDir]);
check(sgOk.status === 0 && /continue/.test(sgOk.stdout), 'stop-gate 忽略输出文本里的路径');
writeSg('docs/missing.md｜执行器输出');
const sgBad = run(sg, ['--cwd', sgDir]);
check(sgBad.status === 0 && /证据文件不存在/.test(sgBad.stdout), 'stop-gate 仍拦真实缺失证据');

// 12. 行为评测：with-rules 注入硬规则 + B6 场景不得授权改测试
const bc = path.join(root, 'scripts', 'behavior-check.mjs');
const rulesBox = path.join(tmp, 'bx-rules');
const bcRules = run(bc, ['prepare', '--scenario', 'B1-ambiguous', '--sandbox', rulesBox, '--with-rules']);
const rulesText = fs.existsSync(path.join(rulesBox, 'AGENTS.md')) ? fs.readFileSync(path.join(rulesBox, 'AGENTS.md'), 'utf8') : '';
check(bcRules.status === 0 && /不可逆操作/.test(rulesText) && /不得修改测试文件/.test(rulesText), 'behavior prepare with-rules 写入 AGENTS.md');
const bareBox = path.join(tmp, 'bx-bare');
run(bc, ['prepare', '--scenario', 'B1-ambiguous', '--sandbox', bareBox]);
check(!fs.existsSync(path.join(bareBox, 'AGENTS.md')), 'behavior prepare 默认不装规则');
const b6 = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'behavior', 'scenarios.json'), 'utf8')).scenarios.find(s => s.id === 'B6-failure-honesty');
check(/禁止修改 check\.mjs/.test(b6.prompt) && !/只允许改 check\.mjs/.test(b6.prompt), 'B6 场景不再授权改测试');

// 13. 提示词技能、推理强度配置、自进化提案
const skillValidate = run(path.join(root, 'skills', 'project-orchestrator', 'scripts', 'validate.mjs'), [path.join(root, 'skills', 'prompt-discipline')]);
check(skillValidate.status === 0 && /FAIL=0/.test(skillValidate.stdout), 'prompt-discipline 技能门禁', (skillValidate.stdout || '').trim().split('\n').filter(l => l.startsWith('FAIL')).join(' ') || '');
const providersText = fs.readFileSync(path.join(root, 'tests', 'behavior', 'providers.json'), 'utf8');
check(/model_reasoning_effort=high/.test(providersText) && /"--variant",\s*"high"/.test(providersText), '执行器推理强度已配置 high');
const evoRoot = path.join(tmp, 'mem-evolve');
fs.mkdirSync(evoRoot, { recursive: true });
const evoRuns = path.join(tmp, 'evo-runs.jsonl');
fs.writeFileSync(evoRuns, [
  JSON.stringify({ scenario: 'X', verdict: 'partial', fails: ['FAIL 内容精确 docs/out.md'] }),
  JSON.stringify({ scenario: 'Y', verdict: 'fail', fails: ['FAIL 内容精确 docs/out.md'] }),
].join('\n') + '\n', 'utf8');
const evoGuard = path.join(tmp, 'evo-guard.log');
fs.writeFileSync(evoGuard, [
  JSON.stringify({ decision: 'ask', reason: '需确认的命令：Remove-Item -Recurse -Force docs/old' }),
  JSON.stringify({ decision: 'ask', reason: '需确认的命令：Remove-Item -Recurse -Force docs/old' }),
].join('\n') + '\n', 'utf8');
const evo = run(path.join(root, 'scripts', 'evolve.mjs'), ['--root', evoRoot, '--runs', evoRuns, '--guard', evoGuard]);
check(evo.status === 0 && /run=2/.test(evo.stdout) && /guard=2/.test(evo.stdout) && /PROPOSAL x2/.test(evo.stdout), 'evolve 聚类评测失败与闸门拦截', (evo.stdout || '').trim().split('\n')[0]);
// 时间窗 + 同出处去重：旧记录排除，同一条记录里的重复 fail 只算一次
const evoDays = path.join(tmp, 'evo-days.jsonl');
const iso = ms => new Date(Date.now() - ms).toISOString();
fs.writeFileSync(evoDays, [
  JSON.stringify({ time: iso(86400000), verdict: 'partial', fails: ['FAIL 内容精确 docs/a.md', 'FAIL 内容精确 docs/a.md'] }),
  JSON.stringify({ time: iso(2 * 86400000), verdict: 'fail', fails: ['FAIL 内容精确 docs/a.md'] }),
  JSON.stringify({ time: iso(30 * 86400000), verdict: 'partial', fails: ['FAIL 内容精确 docs/a.md'] }),
].join('\n') + '\n', 'utf8');
const evoWin = run(path.join(root, 'scripts', 'evolve.mjs'), ['--root', evoRoot, '--runs', evoDays, '--guard', path.join(tmp, 'no-guard.log')]);
check(evoWin.status === 0 && /days=7/.test(evoWin.stdout) && /skippedOld=1/.test(evoWin.stdout) && /skippedDup=1/.test(evoWin.stdout) && /PROPOSAL x2/.test(evoWin.stdout), 'evolve 只收 7 天内并去重', (evoWin.stdout || '').trim().split('\n')[0]);
const evoAll = run(path.join(root, 'scripts', 'evolve.mjs'), ['--root', evoRoot, '--runs', evoDays, '--guard', path.join(tmp, 'no-guard.log'), '--days', '0']);
check(evoAll.status === 0 && /skippedOld=0/.test(evoAll.stdout) && /PROPOSAL x3/.test(evoAll.stdout), 'evolve --days 0 取全量', (evoAll.stdout || '').trim().split('\n')[0]);

// 14. 版本同步、安装清单、自更新
const pkgJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const changelogVersion = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8').match(/^## (\d+\.\d+\.\d+)/m)?.[1];
check(pkgJson.version === changelogVersion, 'package.json 版本与 CHANGELOG 首条一致', `${pkgJson.version} / ${changelogVersion}`);
const projDir = path.join(tmp, 'proj-install');
fs.mkdirSync(projDir, { recursive: true });
const instReal = run(path.join(root, 'scripts', 'install.mjs'), ['--target', 'project', '--tool', 'generic', '--force', '--auto-update', '--check-hours', '6'], projDir);
const installManifest = path.join(projDir, '.agent', 'skills', '.agent-install.json');
let mfData = {};
try { mfData = JSON.parse(fs.readFileSync(installManifest, 'utf8')); } catch { /* 断言会失败 */ }
check(instReal.status === 0 && mfData.version === pkgJson.version && mfData.autoApply === true && mfData.checkIntervalHours === 6, 'install 写安装清单', JSON.stringify({ version: mfData.version, autoApply: mfData.autoApply, checkHours: mfData.checkIntervalHours }));
const updateScript = path.join(root, 'scripts', 'update.mjs');
const upCheck = run(updateScript, ['--manifest', installManifest, '--repo', root, '--check']);
check(upCheck.status === 0 && /status=NEWEST/.test(upCheck.stdout), 'update --check 同版本判 NEWEST', (upCheck.stdout || '').trim());
mfData.version = '0.0.1';
fs.writeFileSync(installManifest, JSON.stringify(mfData, null, 2) + '\n', 'utf8');
const upApply = run(updateScript, ['--manifest', installManifest, '--repo', root, '--apply', '--timeout', '120000']);
const afterMf = JSON.parse(fs.readFileSync(installManifest, 'utf8'));
check(upApply.status === 0 && /status=UPDATED/.test(upApply.stdout) && afterMf.version === pkgJson.version, 'update --apply 重装并升版本', (upApply.stdout || '').trim());
check(fs.existsSync(path.join(projDir, '.agent', 'skills', 'prompt-discipline', 'SKILL.md')), 'update 后技能文件落地');
afterMf.autoCheck = false;
fs.writeFileSync(installManifest, JSON.stringify(afterMf, null, 2) + '\n', 'utf8');
const ssProj = run(path.join(root, 'scripts', 'session-start.mjs'), ['--cwd', projDir, '--no-receipt']);
check(ssProj.status === 0 && new RegExp('VERSION ' + pkgJson.version.replace(/\./g, '\\.')).test(ssProj.stdout), 'session-start 注入安装版本', (ssProj.stdout || '').split('\n').find(l => l.startsWith('VERSION')) || '');
// 检查间隔：刚查过则跳过；到期后才查上游（本地 repo，不联网）
const mfNow = JSON.parse(fs.readFileSync(installManifest, 'utf8'));
mfNow.autoCheck = true;
mfNow.lastCheckAt = new Date().toISOString();
fs.writeFileSync(installManifest, JSON.stringify(mfNow, null, 2) + '\n', 'utf8');
const ssThrottle = run(path.join(root, 'scripts', 'session-start.mjs'), ['--cwd', projDir, '--no-receipt']);
check(ssThrottle.status === 0 && !/newest|UPDATE/.test(ssThrottle.stdout), 'session-start 按间隔节流', (ssThrottle.stdout || '').split('\n').find(l => l.startsWith('VERSION')) || '');
mfNow.lastCheckAt = '2020-01-01T00:00:00.000Z';
fs.writeFileSync(installManifest, JSON.stringify(mfNow, null, 2) + '\n', 'utf8');
const ssDue = run(path.join(root, 'scripts', 'session-start.mjs'), ['--cwd', projDir, '--no-receipt']);
check(ssDue.status === 0 && /VERSION .* newest/.test(ssDue.stdout), 'session-start 到期后查上游', (ssDue.stdout || '').split('\n').find(l => l.startsWith('VERSION')) || '');

// 15. 全局同名异源技能：默认保留、--force 先备份、--remove 不删异源
const colDir = path.join(tmp, 'proj-collision');
const colSkillDir = path.join(colDir, '.agent', 'skills', 'code-review');
fs.mkdirSync(colSkillDir, { recursive: true });
fs.writeFileSync(path.join(colSkillDir, 'SKILL.md'), '# 第三方 code-review\n内容不同，不能覆盖。\n', 'utf8');
const colInst = run(path.join(root, 'scripts', 'install.mjs'), ['--target', 'project', '--tool', 'generic', '--auto-update', '--check-hours', '12'], colDir);
let colMf = {};
try { colMf = JSON.parse(fs.readFileSync(path.join(colDir, '.agent', 'skills', '.agent-install.json'), 'utf8')); } catch { /* 断言会失败 */ }
check(colInst.status === 0 && /CONFLICT/.test(colInst.stdout) && fs.readFileSync(path.join(colSkillDir, 'SKILL.md'), 'utf8').includes('第三方') && !colMf.skills?.['code-review'], 'install 异源同名保留不覆盖');
check(fs.existsSync(path.join(colDir, '.agent', 'skills', 'prompt-discipline', 'SKILL.md')), '冲突时其余技能照常安装');
const colForce = run(path.join(root, 'scripts', 'install.mjs'), ['--target', 'project', '--tool', 'generic', '--force'], colDir);
const baks = fs.readdirSync(path.join(colDir, '.agent', 'skills')).filter(n => n.startsWith('code-review.bak-'));
check(/BACKUP\+COPY/.test(colForce.stdout) && baks.length === 1 && fs.readFileSync(path.join(colDir, '.agent', 'skills', baks[0], 'SKILL.md'), 'utf8').includes('第三方'), '--force 先备份再覆盖');
const rmDir = path.join(tmp, 'proj-foreign');
fs.mkdirSync(path.join(rmDir, '.agent', 'skills', 'code-review'), { recursive: true });
fs.writeFileSync(path.join(rmDir, '.agent', 'skills', 'code-review', 'SKILL.md'), '# 第三方 code-review\n', 'utf8');
const rmForeign = run(path.join(root, 'scripts', 'install.mjs'), ['--target', 'project', '--tool', 'generic', '--remove'], rmDir);
check(rmForeign.status === 0 && /keptForeign=1/.test(rmForeign.stdout) && fs.existsSync(path.join(rmDir, '.agent', 'skills', 'code-review', 'SKILL.md')), '--remove 不删非本包技能');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('---');
console.log(`PASS=${pass} FAIL=${fail}`);
if (fail) process.exitCode = 1;
