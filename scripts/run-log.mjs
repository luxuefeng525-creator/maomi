#!/usr/bin/env node
/**
 * 运行轨迹：把每次任务的开始、步骤、结束写成 JSONL，可按天汇总。
 * 用法：
 *   node scripts/run-log.mjs start  --root .agent-runs --task "名称" --tier L1 [--run id]
 *   node scripts/run-log.mjs step   --root .agent-runs --run id --name "ui-audit" --status pass|fail|skip [--evidence "路径"]
 *   node scripts/run-log.mjs finish --root .agent-runs --run id --status pass|fail|partial|infra_fail [--notes "说明"]
 *   node scripts/run-log.mjs report --root .agent-runs [--days 7]
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const cmd = args[0];
const root = getArg('root');
if (!root || root === true) { console.error('缺少 --root'); process.exit(1); }
const rootAbs = path.resolve(root);
const DAY = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const FILE = path.join(rootAbs, DAY + '.jsonl');

function append(obj) {
  fs.mkdirSync(rootAbs, { recursive: true });
  fs.appendFileSync(FILE, JSON.stringify(obj) + '\n', 'utf8');
}
function readAll(days) {
  if (!fs.existsSync(rootAbs)) return [];
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  return fs.readdirSync(rootAbs).filter(f => /^\d{8}\.jsonl$/.test(f) && f.slice(0, 8) >= cutoff)
    .flatMap(f => fs.readFileSync(path.join(rootAbs, f), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)));
}

if (cmd === 'start') {
  const runId = getArg('run') || `${DAY}-${Date.now().toString().slice(-6)}`;
  append({ ts: new Date().toISOString(), run: runId, event: 'start', task: getArg('task') || '', tier: getArg('tier') || '' });
  console.log('RUN ' + runId);
} else if (cmd === 'step') {
  const run = getArg('run');
  if (!run) { console.error('缺少 --run'); process.exit(1); }
  append({ ts: new Date().toISOString(), run, event: 'step', name: getArg('name') || '', status: getArg('status') || 'skip', evidence: getArg('evidence') || '' });
  console.log('STEP ' + (getArg('name') || '') + ' ' + (getArg('status') || 'skip'));
} else if (cmd === 'finish') {
  const run = getArg('run');
  if (!run) { console.error('缺少 --run'); process.exit(1); }
  append({ ts: new Date().toISOString(), run, event: 'finish', status: getArg('status') || 'pass', notes: getArg('notes') || '' });
  console.log('FINISH ' + run + ' ' + (getArg('status') || 'pass'));
} else if (cmd === 'report') {
  const days = Number(getArg('days') || 7);
  const rows = readAll(days);
  const runs = new Map();
  for (const r of rows) {
    if (!runs.has(r.run)) runs.set(r.run, { run: r.run, task: '', tier: '', start: null, finish: null, steps: [] });
    const x = runs.get(r.run);
    if (r.event === 'start') { x.task = r.task; x.tier = r.tier; x.start = r.ts; }
    if (r.event === 'step') x.steps.push(r);
    if (r.event === 'finish') { x.finish = r.ts; x.status = r.status; x.notes = r.notes; }
  }
  const list = [...runs.values()];
  const by = k => list.reduce((m, x) => { const v = x[k] || 'unknown'; m[v] = (m[v] || 0) + 1; return m; }, {});
  const durations = list.filter(x => x.start && x.finish).map(x => (new Date(x.finish) - new Date(x.start)) / 1000);
  const failSteps = {};
  for (const x of list) for (const s of x.steps) if (s.status === 'fail') failSteps[s.name] = (failSteps[s.name] || 0) + 1;
  console.log(JSON.stringify({
    days,
    runs: list.length,
    status: by('status'),
    tier: by('tier'),
    avgMinutes: durations.length ? +(durations.reduce((a, b) => a + b, 0) / durations.length / 60).toFixed(1) : null,
    topFailSteps: Object.entries(failSteps).sort((a, b) => b[1] - a[1]).slice(0, 5),
  }, null, 2));
} else {
  console.error('用法: start | step | finish | report');
  process.exit(1);
}
