#!/usr/bin/env node
/**
 * 技能路由：把一句自然语言查询（中/英）路由到最匹配的技能。
 * 用法：node scripts/route-skill.mjs --query "<一句话>" [--top 3] [--json] [--registry <文件>]
 *
 * 为什么需要它：README 承诺「按描述自动选技能」，但此前没有任何可执行的路由器，
 * 40 个技能里有 28 个连中文触发词都没有 —— 中文用户说什么都靠模型临场猜。
 * 本脚本给出确定性的打分基线，并作为 tests/eval 的中文路由评测靶子。
 *
 * 打分规则（可解释）：
 *  - 中文触发词整词命中：4 + 触发词长度（越长越具体）
 *  - 触发词部分命中（查询里出现了触发词的 2 字片段）：每个片段 +0.6
 *  - 技能名出现在查询里：+6
 *  - description 英文词命中（>=3 字母）：+1.2；description 里的中文 2 字片段命中：+0.4
 *  - 低于 MIN_SCORE 视为无匹配，输出 ROUTE_NONE（不硬推无关技能）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };

const query = (getArg('query') || '').trim();
const top = Math.max(1, Number(getArg('top') || 3));
const asJson = args.includes('--json');
const registryFile = path.resolve(getArg('registry') || path.join(root, 'skills', 'registry.json'));
const MIN_SCORE = 4;

if (!query) {
  console.error('用法：node scripts/route-skill.mjs --query "<一句话>" [--top 3] [--json]');
  process.exit(2);
}

let registry;
try {
  registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
} catch {
  console.error('读取 registry 失败（先运行 npm run registry:write）：' + registryFile);
  process.exit(2);
}

const norm = s => String(s || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
const q = norm(query);

/** 中文 2 字片段集合（用于部分命中与 description 中文匹配） */
const bigrams = text => {
  const out = new Set();
  const chars = [...norm(text)];
  for (let i = 0; i < chars.length - 1; i++) {
    const pair = chars[i] + chars[i + 1];
    if (/^[\u4e00-\u9fa5]{2}$/.test(pair)) out.add(pair);
  }
  return out;
};
const qBigrams = bigrams(query);
const qLatin = new Set((String(query).toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || []));

const scoreSkill = skill => {
  let score = 0;
  const hits = [];
  for (const t of skill.triggers || []) {
    const nt = norm(t);
    if (nt.length < 2) continue;
    if (q.includes(nt)) {
      score += 4 + nt.length;
      hits.push(t);
      continue;
    }
    let partial = 0;
    for (const bg of bigrams(t)) if (qBigrams.has(bg)) partial += 0.6;
    if (partial > 0) { score += partial; hits.push(t + '(部分)'); }
  }
  if (skill.name && q.includes(norm(skill.name))) { score += 6; hits.push(skill.name); }
  const desc = String(skill.description || '');
  for (const w of new Set(desc.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [])) {
    if (qLatin.has(w)) { score += 1.2; hits.push(w); }
  }
  let zhHits = 0;
  for (const bg of bigrams(desc)) if (qBigrams.has(bg)) zhHits++;
  if (zhHits) { score += Math.min(zhHits, 5) * 0.4; hits.push(`desc中文×${zhHits}`); }
  return { name: skill.name, score: Math.round(score * 10) / 10, hits: hits.slice(0, 6) };
};

const ranked = (registry.skills || [])
  .map(scoreSkill)
  .filter(r => r.score > 0)
  .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  .slice(0, top);

if (asJson) {
  console.log(JSON.stringify({ query, matches: ranked, none: !ranked.length || ranked[0].score < MIN_SCORE }, null, 2));
} else if (!ranked.length || ranked[0].score < MIN_SCORE) {
  console.log(`ROUTE_NONE | 无匹配（最高分 ${ranked[0]?.score ?? 0} < ${MIN_SCORE}）：${query}`);
} else {
  for (const r of ranked) console.log(`ROUTE ${r.name} score=${r.score} | 命中: ${r.hits.join(', ')}`);
}
process.exitCode = 0;
