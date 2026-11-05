#!/usr/bin/env node
// ai-workflow 跨平台安装器：把本包复制到任意 Agent Skills 宿主。
// 用法：
//   node install.mjs                项目级：装到当前仓库检测到的宿主
//   node install.mjs --global       用户级：装到 home 下各宿主
//   node install.mjs --host trae    只装指定宿主
//   node install.mjs --target <dir> 装到任意绝对目录（其下再建 ai-workflow/）
//   node install.mjs --no-deps      不复制 skills/ 依赖包
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const pkgDir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const global = args.includes('--global');
const noDeps = args.includes('--no-deps');
const targetIdx = args.indexOf('--target');
const hostIdx = args.indexOf('--host');
const explicitTarget = targetIdx >= 0 ? args[targetIdx + 1] : null;
const explicitHost = hostIdx >= 0 ? args[hostIdx + 1] : null;

const HOSTS = {
  agents: '.agents', claude: '.claude', trae: '.trae', traecn: '.trae-cn',
  workbuddy: '.workbuddy', cursor: '.cursor', codex: '.codex', windsurf: '.windsurf', opencode: '.opencode'
};

function resolveTargets() {
  if (explicitTarget) return [explicitTarget];
  const base = global ? os.homedir() : process.cwd();
  const wanted = explicitHost ? [explicitHost] : Object.keys(HOSTS);
  return wanted
    .map(h => HOSTS[h])
    .filter(Boolean)
    .map(d => path.join(base, d, 'skills'));
}

// 只复制运行必需项：安装器自身/临时产物不进宿主；evals 保证 eval.mjs 可用。
const COPY = ['SKILL.md', 'README.md', 'MANUAL.md', 'CHANGELOG.md', 'catalog.json', 'references', 'scripts', 'evals', 'examples'];
if (!noDeps) COPY.push('skills');

// 不用 fs.cpSync：本机 Windows 上它会静默失败/抛「目录覆盖」错，且旧实现
// 复制整个包到已存在的 dest 后仍打印 OK（假成功）。改为零依赖手动递归。
function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name), d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyTree(s, d);
    else if (ent.isFile()) fs.copyFileSync(s, d);
  }
}

function installTo(dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of COPY) {
    const s = path.join(pkgDir, item);
    if (!fs.existsSync(s)) continue;
    if (fs.statSync(s).isDirectory()) copyTree(s, path.join(dest, item));
    else fs.copyFileSync(s, path.join(dest, item));
  }
  // 装完自检：关键文件缺失即判失败，绝不伪装成 OK。
  return ['SKILL.md', 'scripts/route.mjs', 'scripts/start.mjs']
    .filter(f => !fs.existsSync(path.join(dest, f)));
}

const targets = resolveTargets();
let done = 0, failed = 0;
for (const t of targets) {
  const dest = path.join(t, 'ai-workflow');
  if (!fs.existsSync(path.dirname(dest)) && !global) {
    // 项目级：宿主目录不存在则跳过（避免误建）
    console.log(`SKIP ${t}（宿主目录不存在）`);
    continue;
  }
  try {
    const missing = installTo(dest);
    if (missing.length) { console.log(`FAIL ${dest}: 缺少 ${missing.join(',')}`); failed++; }
    else { console.log(`OK   ${dest}`); done++; }
  } catch (e) {
    console.log(`FAIL ${dest}: ${e.message}`); failed++;
  }
}

console.log(`\n完成：安装到 ${done} 个宿主目录${noDeps ? '（不含依赖技能）' : ''}${failed ? `，失败 ${failed} 个` : ''}。`);
if (failed) process.exit(1);
console.log('重载 IDE / 开新会话后，输入 ai-workflow 即可使用。');
