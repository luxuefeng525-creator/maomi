#!/usr/bin/env node
// ai-workflow 结构拆解助手：扫描仓库顶层源码模块，分析跨模块依赖，给出并行/串行建议。零依赖。
// 用法：node scripts/decompose.mjs [--dir <repo>] [--json]
// 输出：每个模块的 入度/出度 与分类（LEAF 可并行 / HUB 共享契约先建 / PEER 耦合串行）+ 执行建议。
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dirIdx = args.indexOf('--dir');
const repoDir = (dirIdx >= 0 && args[dirIdx + 1]) ? path.resolve(args[dirIdx + 1]) : process.cwd();
const asJson = args.includes('--json');

const SRC_ROOTS = ['src', 'app', 'apps', 'packages', 'libs', 'lib', 'components', 'services',
  'modules', 'server', 'client', 'frontend', 'backend', 'api', 'web'];
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.vue', '.go', '.py', '.java',
  '.rb', '.php', '.cs', '.cjs', '.mjs']);
// 跳过的重目录（依赖/产物/缓存），避免大仓扫描卡死
const BLOCKLIST = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt',
  '.output', 'target', 'bin', 'obj', '.cache', '.tmp', 'uploads', 'public', 'static',
  '.idea', '.vscode', 'vendor', '.git', 'logs', '_archive', '_bak', '_shots', '_tmp', 'backups']);
const MAX_SCAN_FILES = 150;   // 每模块最多扫多少文件
const MAX_SCAN_TOTAL = 1500;  // 全局硬上限，防失控

function findRoots(dir) {
  const roots = [];
  for (const r of SRC_ROOTS) {
    const p = path.join(dir, r);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) roots.push(p);
  }
  if (!roots.length) {
    const direct = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.') &&
        !['node_modules', 'dist', 'build', 'out', '.git'].includes(d.name));
    if (direct.length) roots.push(dir);
  }
  return roots;
}

function listFiles(dir, cap, globalRemaining) {
  const out = [];
  const stack = [dir];
  while (stack.length && out.length < cap && globalRemaining.n > 0) {
    const cur = stack.pop();
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (out.length >= cap || globalRemaining.n <= 0) break;
      if (BLOCKLIST.has(e.name) || e.name.startsWith('.')) continue;
      const fp = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(fp);
      else if (CODE_EXT.has(path.extname(e.name))) { out.push(fp); globalRemaining.n--; }
    }
  }
  return out;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function countRefs(files, sibling) {
  // 统计有多少文件以相对路径引用了兄弟模块名（import/require/from/using/include 语境）
  const re = new RegExp(`(["'\`~]\\s*[^"'\`]*?)(?:\\.\\.?\\/|^)${escapeRe(sibling)}(?:\\/|["'\`])`);
  let n = 0;
  for (const f of files) {
    let txt;
    try { txt = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (re.test(txt)) n++;
  }
  return n;
}

if (!fs.existsSync(repoDir)) { console.log(`目录不存在: ${repoDir}`); process.exit(1); }
const roots = findRoots(repoDir);
if (!roots.length) { console.log(`未检测到源码根（src/app/packages 等）于 ${repoDir}`); process.exit(1); }

// 收集模块（源码根的直接子目录），跳过产物/依赖/备份类目录
const BACKUP_RE = /^.+__old_\d+$|^\d{10,}$/;
const ART_RE = /^(dist|build|out|release|target)(\.|$)|__old_/i;
const grem = { n: MAX_SCAN_TOTAL };
const modules = [];
for (const root of roots) {
  const rootName = path.basename(root);
  const kids = fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const k of kids) {
    if (BLOCKLIST.has(k.name) || k.name.startsWith('.') || BACKUP_RE.test(k.name) || ART_RE.test(k.name)) continue;
    const mp = path.join(root, k.name);
    const files = listFiles(mp, MAX_SCAN_FILES, grem);
    if (!files.length) continue;
    modules.push({ name: `${rootName}/${k.name}`, base: k.name, root, path: mp, files: files.length });
  }
}

if (modules.length < 2) {
  const msg = `仅检测到 ${modules.length} 个模块，无需并行拆解：直接走普通单线 8 环。`;
  console.log(asJson ? JSON.stringify({ parallel: false, reason: msg, modules }, null, 2) : msg);
  process.exit(0);
}

// 按根独立分析依赖边（避免跨根同名模块误判），再合并分类
const byRoot = new Map();
for (const m of modules) {
  if (!byRoot.has(m.root)) byRoot.set(m.root, []);
  byRoot.get(m.root).push(m);
}
for (const [, mods] of byRoot) {
  const names = mods.map(m => m.base);
  for (const m of mods) m.incoming = 0;
  for (const m of mods) {
    const files = listFiles(m.path, MAX_SCAN_FILES, grem);
    const refs = names.filter(s => s !== m.base && countRefs(files, s));
    m.outgoing = refs.length;
    m.refs = refs;
    for (const r of refs) {
      const t = mods.find(x => x.base === r);
      if (t) t.incoming++;
    }
  }
}

for (const m of modules) {
  if (m.incoming >= 2) m.cls = 'HUB';
  else if (m.outgoing >= 1) m.cls = 'PEER';
  else m.cls = 'LEAF';
  m.parallelSafe = m.cls === 'LEAF';
}

const order = { HUB: 0, PEER: 1, LEAF: 2 };
modules.sort((a, b) => (order[a.cls] - order[b.cls]) || a.name.localeCompare(b.name));

const hubs = modules.filter(m => m.cls === 'HUB');
const peers = modules.filter(m => m.cls === 'PEER');
const leaves = modules.filter(m => m.cls === 'LEAF');
const rec = hubs.length
  ? `先串行建共享契约（HUB: ${hubs.map(m => m.name).join('/')}），再并行叶节点（LEAF: ${leaves.map(m => m.name).join('/') || '无'}）`
  : `无共享契约，叶节点可直接并行（LEAF: ${leaves.map(m => m.name).join('/') || '无'}）` + (peers.length ? `；耦合模块串行（PEER: ${peers.map(m => m.name).join('/')}）` : '');

if (asJson) {
  console.log(JSON.stringify({ repo: repoDir, parallel: true, recommendation: rec, modules }, null, 2));
} else {
  console.log(`仓库: ${repoDir}`);
  console.log(`模块数: ${modules.length} ｜ 可并行(LEAF): ${leaves.length} ｜ 共享契约(HUB): ${hubs.length} ｜ 耦合(PEER): ${peers.length}`);
  console.log('—'.repeat(56));
  for (const m of modules) {
    console.log(`[${m.cls.padEnd(4)}] ${m.name.padEnd(22)} 文件:${String(m.files).padStart(4)} 入:${m.incoming} 出:${m.outgoing}`);
  }
  console.log('—'.repeat(56));
  console.log(`建议: ${rec}`);
}
