#!/usr/bin/env node
/**
 * 验收指纹：给工作区做 sha256 清单，事后再算一次并比对。
 *
 * 用途：证明「只改了 A，B/C 真没动」，比口头声明硬。
 * 机制参考：Blender 教程的「同机位出图 md5 不变 = 真没变」，这里换成源码指纹。
 *
 * 用法：
 *   node scripts/fingerprint.mjs create --cwd <仓库> [--dirs app/src,server/src] [--out <文件>]
 *   node scripts/fingerprint.mjs diff   --cwd <仓库> --before <清单> [--after <清单>] [--json] [--allow-diff]
 * 退出码：diff 有差异 → 1；相同 → 0。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const cmd = args[0];
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const has = n => args.includes('--' + n);
const asJson = has('json');

const EXCLUDE = new Set(['node_modules', '.git', 'dist', 'build', 'logs', '.agent-index', '.agent-memory', '.agent-runs', 'coverage', '.next', '.nuxt', 'vendor', 'uploads', 'static', 'assets', 'media', 'images', 'img', 'fonts', 'cert', 'certs', 'test-results', 'playwright-report']);
const EXCLUDE_FILE = /(^|\/)\.env(\..*)?$/;

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (EXCLUDE.has(name)) continue;
    const p = path.join(dir, name);
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, acc);
    else if (st.isFile()) acc.push(p);
  }
  return acc;
}

function sha(file) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(file));
  return h.digest('hex');
}

function create() {
  const cwd = path.resolve(getArg('cwd') || process.cwd());
  const dirs = (getArg('dirs') || '').split(',').map(s => s.trim()).filter(Boolean);
  const maxBytes = Number(getArg('max-bytes') || 20_000_000);
  const roots = dirs.length ? dirs.map(d => path.resolve(cwd, d)).filter(d => fs.existsSync(d)) : [cwd];
  const files = {};
  const skipped = [];
  for (const r of roots) {
    for (const f of walk(r)) {
      const rel = path.relative(cwd, f).split(path.sep).join('/');
      if (EXCLUDE_FILE.test(rel)) { skipped.push({ path: rel, reason: 'env' }); continue; }
      const bytes = fs.statSync(f).size;
      if (bytes > maxBytes) { skipped.push({ path: rel, reason: 'too-large', bytes }); continue; }
      files[rel] = { sha: sha(f), bytes };
    }
  }
  const out = path.resolve(cwd, getArg('out') || path.join('.agent-runs', `fingerprint-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.json`));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const manifest = { root: cwd, createdAt: new Date().toISOString(), dirs, files, skipped };
  fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`FINGERPRINT ${path.relative(cwd, out).split(path.sep).join('/')} files=${Object.keys(files).length} skipped=${skipped.length}`);
}

function diff() {
  const beforeFile = getArg('before');
  if (!beforeFile) { console.error('缺少 --before <清单>'); process.exit(1); }
  const before = JSON.parse(fs.readFileSync(path.resolve(beforeFile), 'utf8'));
  const cwd = path.resolve(getArg('cwd') || before.root || process.cwd());
  let after;
  if (getArg('after')) after = JSON.parse(fs.readFileSync(path.resolve(getArg('after')), 'utf8'));
  else {
    const maxBytes = Number(getArg('max-bytes') || 20_000_000);
    const roots = (before.dirs && before.dirs.length) ? before.dirs.map(d => path.resolve(cwd, d)).filter(d => fs.existsSync(d)) : [cwd];
    const files = {};
    for (const r of roots) for (const f of walk(r)) {
      const rel = path.relative(cwd, f).split(path.sep).join('/');
      if (EXCLUDE_FILE.test(rel)) continue;
      const bytes = fs.statSync(f).size;
      if (bytes > maxBytes) continue;
      files[rel] = { sha: sha(f), bytes };
    }
    after = { root: cwd, files };
  }

  const changed = [];
  const added = [];
  const removed = [];
  for (const [p, v] of Object.entries(after.files)) {
    if (!before.files[p]) added.push(p);
    else if (before.files[p].sha !== v.sha) changed.push(p);
  }
  for (const p of Object.keys(before.files)) if (!after.files[p]) removed.push(p);
  const unchanged = Object.keys(before.files).length - changed.length - removed.length;

  if (asJson) console.log(JSON.stringify({ unchanged, changed, added, removed }, null, 2));
  else {
    for (const p of changed) console.log('CHANGED ' + p);
    for (const p of added) console.log('ADDED ' + p);
    for (const p of removed) console.log('REMOVED ' + p);
    console.log(`SUMMARY unchanged=${unchanged} changed=${changed.length} added=${added.length} removed=${removed.length}`);
  }
  const dirty = changed.length + added.length + removed.length;
  process.exit(dirty && !has('allow-diff') ? 1 : 0);
}

try {
  if (cmd === 'create') create();
  else if (cmd === 'diff') diff();
  else { console.error('用法: create | diff（详见文件头）'); process.exit(1); }
} catch (e) {
  console.error('FAIL ' + (e && e.message));
  process.exit(1);
}
