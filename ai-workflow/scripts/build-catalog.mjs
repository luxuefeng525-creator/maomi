#!/usr/bin/env node
// 构建 catalog.json + references/dispatch-table.md（机器/模型共用的一页式技能索引）。
// 用法：node scripts/build-catalog.mjs [--check]
// 产物：catalog.json（route.mjs 用，不进模型上下文）、references/dispatch-table.md（≤40 行，模型可整读，约 1.2KB）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const skillsDir = path.join(PKG, 'skills');
const check = process.argv.includes('--check');

const trig = JSON.parse(fs.readFileSync(path.join(HERE, 'triggers.json'), 'utf8'));
const reqMap = trig.__requires || {};
const meta = {};
for (const name of fs.readdirSync(skillsDir)) {
  const f = path.join(skillsDir, name, 'SKILL.md');
  if (!fs.existsSync(f)) continue;
  const txt = fs.readFileSync(f, 'utf8');
  const fm = (txt.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [, ''])[1];
  let desc = (fm.match(/description:\s*([\s\S]*?)(?:\n[a-zA-Z][\w-]*:|\n*$)/) || [, ''])[1]
    .replace(/^[\s'"|>]+/, '').replace(/\s+/g, ' ').trim();
  const when = (fm.match(/when_to_use:\s*(.+)/) || [, ''])[1].trim();
  desc = String(desc).trim().replace(/^['"]|['"]$/g, '').replace(/\s+/g, ' ').trim();
  meta[name] = { name, desc: desc.slice(0, 200), when };
}

const skills = Object.keys(meta).sort().map(n => ({
  name: n,
  keywords: (trig[n] || []).slice(0, 24),
        ...( (trig[n]||[]).length > 24 ? { _dropped: (trig[n]||[]).length - 24 } : {} ),
  desc: meta[n].desc,
  needs: (reqMap[n] && reqMap[n].needs) || [],
}));
const catalog = { version: (JSON.parse('"' + (fs.readFileSync(path.join(PKG, 'SKILL.md'), 'utf8').match(/^version:\s*([\d.]+)/m) || [, '0.0.0'])[1] + '"')), generated: new Date().toISOString().slice(0, 10), skills, syncs: trig.__synonyms || {}, negatives: trig.__negative_intents || null };

if (check) {
  const old = path.join(PKG, 'catalog.json');
  const same = fs.existsSync(old) && fs.readFileSync(old, 'utf8') === JSON.stringify(catalog, null, 2);
  console.log(same ? 'CATALOG OK (up to date)' : 'CATALOG STALE: run node scripts/build-catalog.mjs');
  process.exit(same ? 0 : 1);
}

fs.writeFileSync(path.join(PKG, 'catalog.json'), JSON.stringify(catalog, null, 2));

const rows = skills.map(s => `| ${s.name} | ${s.keywords.slice(0, 4).join(' / ') || '-'} | ${s.needs.length ? s.needs.join(',') : 'any'} |`).join('\n');
const md = `# 派发表（自动生成，勿手改 · 由 scripts/build-catalog.mjs 生成）

用法：先 \`node scripts/route.mjs "<一句话>"\` 拿 Top3，再只读命中的 SKILL.md 正文。
没命中不要硬套技能；用户点名技能以点名为准（点名的优先级高于任何打分）。

| 技能 | 关键词（前 4） | 宿主依赖 |
|---|---|---|
${rows}
`;
fs.mkdirSync(path.join(PKG, 'references'), { recursive: true });
fs.writeFileSync(path.join(PKG, 'references', 'dispatch-table.md'), md);
const missing = skills.filter(s => !s.keywords.length).map(s => s.name);
console.log(`CATALOG ${skills.length} skills -> catalog.json + references/dispatch-table.md`);
if (missing.length) console.log('WARN 无关键词: ' + missing.join(', '));
