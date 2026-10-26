#!/usr/bin/env node
/**
 * Stop Hook 闸门：会话准备结束时检查账本，未达标就阻断并说明原因。
 * 用法：node scripts/stop-gate.mjs [--cwd <项目>] [--file <tasks.json>] [--json] [--no-block]
 * 从 stdin 读 hook JSON（cwd / stop_hook_active / loop_count / last_assistant_message）。
 * 阻断输出：{"decision":"block","reason":"..."}；允许输出：{"continue":true}
 */
import fs from 'node:fs';
import path from 'node:path';
import { nextTask, validateLedger } from '../skills/project-orchestrator/scripts/task.mjs';

const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const noBlock = args.includes('--no-block');

let hook = {};
try {
  if (!process.stdin.isTTY) {
    const raw = fs.readFileSync(0, 'utf8').trim();
    if (raw) hook = JSON.parse(raw);
  }
} catch { /* 无 stdin 按手动执行 */ }

const cwd = path.resolve(getArg('cwd') || hook.cwd || process.cwd());
const explicit = getArg('file');

function findLedger() {
  if (explicit) return path.resolve(cwd, explicit);
  const docs = path.join(cwd, 'docs');
  if (!fs.existsSync(docs)) return null;
  const files = [];
  for (const d of fs.readdirSync(docs)) {
    const p = path.join(docs, d, 'tasks.json');
    if (fs.existsSync(p)) files.push({ p, t: fs.statSync(p).mtimeMs });
  }
  files.sort((a, b) => b.t - a.t);
  return files[0]?.p || null;
}

const allow = () => { console.log(JSON.stringify({ continue: true })); process.exit(0); };
const block = reason => {
  if (noBlock) { console.log('WOULD_BLOCK ' + reason); process.exit(0); }
  console.log(JSON.stringify({ decision: 'block', reason }));
  process.exit(0);
};

const ledgerFile = findLedger();
if (!ledgerFile || !fs.existsSync(ledgerFile)) allow();

let data;
try { data = JSON.parse(fs.readFileSync(ledgerFile, 'utf8')); }
catch (e) { block('账本不是合法 JSON：' + e.message); }

const reasons = [];
const errs = validateLedger(data);
if (errs.length) reasons.push('账本不合法：' + errs.slice(0, 3).join('；'));

const tasks = data.tasks || [];
const doing = tasks.filter(t => t.status === 'doing');
if (doing.length) reasons.push('仍有进行中任务：' + doing.map(t => t.id).join(','));

const n = nextTask(data);
if (n && n.task.status === 'todo') reasons.push('仍有可执行任务未完成：' + n.task.id + ' ' + n.task.title);

const missingEvidence = tasks.filter(t => {
  if (t.status !== 'done' || !t.evidence) return false;
  const e = String(t.evidence);
  return e.includes('/') && /\.[a-z0-9]+$/i.test(e) && !fs.existsSync(path.resolve(cwd, e));
});
if (missingEvidence.length) reasons.push('证据文件不存在：' + missingEvidence.map(t => t.id + '(' + t.evidence + ')').join('，'));

const claimsDone = /(已完成|已修复|修复完成|全部通过|验收通过|done)/i.test(String(hook.last_assistant_message || ''));
if (claimsDone && reasons.length) reasons.push('回复宣称完成，但账本仍有未结项');

if (!reasons.length) allow();
block(reasons.join('；') + '。请补完账本或跑 selfcheck 后再结束。');
