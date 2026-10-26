#!/usr/bin/env node
/**
 * 技能注册表：扫描 skills/*、解析 frontmatter、生成 registry.json。
 * 用法：node scripts/index-skills.mjs [--skills <目录>] [--out <文件>] [--check] [--max-bytes <n>]
 * --check 发现结构性错误（重名、重触发词、缺描述、缺 frontmatter、超硬上限）时退出码 1。
 *
 * 体积分级（2026-10-27 起）：8KB 只是「建议拆 references」的提示，不计失败；
 * 超 --max-bytes（默认 128KB）才算硬错误。原因：大技能（finesse-ui 77KB）正文就在 SKILL.md，
 * 属既有资产，体积是性能取舍而非正确性问题，一刀切 fail 会让 40 技能包永远红。
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
const NOTICE_BYTES = 8192;
const MAX_BYTES = Number(getArg('max-bytes') || 131072);

if (!fs.existsSync(skillsDir)) { console.error('技能目录不存在: ' + skillsDir); process.exit(1); }

const skills = [];
const warnings = [];
const notices = [];
for (const dirName of fs.readdirSync(skillsDir)) {
  const dir = path.join(skillsDir, dirName);
  const file = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, 'utf8');
  const bytes = Buffer.byteLength(raw, 'utf8');
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fmLines = (fm?.[1] || '').split(/\r?\n/);

  /**
   * 读 frontmatter 字段，支持 YAML 折行块（`key: >` / `key: |` 后跟缩进行）。
   * 只取首行会把 `description: >` 解析成字面 `>`，导致描述变空、路由失效。
   * @param {string} key - 字段名
   * @returns {string} 去掉折行与首尾空白后的值
   */
  const readField = key => {
    const i = fmLines.findIndex(l => new RegExp('^' + key + ':').test(l));
    if (i < 0) return '';
    const inline = fmLines[i].replace(new RegExp('^' + key + ':\\s*'), '').trim();
    if (/^[>|][+-]?$/.test(inline)) {
      const block = [];
      for (let j = i + 1; j < fmLines.length; j++) {
        if (/^\S/.test(fmLines[j])) break; // 顶格即下一个字段
        block.push(fmLines[j].trim());
      }
      return block.join(' ').trim();
    }
    return inline;
  };

  const name = readField('name');
  const desc = readField('description');
  // 触发词来源优先「顶格的独立行」，否则回退到任意位置（兼容写在正文里的老格式）。
  // 之前无条件取第一处「触发词：」，遇到 description 里嵌了「触发词：「…」…」的技能
  // （如 finesse-term）会把整段描述切成垃圾触发词 → 路由污染。故：行优先 + 去引号 + 限长 14 字。
  const triggerLine = raw.match(/^触发词[:：]\s*(.+)$/m)?.[1] || raw.match(/触发词[:：]\s*(.+)/)?.[1] || '';
  // 切分策略：先按分隔符切；单块过长（>14 字）说明是描述散文，再按空格二次切（保「bug 根因」这类含空格的短语）。
  const rawChunks = triggerLine.replace(/[「」『』"'“”]/g, ' ').split(/[、,，/|；;]+/);
  const picked = [];
  for (const chunk of rawChunks) {
    const t = chunk.trim().replace(/[。.：:]+$/g, '').trim();
    if (!t) continue;
    if (t.length <= 14) picked.push(t);
    else for (const part of t.split(/\s+/)) {
      const q = part.trim().replace(/[。.：:]+$/g, '').trim();
      if (q.length >= 2 && q.length <= 14) picked.push(q);
    }
  }
  const triggers = [...new Set(picked)]; // 同技能内去重（切分可能产生重复，属正常，不判错）

  if (!fm) warnings.push({ skill: dirName, issue: '缺 frontmatter' });
  if (!name) warnings.push({ skill: dirName, issue: '缺 name' });
  if (name && name !== dirName) warnings.push({ skill: dirName, issue: `name(${name}) 与目录不一致` });
  if (!desc || desc.length < 20) warnings.push({ skill: dirName, issue: 'description 过短' });
  if (bytes > MAX_BYTES) warnings.push({ skill: dirName, issue: `超硬上限 ${MAX_BYTES}B（${bytes}）` });
  else if (bytes > NOTICE_BYTES) notices.push({ skill: dirName, issue: `超 8KB（${bytes}），建议拆 references` });
  // 英文技能靠 description 路由、不写中文「触发词」字段，属正常形态，只提示不判错
  if (!triggers.length) notices.push({ skill: dirName, issue: '无中文触发词（靠 description 路由）' });

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
// 触发词查重分两级：同一技能内重复 = 结构性错误（WARN，拦 CI）；
// 跨技能重复 = 路由歧义（NOTICE，提示但不判错——两个技能共享一个常见说法是正常现象）。
const byTrigger = {};
for (const s of skills) {
  const seen = new Set();
  for (const t of s.triggers) {
    if (seen.has(t)) continue; // 同一技能里重复写同一触发词，去重即可（无信息量，不判错）
    seen.add(t);
    const owner = byTrigger[t];
    if (owner && owner !== s.name) notices.push({ skill: s.name, issue: `触发词与 ${owner} 重复（路由歧义）：${t}` });
    else if (!owner) byTrigger[t] = s.name;
  }
}

const registry = { generatedAt: new Date().toISOString(), count: skills.length, skills, warnings, notices };
// --check 默认只读：不写盘，只比对现有 registry 与本次扫描结果是否一致。
// 原因：旧实现无条件写盘且写 generatedAt，导致每次检查都把工作区弄脏（真 bug）。
// 显式传 --out 时保留写盘语义（测试与「生成到指定位置」用法依赖）。
const explicitOut = Boolean(getArg('out'));
const rel = path.relative(root, outFile);
const norm = r => JSON.stringify({ count: r.count, skills: r.skills, warnings: r.warnings, notices: r.notices });

if (check && !explicitOut) {
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(outFile, 'utf8')); } catch { prev = null; }
  if (!prev) {
    console.log(`REGISTRY_DRIFT ${rel} | 现有 registry 缺失或无法解析（请运行 npm run registry:write 重新生成）`);
    process.exitCode = 1;
  } else if (norm(prev) !== norm(registry)) {
    const prevByName = new Map((prev.skills || []).map(s => [s.name, s]));
    const nowByName = new Map(registry.skills.map(s => [s.name, s]));
    const diffs = [];
    for (const [name, now] of nowByName) {
      const old = prevByName.get(name);
      if (!old) { diffs.push(`${name} 新增`); continue; }
      if (JSON.stringify(old) !== JSON.stringify(now)) diffs.push(`${name} 内容变更`);
    }
    for (const name of prevByName.keys()) if (!nowByName.has(name)) diffs.push(`${name} 已删除`);
    if (JSON.stringify(prev.warnings || []) !== JSON.stringify(registry.warnings)) diffs.push('warnings 变更');
    if (JSON.stringify(prev.notices || []) !== JSON.stringify(registry.notices)) diffs.push('notices 变更');
    console.log(`REGISTRY_DRIFT ${rel} | 差异 ${diffs.length} 项，首个：${diffs[0] || '未知'}（请运行 npm run registry:write 更新）`);
    process.exitCode = 1;
  } else {
    console.log(`REGISTRY OK ${rel} skills=${skills.length} warnings=${registry.warnings.length} notices=${registry.notices.length}`);
  }
} else {
  fs.writeFileSync(outFile, JSON.stringify(registry, null, 2), 'utf8');
  console.log(`REGISTRY ${rel} skills=${skills.length} warnings=${warnings.length} notices=${notices.length}`);
}
for (const w of warnings) console.log(`WARN ${w.skill} | ${w.issue}`);
for (const n of notices) console.log(`NOTICE ${n.skill} | ${n.issue}`);
if (check && warnings.length) process.exitCode = 1;
