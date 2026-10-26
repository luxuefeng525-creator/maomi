#!/usr/bin/env node
/**
 * 自进化提案：把重复出现的坑、评测失败、闸门拦截聚类成规则候选。
 * 用法：node scripts/evolve.mjs --root .agent-memory [--min 2] [--days 7] [--write]
 *       可选：--runs logs/external-results.jsonl  --guard .agent-runs/guard.log
 * --days 默认 7（只收最近 7 天），0 表示不限时间；同来源同出处的重复条目自动去重。
 * 默认只打印；--write 追加到 <root>/evolution/proposals-YYYYMMDD.md。
 * 提案必须人工确认后才写入 rules/agent-rules.md 或技能，脚本不自动改规则。
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const root = getArg('root');
if (!root || root === true) { console.error('缺少 --root'); process.exit(1); }
const rootAbs = path.resolve(root);
if (!fs.existsSync(rootAbs)) { console.error('目录不存在: ' + rootAbs); process.exit(1); }
const min = Number(getArg('min') || 2);
const days = Number(getArg('days') ?? 7);
const cutoff = days > 0 ? Date.now() - days * 86400000 : 0;
const write = args.includes('--write');
const runsFile = getArg('runs') || path.join(process.cwd(), 'logs', 'external-results.jsonl');
const guardFile = getArg('guard') || path.join(process.cwd(), '.agent-runs', 'guard.log');

const norm = s => String(s).toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, '');
const bigrams = s => { const set = new Set(); for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2)); return set; };
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; const u = a.size + b.size - i; return u ? i / u : 0; };

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (f !== 'evolution') walk(p); }
    else if (f.endsWith('.md')) files.push(p);
  }
})(rootAbs);

const items = [];
const seen = new Set();
let skippedDup = 0, skippedOld = 0;
/** 时间窗判断：无时间字段按当前处理，避免旧格式记录被全部丢弃 */
function inWindow(value) {
  if (!cutoff || !value) return true;
  const t = Date.parse(value);
  return Number.isNaN(t) ? true : t >= cutoff;
}
function pushItem(text, ref, source) {
  const t = String(text || '').trim();
  if (t.length < 6) return;
  const key = `${source}|${ref}|${norm(t)}`;
  if (seen.has(key)) { skippedDup++; return; }
  seen.add(key);
  items.push({ text: t, source, ref, b: bigrams(norm(t)) });
}
for (const file of files) {
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    const m = line.match(/^- \[pitfall\]\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+\|\s*([^|]+)\|.*id:\s*([0-9a-f]{8})/);
    if (!m) return;
    if (!inWindow(m[1] + 'T' + m[2] + ':00')) { skippedOld++; return; }
    pushItem(m[3], `${path.relative(rootAbs, file)}:${i + 1}`, 'pitfall');
  });
}
// 评测失败：只取 fail 明细，infra_fail 不算模型失败
if (fs.existsSync(runsFile)) {
  fs.readFileSync(runsFile, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    let o; try { o = JSON.parse(line); } catch { return; }
    if (o.verdict === 'infra_fail') return; // 通道/超时故障不算模型行为
    if (!inWindow(o.time)) { skippedOld++; return; }
    if (!Array.isArray(o.fails)) return;
    for (const f of o.fails) pushItem(String(f).replace(/^FAIL\s+/, ''), `${path.relative(process.cwd(), runsFile)}:${i + 1}`, 'run');
  });
}
// 闸门拦截：ask / deny 的原因聚成候选
if (fs.existsSync(guardFile)) {
  fs.readFileSync(guardFile, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    let o; try { o = JSON.parse(line); } catch { return; }
    if (!inWindow(o.time)) { skippedOld++; return; }
    if (o.decision === 'ask' || o.decision === 'deny') pushItem(o.reason, `${path.relative(process.cwd(), guardFile)}:${i + 1}`, 'guard');
  });
}

const used = new Set();
const clusters = [];
for (let i = 0; i < items.length; i++) {
  if (used.has(i)) continue;
  const group = [items[i]];
  used.add(i);
  for (let j = i + 1; j < items.length; j++) {
    if (used.has(j)) continue;
    if (jac(items[i].b, items[j].b) >= 0.55) { group.push(items[j]); used.add(j); }
  }
  if (group.length >= min) clusters.push(group);
}
clusters.sort((a, b) => b.length - a.length);

const count = s => items.filter(x => x.source === s).length;
const stamp = new Date().toISOString().slice(0, 10);
console.log(`EVOLVE root=${rootAbs} items=${items.length} (pitfall=${count('pitfall')} run=${count('run')} guard=${count('guard')}) clusters=${clusters.length} min=${min} days=${days} skippedOld=${skippedOld} skippedDup=${skippedDup}`);
for (const g of clusters) {
  console.log(`PROPOSAL x${g.length} | [${g[0].source}] ${g[0].text}`);
  for (const it of g) console.log(`  - ${it.ref}`);
}
if (!clusters.length) console.log('NO_PROPOSAL');

if (write && clusters.length) {
  const dir = path.join(rootAbs, 'evolution');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `proposals-${stamp}.md`);
  const L = [`# 规则候选 · ${stamp}`, ''];
  clusters.forEach((g, idx) => {
    L.push(`## ${idx + 1}. 出现 ${g.length} 次 · 来源 ${g[0].source}`, '');
    for (const it of g) L.push(`- ${it.text} ｜ ${it.ref}`);
    L.push('');
    L.push('建议：人工确认后提炼成一条规则写入 rules/agent-rules.md，或补进对应技能；原始记录保留作证据。');
    L.push('');
  });
  fs.writeFileSync(file, L.join('\n'), 'utf8');
  console.log('WRITE ' + file);
}
