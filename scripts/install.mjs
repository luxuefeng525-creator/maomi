#!/usr/bin/env node
/**
 * 安装器：把技能与 Agent 复制到目标位置。
 * 用法：
 *   node scripts/install.mjs --target trae-user [--dry-run] [--force] [--remove] [--auto-update] [--no-auto-check] [--check-hours 24]
 *   node scripts/install.mjs --target project [--tool trae|generic] [--dry-run] [--force] [--remove] [--auto-update] [--check-hours 24]
 *
 * 安装后写 .agent-install.json（版本、来源、autoCheck/autoApply）；update.mjs 靠它判断是否需要更新。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
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
const checkHours = Number(getArg('check-hours') || 0);

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

const manifestPath = path.join(skillsDst, '.agent-install.json');
let old = {};
try { old = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { /* 无旧清单 */ }
// 迁移旧清单：只有「来源路径相同且没有 skills 归属表」的旧版才整体视为本包
const adopt = !!(old.source && !old.skills && old.source.path && path.resolve(old.source.path) === pkgRoot);
const ownedSkills = { ...(old.skills || {}) };
let ownedAgentHash = old.agentHash || null;

/** 技能身份取 SKILL.md 哈希：同名不同内容 = 异源，不能直接覆盖 */
const sha = file => {
  try { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16); } catch { return null; }
};
const identity = a => a.kind === 'skill' ? sha(path.join(a.src, 'SKILL.md')) : sha(a.src);
const installedIdentity = a => a.kind === 'skill' ? sha(path.join(a.dst, 'SKILL.md')) : sha(a.dst);

function copyDir(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true, force: true });
}

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
let copied = 0, same = 0, updated = 0, conflicts = 0, backedUp = 0, removed = 0, keptForeign = 0;

for (const a of actions) {
  const exists = fs.existsSync(a.dst);
  const known = a.kind === 'skill' ? ownedSkills[a.name] : ownedAgentHash;
  const ours = adopt || !!known;
  if (remove) {
    if (!exists) continue;
    // 只删清单记录过的技能；无清单或无记录时必须 --force 才删
    if (!ours && !force) {
      keptForeign++;
      console.log('SKIP 非本包安装，不删: ' + a.dst + '（确需删除加 --force）');
      continue;
    }
    if (dryRun) console.log('DRY  REMOVE ' + a.dst);
    else { fs.rmSync(a.dst, { recursive: true, force: true }); removed++; console.log('REMOVE ' + a.dst); }
    if (a.kind === 'skill') delete ownedSkills[a.name]; else ownedAgentHash = null;
    continue;
  }

  const want = identity(a);
  const have = exists ? installedIdentity(a) : null;
  if (!exists) {
    if (dryRun) console.log('DRY  COPY ' + a.src + ' -> ' + a.dst);
    else {
      if (a.kind === 'skill') copyDir(a.src, a.dst);
      else { fs.mkdirSync(path.dirname(a.dst), { recursive: true }); fs.copyFileSync(a.src, a.dst); }
      console.log('COPY ' + a.dst);
    }
    copied++;
    if (a.kind === 'skill') ownedSkills[a.name] = want; else ownedAgentHash = want;
    continue;
  }
  if (have === want) {
    same++;
    if (a.kind === 'skill') ownedSkills[a.name] = want; else ownedAgentHash = want;
    continue;
  }
  // 内容不同：本包旧版才更新；异源默认保留
  if (ours) {
    if (dryRun) console.log('DRY  UPDATE ' + a.dst);
    else {
      if (a.kind === 'skill') copyDir(a.src, a.dst);
      else fs.copyFileSync(a.src, a.dst);
      console.log('UPDATE ' + a.dst);
    }
    updated++;
    if (a.kind === 'skill') ownedSkills[a.name] = want; else ownedAgentHash = want;
    continue;
  }
  if (force) {
    const bak = a.dst + '.bak-' + stamp;
    if (dryRun) console.log('DRY  BACKUP ' + a.dst + ' -> ' + bak);
    else {
      fs.renameSync(a.dst, bak);
      if (a.kind === 'skill') copyDir(a.src, a.dst);
      else { fs.mkdirSync(path.dirname(a.dst), { recursive: true }); fs.copyFileSync(a.src, a.dst); }
      console.log('BACKUP+COPY ' + bak + ' -> ' + a.dst);
    }
    backedUp++; copied++;
    if (a.kind === 'skill') ownedSkills[a.name] = want; else ownedAgentHash = want;
    continue;
  }
  conflicts++;
  console.log('CONFLICT 保留现有，不覆盖: ' + a.dst + '（异源或已改动；--force 会先备份再覆盖）');
}

if (agentsMdDst) {
  const src = path.join(pkgRoot, 'AGENTS.md');
  if (fs.existsSync(agentsMdDst)) console.log('SKIP 已存在 AGENTS.md: ' + agentsMdDst);
  else if (dryRun) console.log('DRY  COPY ' + src + ' -> ' + agentsMdDst);
  else { fs.copyFileSync(src, agentsMdDst); copied++; console.log('COPY ' + agentsMdDst); }
}

if (!dryRun) {
  if (remove) {
    const left = Object.keys(ownedSkills).length;
    if (left === 0) {
      if (fs.existsSync(manifestPath)) { fs.rmSync(manifestPath, { force: true }); console.log('REMOVE ' + manifestPath); }
    } else {
      old.name = old.name || 'agent-workbench';
      old.skills = ownedSkills;
      fs.writeFileSync(manifestPath, JSON.stringify(old, null, 2) + '\n', 'utf8');
    }
  } else {
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
      checkIntervalHours: checkHours > 0 ? checkHours : (old.checkIntervalHours || 24),
      lastCheckAt: old.lastCheckAt || null,
      skills: ownedSkills,
      agentHash: ownedAgentHash,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log('MANIFEST ' + manifestPath + ' version=' + pkgVersion + ' owned=' + Object.keys(ownedSkills).length + ' autoCheck=' + autoCheck + ' autoApply=' + autoApply + ' checkHours=' + manifest.checkIntervalHours);
  }
}

console.log('---');
console.log(`SUMMARY target=${target} tool=${tool} copied=${copied} updated=${updated} same=${same} conflicts=${conflicts} backedUp=${backedUp} removed=${removed} keptForeign=${keptForeign}${dryRun ? ' (dry-run)' : ''}`);
if (!dryRun && !remove && target === 'project') {
  console.log('下一步：新建 .agent/project.md 写技术栈、命令、端口、可调用项目技能；否则技能会自行探测仓库。');
}
if (!dryRun && !remove) console.log('重载 IDE 后技能才会出现在列表。');
