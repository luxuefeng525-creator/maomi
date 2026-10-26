#!/usr/bin/env node
/**
 * Agent 编排入口：把「定档 → 建账本 → 闸门预检 → 验收」串成一条闭环。
 * 它不替模型写代码，只负责确定性的调度与证据；内容生成由调用方（模型）完成。
 *
 * 用法：
 *   node scripts/agent.mjs plan   --task "<目标>" [--slug <目录名>] [--files <n>] [--cross <n>]
 *                                 [--schema] [--api] [--route] [--profile package|app] [--cwd <目录>]
 *   node scripts/agent.mjs step   [--cwd <目录>] [--file <tasks.json>] [--json]
 *   node scripts/agent.mjs guard  --tool <工具名> --input '<JSON>' [--cwd <目录>]
 *   node scripts/agent.mjs status [--cwd <目录>] [--file <tasks.json>]
 *   node scripts/agent.mjs finish [--cwd <目录>] [--file <tasks.json>]
 *
 * 退出码：plan/step/guard/status 恒 0（供编排读取）；finish 验收不过为 1。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readLedger, writeLedger, depsMissing, nextTask, validateLedger } from '../skills/project-orchestrator/scripts/task.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const cmd = args[0];
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const has = n => args.includes('--' + n);
const asJson = has('json');

const cwd = path.resolve(getArg('cwd') || process.cwd());
const guardScript = path.join(scriptDir, 'pre-tool-guard.mjs');
const stopScript = path.join(scriptDir, 'stop-gate.mjs');

/** 阶段模板：L2 在业务项目跑全 8 环，在包/库项目裁掉「后台同批」「三端对账」 */
const STAGES_APP = {
  L0: [['T1', '实现'], ['T2', '测试']],
  L1: [['T1', '实现'], ['T2', '测试'], ['T3', '验收']],
  L2: [
    ['T1', '需求与对标'], ['T2', '设计文档'], ['T3', '实现'], ['T4', '测试'],
    ['T5', '浏览器验收'], ['T6', '后台同批'], ['T7', '三端对账'], ['T8', '构建重载健康检查'],
  ],
};
const STAGES_PACKAGE = {
  L0: [['T1', '实现'], ['T2', '测试']],
  L1: [['T1', '实现'], ['T2', '测试'], ['T3', '验收']],
  L2: [['T1', '需求与对标'], ['T2', '设计文档'], ['T3', '实现'], ['T4', '测试'], ['T5', '验收']],
};

/**
 * 按 ai-workflow 1.0 判据定档；返回档位与判定依据（依据要一并报给用户，便于当场改判）。
 * @param {{files:number, cross:number, schema:boolean, api:boolean, route:boolean}} o - 影响面输入
 * @returns {{tier:string, reasons:string[]}} 档位与命中理由
 */
function decideTier(o) {
  const reasons = [];
  if (o.schema) reasons.push('动库表/schema');
  if (o.api) reasons.push('改对外接口');
  if (o.route) reasons.push('新增页面或路由');
  if (o.cross >= 2) reasons.push(`跨 ${o.cross} 端`);
  if (o.files >= 5) reasons.push(`${o.files} 个文件（≥5）`);
  if (reasons.length) return { tier: 'L2', reasons };
  if (o.cross >= 1) return { tier: 'L1', reasons: [`单端 · ${o.files} 个文件`] };
  if (o.files >= 2) return { tier: 'L1', reasons: [`单端 · ${o.files} 个文件`] };
  return { tier: 'L0', reasons: ['单文件小改'] };
}

/** 找账本：显式 --file 优先，否则取 docs 下最近修改的 tasks.json */
function findLedger(cliFile) {
  if (cliFile) return path.resolve(cwd, cliFile);
  const docs = path.join(cwd, 'docs');
  if (!fs.existsSync(docs)) return null;
  const found = [];
  for (const d of fs.readdirSync(docs)) {
    const p = path.join(docs, d, 'tasks.json');
    if (fs.existsSync(p)) found.push({ p, t: fs.statSync(p).mtimeMs });
  }
  found.sort((a, b) => b.t - a.t);
  return found[0]?.p || null;
}

/** 把一次工具调用交给 pre-tool-guard 判定；guard 自身异常按放行（fail-open） */
function guardDecide(tool, input) {
  const event = { session_id: 'agent-mjs', cwd, hook_event_name: 'PreToolUse', tool_name: tool, tool_input: input };
  const r = spawnSync(process.execPath, [guardScript, '--cwd', cwd], { input: JSON.stringify(event), encoding: 'utf8' });
  const m = (r.stdout || '').match(/\{[\s\S]*\}$/);
  try {
    const o = JSON.parse(m ? m[0] : r.stdout).hookSpecificOutput;
    return { decision: o.permissionDecision, reason: o.permissionDecisionReason };
  } catch {
    return { decision: 'allow', reason: 'guard 输出无法解析，按放行处理' };
  }
}

function cmdPlan() {
  const task = getArg('task');
  if (!task) { console.error('缺少 --task'); process.exit(1); }
  const profile = getArg('profile') || 'package';
  const o = {
    files: Number(getArg('files') || 1),
    cross: Number(getArg('cross') || 0),
    schema: has('schema'),
    api: has('api'),
    route: has('route'),
  };
  const { tier, reasons } = decideTier(o);
  const table = profile === 'app' ? STAGES_APP : STAGES_PACKAGE;
  const stages = table[tier];
  const slug = getArg('slug') || 'task-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const file = path.join(cwd, 'docs', slug, 'tasks.json');
  if (fs.existsSync(file) && !has('force')) {
    console.error(`账本已存在，未覆盖：${file}（确需覆盖加 --force）`);
    process.exit(1);
  }
  const data = {
    task,
    tier,
    profile,
    tasks: stages.map(([id, title], i) => ({
      id, title, deps: i ? [stages[i - 1][0]] : [], files: [], status: 'todo', evidence: '',
    })),
  };
  const invalid = validateLedger(data);
  if (invalid.length) { console.error('账本非法：' + invalid.join('；')); process.exit(1); }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeLedger(file, data);
  const rel = path.relative(cwd, file).split(path.sep).join('/');
  if (asJson) console.log(JSON.stringify({ tier, reasons, profile, ledger: rel, tasks: data.tasks }, null, 2));
  else {
    console.log(`[档位] ${tier} · ${reasons.join(' / ')} · profile=${profile}`);
    console.log(`LEDGER ${rel} 共 ${data.tasks.length} 件`);
    for (const t of data.tasks) console.log(`  ${t.id} ${t.title}${t.deps.length ? ' <- ' + t.deps.join(',') : ''}`);
    console.log(`下一步：node scripts/agent.mjs step --cwd ${cwd}`);
  }
}

function cmdStep() {
  const file = findLedger(getArg('file'));
  if (!file) { console.log('LEDGER NONE 未找到 docs/*/tasks.json，先跑 plan'); return; }
  const { data } = readLedger(file);
  const invalid = validateLedger(data);
  const n = nextTask(data);
  const c = k => data.tasks.filter(t => t.status === k).length;
  const rel = path.relative(cwd, file).split(path.sep).join('/');
  if (asJson) {
    console.log(JSON.stringify({ ledger: rel, tier: data.tier, counts: { todo: c('todo'), doing: c('doing'), blocked: c('blocked'), done: c('done') }, invalid, next: n || null }, null, 2));
    return;
  }
  console.log(`LEDGER ${rel} | ${data.tier} | todo=${c('todo')} doing=${c('doing')} blocked=${c('blocked')} done=${c('done')}`);
  if (invalid.length) console.log('WARN 账本问题：' + invalid.join('；'));
  if (!n) { console.log('NEXT NONE 全部完成或全部阻塞'); return; }
  console.log(`NEXT ${n.task.id} | ${n.task.title}${n.resumed ? '（续跑）' : ''}`);
  const missing = depsMissing(data, n.task);
  if (missing.length) console.log(`WARN 依赖未完成：${missing.join(',')}`);
  // 闸门预检：任务已声明文件时，逐个按 Write 预判是否会拒
  for (const f of n.task.files || []) {
    const d = guardDecide('Write', { file_path: f });
    if (d.decision !== 'allow') console.log(`GUARD ${f} -> ${d.decision}：${d.reason}`);
  }
}

function cmdGuard() {
  const tool = getArg('tool');
  const raw = getArg('input');
  if (!tool || !raw) { console.error('需要 --tool 与 --input'); process.exit(1); }
  let input;
  try { input = JSON.parse(raw); } catch (e) { console.error('--input 不是合法 JSON: ' + e.message); process.exit(1); }
  const d = guardDecide(tool, input);
  if (asJson) console.log(JSON.stringify(d, null, 2));
  else console.log(`${d.decision.toUpperCase()} ${tool} | ${d.reason}`);
}

function cmdStatus() {
  const file = findLedger(getArg('file'));
  if (!file) { console.log('LEDGER NONE'); return; }
  const { data } = readLedger(file);
  const invalid = validateLedger(data);
  const stats = ['todo', 'doing', 'blocked', 'done'].map(k => `${k}=${data.tasks.filter(t => t.status === k).length}`).join(' ');
  console.log(`${path.relative(cwd, file).split(path.sep).join('/')} | ${data.tier} | ${stats} | invalid=${invalid.length}`);
  for (const t of data.tasks) console.log(`  ${t.status.padEnd(7)} ${t.id} ${t.title}${t.evidence ? ' | ' + t.evidence : ''}`);
}

function cmdFinish() {
  const file = findLedger(getArg('file'));
  if (!file) { console.error('LEDGER NONE，无法验收'); process.exit(1); }
  const { data } = readLedger(file);
  const invalid = validateLedger(data);
  const r = spawnSync(process.execPath, [stopScript, '--cwd', cwd, '--file', file], { encoding: 'utf8' });
  let gate = null;
  try { gate = JSON.parse((r.stdout || '').trim()); } catch { /* 解析失败按未放行 */ }
  const rel = path.relative(cwd, file).split(path.sep).join('/');
  const allow = gate && gate.continue === true && invalid.length === 0;
  if (asJson) {
    console.log(JSON.stringify({ ledger: rel, allow, gate, invalid }, null, 2));
  } else {
    console.log(`LEDGER ${rel}`);
    console.log(`VALIDATE ${invalid.length ? 'FAIL ' + invalid.join('；') : 'OK'}`);
    console.log(`STOPGATE ${allow ? 'ALLOW' : 'BLOCK'} | ${gate ? JSON.stringify(gate) : '闸门输出无法解析'}`);
    const undone = data.tasks.filter(t => t.status !== 'done');
    if (undone.length) console.log('未完成：' + undone.map(t => `${t.id}(${t.status})`).join(' '));
  }
  process.exitCode = allow ? 0 : 1;
}

try {
  if (cmd === 'plan') cmdPlan();
  else if (cmd === 'step') cmdStep();
  else if (cmd === 'guard') cmdGuard();
  else if (cmd === 'status') cmdStatus();
  else if (cmd === 'finish') cmdFinish();
  else {
    console.error('用法: plan | step | guard | status | finish（详见文件头注释）');
    process.exit(1);
  }
} catch (e) {
  console.error('FAIL ' + (e && e.message));
  process.exit(1);
}
