#!/usr/bin/env node
/**
 * 任务快照与回滚：create / list / restore。
 *
 * 设计取舍：
 * - 以 git 工作区为基线，只快照「已改动 + 未跟踪」文件；不复制整仓。
 * - 回滚：已跟踪文件用 `git checkout --` 还原；未跟踪文件从快照拷回；
 *   快照之后新增的未跟踪文件需显式 `--prune` 才删除。
 * - 回滚前自动再拍一张 `pre-restore` 快照，避免回滚本身不可逆。
 * - 非 git 目录直接报错，不假装支持；大文件超阈值只登记 skipped，不复制。
 *
 * 用法：
 *   node scripts/snapshot.mjs create  --cwd <仓库> [--label 名称] [--max-bytes 5000000]
 *   node scripts/snapshot.mjs list    --cwd <仓库>
 *   node scripts/snapshot.mjs restore --cwd <仓库> --id <id|前缀> [--prune] [--force] [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const cmd = args[0];
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const has = n => args.includes('--' + n);
const asJson = has('json');
const dryRun = has('dry-run');

const EXCLUDE = ['.agent-runs', 'node_modules', 'dist', 'logs', '.git', 'uploads', 'cert'];
const EXCLUDE_FILE = /(^|\/)\.env(\..*)?$/;

function git(cwd, argv, allowFail = false, trim = true) {
  const r = spawnSync('git', argv, { cwd, encoding: 'utf8' });
  if (r.status !== 0 && !allowFail) {
    throw new Error(`git ${argv.join(' ')} 失败: ${(r.stderr || r.stdout || '').trim()}`);
  }
  const stdout = r.stdout || '';
  return { ok: r.status === 0, out: trim ? stdout.trim() : stdout, err: (r.stderr || '').trim() };
}

function repoRoot(cwd) {
  const r = git(cwd, ['rev-parse', '--show-toplevel'], true);
  if (!r.ok) throw new Error(`不是 git 仓库: ${cwd}（快照以 git 工作区为基线）`);
  return path.resolve(r.out.split('\n')[0]);
}

/** 解析 git status --porcelain=v1 -z；返回 [{path, xy, untracked}] */
function statusEntries(root) {
  // 不能 trim：porcelain 首行以空格开头（" M path"），trim 会把 XY 挤掉一位
  const r = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'], false, false);
  const tokens = r.out.split('\0').filter(Boolean);
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.length < 4) continue;
    const xy = tok.slice(0, 2);
    const p = tok.slice(3).split(path.sep).join('/');
    out.push({ path: p, xy, untracked: xy === '??' });
    // -z 下重命名/复制会紧跟一个「源路径」token，跳过它
    if (/[RC]/.test(xy)) i += 1;
  }
  return out;
}

function excluded(rel) {
  if (EXCLUDE_FILE.test(rel)) return 'env';
  return EXCLUDE.some(x => rel === x || rel.startsWith(x + '/')) ? 'dir' : '';
}

function snapRoot(root) {
  return path.join(root, '.agent-runs', 'snapshots');
}

function makeId(label) {
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const safe = String(label || 'task').replace(/[^\w.-]+/g, '-').slice(0, 40);
  return `${ts}-${safe}`;
}

function createSnapshot(root, label, maxBytes) {
  const entries = statusEntries(root);
  const id = makeId(label);
  const dir = path.join(snapRoot(root), id);
  const filesDir = path.join(dir, 'files');
  const manifest = {
    id,
    label: label || 'task',
    createdAt: new Date().toISOString(),
    root,
    head: git(root, ['rev-parse', 'HEAD'], true).out || '',
    maxBytes,
    files: [],
  };
  let copied = 0;
  let skipped = 0;
  let bytes = 0;
  for (const e of entries) {
    const why = excluded(e.path);
    const abs = path.join(root, e.path);
    const exists = fs.existsSync(abs);
    const size = exists ? fs.statSync(abs).size : 0;
    let state = e.untracked ? 'untracked' : 'modified';
    if (!e.untracked && !exists) state = 'deleted';
    const rec = { path: e.path, state, bytes: size, skipped: '' };
    if (why) { rec.skipped = 'excluded:' + why; skipped++; manifest.files.push(rec); continue; }
    if (e.untracked && !exists) { rec.skipped = 'missing'; skipped++; manifest.files.push(rec); continue; }
    if (size > maxBytes) { rec.skipped = 'too-large'; skipped++; manifest.files.push(rec); continue; }
    if (exists) {
      const dst = path.join(filesDir, e.path);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(abs, dst);
      copied++;
      bytes += size;
    }
    manifest.files.push(rec);
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return { id, dir, copied, skipped, bytes, total: manifest.files.length, manifest };
}

function findSnapshot(root, id) {
  const base = snapRoot(root);
  if (!fs.existsSync(base)) throw new Error('没有快照目录: ' + base);
  const ids = fs.readdirSync(base).filter(d => fs.existsSync(path.join(base, d, 'manifest.json')));
  const hit = ids.filter(d => d === id || d.startsWith(id));
  if (!hit.length) throw new Error('快照不存在: ' + id);
  if (hit.length > 1) throw new Error('快照前缀不唯一: ' + hit.join(', '));
  return path.join(base, hit[0]);
}

function restore(root, id, opts) {
  const dir = findSnapshot(root, id);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const head = git(root, ['rev-parse', 'HEAD'], true).out || '';
  if (manifest.head && head !== manifest.head && !opts.force && !dryRun) {
    throw new Error(`HEAD 已变化（快照 ${manifest.head.slice(0, 8)} → 当前 ${head.slice(0, 8)}），需 --force`);
  }

  let pre = null;
  if (!dryRun && opts.preSnapshot !== false) {
    pre = createSnapshot(root, 'pre-restore', manifest.maxBytes || 5000000);
  }

  const actions = [];
  let restored = 0;
  let removed = 0;
  let skipped = 0;
  for (const f of manifest.files) {
    if (f.skipped) { actions.push(`SKIP ${f.path} (${f.skipped})`); skipped++; continue; }
    const abs = path.join(root, f.path);
    const src = path.join(dir, 'files', f.path);
    if (f.state === 'modified' || f.state === 'untracked') {
      if (dryRun) { actions.push(`COPY ${f.path}`); restored++; continue; }
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.copyFileSync(src, abs);
      restored++;
      actions.push(`RESTORE(copy) ${f.path}`);
    } else if (f.state === 'deleted') {
      if (dryRun) { actions.push(`GIT-CHECKOUT ${f.path}`); restored++; continue; }
      const r = git(root, ['checkout', '--', f.path], true);
      if (r.ok) { restored++; actions.push(`RESTORE(checkout) ${f.path}`); }
      else { skipped++; actions.push(`SKIP ${f.path} (checkout 失败)`); }
    }
  }

  if (opts.prune) {
    const known = new Set(manifest.files.map(f => f.path));
    for (const e of statusEntries(root)) {
      if (!e.untracked) continue;
      if (known.has(e.path)) continue;
      if (excluded(e.path)) continue;
      if (dryRun) { actions.push(`PRUNE ${e.path}`); removed++; continue; }
      fs.rmSync(path.join(root, e.path), { force: true });
      removed++;
      actions.push(`PRUNE ${e.path}`);
    }
  }

  return { id: manifest.id, dir, pre: pre?.id || '', restored, removed, skipped, actions, head: manifest.head || '' };
}

function main() {
  const cwd = path.resolve(getArg('cwd') || process.cwd());
  const root = repoRoot(cwd);
  if (cmd === 'create') {
    const maxBytes = Number(getArg('max-bytes') || 5_000_000);
    const r = createSnapshot(root, getArg('label') || 'task', maxBytes);
    if (asJson) console.log(JSON.stringify({ id: r.id, dir: r.dir, copied: r.copied, skipped: r.skipped, bytes: r.bytes, total: r.total }, null, 2));
    else console.log(`SNAPSHOT ${r.id} files=${r.copied} skipped=${r.skipped} bytes=${r.bytes} total=${r.total}\nDIR ${r.dir}`);
    return;
  }
  if (cmd === 'list') {
    const base = snapRoot(root);
    const rows = fs.existsSync(base)
      ? fs.readdirSync(base).filter(d => fs.existsSync(path.join(base, d, 'manifest.json'))).sort().map(d => {
        const m = JSON.parse(fs.readFileSync(path.join(base, d, 'manifest.json'), 'utf8'));
        return { id: m.id, label: m.label, createdAt: m.createdAt, files: m.files.length, head: (m.head || '').slice(0, 8) };
      })
      : [];
    if (asJson) console.log(JSON.stringify(rows, null, 2));
    else rows.forEach(x => console.log(`${x.id} | files=${x.files} | head=${x.head} | ${x.label}`));
    if (!rows.length) console.log('NONE 没有快照');
    return;
  }
  if (cmd === 'restore') {
    const id = getArg('id');
    if (!id) throw new Error('缺少 --id');
    const r = restore(root, id, { prune: has('prune'), force: has('force') });
    const prefix = dryRun ? 'DRY ' : '';
    for (const a of r.actions) console.log(prefix + a);
    console.log(`RESTORED ${r.id} restored=${r.restored} removed=${r.removed} skipped=${r.skipped} pre=${r.pre || 'none'}`);
    if (asJson) console.log(JSON.stringify(r, null, 2));
    return;
  }
  console.error('用法: create | list | restore（详见文件头注释）');
  process.exit(1);
}

try {
  main();
} catch (e) {
  console.error('FAIL ' + (e && e.message));
  process.exit(1);
}
