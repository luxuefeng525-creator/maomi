#!/usr/bin/env node
/**
 * 行为场景复跑器：每场景重复执行 prepare → 回放夹具动作 → check，比对判定是否稳定。
 * 用法：node tests/behavior/rerun.mjs [--times 3] [--scenario B1-ambiguous] [--keep]
 * 退出码：全部 pass 且跨次一致 → 0；出现 fail/partial/不一致 → 1。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..', '..');
const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const times = Number(getArg('times') || 3);
const only = getArg('scenario');
const keep = args.includes('--keep');

const cfg = JSON.parse(fs.readFileSync(path.join(scriptDir, 'scenarios.json'), 'utf8'));
const sol = JSON.parse(fs.readFileSync(path.join(scriptDir, 'solutions.json'), 'utf8'));
const scenarios = cfg.scenarios.filter(s => !only || s.id === only);
if (!scenarios.length) { console.error('场景不存在: ' + only); process.exit(1); }

const checker = path.join(root, 'scripts', 'behavior-check.mjs');
const sandboxRoot = path.join(scriptDir, '.rerun');

/** 把回放动作写进沙箱；taskDone 走 task.mjs，禁止手改 status。 */
function applyActions(sandbox, actions) {
  for (const a of actions) {
    if (a.write) {
      const p = path.join(sandbox, a.write);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, a.content, 'utf8');
    }
    if (a.taskDone) {
      const { file, id, evidence } = a.taskDone;
      const r = spawnSync(process.execPath, [
        path.join(root, 'skills', 'project-orchestrator', 'scripts', 'task.mjs'),
        'done', '--file', path.join(sandbox, file), '--id', id, '--evidence', evidence,
      ], { cwd: sandbox, encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`task.mjs done 失败 ${id}: ${(r.stderr || '').trim()}`);
    }
  }
}

function verdictOf(sandbox, id) {
  // 回复转录按短号存：B3-tiny-change -> B3.md
  const resp = path.join(scriptDir, '.responses', id.split('-')[0] + '.md');
  const r = spawnSync(process.execPath, [checker, 'check', '--scenario', id, '--sandbox', sandbox, '--response', resp], { cwd: root, encoding: 'utf8' });
  const out = (r.stdout || '').trim();
  const line = out.split('\n').reverse().find(l => l.startsWith('VERDICT ')) || '';
  return { line, pass: r.status === 0 && / pass=(\d+)\/\1$/.test(line), out };
}

let bad = 0;
const summary = [];
for (const sc of scenarios) {
  const actions = sol.scenarios[sc.id];
  if (!actions) { console.error('缺少回放夹具: ' + sc.id); bad++; continue; }
  const sandbox = path.join(sandboxRoot, sc.id);
  const lines = [];
  let stable = true;
  for (let i = 1; i <= times; i++) {
    const p = spawnSync(process.execPath, [checker, 'prepare', '--scenario', sc.id, '--sandbox', sandbox], { cwd: root, encoding: 'utf8' });
    if (p.status !== 0) { console.error('prepare 失败 ' + sc.id + ': ' + (p.stderr || '').trim()); bad++; stable = false; break; }
    try { applyActions(sandbox, actions); } catch (e) { console.error(String(e.message)); bad++; stable = false; break; }
    const v = verdictOf(sandbox, sc.id);
    lines.push(v.line);
    if (!v.pass) { console.log(v.out); bad++; }
  }
  const uniq = new Set(lines);
  if (uniq.size > 1) stable = false;
  if (!stable) bad++;
  summary.push({ id: sc.id, runs: lines.length, stable, verdict: lines[0] || '', lines });
  const tag = stable && lines.every(l => /\bpass\b/.test(l)) ? 'STABLE' : 'UNSTABLE';
  console.log(`${tag} ${sc.id} runs=${lines.length} ${lines[0] || ''}`);
}

if (!keep) fs.rmSync(sandboxRoot, { recursive: true, force: true });
console.log('---');
console.log(`SUMMARY scenarios=${summary.length} times=${times} stable=${summary.filter(s => s.stable).length}/${summary.length} bad=${bad}`);
process.exitCode = bad ? 1 : 0;
