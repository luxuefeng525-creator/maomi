#!/usr/bin/env node
/**
 * 任务账本调度器：读写 tasks.json，挑下一件、校验依赖与状态。
 * 用法：
 *   node scripts/task.mjs init     --file <tasks.json> [--task 名称] [--tier L1]
 *   node scripts/task.mjs add      --file <tasks.json> --id T1 --title "标题" [--deps T0,T1]
 *   node scripts/task.mjs next     --file <tasks.json> [--json]
 *   node scripts/task.mjs start    --file <tasks.json> --id T1
 *   node scripts/task.mjs done     --file <tasks.json> --id T1 --evidence "路径或命令"
 *   node scripts/task.mjs block    --file <tasks.json> --id T1 --reason "阻塞点"
 *   node scripts/task.mjs unblock  --file <tasks.json> --id T1
 *   node scripts/task.mjs status   --file <tasks.json>
 *   node scripts/task.mjs validate --file <tasks.json>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STATUS = ['todo', 'doing', 'blocked', 'done'];

export function readLedger(file) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) throw new Error('账本不存在: ' + abs);
  return { abs, data: JSON.parse(fs.readFileSync(abs, 'utf8')) };
}
export function writeLedger(abs, data) {
  // 用本地日期：UTC 在东八区 0–8 点会写成前一天
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  data.updated = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const tmp = abs + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, abs);
}
export function depsMissing(data, t) {
  return (t.deps || []).filter(d => {
    const x = (data.tasks || []).find(y => y.id === d);
    return !x || x.status !== 'done';
  });
}
export function nextTask(data) {
  const tasks = data.tasks || [];
  const doing = tasks.find(t => t.status === 'doing');
  if (doing) return { task: doing, resumed: true };
  const candidate = tasks.find(t => t.status === 'todo' && depsMissing(data, t).length === 0);
  return candidate ? { task: candidate, resumed: false } : null;
}
export function validateLedger(data) {
  const errs = [];
  const tasks = data.tasks || [];
  const ids = new Set();
  for (const t of tasks) {
    if (!t.id) errs.push('存在无 id 任务');
    else if (ids.has(t.id)) errs.push('id 重复: ' + t.id);
    else ids.add(t.id);
    if (!STATUS.includes(t.status)) errs.push(`${t.id} 状态非法: ${t.status}`);
    if (t.status === 'done' && !t.evidence) errs.push(`${t.id} done 但无 evidence`);
    if (t.status === 'blocked' && !t.note) errs.push(`${t.id} blocked 但无 note`);
  }
  for (const t of tasks) for (const d of (t.deps || [])) {
    if (d === t.id) errs.push(`${t.id} 依赖自己`);
    if (!ids.has(d)) errs.push(`${t.id} 依赖不存在: ${d}`);
  }
  const doing = tasks.filter(t => t.status === 'doing');
  if (doing.length > 1) errs.push('同时多个 doing: ' + doing.map(t => t.id).join(','));
  const state = new Map();
  const dfs = (id, stack) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') { errs.push('依赖循环: ' + [...stack, id].join(' -> ')); return; }
    state.set(id, 'visiting');
    const t = tasks.find(x => x.id === id);
    for (const d of (t?.deps || [])) if (ids.has(d)) dfs(d, [...stack, id]);
    state.set(id, 'done');
  };
  for (const t of tasks) dfs(t.id, []);
  return errs;
}

function main() {
  const args = process.argv.slice(2);
  const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
  const cmd = args[0];
  const file = getArg('file');
  if (!file || file === true) { console.error('缺少 --file（tasks.json 路径）'); process.exit(1); }
  const fail = msg => { console.error('FAIL ' + msg); process.exit(1); };
  const load = () => { try { return readLedger(file); } catch (e) { fail(e.message); } };
  const find = (data, id) => {
    const t = (data.tasks || []).find(x => x.id === id);
    if (!t) fail('任务不存在: ' + id);
    return t;
  };

  if (cmd === 'init') {
    const abs = path.resolve(file);
    if (fs.existsSync(abs)) fail('账本已存在: ' + abs);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    writeLedger(abs, { task: getArg('task') || '', tier: getArg('tier') || '', updated: '', tasks: [] });
    console.log('INIT ' + abs);
  } else if (cmd === 'add') {
    const id = getArg('id'), title = getArg('title');
    if (!id) fail('缺少 --id');
    if (!title) fail('缺少 --title');
    const { abs, data } = load();
    if ((data.tasks || []).some(t => t.id === id)) fail('任务已存在: ' + id);
    data.tasks = data.tasks || [];
    data.tasks.push({ id, title, deps: (getArg('deps') || '').split(',').map(s => s.trim()).filter(Boolean), files: (getArg('files') || '').split(',').map(s => s.trim()).filter(Boolean), status: 'todo', evidence: '' });
    writeLedger(abs, data);
    console.log('ADD ' + id);
  } else if (cmd === 'next') {
    const { data } = load();
    const n = nextTask(data);
    if (!n) { console.log('NONE 没有可执行任务'); return; }
    if (args.includes('--json')) console.log(JSON.stringify(n.task, null, 2));
    else console.log(`NEXT ${n.task.id} | ${n.task.title}${n.resumed ? '（进行中，续跑）' : ''}`);
  } else if (cmd === 'start') {
    const id = getArg('id');
    if (!id) fail('缺少 --id');
    const { abs, data } = load();
    const t = find(data, id);
    if (t.status === 'done') fail('任务已完成: ' + id);
    const missing = depsMissing(data, t);
    if (missing.length) fail('依赖未完成: ' + missing.join(','));
    const doing = (data.tasks || []).find(x => x.status === 'doing' && x.id !== id);
    if (doing) fail('已有进行中任务: ' + doing.id);
    t.status = 'doing';
    writeLedger(abs, data);
    console.log('START ' + id);
  } else if (cmd === 'done') {
    const id = getArg('id'), evidence = getArg('evidence');
    if (!id) fail('缺少 --id');
    if (!evidence || evidence === true) fail('缺少 --evidence（无证据不算完成）');
    const { abs, data } = load();
    const t = find(data, id);
    t.status = 'done';
    t.evidence = evidence;
    delete t.note;
    writeLedger(abs, data);
    console.log('DONE ' + id);
  } else if (cmd === 'block') {
    const id = getArg('id'), reason = getArg('reason');
    if (!id) fail('缺少 --id');
    if (!reason || reason === true) fail('缺少 --reason');
    const { abs, data } = load();
    const t = find(data, id);
    t.status = 'blocked';
    t.note = reason;
    writeLedger(abs, data);
    console.log('BLOCK ' + id);
  } else if (cmd === 'unblock') {
    const id = getArg('id');
    if (!id) fail('缺少 --id');
    const { abs, data } = load();
    const t = find(data, id);
    if (t.status !== 'blocked') fail('任务不是 blocked 状态: ' + id);
    t.status = 'todo';
    delete t.note;
    writeLedger(abs, data);
    console.log('UNBLOCK ' + id);
  } else if (cmd === 'validate') {
    const { data } = load();
    const errs = validateLedger(data);
    if (errs.length) { for (const e of errs) console.log('FAIL ' + e); process.exit(1); }
    console.log('OK 账本合法');
  } else if (cmd === 'status') {
    const { data } = load();
    const tasks = data.tasks || [];
    const count = k => tasks.filter(t => t.status === k).length;
    const errs = validateLedger(data);
    console.log(JSON.stringify({
      task: data.task || '', tier: data.tier || '',
      total: tasks.length, todo: count('todo'), doing: count('doing'), blocked: count('blocked'), done: count('done'),
      invalid: errs.length,
    }, null, 2));
    for (const e of errs) console.log('WARN ' + e);
  } else {
    console.error('用法: init | add | next | start | done | block | unblock | status | validate');
    process.exit(1);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) main();
