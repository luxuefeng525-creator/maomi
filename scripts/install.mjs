#!/usr/bin/env node
/**
 * 安装器：把技能与 Agent 复制到目标位置。
 * 用法：
 *   node scripts/install.mjs --target trae-user [--dry-run] [--force] [--remove] [--auto-update] [--no-auto-check]
 *   node scripts/install.mjs --target project [--tool trae|generic] [--dry-run] [--force] [--remove] [--auto-update]
 *
 * 安装后写 .agent-install.json（版本、来源、autoCheck/autoApply）；update.mjs 靠它判断是否需要更新。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const has = n => args.includes('--' + n);

const target = getArg('target');
const tool = getArg('tool') || 'trae';
const dryRun = has('dry-run');
const force = has('force');
const remove = has('remove');

if (!['trae-user', 'project'].includes(target)) {
  console.error('缺少或非法 --target：trae-user | project');
  process.exit(1);
}
if (!['trae', 'generic'].includes(tool)) {
  console.error('非法 --tool：trae | generic');
  process.exit(1);
}

const skillsSrc = path.join(pkgRoot, 'skills');
const pkgVersion = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8')).version;
const names = fs.readdirSync(skillsSrc).filter(n => fs.existsSync(path.join(skillsSrc, n, 'SKILL.md')));
if (!names.length) {
  console.error('源目录没有技能: ' + skillsSrc);
  process.exit(1);
}

let skillsDst;
let agentDst = null;
let agentsMdDst = null;
if (target === 'trae-user') {
  const home = os.homedir();
  skillsDst = path.join(home, '.trae-cn', 'skills');
  agentDst = path.join(home, '.trae-cn', 'agents', 'project-orchestrator.md');
} else {
  const cwd = process.cwd();
  skillsDst = tool === 'trae' ? path.join(cwd, '.trae', 'skills') : path.join(cwd, '.agent', 'skills');
  if (tool === 'generic') agentsMdDst = path.join(cwd, 'AGENTS.md');
}

const actions = [];
for (const n of names) actions.push({ kind: 'skill', name: n, src: path.join(skillsSrc, n), dst: path.join(skillsDst, n) });
if (agentDst) actions.push({ kind: 'agent', name: 'orchestrator.md', src: path.join(pkgRoot, 'agents', 'orchestrator.md'), dst: agentDst });

function copyDir(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true, force: true });
}

let copied = 0, skipped = 0, removed = 0;
for (const a of actions) {
  const exists = fs.existsSync(a.dst);
  if (remove) {
    if (exists) {
      if (dryRun) console.log('DRY  REMOVE ' + a.dst);
      else { fs.rmSync(a.dst, { recursive: true, force: true }); removed++; console.log('REMOVE ' + a.dst); }
    }
    continue;
  }
  if (exists && !force) { skipped++; console.log('SKIP 存在，加 --force 覆盖: ' + a.dst); continue; }
  if (dryRun) { console.log('DRY  COPY ' + a.src + ' -> ' + a.dst); copied++; continue; }
  if (a.kind === 'skill') copyDir(a.src, a.dst);
  else { fs.mkdirSync(path.dirname(a.dst), { recursive: true }); fs.copyFileSync(a.src, a.dst); }
  copied++;
  console.log('COPY ' + a.dst);
}

if (agentsMdDst) {
  const src = path.join(pkgRoot, 'AGENTS.md');
  if (fs.existsSync(agentsMdDst)) console.log('SKIP 已存在 AGENTS.md: ' + agentsMdDst);
  else if (dryRun) console.log('DRY  COPY ' + src + ' -> ' + agentsMdDst);
  else { fs.copyFileSync(src, agentsMdDst); copied++; console.log('COPY ' + agentsMdDst); }
}

const manifestPath = path.join(skillsDst, '.agent-install.json');
if (!dryRun) {
  if (remove) {
    if (fs.existsSync(manifestPath)) { fs.rmSync(manifestPath, { force: true }); console.log('REMOVE ' + manifestPath); }
  } else {
    let old = {};
    try { old = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { /* 无旧清单 */ }
    const autoCheck = has('no-auto-check') ? false : (has('auto-check') ? true : old.autoCheck !== false);
    const autoApply = has('no-auto-update') ? false : (has('auto-update') ? true : old.autoApply === true);
    const manifest = {
      name: 'agent-workbench',
      version: pkgVersion,
      installedAt: new Date().toISOString(),
      target,
      tool,
      skillsDir: skillsDst,
      source: { type: 'local', path: pkgRoot, url: 'https://github.com/luxuefeng525-creator/maomi.git' },
      autoCheck,
      autoApply,
      lastCheckAt: old.lastCheckAt || null,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log('MANIFEST ' + manifestPath + ' version=' + pkgVersion + ' autoCheck=' + autoCheck + ' autoApply=' + autoApply);
  }
}

console.log('---');
console.log(`SUMMARY target=${target} tool=${tool} copied=${copied} skipped=${skipped} removed=${removed}${dryRun ? ' (dry-run)' : ''}`);
if (!dryRun && !remove && target === 'project') {
  console.log('下一步：新建 .agent/project.md 写技术栈、命令、端口、可调用项目技能；否则技能会自行探测仓库。');
}
if (!dryRun && !remove) console.log('重载 IDE 后技能才会出现在列表。');
