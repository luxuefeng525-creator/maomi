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

fs.rmSync(tmp, { recursive: true, force: true });
console.log('---');
console.log(`PASS=${pass} FAIL=${fail}`);
if (fail) process.exitCode = 1;
