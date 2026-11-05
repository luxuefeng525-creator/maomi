#!/usr/bin/env node
// checkpoint.mjs — 长任务断点账本：任务超时/中断后，下次会话能从这里续跑，不丢进度。
// 默认文件：.ai-workflow/checkpoint.json（可用 --file 覆盖）。
// 用法：
//   node scripts/checkpoint.mjs start "<任务名>" --steps "调研|契约|实现|测试|验收"
//   node scripts/checkpoint.mjs done "<步骤名或序号>" [--note "做了什么"]
//   node scripts/checkpoint.mjs status          # 进度 + 下一步
//   node scripts/checkpoint.mjs resume          # 上次做到哪、下一步、最近备注
//   node scripts/checkpoint.mjs note "备注"
//   node scripts/checkpoint.mjs reset
// 设计：单文件 JSON、零依赖、输出极简（省 token）。
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
function opt(n, d) { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; }
const ROOT = opt('--root', '');  // 子代理跑在别的目录时用 --root 指回项目根，避免账本写错地方
const FILE = path.resolve(opt('--file', path.join(ROOT || '.', '.ai-workflow', 'checkpoint.json')));
const cmd = argv[0];
const now = () => new Date().toISOString();

function load() {
  if (!fs.existsSync(FILE)) return null;
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return null; }
}
function save(s) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); s.updated_at = now(); fs.writeFileSync(FILE, JSON.stringify(s, null, 2)); }
function need(s) { if (!s) { console.log('NO_CHECKPOINT 先执行: checkpoint.mjs start "<任务>" --steps "a|b|c"'); process.exit(1); } return s; }

if (cmd === 'start') {
  const task = argv[1] || '未命名任务';
  const stepsRaw = opt('--steps', '');
  const names = stepsRaw ? stepsRaw.split('|').map(x => x.trim()).filter(Boolean) : [];
  if (!names.length) { console.log('用法: checkpoint.mjs start "<任务>" --steps "调研|契约|实现|测试|验收"'); process.exit(1); }
  const state = { task, created_at: now(), updated_at: now(), steps: names.map(n => ({ name: n, status: 'todo', note: '', at: null })), notes: [] };
  save(state);
  console.log(`CHECKPOINT 新建 ${FILE}\nTASK ${task} · ${names.length} 步\nNEXT ${names[0]}`);
  process.exit(0);
}

if (cmd === 'reset') {
  if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
  console.log('CHECKPOINT 已清除');
  process.exit(0);
}

const s = need(load());
const doneCount = s.steps.filter(x => x.status === 'done').length;

if (cmd === 'status' || cmd === 'resume') {
  const next = s.steps.find(x => x.status !== 'done');
  const lastDone = [...s.steps].reverse().find(x => x.status === 'done');
  const pct = Math.round((doneCount / s.steps.length) * 100);
  console.log(`TASK ${s.task}`);
  console.log(`PROGRESS ${doneCount}/${s.steps.length} (${pct}%)`);
  if (cmd === 'resume' && lastDone) console.log(`LAST ${lastDone.name}${lastDone.note ? ' · ' + lastDone.note : ''}`);
  console.log(next ? `NEXT ${next.name}` : 'NEXT 全部完成');
  if (cmd === 'resume' && s.notes.length) console.log(`NOTE ${s.notes.slice(-2).join(' / ')}`);
  process.exit(0);
}

if (cmd === 'note') {
  const text = argv[1] || opt('--note', '');
  if (!text) { console.log('用法: checkpoint.mjs note "备注"'); process.exit(1); }
  s.notes.push(text);
  save(s);
  console.log(`NOTE + ${text}`);
  process.exit(0);
}

if (cmd === 'done') {
  const key = argv[1];
  if (!key) { console.log('用法: checkpoint.mjs done "<步骤名或序号>"'); process.exit(1); }
  let idx = /^\d+$/.test(key) ? Number(key) - 1 : s.steps.findIndex(x => x.name === key);
  if (idx < 0 || idx >= s.steps.length) { console.log(`未找到步骤: ${key}`); process.exit(1); }
  s.steps[idx].status = 'done';
  s.steps[idx].at = now();
  const note = opt('--note', '');
  if (note) s.steps[idx].note = note;
  save(s);
  const next = s.steps.find(x => x.status !== 'done');
  const d = s.steps.filter(x => x.status === 'done').length;
  console.log(`DONE ${s.steps[idx].name} · ${d}/${s.steps.length}` + (next ? ` · NEXT ${next.name}` : ' · 全部完成'));
  process.exit(0);
}

console.log('checkpoint.mjs: start | done | status | resume | note | reset   （默认 .ai-workflow/checkpoint.json）');
