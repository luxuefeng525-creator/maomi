#!/usr/bin/env node
// 仓库地图：给模型「目录 + 顶层符号」的有界摘要，替代整份读文件（省上下文 + 提准确度）。
// 对标 Aider repo-map / Cursor 代码库索引的轻量替代：不建向量库、不联网、零依赖。
// 用法：
//   node scripts/context.mjs                    # 当前目录，默认预算 4000 字符
//   node scripts/context.mjs --dir /abs/repo
//   node scripts/context.mjs --focus auth          # 只列路径/符号命中关键词的文件
//   node scripts/context.mjs --budget 8000 --max-files 300
//   node scripts/context.mjs --json
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
function opt(n, d) { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; }
const asJson = argv.includes('--json');
const ROOT = path.resolve(opt('--dir', process.cwd()));
const BUDGET = Math.max(800, Number(opt('--budget', '4000')) || 4000);
const MAX_FILES = Math.max(20, Number(opt('--max-files', '400')) || 400);
const FOCUS = (opt('--focus', '') || '').trim().toLowerCase();

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'out', '.next', '.nuxt', 'coverage',
  'vendor', '__pycache__', '.venv', 'venv', 'target', '.idea', '.vscode', '.turbo', '.cache', 'eval-results']);
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.pdf', '.zip', '.gz',
  '.mp4', '.mp3', '.woff', '.woff2', '.ttf', '.eot', '.lock', '.map', '.min.js', '.min.css']);
const SRC_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.vue', '.svelte', '.py', '.go',
  '.java', '.kt', '.rs', '.rb', '.php', '.cs', '.swift', '.scala', '.sh']);

function isSrc(name) {
  if (SKIP_EXT.has(path.extname(name).toLowerCase())) return false;
  if (name.endsWith('.min.js') || name.endsWith('.min.css')) return false;
  return SRC_EXT.has(path.extname(name).toLowerCase());
}

function walk(dir, acc) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith('.') && e.name !== '.github') continue;
      walk(path.join(dir, e.name), acc);
    } else if (e.isFile() && isSrc(e.name)) {
      acc.push(path.join(dir, e.name));
      if (acc.length >= MAX_FILES) return acc;
    }
  }
  return acc;
}

const RES = {
  js: /^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm,
  py: /^\s*(?:def|class)\s+([A-Za-z_]\w*)/gm,
  go: /^(?:func|type)\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/gm,
  java: /(?:class|interface|enum|record)\s+([A-Za-z_]\w*)/g,
  rs: /^\s*(?:pub\s+)?(?:fn|struct|enum|trait|impl)\s+([A-Za-z_]\w*)/gm,
  rb: /^\s*(?:def|class|module)\s+([A-Za-z_]\w*)/gm,
  php: /(?:function|class)\s+([A-Za-z_]\w*)/g,
  cs: /(?:class|interface|struct|enum)\s+([A-Za-z_]\w*)/g,
};
function symbolsOf(file, text) {
  const ext = path.extname(file).toLowerCase();
  let re = RES.js;
  if (ext === '.py') re = RES.py;
  else if (ext === '.go') re = RES.go;
  else if (ext === '.java' || ext === '.kt') re = RES.java;
  else if (ext === '.rs') re = RES.rs;
  else if (ext === '.rb') re = RES.rb;
  else if (ext === '.php') re = RES.php;
  else if (ext === '.cs') re = RES.cs;
  const out = [];
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(text)) && out.length < 12) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

const files = walk(ROOT, []).sort();
let rows = [];
for (const f of files) {
  let text = '';
  try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const lines = text.split('\n').length;
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  const syms = symbolsOf(f, text);
  rows.push({ path: rel, lines, symbols: syms });
}

if (FOCUS) {
  rows = rows.filter(r => r.path.toLowerCase().includes(FOCUS) || r.symbols.some(s => s.toLowerCase().includes(FOCUS)));
  if (!rows.length) { console.log(`# repo map · 0 匹配 "${FOCUS}"（用 Grep 定位或去掉 --focus）`); process.exit(0); }
}

if (asJson) {
  console.log(JSON.stringify({ root: ROOT, files: rows.length, budget: BUDGET, focus: FOCUS || null, rows }, null, 2));
  process.exit(0);
}

// 有界输出：先目录概况，再逐文件（超预算即截断并提示）
let out = `# repo map · ${rows.length} 源文件${FOCUS ? ` · focus="${FOCUS}"` : ''} · root=${path.basename(ROOT)}\n`;
const used = [];
for (const r of rows) {
  const sym = r.symbols.length ? ' :: ' + r.symbols.join(', ') : '';
  const line = `${r.path} (${r.lines})${sym}\n`;
  if (out.length + line.length > BUDGET) {
    const rest = rows.length - used.length;
    out += `… 余 ${rest} 个文件未列出（用 --budget 提高，或 Grep 定位后定点读）\n`;
    break;
  }
  out += line;
  used.push(r.path);
}
console.log(out.trimEnd());
