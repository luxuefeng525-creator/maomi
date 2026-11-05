#!/usr/bin/env node
// 安全同步：把本包同步到宿主。默认 dry-run，只报告差异；--apply 才写。
// --backup 备份将被覆盖的文件；--skip 保护定制技能（如项目里被 git 跟踪的 bigscreen-studio）。
// 用法：
//   node scripts/sync-hosts.mjs --pkg <宿主 ai-workflow 目录> [--deps <宿主 skills 目录>]
//        [--apply] [--backup] [--skip bigscreen-studio,industrial-screen] [--no-skills]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const PKG = opt('--pkg', null);
const DEPS = opt('--deps', null);
const APPLY = argv.includes('--apply');
const BACKUP = argv.includes('--backup');
const NO_SKILLS = argv.includes('--no-skills');
const SKIP = new Set((opt('--skip', '') || '').split(',').map(s => s.trim()).filter(Boolean));

if (!PKG) { console.log('用法: sync-hosts.mjs --pkg <宿主 ai-workflow 目录> [--deps <宿主 skills 目录>] [--apply] [--backup] [--skip a,b]'); process.exit(1); }

const PKG_ITEMS = ['SKILL.md', 'README.md', 'MANUAL.md', 'CHANGELOG.md', 'references', 'scripts', 'examples', 'evals'];
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = path.join(path.dirname(path.resolve(PKG)), '.ai-workflow-backup', stamp);

function walk(base, rel = '') {
  const out = [];
  const abs = path.join(base, rel);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const r = path.join(rel, e.name);
    if (e.isDirectory()) out.push(...walk(base, r));
    else out.push(r);
  }
  return out;
}
const sha = p => crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');

const plan = [];
function consider(srcFile, dstFile, label) {
  const exists = fs.existsSync(dstFile);
  if (!exists) { plan.push({ kind: 'NEW', label, srcFile, dstFile }); return; }
  if (sha(srcFile) !== sha(dstFile)) plan.push({ kind: 'CHANGED', label, srcFile, dstFile });
}

for (const item of PKG_ITEMS) {
  const s = path.join(src, item);
  if (!fs.existsSync(s)) continue;
  if (fs.statSync(s).isDirectory()) {
    for (const r of walk(s)) consider(path.join(s, r), path.join(PKG, item, r), `${item}/${r}`);
  } else {
    consider(s, path.join(PKG, item), item);
  }
}

if (!NO_SKILLS && DEPS) {
  const sroot = path.join(src, 'skills');
  for (const name of fs.readdirSync(sroot).sort()) {
    if (SKIP.has(name)) { plan.push({ kind: 'SKIP', label: `skills/${name}` }); continue; }
    const sd = path.join(sroot, name);
    if (!fs.statSync(sd).isDirectory()) continue;
    for (const r of walk(sd)) consider(path.join(sd, r), path.join(DEPS, name, r), `skills/${name}/${r}`);
  }
}

const counts = plan.reduce((a, p) => (a[p.kind] = (a[p.kind] || 0) + 1, a), {});
const changed = plan.filter(p => p.kind === 'NEW' || p.kind === 'CHANGED');
for (const p of changed) console.log(`${p.kind.padEnd(7)} ${p.label}`);
for (const p of plan.filter(p => p.kind === 'SKIP')) console.log(`SKIP    ${p.label}（受保护）`);
console.log(`\nSYNC ${APPLY ? 'APPLY' : 'DRY-RUN'} · new=${counts.NEW || 0} changed=${counts.CHANGED || 0} skipped=${counts.SKIP || 0} · pkg=${PKG}`);

if (!APPLY) { console.log('未写入。确认无误后加 --apply [--backup]。'); process.exit(0); }
if (!changed.length) { console.log('无变更。'); process.exit(0); }

for (const p of changed) {
  if (BACKUP && fs.existsSync(p.dstFile)) {
    const b = path.join(backupRoot, p.label);
    fs.mkdirSync(path.dirname(b), { recursive: true });
    fs.copyFileSync(p.dstFile, b);
  }
  fs.mkdirSync(path.dirname(p.dstFile), { recursive: true });
  fs.copyFileSync(p.srcFile, p.dstFile);
}
console.log(`APPLIED ${changed.length} 个文件${BACKUP ? `；备份在 ${backupRoot}` : ''}`);
