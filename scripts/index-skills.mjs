#!/usr/bin/env node
/**
 * 技能注册表：扫描 skills/*、解析 frontmatter、生成 registry.json。
 * 用法：node scripts/index-skills.mjs [--skills <目录>] [--out <文件>] [--check]
 * --check 发现重名、重触发词、缺描述、超 8KB 时退出码 1。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const check = args.includes('--check');
const skillsDir = path.resolve(getArg('skills') || path.join(root, 'skills'));
const outFile = path.resolve(getArg('out') || path.join(skillsDir, 'registry.json'));

if (!fs.existsSync(skillsDir)) { console.error('技能目录不存在: ' + skillsDir); process.exit(1); }

const skills = [];
const warnings = [];
for (const dirName of fs.readdirSync(skillsDir)) {
  const dir = path.join(skillsDir, dirName);
  const file = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, 'utf8');
  const bytes = Buffer.byteLength(raw, 'utf8');
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const name = fm?.[1].match(/^name:\s*(\S+)\s*$/m)?.[1] || '';
  const desc = fm?.[1].match(/^description:\s*(.+)$/m)?.[1]?.trim() || '';
  const triggerLine = raw.match(/触发词[:：]\s*(.+)/)?.[1] || '';
  const triggers = triggerLine.split(/[、,，/]/).map(s => s.trim()).filter(Boolean);

  if (!fm) warnings.push({ skill: dirName, issue: '缺 frontmatter' });
  if (!name) warnings.push({ skill: dirName, issue: '缺 name' });
  if (name && name !== dirName) warnings.push({ skill: dirName, issue: `name(${name}) 与目录不一致` });
  if (!desc || desc.length < 20) warnings.push({ skill: dirName, issue: 'description 过短' });
  if (bytes > 8192) warnings.push({ skill: dirName, issue: `超 8KB（${bytes}）` });
  if (!triggers.length) warnings.push({ skill: dirName, issue: '无触发词' });

  skills.push({
    name: name || dirName,
    description: desc,
    triggers,
    path: path.relative(root, file).split(path.sep).join('/'),
    bytes,
    sha256: crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16),
  });
}

const byName = {};
for (const s of skills) {
  if (byName[s.name]) warnings.push({ skill: s.name, issue: '技能名重复' });
  byName[s.name] = true;
}
const byTrigger = {};
for (const s of skills) for (const t of s.triggers) {
  if (byTrigger[t]) warnings.push({ skill: s.name, issue: `触发词重复：${t}` });
  byTrigger[t] = true;
}

const registry = { generatedAt: new Date().toISOString(), count: skills.length, skills, warnings };
fs.writeFileSync(outFile, JSON.stringify(registry, null, 2), 'utf8');
console.log(`REGISTRY ${path.relative(root, outFile)} skills=${skills.length} warnings=${warnings.length}`);
for (const w of warnings) console.log(`WARN ${w.skill} | ${w.issue}`);
if (check && warnings.length) process.exitCode = 1;
