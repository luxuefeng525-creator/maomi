#!/usr/bin/env node
// ai-workflow 长期记忆：索引式，从不整份载入。零依赖，跨平台。
// 用法：
//   node scripts/memory.mjs add "<类别> | <一句话事实>"
//   node scripts/memory.mjs search "<关键词>"
//   node scripts/memory.mjs prune
//   node scripts/memory.mjs index
// 跨项目偏好：加 --file <用户级MEMORY.md路径>
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const rootIdx = args.indexOf('--root');
const ROOT = rootIdx >= 0 ? args[rootIdx + 1] : '';
const memFile = fileIdx >= 0 ? args[fileIdx + 1]
  : path.join(ROOT || process.cwd(), '.ai-workflow', 'memory.md');
const cmd = args[0];
const VALUE_FLAGS = ['--file', '--root'];
const rest = args.slice(1).filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i])).join(' ').trim();

function ensureDir() {
  const dir = path.dirname(memFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function read() {
  try { return fs.readFileSync(memFile, 'utf8').split('\n'); } catch { return []; }
}
function today() { return new Date().toISOString().slice(0, 10); }

if (cmd === 'add') {
  if (!rest) { console.log('用法：memory.mjs add "<类别> | <事实>"'); process.exit(1); }
  ensureDir();
  // 防重复：同关键词已存在则跳过
  const lines = read().filter(Boolean);
  const kw = rest.split('|')[1]?.trim().slice(0, 12) || rest.slice(0, 12);
  if (lines.some(l => l.toLowerCase().includes(kw.toLowerCase()) && kw.length > 2)) {
    console.log('SKIP 已有近似条目（先 search 确认）');
    process.exit(0);
  }
  const entry = `${today()} | ${rest}`;
  fs.appendFileSync(memFile, entry + '\n', 'utf8');
  console.log('ADDED ' + entry);
}
else if (cmd === 'search') {
  if (!rest) { console.log('用法：memory.mjs search "<关键词>"'); process.exit(1); }
  const lines = read().filter(Boolean).filter(l => l.toLowerCase().includes(rest.toLowerCase()));
  if (!lines.length) { console.log('NONE'); process.exit(0); }
  lines.slice(0, 8).forEach((l, i) => console.log(`${i + 1}. ${l}`));
  if (lines.length > 8) console.log(`… 另有 ${lines.length - 8} 条，缩小关键词`);
}
else if (cmd === 'prune') {
  const lines = read().filter(Boolean);
  const cutoff = Date.now() - 90 * 864e5;
  let kept = 0, stale = 0;
  const next = lines.map(l => {
    const d = l.slice(0, 10);
    const t = Date.parse(d);
    if (!isNaN(t) && t < cutoff) { stale++; return l + ' [stale]'; }
    kept++; return l;
  }).slice(-200);
  ensureDir();
  fs.writeFileSync(memFile, next.join('\n') + '\n', 'utf8');
  console.log(`PRUNED kept=${kept} stale=${stale} total=${next.length}`);
}
else if (cmd === 'index') {
  const lines = read().filter(Boolean);
  const cats = {};
  lines.forEach(l => { const c = (l.split('|')[1] || '?').trim(); cats[c] = (cats[c] || 0) + 1; });
  console.log('INDEX ' + JSON.stringify(cats));
}
else {
  console.log('memory.mjs: add | search | prune | index');
}
