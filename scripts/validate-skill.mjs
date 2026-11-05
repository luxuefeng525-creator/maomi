#!/usr/bin/env node
// 技能自校验：按 Agent Skills 规范检查一个技能目录（作者自检用，零依赖）。
// 用法：node scripts/validate-skill.mjs <skills/某技能 或 任意技能目录>
// 通过 exit 0；任一 FAIL exit 1。
// 说明：frontmatter 用最小 YAML 解析（支持 > / | 块标量、单双引号、多行），引用路径跳过通配/占位符。
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] || '.');
const md = path.join(dir, 'SKILL.md');
const fails = [];
const oks = [];

if (!fs.existsSync(md)) {
  console.log(`FAIL 缺少 SKILL.md: ${md}`);
  process.exit(1);
}
const raw = fs.readFileSync(md, 'utf8');
const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

function parseFrontmatter(fm) {
  const out = {};
  const lines = fm.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) { i++; continue; }
    const key = m[1];
    let val = m[2];
    // 块标量：> 或 |（可带 +/-）
    if (/^[>|][+-]?$/.test(val)) {
      const parts = [];
      i++;
      while (i < lines.length && (lines[i].trim() === '' || /^\s+/.test(lines[i]))) {
        parts.push(lines[i].trim());
        i++;
      }
      out[key] = parts.join(' ').trim();
      continue;
    }
    // 引号标量（可能跨行）
    if (/^['"]/.test(val)) {
      const q = val[0];
      let s = val.slice(1);
      while (!s.includes(q) && i + 1 < lines.length) { i++; s += ' ' + lines[i]; }
      const end = s.indexOf(q);
      out[key] = (end >= 0 ? s.slice(0, end) : s).trim();
      i++;
      continue;
    }
    out[key] = val.trim();
    i++;
  }
  return out;
}

let name = '', desc = '';
if (!fmMatch) fails.push('缺少 YAML frontmatter（首行应为 ---）');
else {
  const fm = parseFrontmatter(fmMatch[1]);
  name = fm.name || '';
  desc = (fm.description || '').replace(/\s+/g, ' ').trim();
  if (!name) fails.push('frontmatter 缺 name');
  if (!desc) fails.push('frontmatter 缺 description');
}

const dirName = path.basename(dir);
if (name && !/^[a-z0-9-]+$/.test(name)) fails.push(`name 只能小写字母/数字/连字符: "${name}"`);
if (name && name !== dirName) fails.push(`name(${name}) 与目录名(${dirName}) 不一致`);
if (desc && desc.length < 20) fails.push(`description 太短(${desc.length}<20)，模型无法判断何时用`);
if (desc && desc.length > 1024) fails.push(`description 超 1024 字符(${desc.length})`);
if (desc) oks.push(`description ${desc.length} 字符`);

const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;
const bodyLines = body.split(/\r?\n/).length;
if (bodyLines > 500) fails.push(`正文 ${bodyLines} 行 > 500，应按渐进披露拆到 references/`);
else oks.push(`正文 ${bodyLines} 行`);

// 引用路径检查：只查具体路径；跳过通配（*）、占位符（<>{}）、URL
const refs = [...raw.matchAll(/`((?:references|scripts|evals|assets)\/[^`\s]+)`/g)].map(m => m[1]);
const concrete = [...new Set(refs)].filter(p => !/[*<>{}]/.test(p) && !/^https?:/i.test(p));
// 引用可指向技能自身目录，也可指向包根（../../scripts/…、../../references/…）。
// 包根判定：dir 的上两级；只有当上两级确实像包根（有 SKILL.md 或 scripts/）时才回退，避免误判。
const pkgRoot = path.dirname(path.dirname(dir));
const hasPkgRoot = fs.existsSync(path.join(pkgRoot, 'scripts')) || fs.existsSync(path.join(pkgRoot, 'SKILL.md'));
const resolveRef = p => {
  if (fs.existsSync(path.join(dir, p))) return true;
  return hasPkgRoot && fs.existsSync(path.join(pkgRoot, p));
};
const missing = concrete.filter(p => !resolveRef(p));
const viaPkg = concrete.filter(p => !fs.existsSync(path.join(dir, p)) && resolveRef(p));
if (missing.length) fails.push(`引用的文件不存在: ${missing.join(', ')}`);
else if (concrete.length) oks.push(`引用路径 ${concrete.length} 个均存在` + (viaPkg.length ? `（其中 ${viaPkg.length} 个指向包根）` : ''));
const skipped = refs.length - concrete.length;
if (skipped > 0) oks.push(`跳过通配/占位引用 ${skipped} 个`);

for (const f of fails) console.log('FAIL ' + f);
for (const o of oks) console.log('OK   ' + o);
console.log(fails.length ? `\n${fails.length} 项未通过` : `\nPASS ${dirName}`);
process.exit(fails.length ? 1 : 0);
