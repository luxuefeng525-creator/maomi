#!/usr/bin/env node
/**
 * 自进化提案：把重复出现的 pitfall 聚类成规则候选。
 * 用法：node scripts/evolve.mjs --root .agent-memory [--min 2] [--write]
 * 默认只打印；--write 追加到 <root>/evolution/proposals-YYYYMMDD.md。
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
const write = args.includes('--write');

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
for (const file of files) {
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    const m = line.match(/^- \[pitfall\]\s+\S+\s+\S+\s+\|\s*([^|]+)\|.*id:\s*([0-9a-f]{8})/);
    if (m) items.push({ text: m[1].trim(), id: m[2], ref: `${path.relative(rootAbs, file)}:${i + 1}`, b: bigrams(norm(m[1])) });
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

const stamp = new Date().toISOString().slice(0, 10);
console.log(`EVOLVE root=${rootAbs} pitfalls=${items.length} clusters=${clusters.length} min=${min}`);
for (const g of clusters) {
  console.log(`PROPOSAL x${g.length} | ${g[0].text}`);
  for (const it of g) console.log(`  - ${it.ref} id=${it.id}`);
}
if (!clusters.length) console.log('NO_PROPOSAL');

if (write && clusters.length) {
  const dir = path.join(rootAbs, 'evolution');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `proposals-${stamp}.md`);
  const L = [`# 规则候选 · ${stamp}`, ''];
  clusters.forEach((g, idx) => {
    L.push(`## ${idx + 1}. 出现 ${g.length} 次`, '');
    for (const it of g) L.push(`- ${it.text} ｜ ${it.ref} ｜ id=${it.id}`);
    L.push('');
    L.push('建议：提炼成一条规则写入索引，原条目保留作证据。');
    L.push('');
  });
  fs.writeFileSync(file, L.join('\n'), 'utf8');
  console.log('WRITE ' + file);
}
