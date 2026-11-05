#!/usr/bin/env node
// 发布前检查（本地）：版本号 / CHANGELOG / 全量技能审计 / 命中率 / 打包 / 待提交。
// 任一闸门失败 exit 1。不做任何 push（外部动作留给人工确认）。
// 用法：node scripts/release.mjs [--pack]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const argv = process.argv.slice(2);
const DO_PACK = argv.includes('--pack');
// --zip <路径>：只检查指定 zip 的泄漏（不打包）。用于复验历史产物或做负向测试。
const optVal = n => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : null; };
const ZIP_OVERRIDE = optVal('--zip');

function sh(args) {
  try { return { code: 0, out: execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status || 1, out: ((e.stdout || '') + (e.stderr || '')).toString() }; }
}

const gates = [];
function gate(name, ok, detail) { gates.push({ name, ok, detail }); }

const skillMd = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
const ver = (skillMd.match(/^version:\s*([\d.]+)/m) || [])[1] || '';
gate('版本号', !!ver, ver || '未找到 version');

const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
gate('CHANGELOG', changelog.includes(`## ${ver}`), `## ${ver}`);

const audit = sh([path.join(here, 'audit-skills.mjs')]);
gate('技能审计', audit.code === 0, audit.out.trim().split('\n').slice(-1)[0] || '');

const evalr = sh([path.join(here, 'eval.mjs'), 'trigger']);
const f1 = (evalr.out.match(/F1=([\d.]+)/) || [])[1] || '';
gate('命中率', evalr.code === 0, f1 ? `F1=${f1}` : 'trigger 失败');

const tier = sh([path.join(here, 'eval.mjs'), 'tier']);
const tierAcc = (tier.out.match(/acc=([\d.]+)/) || [])[1] || '';
gate('定档', tier.code === 0 && tierAcc === '1.00', tierAcc ? `acc=${tierAcc}` : 'tier 失败');

// 留出集闸门：不参与调参的句子，衡量真实泛化。触发 F1 低于阈值即拦（当前阈值 0.80）。
const heldoutFiles = fs.existsSync(path.join(root, 'evals', 'heldout.json')) ? ['heldout.json'] : [];
if (fs.existsSync(path.join(root, 'evals', 'heldout2.json'))) heldoutFiles.push('heldout2.json');
const HELDOUT_F1_MIN = 0.80;
const heldoutDetails = [];
let heldoutOk = true;
for (const hf of heldoutFiles) {
  const h = sh([path.join(here, 'eval.mjs'), 'trigger', '--file', path.join('evals', hf)]);
  const hf1 = parseFloat((h.out.match(/F1=([\d.]+)/) || [])[1] || '0');
  heldoutOk = heldoutOk && h.code === 0 && hf1 >= HELDOUT_F1_MIN;
  heldoutDetails.push(`${hf}=${hf1.toFixed(2)}`);
}
gate('留出集 F1≥' + HELDOUT_F1_MIN, heldoutOk, heldoutDetails.join('  ') || '无留出集文件');

// 包完整性自检：环境/核心文件/catalog/零依赖/smoke 任一不过都不发
const doc = sh([path.join(here, 'doctor.mjs')]);
const ready = /READY/.test(doc.out) && doc.code === 0;
gate('环境自检', ready, ready ? (doc.out.match(/(\d+) pass, (\d+) warn, (\d+) fail/) || []).slice(1).join('/') + ' (pass/warn/fail)' : 'doctor 未 READY');

let zipInfo = '';
if (DO_PACK || ZIP_OVERRIDE) {
  const p = DO_PACK ? sh([path.join(here, 'pack.mjs')]) : { code: 0, out: '' };
  const m = p.out.match(/FILES=(\d+) BYTES=(\d+) VERSION=([\d.]+)/);
  zipInfo = m ? `${m[1]} 文件 / ${m[2]} B / v${m[3]}` : p.out.trim().split('\n').slice(-1)[0];
  if (DO_PACK) gate('打包', p.code === 0 && !!m, zipInfo);
  // 泄漏闸：分发件不许含工作产物/凭据/仓库历史（eval snapshot 与 pack 的默认排除必须一致）
  const zipPath = ZIP_OVERRIDE ? path.resolve(ZIP_OVERRIDE) : path.join(root, `ai-workflow-v${ver}.zip`);
  let leaks = ['zip 不存在'];
  if (fs.existsSync(zipPath)) {
    const buf = fs.readFileSync(zipPath);
    // 直接从中央目录读文件名，不解压（零依赖、快）
    const names = [];
    let i = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    while (i >= 0 && i + 46 <= buf.length) {
      const nLen = buf.readUInt16LE(i + 28);
      names.push(buf.slice(i + 46, i + 46 + nLen).toString('utf8'));
      i = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), i + 46 + nLen);
    }
    const BAN = [/(^|\/)\.ai-workflow\//, /(^|\/)\.git\//, /(^|\/)node_modules\//,
                 /(^|\/)eval-results\//, /(^|\/)HANDOFF\.md$/, /(^|\/)\.env/, /\.zip$/i];
    leaks = names.filter(n => BAN.some(re => re.test(n)));
  }
  gate('泄漏检查', leaks.length === 0, leaks.length ? `混入 ${leaks.length} 项: ${leaks.slice(0, 3).join(', ')}` : '无工作产物/凭据泄漏');
}

for (const g of gates) console.log(`${g.ok ? 'OK  ' : 'FAIL'} ${g.name}: ${g.detail}`);
const bad = gates.filter(g => !g.ok);
console.log(`\nRELEASE ${bad.length ? 'BLOCKED' : 'READY'} · v${ver}${zipInfo ? ' · ' + zipInfo : ''}`);
if (bad.length) process.exit(1);
console.log('下一步（外部动作需人工确认）：推送分支 → 开/更新 PR → 合并 → 建 Release 并上传 zip。');
