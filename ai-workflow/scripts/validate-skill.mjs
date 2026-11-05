#!/usr/bin/env node
// 技能自校验：按 Agent Skills 规范检查一个技能目录（作者自检用，零依赖）。
// 用法：node scripts/validate-skill.mjs <skills/某技能 或 任意技能目录>
// 通过 exit 0；任一 FAIL exit 1。
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
let name = '', desc = '';
if (!fmMatch) fails.push('缺少 YAML frontmatter（首行应为 ---）');
else {
  const fm = fmMatch[1];
  const nm = fm.match(/^name:\s*(.+)$/m);
  const dm = fm.match(/^description:\s*([\s\S]*?)(?=\n[a-zA-Z_-]+:\s|$)/m);
  name = nm ? nm[1].trim() : '';
  desc = dm ? dm[1].trim().replace(/\s+/g, ' ') : '';
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

// 引用路径检查：仅查形如 references/xxx、scripts/xxx 的反引号路径
const refs = [...raw.matchAll(/`((?:references|scripts|evals|assets)\/[^`\s]+)`/g)].map(m => m[1]);
const missing = [...new Set(refs)].filter(p => !fs.existsSync(path.join(dir, p)));
if (missing.length) fails.push(`引用的文件不存在: ${missing.join(', ')}`);
else if (refs.length) oks.push(`引用路径 ${new Set(refs).size} 个均存在`);

for (const f of fails) console.log('FAIL ' + f);
for (const o of oks) console.log('OK   ' + o);
console.log(fails.length ? `\n${fails.length} 项未通过` : `\nPASS ${dirName}`);
process.exit(fails.length ? 1 : 0);
