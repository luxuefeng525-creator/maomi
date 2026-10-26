#!/usr/bin/env node
/**
 * 多代理调度：按依赖分层、按文件冲突分车道，并拦截同文件并行认领。
 * 用法：
 *   node scripts/agents.mjs plan    --file <tasks.json> [--json]
 *   node scripts/agents.mjs claim   --file <tasks.json> --id T1 --agent A
 *   node scripts/agents.mjs release --file <tasks.json> --id T1
 *   node scripts/agents.mjs status  --file <tasks.json>
 * 任务可带 files: [] 字段；未声明 files 视为通配，独占车道并与其他任务冲突。
 */
import path from 'node:path';
import { readLedger, writeLedger, depsMissing, validateLedger } from '../skills/project-orchestrator/scripts/task.mjs';

const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const cmd = args[0];
const file = getArg('file');
if (!file || file === true) { console.error('缺少 --file'); process.exit(1); }

const load = () => {
  try { return readLedger(file); } catch (e) { console.error('FAIL ' + e.message); process.exit(1); }
};
const overlap = (a, b) => {
  const fa = a.files || [], fb = b.files || [];
  if (!fa.length || !fb.length) return true;
  return fa.some(x => fb.includes(x));
};

function levels(data) {
  const tasks = data.tasks || [];
  const done = new Set(tasks.filter(t => t.status === 'done').map(t => t.id));
  const left = tasks.filter(t => t.status !== 'done');
  const out = [];
  while (left.length) {
    const layer = left.filter(t => (t.deps || []).every(d => done.has(d)));
    if (!layer.length) break;
    out.push(layer);
    for (const t of layer) { done.add(t.id); left.splice(left.indexOf(t), 1); }
  }
  if (left.length) out.push(left);
  return out;
}

function plan() {
  const { data } = load();
  const errs = validateLedger(data);
  if (errs.length) { for (const e of errs) console.log('WARN ' + e); }
  const result = [];
  for (const [i, layer] of levels(data).entries()) {
    const lanes = [];
    for (const t of layer) {
      const files = t.files || [];
      let target = null;
      if (files.length) target = lanes.find(l => l.files.length && overlap(t, l));
      else target = lanes[0] || null;
      if (target) {
        target.tasks.push(t.id);
        target.files.push(...files);
        if (!files.length) target.wildcard = true;
      } else {
        lanes.push({ files: [...files], wildcard: !files.length, tasks: [t.id] });
      }
    }
    result.push({ level: i + 1, lanes: lanes.map((l, n) => ({ lane: 'lane' + (n + 1), tasks: l.tasks, wildcard: l.wildcard })) });
  }
  if (args.includes('--json')) { console.log(JSON.stringify(result, null, 2)); return; }
  for (const lv of result) {
    console.log('LEVEL ' + lv.level);
    for (const ln of lv.lanes) console.log(`  ${ln.lane}${ln.wildcard ? '（通配独占）' : ''}: ${ln.tasks.join(', ')}`);
  }
}

function claim() {
  const id = getArg('id'), agent = getArg('agent');
  if (!id) { console.error('缺少 --id'); process.exit(1); }
  if (!agent) { console.error('缺少 --agent'); process.exit(1); }
  const { abs, data } = load();
  const t = (data.tasks || []).find(x => x.id === id);
  if (!t) { console.error('FAIL 任务不存在: ' + id); process.exit(1); }
  if (t.status === 'done') { console.error('FAIL 任务已完成: ' + id); process.exit(1); }
  const missing = depsMissing(data, t);
  if (missing.length) { console.error('FAIL 依赖未完成: ' + missing.join(',')); process.exit(1); }
  const clash = (data.tasks || []).find(x => x.status === 'doing' && x.id !== id && overlap(t, x));
  if (clash) { console.error('FAIL 文件冲突: ' + id + ' 与进行中的 ' + clash.id + '（' + (clash.files || []).join(',') + '）'); process.exit(1); }
  t.status = 'doing';
  t.assignee = agent;
  writeLedger(abs, data);
  console.log(`CLAIM ${id} by ${agent}`);
}

function release() {
  const id = getArg('id');
  if (!id) { console.error('缺少 --id'); process.exit(1); }
  const { abs, data } = load();
  const t = (data.tasks || []).find(x => x.id === id);
  if (!t) { console.error('FAIL 任务不存在: ' + id); process.exit(1); }
  if (t.status !== 'doing') { console.error('FAIL 任务不是 doing: ' + id); process.exit(1); }
  t.status = 'todo';
  delete t.assignee;
  writeLedger(abs, data);
  console.log('RELEASE ' + id);
}

function status() {
  const { data } = load();
  const tasks = data.tasks || [];
  const doing = tasks.filter(t => t.status === 'doing');
  const conflicts = [];
  for (let i = 0; i < doing.length; i++) for (let j = i + 1; j < doing.length; j++) {
    if (overlap(doing[i], doing[j])) conflicts.push(doing[i].id + '<->' + doing[j].id);
  }
  const c = k => tasks.filter(t => t.status === k).length;
  console.log(JSON.stringify({
    total: tasks.length, todo: c('todo'), doing: c('doing'), blocked: c('blocked'), done: c('done'),
    agents: doing.map(t => ({ id: t.id, agent: t.assignee || '未指派', files: t.files || [] })),
    conflicts,
  }, null, 2));
}

if (cmd === 'plan') plan();
else if (cmd === 'claim') claim();
else if (cmd === 'release') release();
else if (cmd === 'status') status();
else { console.error('用法: plan | claim | release | status'); process.exit(1); }
