#!/usr/bin/env node
/**
 * 仓库索引：符号、别名解析、路由映射，产出可查询索引与预算裁剪 MAP。
 * 用法：
 *   node scripts/repo-index.mjs build   [--root <仓库>] [--out .agent-index] [--budget 200]
 *   node scripts/repo-index.mjs query   --term <关键词> [--root <仓库>] [--limit 20]
 *   node scripts/repo-index.mjs context --term <符号> [--budget 4000] [--root <仓库>]
 *   node scripts/repo-index.mjs related --file <相对路径> [--root <仓库>]
 *   node scripts/repo-index.mjs route   --path <路由> [--root <仓库>]
 *   node scripts/repo-index.mjs stats   [--root <仓库>]
 * 纯正则解析，无第三方依赖；跳过依赖目录与产物目录。
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const cmd = args[0];
const root = path.resolve(getArg('root') || process.cwd());
const outDir = path.resolve(root, getArg('out') || '.agent-index');
const maxLines = Number(getArg('budget') || getArg('max-lines') || 200);
const onlyDirs = (getArg('dirs') || '').split(',').map(s => s.trim()).filter(Boolean);

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'logs', '.agent-index', '.agent-memory', '.agent-runs', '.next', '.nuxt', 'vendor', '__pycache__', 'uploads', 'static', 'public', 'assets', 'media', 'images', 'img', 'fonts', 'cert', 'certs', '.trae', 'test-results', 'playwright-report']);
const UNI_TAGS = new Set(['view', 'text', 'image', 'button', 'swiper', 'swiper-item', 'scroll-view', 'navigator', 'input', 'textarea', 'form', 'label', 'picker', 'checkbox', 'radio', 'slider', 'switch', 'video', 'audio', 'canvas', 'map', 'web-view', 'template', 'block', 'slot', 'rich-text', 'cover-view', 'cover-image', 'picker-view', 'picker-view-column', 'checkbox-group', 'radio-group', 'live-player', 'live-pusher', 'camera', 'ad', 'open-data', 'page-meta', 'navigation-bar']);
const EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.vue']);
const SYMBOL_PATTERNS = [
  { re: /^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/, kind: 'function' },
  { re: /^\s*export\s+const\s+([A-Za-z_$][\w$]*)\s*=/, kind: 'const' },
  { re: /^\s*export\s+class\s+([A-Za-z_$][\w$]*)/, kind: 'class' },
  { re: /^\s*export\s+(?:interface|type)\s+([A-Za-z_$][\w$]*)/, kind: 'type' },
  { re: /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/, kind: 'function' },
  { re: /^\s*class\s+([A-Za-z_$][\w$]*)/, kind: 'class' },
  { re: /^\s*interface\s+([A-Za-z_$][\w$]*)/, kind: 'type' },
  { re: /^\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/, kind: 'function' },
];

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = path.join(dir, name);
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, acc);
    else if (EXT.has(path.extname(name))) acc.push(p);
  }
  return acc;
}
function readLooseJson(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  return JSON.parse(raw);
}
function loadAliases() {
  const out = [];
  for (const rel of ['tsconfig.json', 'jsconfig.json', 'app/tsconfig.json', 'admin/tsconfig.json', 'server/tsconfig.json', 'web/tsconfig.json']) {
    const f = path.join(root, rel);
    if (!fs.existsSync(f)) continue;
    try {
      const cfg = readLooseJson(f);
      const base = path.dirname(f);
      const paths = cfg?.compilerOptions?.paths || {};
      for (const [key, targets] of Object.entries(paths)) {
        const target = Array.isArray(targets) ? targets[0] : targets;
        if (!target) continue;
        out.push({ pattern: key, target, baseAbs: base });
      }
    } catch { /* 配置不规范就跳过 */ }
  }
  if (!out.length) out.push({ pattern: '@/*', target: 'src/*', baseAbs: root });
  return out;
}
function resolveImport(raw, fileAbs, aliases) {
  const tryExt = base => {
    for (const ext of ['', '.ts', '.tsx', '.js', '.mjs', '.vue', '.jsx', '/index.ts', '/index.js']) {
      const p = base + ext;
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return path.relative(root, p).split(path.sep).join('/');
    }
    return null;
  };
  if (raw.startsWith('.')) return tryExt(path.resolve(path.dirname(fileAbs), raw));
  if (raw.startsWith('@/')) {
    const rel = path.relative(root, fileAbs).split(path.sep)[0];
    const base = rel === 'app' ? path.join(root, 'app', 'src') : rel === 'admin' ? path.join(root, 'admin', 'src') : rel === 'server' ? path.join(root, 'server', 'src') : path.join(root, 'src');
    const hit = tryExt(path.join(base, raw.slice(2)));
    if (hit) return hit;
  }
  for (const a of aliases) {
    const star = a.pattern.indexOf('*');
    if (star < 0) { if (raw === a.pattern) return tryExt(path.resolve(a.baseAbs, a.target)); continue; }
    const prefix = a.pattern.slice(0, star);
    const suffix = a.pattern.slice(star + 1);
    if (raw.startsWith(prefix) && raw.endsWith(suffix)) {
      const mid = raw.slice(prefix.length, raw.length - (suffix.length || 0));
      const target = a.target.replace('*', mid);
      return tryExt(path.resolve(a.baseAbs, target));
    }
  }
  return null;
}
function routes() {
  const out = [];
  for (const rel of ['pages.json', 'app/src/pages.json', 'src/pages.json', 'app/pages.json']) {
    const f = path.join(root, rel);
    if (!fs.existsSync(f)) continue;
    try {
      const cfg = readLooseJson(f);
      const base = path.dirname(f);
      const add = p => {
        const file = path.resolve(base, p + '.vue');
        out.push({ kind: 'page', route: '/' + p, file: fs.existsSync(file) ? path.relative(root, file).split(path.sep).join('/') : path.relative(root, file).split(path.sep).join('/') });
      };
      for (const p of cfg.pages || []) add(p.path);
      for (const sp of cfg.subPackages || cfg.subpackages || []) for (const p of sp.pages || []) add(sp.root.replace(/\/$/, '') + '/' + p.path);
    } catch { /* pages.json 不规范就跳过 */ }
  }
  for (const file of walk(root)) {
    if (!file.endsWith('.ts')) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/@Controller\(\s*['"]([^'"]*)['"]\s*\)/g)) {
      out.push({ kind: 'api', route: '/' + m[1].replace(/^\//, ''), file: path.relative(root, file).split(path.sep).join('/') });
    }
  }
  return out;
}

function build() {
  const aliases = loadAliases();
  const routeList = routes();
  const hasMono = ['app/src', 'admin/src', 'server/src'].some(d => fs.existsSync(path.join(root, d)));
  const autoDirs = hasMono
    ? ['app/src', 'admin/src', 'server/src', 'src', 'web/src', 'packages'].filter(d => fs.existsSync(path.join(root, d)))
    : [];
  const scope = onlyDirs.length ? onlyDirs : autoDirs;
  const files = scope.length
    ? scope.flatMap(d => { const p = path.resolve(root, d); return fs.existsSync(p) ? walk(p) : []; })
    : walk(root);
  const mode = scope.length ? 'dirs(' + scope.join(',') + ')' : 'all';
  const entries = [];
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    const symbols = [];
    lines.forEach((line, i) => {
      for (const { re, kind } of SYMBOL_PATTERNS) {
        const m = line.match(re);
        if (m) { symbols.push({ name: m[1], kind, line: i + 1 }); break; }
      }
    });
    const isVue = path.extname(file) === '.vue';
    if (isVue) {
      const compName = path.basename(file, '.vue').split(/[-_]/).map(s => s ? s[0].toUpperCase() + s.slice(1) : '').join('');
      symbols.unshift({ name: compName, kind: 'component', line: 1 });
      const tpl = text.match(/<template>([\s\S]*?)<\/template>/)?.[1] || '';
      const seen = new Set();
      for (const m of tpl.matchAll(/<([a-zA-Z][\w-]*)/g)) {
        const tag = m[1];
        if (UNI_TAGS.has(tag) || seen.has(tag)) continue;
        if (!tag.includes('-') && !/^[A-Z]/.test(tag)) continue;
        seen.add(tag);
        const line = text.slice(0, text.indexOf('<' + tag)).split(/\r?\n/).length;
        symbols.push({ name: tag, kind: 'component', line });
      }
    }
    const imports = [];
    for (const line of lines) {
      const stat = line.match(/^\s*(?:import|export)\b[^'"]*?from\s+['"]([^'"]+)['"]/);
      const req = line.match(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/);
      const dyn = line.match(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/);
      const m = stat || req || dyn;
      if (m) imports.push({ raw: m[1], resolved: resolveImport(m[1], file, aliases), dynamic: !!dyn && !stat && !req });
    }
    entries.push({ path: rel, bytes: Buffer.byteLength(text, 'utf8'), lines: lines.length, symbols: symbols.slice(0, 40), imports });
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  // 引用入度：被其他文件 import 的次数，用于 MAP 与 context 排序
  const refs = new Map();
  for (const e of entries) for (const i of e.imports) if (i.resolved) refs.set(i.resolved, (refs.get(i.resolved) || 0) + 1);
  for (const e of entries) e.refs = refs.get(e.path) || 0;

  fs.mkdirSync(outDir, { recursive: true });
  const index = { generatedAt: new Date().toISOString(), root, files: entries.length, aliases, routes: routeList, entries };
  fs.writeFileSync(path.join(outDir, 'repo.json'), JSON.stringify(index, null, 2), 'utf8');

  const ranked = [...entries].sort((a, b) => (b.refs || 0) - (a.refs || 0) || a.path.localeCompare(b.path));
  const L = ['# REPO MAP', '', `生成：${index.generatedAt} ｜ 文件：${entries.length} ｜ 路由：${routeList.length} ｜ 预算：${maxLines} 行 ｜ 排序：引用入度`, ''];
  for (const e of ranked) {
    const syms = e.symbols.map(s => s.name).slice(0, 8).join(', ');
    L.push(`- ${e.path} (${e.lines} 行, refs=${e.refs || 0})${syms ? ' — ' + syms : ''}`);
    if (L.length >= maxLines) { L.push('…（超出预算已截断，完整表见 repo.json）'); break; }
  }
  L.push('');
  if (routeList.length && L.length < maxLines) {
    L.push('## routes');
    for (const r of routeList.slice(0, 30)) L.push(`- ${r.route} → ${r.file} (${r.kind})`);
    L.push('');
  }
  fs.writeFileSync(path.join(outDir, 'MAP.md'), L.join('\n'), 'utf8');
  console.log(`INDEX files=${entries.length} routes=${routeList.length} mode=${mode} out=${path.relative(root, outDir) || '.'} mapLines=${Math.min(L.length, maxLines)}`);
}

function loadIndex() {
  const f = path.join(outDir, 'repo.json');
  if (!fs.existsSync(f)) { console.error('索引不存在，先跑 build: ' + f); process.exit(1); }
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}
function query() {
  const term = (getArg('term') || '').toLowerCase();
  if (!term) { console.error('缺少 --term'); process.exit(1); }
  const limit = Number(getArg('limit') || 20);
  const idx = loadIndex();
  const hits = [];
  for (const e of idx.entries) {
    if (e.path.toLowerCase().includes(term)) hits.push({ file: e.path, line: 0, what: 'path' });
    for (const s of e.symbols) if (s.name.toLowerCase().includes(term)) hits.push({ file: e.path, line: s.line, what: s.kind + ' ' + s.name });
  }
  for (const r of idx.routes || []) if (r.route.toLowerCase().includes(term)) hits.push({ file: r.file, line: 0, what: 'route ' + r.route });
  hits.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  if (!hits.length) { console.log('NO_HIT'); return; }
  for (const h of hits.slice(0, limit)) console.log(`${h.file}:${h.line}\t${h.what}`);
}
function related() {
  const target = (getArg('file') || '').split(path.sep).join('/');
  if (!target) { console.error('缺少 --file'); process.exit(1); }
  const idx = loadIndex();
  const known = idx.entries.some(e => e.path === target);
  if (!known) console.log('NOT_INDEXED ' + target);
  const dependents = idx.entries.filter(e => e.path !== target && e.imports.some(i => i.resolved === target));
  const dir = path.posix.dirname(target);
  const siblings = idx.entries.filter(e => e.path !== target && path.posix.dirname(e.path) === dir);
  console.log('RELATED ' + target);
  for (const d of dependents.slice(0, 20)) console.log('  dependent ' + d.path);
  for (const s of siblings.slice(0, 10)) console.log('  sibling   ' + s.path);
}
function route() {
  const p = (getArg('path') || '').replace(/\/$/, '');
  if (!p) { console.error('缺少 --path'); process.exit(1); }
  const idx = loadIndex();
  const hit = (idx.routes || []).find(r => r.route === p || r.route.replace(/^\//, '') === p.replace(/^\//, ''));
  if (!hit) { console.log('NO_ROUTE'); return; }
  console.log(`${hit.route} → ${hit.file} (${hit.kind})`);
}
function stats() {
  const idx = loadIndex();
  const byExt = {};
  for (const e of idx.entries) {
    const ext = path.posix.extname(e.path) || '(none)';
    byExt[ext] = (byExt[ext] || 0) + 1;
  }
  const importCount = {};
  for (const e of idx.entries) for (const i of e.imports) {
    const key = (i.resolved || i.raw).split('/').pop();
    importCount[key] = (importCount[key] || 0) + 1;
  }
  const top = Object.entries(importCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(JSON.stringify({ files: idx.entries.length, routes: (idx.routes || []).length, byExt, topImported: top }, null, 2));
}

function audit() {
  const idx = loadIndex();
  const prefixes = (idx.aliases || []).map(a => a.pattern.split('*')[0]).filter(Boolean);
  let internal = 0, resolved = 0, external = 0, symbols = 0;
  const unresolved = [];
  for (const e of idx.entries) {
    symbols += e.symbols.length;
    for (const imp of e.imports) {
      const isInternal = imp.raw.startsWith('.') || prefixes.some(p => imp.raw.startsWith(p));
      if (!isInternal) { external++; continue; }
      internal++;
      if (imp.resolved) resolved++; else unresolved.push(`${e.path} -> ${imp.raw}`);
    }
  }
  const missingRoutes = (idx.routes || []).filter(r => !fs.existsSync(path.join(root, r.file))).map(r => r.route);
  console.log(JSON.stringify({
    files: idx.entries.length,
    symbols,
    imports: { internal, resolved, unresolved: unresolved.length },
    external,
    routes: (idx.routes || []).length,
    missingRoutes,
    aliases: (idx.aliases || []).map(a => a.pattern + ' -> ' + a.target),
  }, null, 2));
  for (const u of unresolved.slice(0, 10)) console.log('UNRESOLVED ' + u);
}

function context() {
  const term = (getArg('term') || '').toLowerCase();
  if (!term) { console.error('缺少 --term'); process.exit(1); }
  const budget = Math.max(200, Number(getArg('budget') || 4000));
  const idx = loadIndex();
  const byPath = new Map(idx.entries.map(e => [e.path, e]));
  const hits = new Map();
  const bump = (file, score, line = 0) => {
    const cur = hits.get(file) || { file, score: 0, line: 0 };
    if (score > cur.score) { cur.score = score; cur.line = line; }
    hits.set(file, cur);
  };
  for (const e of idx.entries) {
    if (e.path.toLowerCase().includes(term)) bump(e.path, 2);
    for (const s of e.symbols) {
      const n = s.name.toLowerCase();
      if (n === term) bump(e.path, 6, s.line);
      else if (n.startsWith(term)) bump(e.path, 5, s.line);
      else if (n.includes(term)) bump(e.path, 3, s.line);
    }
  }
  for (const r of idx.routes || []) if (r.route.toLowerCase().includes(term)) bump(r.file, 2);

  // 依赖方：谁 import 了命中文件，补进上下文（低分），看得到真实用法
  const seeds = [...hits.values()].sort((a, b) => b.score - a.score).slice(0, 3).map(h => h.file);
  for (const e of idx.entries) {
    if (hits.has(e.path)) continue;
    if (e.imports.some(i => seeds.includes(i.resolved))) bump(e.path, 1);
  }

  const ranked = [...hits.values()]
    .map(h => ({ ...h, refs: byPath.get(h.file)?.refs || 0 }))
    .sort((a, b) => b.score - a.score || b.refs - a.refs || a.file.localeCompare(b.file))
    .slice(0, 8);
  if (!ranked.length) { console.log('NO_HIT'); return; }

  const parts = [`# CONTEXT term=${term} budget=${budget}`];
  let used = parts[0].length;
  let included = 0;
  for (const h of ranked) {
    let lines = [];
    try { lines = fs.readFileSync(path.join(root, h.file), 'utf8').split(/\r?\n/); } catch { continue; }
    const center = h.line > 0 ? h.line - 1 : 0;
    const start = Math.max(0, center - 5);
    const end = Math.min(lines.length, center + 6);
    const body = lines.slice(start, end).map((l, i) => `${start + i + 1}: ${l}`).join('\n');
    const block = `## ${h.file}:${h.line || 1} (refs=${h.refs})\n\`\`\`\n${body}\n\`\`\``;
    if (used + block.length + 1 > budget) {
      const room = budget - used - 40;
      if (room > 80) parts.push(block.slice(0, room).replace(/\s+$/, '') + `\n…（截断）完整见 ${h.file}`);
      break;
    }
    parts.push(block);
    used += block.length + 1;
    included++;
  }
  parts.push(`CTX files=${included} chars=${used}/${budget}`);
  console.log(parts.join('\n'));
}

if (cmd === 'build') build();
else if (cmd === 'query') query();
else if (cmd === 'context') context();
else if (cmd === 'related') related();
else if (cmd === 'route') route();
else if (cmd === 'stats') stats();
else if (cmd === 'audit') audit();
else { console.error('用法: build | query | context | related | route | stats | audit'); process.exit(1); }
