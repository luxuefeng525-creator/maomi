#!/usr/bin/env node
/**
 * 技能结构门禁：frontmatter、体积、AI 味词、越权指令、引用路径。
 * 用法：node scripts/validate.mjs [技能目录...]
 * 默认校验核心三技能；有 FAIL 时退出码 1。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();
const MAX_BYTES = 8192;
const CORE = ['project-orchestrator', 'project-memory', 'ui-ux-benchmark'];

const candidates = [
  path.join(cwd, '.agent', 'skills'),
  path.join(cwd, '.trae', 'skills'),
  path.join(cwd, 'skills'),
  path.resolve(scriptDir, '..', '..'),
];
const skillsDir = candidates.find(d => fs.existsSync(d) && fs.readdirSync(d).some(n => fs.existsSync(path.join(d, n, 'SKILL.md'))));
if (!skillsDir) {
  console.log('FAIL | 未找到技能目录（尝试 .agent/skills、.trae/skills、skills）');
  process.exit(1);
}

const BANNED = ['赋能', '一站式', '无限可能', '颠覆', '极致', '丝滑', '重磅', '全方位', '闭环生态', '全面提升', '遥遥领先', 'YYDS'];
const HIJACK = [
  /忽略(之前|以上|前面|先前).{0,8}(指令|规则)/,
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard.{0,16}(instruction|rule)/i,
  /跳过.{0,6}(规则|验收|门禁)/,
  /绕过.{0,6}(验收|审批|权限)/,
  /自动安装.{0,6}(插件|技能)/,
];

const args = process.argv.slice(2);
const targets = args.length
  ? args.map(p => path.resolve(p))
  : (CORE.filter(n => fs.existsSync(path.join(skillsDir, n, 'SKILL.md'))).length
      ? CORE.filter(n => fs.existsSync(path.join(skillsDir, n, 'SKILL.md'))).map(n => path.join(skillsDir, n))
      : fs.readdirSync(skillsDir).filter(n => fs.existsSync(path.join(skillsDir, n, 'SKILL.md'))).map(n => path.join(skillsDir, n)));

if (!targets.length) {
  console.log('FAIL | 校验目标为空');
  process.exit(1);
}

let fail = 0;
const report = (ok, title, detail = '') => {
  if (!ok) fail++;
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + title + (detail ? ' | ' + detail : ''));
};

for (const dir of targets) {
  const file = path.join(dir, 'SKILL.md');
  const name = path.basename(dir);
  if (!fs.existsSync(file)) { report(false, name, '缺 SKILL.md'); continue; }
  const raw = fs.readFileSync(file, 'utf8');
  const bytes = Buffer.byteLength(raw, 'utf8');

  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  report(!!fm, name + ' frontmatter');
  if (fm) {
    const nm = fm[1].match(/^name:\s*(\S+)\s*$/m);
    const dm = fm[1].match(/^description:\s*(.+)$/m);
    report(!!nm && nm[1] === name, name + ' name 与目录一致');
    report(!!dm && dm[1].trim().length >= 20, name + ' description 长度');
  }

  report(bytes <= MAX_BYTES, name + ' 体积 ≤8KB', bytes + ' bytes');

  const scannable = raw.split(/\r?\n/).filter(l => !/禁词|黑名单|反例|替换/.test(l)).join('\n');
  const bannedHit = BANNED.filter(w => scannable.includes(w));
  report(!bannedHit.length, name + ' 无 AI 味词', bannedHit.join(','));

  const hijackScan = raw.split(/\r?\n/).filter(l => !/禁止|拒绝|不得|不许|反模式/.test(l)).join('\n');
  const hijackHit = HIJACK.map(re => hijackScan.match(re)?.[0]).filter(Boolean);
  report(!hijackHit.length, name + ' 无越权指令', hijackHit.join(','));

  const spans = [...raw.matchAll(/`([^`]+)`/g)].map(m => m[1]);
  const refs = spans.filter(s =>
    !/^https?:/.test(s) && !s.includes('<') && !s.includes(' ') && !s.includes('*') &&
    !s.startsWith('.agent-memory') && !s.startsWith('.agent-runs') && !s.startsWith('.agent-index') &&
    !s.startsWith('.agent/project') && s.includes('/') &&
    /\.(md|mjs|json|ts|vue|html)$/.test(s)
  );
  const missing = refs.filter(s => {
    const cands = [path.join(cwd, s), path.join(dir, s), path.join(dir, 'references', s)];
    return !cands.some(p => fs.existsSync(p));
  });
  report(!missing.length, name + ' 引用路径存在', missing.join(','));
}
console.log('---');
console.log('FAIL=' + fail);
if (fail) process.exitCode = 1;
