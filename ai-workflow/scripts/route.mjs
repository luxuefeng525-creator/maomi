#!/usr/bin/env node
// ai-workflow 路由兜底：对一句话意图，给本包/宿主技能打分，输出 Top3。零依赖。
// 用法：node scripts/route.mjs "<一句话>" [额外技能目录...]
import fs from 'node:fs';
import path from 'node:path';

const query = (process.argv.slice(2).join(' ')).toLowerCase();
const extraDirs = process.argv.slice(2).slice(1).filter(a => fs.existsSync(a));

function loadSkills(dir) {
  const res = [];
  if (!fs.existsSync(dir)) return res;
  for (const name of fs.readdirSync(dir)) {
    const sk = path.join(dir, name, 'SKILL.md');
    if (!fs.existsSync(sk)) continue;
    const txt = fs.readFileSync(sk, 'utf8');
    const fm = txt.match(/^---\n([\s\S]*?)\n---/);
    const desc = (fm ? fm[1].match(/description:\s*([\s\S]*?)(?:\n\w|$)/) : null);
    let description = desc ? desc[1].replace(/\n/g, ' ').trim() : '';
    const trigLine = txt.match(/^触发词[:：]\s*(.+)$/m);
    const triggers = trigLine ? trigLine[1].split(/[\/、，,；;|]/).map(s => s.trim()).filter(Boolean) : [];
    res.push({ name, description, triggers });
  }
  return res;
}

const pkgSkills = path.join(import.meta.dirname, '..', 'skills');
let skills = loadSkills(pkgSkills);
// 同级扫描：宿主技能根目录（如 .trae/skills/、.workbuddy/skills/）里的兄弟技能也能被路由发现
const hostRoot = path.join(import.meta.dirname, '..', '..');
const scanDirs = Array.from(new Set([hostRoot, ...extraDirs])).filter(d => d !== pkgSkills);
for (const d of scanDirs) skills = skills.concat(loadSkills(d));

// 主路由：机器可读触发词清单（省 token，不逐技能读大段 description）
let triggers = {};
try { triggers = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'triggers.json'), 'utf8')); } catch {}
const neg = triggers.__negative_intents || null;
delete triggers.__negative_intents;

if (!query) { console.log('用法：route.mjs "<一句话>"'); process.exit(1); }

// 负向意图闸门：纯问答/文本替换/转交文件等元请求，且无开发动作词 → 不载技能（省 token）。
// 由 eval.mjs trigger 迭代暴露，规则写在 triggers.json，可扩充；误拦仍可由用户点名技能覆盖。
if (neg) {
  const pats = neg.patterns || [], verbs = neg.build_verbs || [];
  const hitMeta = pats.some(p => query.includes(String(p).toLowerCase()));
  const hasBuild = verbs.some(v => query.includes(String(v).toLowerCase()));
  if (hitMeta && !hasBuild) {
    console.log('ROUTE_NONE（非开发意图，走通用工程纪律）');
    process.exit(0);
  }
}

function score(s) {
  let sc = 0;
  const trigHits = [];
  // 1) triggers.json 优先（中文意图可靠）
  const tk = triggers[s.name] || [];
  for (const t of tk) {
    if (t.length >= 2 && query.includes(t.toLowerCase())) { sc += 4; trigHits.push(t); }
  }
  // 2) SKILL.md 触发词行兜底
  for (const t of s.triggers) {
    if (t.length >= 2 && query.includes(t.toLowerCase()) && !trigHits.includes(t)) { sc += 4; trigHits.push(t); }
  }
  if (query.includes(s.name.toLowerCase())) sc += 6;
  // 3) description 2-gram 重叠作为补充
  const grams = new Set();
  for (let i = 0; i < query.length - 1; i++) grams.add(query.slice(i, i + 2));
  let ov = 0;
  for (const g of grams) if (s.description.toLowerCase().includes(g)) ov++;
  sc += Math.min(ov, 4);
  return { sc, trigHits };
}

// 按 name 去重（包内 skills/ 与宿主根嵌套扫描可能重复命中同一技能）
const seen = new Set();
skills = skills.filter(s => (seen.has(s.name) ? false : (seen.add(s.name), true)));

const ranked = skills
  .map(s => ({ s, ...score(s) }))
  .filter(x => x.sc >= 4)
  .sort((a, b) => b.sc - a.sc)
  .slice(0, 3);

if (!ranked.length) {
  console.log('ROUTE_NONE（无匹配技能，按通用工程纪律执行）');
} else {
  ranked.forEach((x, i) => {
    const tag = x.trigHits.length ? ` 触发词:${x.trigHits.join('/')}` : '';
    console.log(`${i + 1}. ${x.s.name} (score=${x.sc})${tag}`);
  });
}
