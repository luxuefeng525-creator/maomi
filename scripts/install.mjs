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
let commandsDst;
let agentDst = null;
let agentsMdDst = null;
if (target === 'trae-user') {
  const home = os.homedir();
  skillsDst = path.join(home, '.trae-cn', 'skills');
  commandsDst = path.join(home, '.trae-cn', 'commands');
  agentDst = path.join(home, '.trae-cn', 'agents', 'project-orchestrator.md');
} else {
  const cwd = process.cwd();
  skillsDst = tool === 'trae' ? path.join(cwd, '.trae', 'skills') : path.join(cwd, '.agent', 'skills');
  commandsDst = tool === 'trae' ? path.join(cwd, '.trae', 'commands') : path.join(cwd, '.agent', 'commands');
  if (tool === 'generic') agentsMdDst = path.join(cwd, 'AGENTS.md');
}

/**
 * 渲染斜杠命令：把 {{PKG_ROOT}} 换成本机包根（正斜杠）。
 * 命令模板进 git 时必须写占位符，否则开源用户的路径全错。
 * @param {string} src - 命令模板绝对路径
 * @returns {string} 可直接写入用户目录的命令正文
 */
const renderCommand = src => fs.readFileSync(src, 'utf8').replace(/\{\{PKG_ROOT\}\}/g, pkgRoot.split(path.sep).join('/'));

const actions = [];
for (const n of names) actions.push({ kind: 'skill', name: n, src: path.join(skillsSrc, n), dst: path.join(skillsDst, n) });
const commandsSrc = path.join(pkgRoot, 'commands');
const commandNames = fs.existsSync(commandsSrc)
  ? fs.readdirSync(commandsSrc).filter(f => f.endsWith('.md')).map(f => path.basename(f, '.md'))
  : [];
for (const n of commandNames) actions.push({ kind: 'command', name: n, src: path.join(commandsSrc, n + '.md'), dst: path.join(commandsDst, n + '.md') });
if (agentDst) actions.push({ kind: 'agent', name: 'orchestrator.md', src: path.join(pkgRoot, 'agents', 'orchestrator.md'), dst: agentDst });

const manifestPath = path.join(skillsDst, '.agent-install.json');
let old = {};
try { old = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { /* 无旧清单 */ }
// 迁移旧清单：只有「来源路径相同且没有 skills 归属表」的旧版才整体视为本包
const adopt = !!(old.source && !old.skills && old.source.path && path.resolve(old.source.path) === pkgRoot);
const ownedSkills = { ...(old.skills || {}) };
const ownedCommands = { ...(old.commands || {}) };
let ownedAgentHash = old.agentHash || null;

/** 技能身份取 SKILL.md 哈希；命令取渲染后正文哈希（含本机路径，路径变则需更新） */
const sha = file => {
  try { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16); } catch { return null; }
};
const shaText = text => crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
const identity = a => a.kind === 'skill' ? sha(path.join(a.src, 'SKILL.md'))
  : a.kind === 'command' ? shaText(renderCommand(a.src))
  : sha(a.src);
const installedIdentity = a => a.kind === 'skill' ? sha(path.join(a.dst, 'SKILL.md')) : sha(a.dst);

/** 记归属 / 清归属：技能、命令、agent 三类分开存 */
const remember = (a, v) => {
  if (a.kind === 'skill') ownedSkills[a.name] = v;
  else if (a.kind === 'command') ownedCommands[a.name] = v;
  else ownedAgentHash = v;
};
const forget = a => {
  if (a.kind === 'skill') delete ownedSkills[a.name];
  else if (a.kind === 'command') delete ownedCommands[a.name];
  else ownedAgentHash = null;
};

function copyDir(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true, force: true });
}

/** 统一写落盘：技能整目录、命令渲染后写文本、agent 原样复制 */
function writeAction(a, dst) {
  if (a.kind === 'skill') { copyDir(a.src, dst); return; }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (a.kind === 'command') fs.writeFileSync(dst, renderCommand(a.src), 'utf8');
  else fs.copyFileSync(a.src, dst);
}

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
let copied = 0, same = 0, updated = 0, conflicts = 0, backedUp = 0, removed = 0, keptForeign = 0;

for (const a of actions) {
  const exists = fs.existsSync(a.dst);
  const known = a.kind === 'skill' ? ownedSkills[a.name]
    : a.kind === 'command' ? ownedCommands[a.name]
    : ownedAgentHash;
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
    forget(a);
    continue;
  }

  const want = identity(a);
  const have = exists ? installedIdentity(a) : null;
  if (!exists) {
    if (dryRun) console.log('DRY  COPY ' + a.src + ' -> ' + a.dst);
    else { writeAction(a, a.dst); console.log('COPY ' + a.dst); }
    copied++;
    remember(a, want);
    continue;
  }
  if (have === want) {
    same++;
    remember(a, want);
    continue;
  }
  // 内容不同：本包旧版才更新；异源默认保留
  if (ours) {
    if (dryRun) console.log('DRY  UPDATE ' + a.dst);
    else { writeAction(a, a.dst); console.log('UPDATE ' + a.dst); }
    updated++;
    remember(a, want);
    continue;
  }
  if (force) {
    const bak = a.dst + '.bak-' + stamp;
    if (dryRun) console.log('DRY  BACKUP ' + a.dst + ' -> ' + bak);
    else {
      fs.renameSync(a.dst, bak);
      writeAction(a, a.dst);
      console.log('BACKUP+COPY ' + bak + ' -> ' + a.dst);
    }
    backedUp++; copied++;
    remember(a, want);
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
    const left = Object.keys(ownedSkills).length + Object.keys(ownedCommands).length;
    if (left === 0) {
      if (fs.existsSync(manifestPath)) { fs.rmSync(manifestPath, { force: true }); console.log('REMOVE ' + manifestPath); }
    } else {
      old.name = old.name || 'agent-workbench';
      old.skills = ownedSkills;
      old.commands = ownedCommands;
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
      commandsDir: commandsDst,
      source: { type: 'local', path: pkgRoot, url: 'https://github.com/luxuefeng525-creator/maomi.git' },
      autoCheck,
      autoApply,
      checkIntervalHours: checkHours > 0 ? checkHours : (old.checkIntervalHours || 24),
      lastCheckAt: old.lastCheckAt || null,
      skills: ownedSkills,
      commands: ownedCommands,
      agentHash: ownedAgentHash,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log('MANIFEST ' + manifestPath + ' version=' + pkgVersion
      + ' owned=' + Object.keys(ownedSkills).length
      + ' commands=' + Object.keys(ownedCommands).length
      + ' autoCheck=' + autoCheck + ' autoApply=' + autoApply + ' checkHours=' + manifest.checkIntervalHours);
  }
}

console.log('---');
console.log(`SUMMARY target=${target} tool=${tool} copied=${copied} updated=${updated} same=${same} conflicts=${conflicts} backedUp=${backedUp} removed=${removed} keptForeign=${keptForeign}${dryRun ? ' (dry-run)' : ''}`);
if (!dryRun && !remove && target === 'project') {
  console.log('下一步：新建 .agent/project.md 写技术栈、命令、端口、可调用项目技能；否则技能会自行探测仓库。');
}
if (!dryRun && !remove) console.log('重载 IDE 后技能才会出现在列表。');
