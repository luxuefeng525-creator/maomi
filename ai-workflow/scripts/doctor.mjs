#!/usr/bin/env node
// doctor.mjs — 环境与包完整性自检。零依赖，只读（除 --fix-ignore 外不改文件）。
// 用法：node scripts/doctor.mjs [--json]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const ROOT = path.resolve(import.meta.dirname, '..');
const out = [];
const add = (level, name, msg) => out.push({ level, name, msg });

// 1 Node 版本
const major = Number(process.versions.node.split('.')[0]);
add(major >= 18 ? 'PASS' : 'FAIL', 'node', 'v' + process.versions.node + (major >= 18 ? '' : '（需要 ≥18：fs.cpSync / import.meta.dirname）'));

// 2 必需文件
const must = ['SKILL.md', 'README.md', 'catalog.json', 'scripts/route.mjs', 'scripts/classify.mjs',
  'scripts/agent.mjs', 'scripts/checkpoint.mjs', 'references/routing.md', 'references/parallel.md'];
const missing = must.filter(f => !fs.existsSync(path.join(ROOT, f)));
add(missing.length ? 'FAIL' : 'PASS', 'files', missing.length ? '缺 ' + missing.join(', ') : must.length + ' 个核心文件齐');

// 3 技能与 catalog 一致
let cat = null;
try { cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8')); } catch (e) { add('FAIL', 'catalog', '解析失败：' + e.message); }
const dirs = fs.existsSync(path.join(ROOT, 'skills'))
  ? fs.readdirSync(path.join(ROOT, 'skills')).filter(d => fs.statSync(path.join(ROOT, 'skills', d)).isDirectory()) : [];
if (cat) {
  const inCat = new Set(cat.skills.map(s => s.name));
  const noCat = dirs.filter(d => !inCat.has(d));
  const noDir = [...inCat].filter(n => !dirs.includes(n));
  add(noCat.length || noDir.length ? 'WARN' : 'PASS', 'catalog',
    noCat.length || noDir.length ? `未入目录 ${noCat.length} 个 / 无实体 ${noDir.length} 个（跑 catalog.mjs 重生）` : dirs.length + ' 个技能与目录一致');
}

// 4 frontmatter 最小校验（name/description/version）
const bad = [];
for (const d of dirs) {
  const f = path.join(ROOT, 'skills', d, 'SKILL.md');
  if (!fs.existsSync(f)) { bad.push(d + ':无SKILL.md'); continue; }
  const head = fs.readFileSync(f, 'utf8').slice(0, 1200);
  if (!/^---[\s\S]*?---/.test(head)) { bad.push(d + ':无frontmatter'); continue; }
  const fm = head.split('---')[1] || '';
  if (!/^name:\s*\S+/m.test(fm)) bad.push(d + ':缺name');
  if (!/^description:\s*\S+/m.test(fm)) bad.push(d + ':缺description');
}
add(bad.length ? 'WARN' : 'PASS', 'skills', bad.length ? bad.slice(0, 6).join(' / ') : dirs.length + ' 个 frontmatter 完整');

// 5 描述长度（路由可读性：过短不触发，过长烧 token）
const longDesc = [];
for (const s of (cat?.skills || [])) if (s.desc.length > 220) longDesc.push(s.name + '(' + s.desc.length + ')');
add(longDesc.length ? 'WARN' : 'PASS', 'desc-length', longDesc.length ? '过长：' + longDesc.join(' ') : '全部 ≤220 字');

// 6 git 忽略
let gi = '';
try { gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8'); } catch {}
const needIgnore = ['.ai-workflow', 'eval-results', 'node_modules'];
const lack = needIgnore.filter(x => !gi.includes(x));
add(lack.length ? 'WARN' : 'PASS', 'gitignore', lack.length ? '建议忽略：' + lack.join(', ') : '工作产物已忽略');

// 7 脚本可执行（零依赖：不得 require 外部包）
const extDeps = [];
for (const f of fs.readdirSync(path.join(ROOT, 'scripts'))) {
  if (!f.endsWith('.mjs')) continue;
  const src = fs.readFileSync(path.join(ROOT, 'scripts', f), 'utf8');
  const m = src.match(/from\s+['"](?!node:|\.)/g);
  if (m) extDeps.push(f);
}
add(extDeps.length ? 'FAIL' : 'PASS', 'zero-dep', extDeps.length ? '引用了外部包：' + extDeps.join(', ') : '全部只用 node: 内置模块');

// 8 关键脚本能跑
try {
  const v = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'classify.mjs'), '改个文案', '--json'], { encoding: 'utf8', timeout: 15000 });
  const ok = JSON.parse(v).tier === 'L0';
  add(ok ? 'PASS' : 'WARN', 'smoke', ok ? 'classify 自检通过（"改个文案"→L0）' : 'classify 结果异常：' + v.trim().slice(0, 80));
} catch (e) { add('FAIL', 'smoke', 'classify 跑不起来：' + String(e.message).slice(0, 100)); }

const fails = out.filter(x => x.level === 'FAIL').length;
const warns = out.filter(x => x.level === 'WARN').length;
if (asJson) console.log(JSON.stringify({ ok: fails === 0, fails, warns, checks: out }, null, 2));
else {
  for (const x of out) console.log(`${x.level === 'PASS' ? '✓' : x.level === 'WARN' ? '!' : '✗'} ${x.name}: ${x.msg}`);
  console.log(`\n${fails === 0 ? 'READY' : 'NOT READY'} — ${out.length - fails - warns} pass, ${warns} warn, ${fails} fail`);
}
process.exit(fails === 0 ? 0 : 1);
