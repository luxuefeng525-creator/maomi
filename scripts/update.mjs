#!/usr/bin/env node
/**
 * 自更新：按安装清单比对本地与上游版本，必要时重装技能。
 * 用法：
 *   node scripts/update.mjs --check  [--manifest <file>] [--repo <路径>] [--quiet] [--json]
 *   node scripts/update.mjs --apply  [--manifest <file>] [--repo <路径>] [--timeout 20000]
 *
 * 安装清单由 install.mjs 写入 skills 目录：.agent-install.json
 * 上游优先级：--repo > 清单里的 source.path > git clone/pull 到 ~/.trae-cn/agent-workbench-src
 * 网络不可用时只报告，不动已安装文件；版本相同不重装。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const has = n => args.includes('--' + n);
const quiet = has('quiet') || has('json');
const noWrite = has('no-write');
const mode = has('apply') ? 'apply' : 'check';
const timeout = Number(getArg('timeout') || 20000);
const REPO_URL = 'https://github.com/luxuefeng525-creator/maomi.git';

const fail = (msg, code = 1) => { if (!quiet) console.error('UPDATE FAIL ' + msg); else console.log('UPDATE FAIL ' + msg); process.exit(code); };

/** 在项目或全局常见位置找安装清单 */
function discoverManifest() {
  const cwd = process.cwd();
  const cands = [
    path.join(cwd, '.trae', 'skills', '.agent-install.json'),
    path.join(cwd, '.agent', 'skills', '.agent-install.json'),
    path.join(os.homedir(), '.trae-cn', 'skills', '.agent-install.json'),
  ];
  return cands.find(p => fs.existsSync(p)) || null;
}

const manifestFile = path.resolve(getArg('manifest') || discoverManifest() || '');
if (!getArg('manifest') && !discoverManifest()) fail('未找到安装清单（先跑 install.mjs）');
if (!fs.existsSync(manifestFile)) fail('清单不存在: ' + manifestFile);

let manifest;
try { manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch (e) { fail('清单不是合法 JSON: ' + e.message); }

/** 版本比较：只按数字段，b < a 返回 -1 */
function cmpVersion(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

function readVersion(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version; } catch { return ''; }
}

/** 解析上游仓库：显式 --repo > 清单记录 > 缓存克隆 */
function resolveRepo() {
  const explicit = getArg('repo');
  if (explicit && fs.existsSync(explicit)) return { dir: path.resolve(explicit), how: '--repo' };
  const saved = manifest.source && manifest.source.path;
  if (saved && fs.existsSync(saved)) return { dir: path.resolve(saved), how: 'manifest.source.path' };
  const cache = path.join(os.homedir(), '.trae-cn', 'agent-workbench-src');
  if (fs.existsSync(path.join(cache, 'package.json'))) return { dir: cache, how: 'cache', pull: true };
  return { dir: cache, how: 'clone', clone: true };
}

let repo = resolveRepo();
let netFail = '';
if (repo.clone) {
  fs.mkdirSync(path.dirname(repo.dir), { recursive: true });
  const r = spawnSync('git', ['clone', '--depth', '1', REPO_URL, repo.dir], { encoding: 'utf8', timeout });
  if (r.status !== 0) netFail = 'clone 失败: ' + ((r.stderr || '').trim().split('\n')[0] || '未知');
} else if (repo.pull) {
  const r = spawnSync('git', ['-C', repo.dir, 'pull', '--ff-only'], { encoding: 'utf8', timeout });
  if (r.status !== 0) netFail = 'pull 失败: ' + ((r.stderr || '').trim().split('\n')[0] || '未知');
}

const installed = manifest.version || '0.0.0';
const latest = netFail ? '' : readVersion(repo.dir);
if (!latest) fail(netFail || '读不到上游版本：' + repo.dir, 2);

const status = cmpVersion(latest, installed);
const result = {
  manifest: manifestFile,
  installed,
  latest,
  status: status > 0 ? 'UPDATE' : status < 0 ? 'AHEAD' : 'NEWEST',
  repo: repo.dir,
  how: repo.how,
  applied: false,
};

if (mode === 'apply' && status > 0) {
  const target = manifest.target || 'project';
  const tool = manifest.tool || 'trae';
  const argv = [
    path.join(repo.dir, 'scripts', 'install.mjs'),
    '--target', target, '--tool', tool, '--force',
  ];
  if (manifest.autoCheck) argv.push('--auto-check');
  if (manifest.autoApply) argv.push('--auto-update');
  const inst = spawnSync(process.execPath, argv, {
    // project 安装以「skillsDir 上两级」为工作目录，避免把更新装进当前 cwd
    cwd: target === 'project' ? path.resolve(manifest.skillsDir, '..', '..') : process.cwd(),
    encoding: 'utf8',
    timeout,
  });
  const out = ((inst.stdout || '') + (inst.stderr || '')).trim();
  if (inst.status !== 0) fail('重装失败: ' + out.split('\n').slice(-2).join(' | '), 3);
  const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  m.version = latest;
  m.installedAt = new Date().toISOString();
  m.lastCheckAt = new Date().toISOString();
  fs.writeFileSync(manifestFile, JSON.stringify(m, null, 2) + '\n', 'utf8');
  result.applied = true;
} else if (mode === 'check' && !noWrite) {
  const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  m.lastCheckAt = new Date().toISOString();
  fs.writeFileSync(manifestFile, JSON.stringify(m, null, 2) + '\n', 'utf8');
}

if (has('json')) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`VERSION installed=${installed} latest=${latest} status=${result.status === 'UPDATE' && result.applied ? 'UPDATED' : result.status} via=${repo.how}`);
  if (result.status === 'UPDATE' && !result.applied) console.log('提示：运行 node scripts/update.mjs --apply 完成更新');
}
