#!/usr/bin/env node
/**
 * 发布预检：把「发版前到底卡在哪」一次说清楚，只读、不写 registry。
 * 用法：
 *   node scripts/release-preflight.mjs                 # 全量（含 npm registry 网络探测）
 *   node scripts/release-preflight.mjs --offline       # 只查本地（版本/CHANGELOG/tag/registry 配置）
 *   node scripts/release-preflight.mjs --token <TOKEN> # 额外核对该令牌身份（不落盘）
 * 退出码：无 FAIL 为 0，否则 1（WARN 不影响退出码）。
 *
 * 为什么要有它：0.24.x 首发连续两次 403，根因分散在「令牌范围 / 令牌未绕 2FA / 本机 registry 指向镜像站」
 * 三处互不相干的地方，每次都要人肉试一遍才知道卡在哪。这条脚本把三项一次性列出来。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** CHANGELOG 首条版本号；首条标题不是 `## x.y.z`（如 `## Unreleased`）返回 null。 */
export function parseChangelogVersion(md) {
  const first = String(md || '').split(/\r?\n/).find(l => /^\s*##\s+/.test(l));
  const m = first && /^\s*##\s+v?(\d+\.\d+\.\d+)/.exec(first);
  return m ? m[1] : null;
}

/** 语义化版本比较（只比 x.y.z 数字段）：a<b 返回 -1，相等 0，a>b 返回 1。 */
export function compareVersions(a, b) {
  const p = v => String(v || '').split('.').map(n => parseInt(n, 10) || 0);
  const [x, y, z] = [p(a), p(b)];
  for (let i = 0; i < 3; i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0) ? -1 : 1;
  }
  return 0;
}

/**
 * 纯函数：给定采集到的事实，产出结论。不碰网络/文件，便于单测。
 * facts = { name, version, changelogVersion, tagExists, registryConfig,
 *           registry: { kind: 'notFound'|'ok'|'error', latest, error }, whoami }
 */
export function evaluate(facts) {
  const fails = [];
  const warns = [];
  const oks = [];

  const cl = facts.changelogVersion;
  if (!cl) fails.push('CHANGELOG 首条没有 `## x.y.z` 版本标题 —— 发布门禁第 2 道必挂');
  else if (compareVersions(cl, facts.version) !== 0) fails.push(`CHANGELOG 首条(${cl}) ≠ package.json(${facts.version})`);
  else oks.push(`CHANGELOG 首条 = ${cl}`);

  if (facts.tagExists === false) fails.push(`本地没有 tag v${facts.version} —— release.yml 由 tag 触发，必须先打并推 tag`);
  else if (facts.tagExists === true) oks.push(`tag v${facts.version} 存在`);

  const reg = facts.registry || { kind: 'skipped' };
  if (reg.kind === 'notFound') oks.push(`包名 ${facts.name} 在 registry 上未被占用（可首发）`);
  else if (reg.kind === 'ok') {
    const c = compareVersions(facts.version, reg.latest);
    if (c <= 0) fails.push(`registry 上已有 ${facts.name}@${reg.latest}，当前 ${facts.version} 不大于它 —— 版本号不可回收，请升版`);
    else oks.push(`registry 上最新 ${reg.latest}，本次 ${facts.version} 是升级发布`);
  } else if (reg.kind === 'error') warns.push(`registry 探测失败（网络/鉴权）：${String(reg.error || '').split('\n')[0]}`);
  else warns.push('registry 探测已跳过（--offline）');

  const cfg = String(facts.registryConfig || '');
  if (cfg && !/^https:\/\/registry\.npmjs\.org\/?$/.test(cfg)) {
    warns.push(`本机默认 registry = ${cfg}（镜像站）—— 发布必须显式 --registry https://registry.npmjs.org/`);
  } else if (cfg) oks.push('默认 registry 指向 npmjs.org');

  if (facts.whoami === null) warns.push('未取得令牌身份（--offline 跳过）');
  else if (facts.whoami && facts.whoami.error) {
    // 401/ENEEDAUTH = 没配令牌。走 GitHub OIDC 发布时本来就不需要令牌，所以只提示不判错；
    // 其他错误（403/网络/配置错）才是真问题。
    if (/E401|ENEEDAUTH|Unauthorized/i.test(facts.whoami.error)) {
      warns.push('本机无有效 npm 凭据（走 OIDC 发布可忽略；本地直发需 --token <带 Bypass 2FA 的 granular token>）');
    } else fails.push(`令牌/凭据认证失败：${facts.whoami.error}`);
  }
  else if (facts.whoami && facts.whoami.user) {
    oks.push(`令牌身份 = ${facts.whoami.user}`);
    warns.push('无法预判该令牌是否勾了「Bypass 2FA」：若发布报 403 且文案含 `bypass 2fa`，去重建令牌并勾上');
  }

  return { ok: fails.length === 0, fails, warns, oks };
}

// Windows 上 npm 是 npm.cmd，直接 spawn 会 EINVAL 且拿到空输出（实测：错误信息为空，误判成"网络失败"）。
// 优先用 node 直接跑 npm-cli.js（无 shell、无 DEP0190 警告、参数不经过再次切词）；找不到才退回 shell。
const sh = (cmd, argv, cwd) => {
  const r = spawnSync(cmd, argv, { cwd, encoding: 'utf8', timeout: 120000 });
  if (r.error) return { status: -1, stdout: '', stderr: String(r.error.message || r.error) };
  return r;
};

function npmInvoker() {
  const candidates = [
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  const cli = candidates.find(p => fs.existsSync(p));
  if (cli) return argv => spawnSync(process.execPath, [cli, ...argv], { encoding: 'utf8', timeout: 120000 });
  const bin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return argv => spawnSync(bin, argv, { encoding: 'utf8', timeout: 120000, shell: process.platform === 'win32' });
}

function main() {
  const args = process.argv.slice(2);
  const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
  const offline = args.includes('--offline');
  const token = getArg('token');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(scriptDir, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const changelogPath = path.join(root, 'CHANGELOG.md');
  const changelogVersion = fs.existsSync(changelogPath) ? parseChangelogVersion(fs.readFileSync(changelogPath, 'utf8')) : null;

  const tag = sh('git', ['tag', '--list', `v${pkg.version}`], root);
  const tagExists = tag.error || tag.status !== 0 ? undefined : String(tag.stdout || '').trim() !== '';

  const npm = npmInvoker();
  const REG = 'https://registry.npmjs.org/';
  const authArg = token ? [`--//registry.npmjs.org/:_authToken=${token}`] : [];

  // 注意：这里不能带 --registry，否则永远回显 npmjs.org，镜像站配置就被掩盖了（实测踩过）
  const cfgRes = npm(['config', 'get', 'registry']);
  const registryConfig = cfgRes.status === 0 ? String(cfgRes.stdout || '').trim() : '';

  let registry = { kind: 'skipped' };
  let whoami = null;
  if (!offline) {
    const view = npm(['view', pkg.name, 'version', '--registry', REG, ...authArg]);
    const out = `${view.stdout || ''}${view.stderr || ''}`;
    if (view.status === 0) registry = { kind: 'ok', latest: String(view.stdout || '').trim().split('\n').pop().trim() };
    else if (/E404|NOT_FOUND/i.test(out)) registry = { kind: 'notFound' };
    else registry = { kind: 'error', error: out.trim() };

    const who = npm(['whoami', '--registry', REG, ...authArg]);
    const whoUser = String(who.stdout || '').trim();
    const whoOut = `${who.stdout || ''}${who.stderr || ''}`;
    if (who.status === 0 && whoUser) whoami = { user: whoUser.split('\n').pop().trim() };
    else whoami = { error: (whoOut.match(/npm (error|ERR!)[^\n]*/) || [whoOut.trim().split('\n')[0] || 'whoami 无输出'])[0] };
  }

  const r = evaluate({ name: pkg.name, version: pkg.version, changelogVersion, tagExists, registryConfig, registry, whoami });

  console.log(`release-preflight ${pkg.name}@${pkg.version}${offline ? '  (offline)' : ''}`);
  r.oks.forEach(t => console.log('PASS | ' + t));
  r.warns.forEach(t => console.log('WARN | ' + t));
  r.fails.forEach(t => console.log('FAIL | ' + t));
  console.log(`---\nPREFLIGHT PASS=${r.oks.length} WARN=${r.warns.length} FAIL=${r.fails.length}`);
  if (!r.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
