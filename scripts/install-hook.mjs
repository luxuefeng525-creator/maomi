#!/usr/bin/env node
/**
 * 安装 Hook：SessionStart（自举）+ Stop（验收闸门）。
 * 用法：
 *   node scripts/install-hook.mjs --target trae-project [--cwd <目录>] [--dry-run]
 *   node scripts/install-hook.mjs --target trae-global  [--dry-run]
 *   node scripts/install-hook.mjs --target trae-project --remove
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const target = getArg('target') || 'trae-project';
const dryRun = args.includes('--dry-run');
const remove = args.includes('--remove');
const cwd = path.resolve(getArg('cwd') || process.cwd());

if (!['trae-project', 'trae-global'].includes(target)) {
  console.error('--target 只能是 trae-project | trae-global');
  process.exit(1);
}

const hooksFile = target === 'trae-project'
  ? path.join(cwd, '.trae', 'hooks.json')
  : path.join(os.homedir(), '.trae-cn', 'hooks.json');

const nodePath = process.execPath.split(path.sep).join('/');
const startScript = path.join(pkgRoot, 'scripts', 'session-start.mjs').split(path.sep).join('/');
const guardScript = path.join(pkgRoot, 'scripts', 'pre-tool-guard.mjs').split(path.sep).join('/');
const stopScript = path.join(pkgRoot, 'scripts', 'stop-gate.mjs').split(path.sep).join('/');
const startCmd = `"${nodePath}" "${startScript}"`;
const guardCmd = `"${nodePath}" "${guardScript}"`;
const stopCmd = `"${nodePath}" "${stopScript}"`;

const desired = {
  SessionStart: [{ hooks: [{ type: 'command', command: startCmd, timeout: 20 }] }],
  PreToolUse: [{
    matcher: 'RunCommand|Edit|Write|MultiEdit|NotebookEdit|mcp.*',
    hooks: [{ type: 'command', command: guardCmd, timeout: 20 }],
  }],
  Stop: [{ loop_limit: 5, hooks: [{ type: 'command', command: stopCmd, timeout: 30 }] }],
};
const NEEDLE = { SessionStart: 'session-start.mjs', PreToolUse: 'pre-tool-guard.mjs', Stop: 'stop-gate.mjs' };
const isOurs = (event, g) => {
  const needle = NEEDLE[event];
  return Array.isArray(g.hooks) && g.hooks.some(h => String(h.command || '').includes(needle));
};

let config = { version: 1, hooks: {} };
if (fs.existsSync(hooksFile)) {
  try { config = JSON.parse(fs.readFileSync(hooksFile, 'utf8')); }
  catch (e) { console.error('现有 hooks.json 不是合法 JSON，拒绝覆盖: ' + e.message); process.exit(1); }
}
config.version = config.version || 1;
config.hooks = config.hooks || {};

if (remove) {
  for (const event of Object.keys(desired)) {
    const groups = Array.isArray(config.hooks[event]) ? config.hooks[event] : [];
    const kept = groups.filter(g => !isOurs(event, g));
    if (kept.length) config.hooks[event] = kept; else delete config.hooks[event];
  }
  if (dryRun) { console.log('DRY  REMOVE SessionStart/PreToolUse/Stop hooks from ' + hooksFile); process.exit(0); }
  fs.writeFileSync(hooksFile, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log('REMOVE ' + hooksFile);
  process.exit(0);
}

let changed = false;
for (const event of Object.keys(desired)) {
  const groups = Array.isArray(config.hooks[event]) ? config.hooks[event] : [];
  const ours = groups.find(g => isOurs(event, g));
  const want = desired[event][0].hooks[0].command;
  const same = ours && ours.hooks.some(h => String(h.command) === want);
  if (same) continue;
  config.hooks[event] = [...groups.filter(g => !isOurs(event, g)), ...desired[event]];
  changed = true;
}

if (!changed) { console.log('SKIP 已存在同命令 hooks: ' + hooksFile); process.exit(0); }

if (dryRun) {
  console.log('DRY  WRITE ' + hooksFile);
  console.log('DRY  SessionStart -> ' + startCmd);
  console.log('DRY  PreToolUse -> ' + guardCmd);
  console.log('DRY  Stop -> ' + stopCmd);
  process.exit(0);
}

fs.mkdirSync(path.dirname(hooksFile), { recursive: true });
if (fs.existsSync(hooksFile)) {
  const bak = hooksFile + '.bak-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  fs.copyFileSync(hooksFile, bak);
  console.log('BACKUP ' + bak);
}
fs.writeFileSync(hooksFile, JSON.stringify(config, null, 2) + '\n', 'utf8');
console.log('WRITE ' + hooksFile);
console.log('HOOK SessionStart -> ' + startCmd);
console.log('HOOK PreToolUse -> ' + guardCmd);
console.log('HOOK Stop -> ' + stopCmd);
console.log('重要：只写文件不会被 TRAE 加载。必须到「设置 → Hooks → 项目」点创建/启用；启用后按提示重启。');
