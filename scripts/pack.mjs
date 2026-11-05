#!/usr/bin/env node
// ai-workflow 可重复打包器：生成自包含分发 zip。
// 默认排除「工作产物」：.git / node_modules / 输出 zip / .env* / .ai-workflow/ / HANDOFF.md / eval-results/
//   —— 这些与 .gitignore 一致，属于会话账本与可再生的评测数据，不该随分发件下发。
// 需要连工作产物一起打（内部留档）时加 --with-work。
// 纯 Node 零依赖：内置 store（不压缩）ZIP 写入，跨平台可用，不依赖本机 zip/python。
// 用法：
//   node scripts/pack.mjs                  # 写到包根 ai-workflow-v<version>.zip
//   node scripts/pack.mjs --version 3.1.0   # 指定版本号
//   node scripts/pack.mjs --out /tmp/x.zip  # 指定输出路径
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
function opt(n, d) { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; }

// 版本号：优先 --version，否则读 SKILL.md 的 version: 字段
let VERSION = opt('--version', null);
if (!VERSION) {
  const sk = fs.readFileSync(path.join(pkgRoot, 'SKILL.md'), 'utf8');
  const m = sk.match(/^version:\s*([\d.]+)/m);
  VERSION = m ? m[1] : '0.0.0';
}
const outArg = opt('--out', null);
const OUT = outArg || path.join(pkgRoot, `ai-workflow-v${VERSION}.zip`);

// 排除清单：仓库历史 / 依赖 / 系统文件 / 工作产物（默认排除，--with-work 打开）
const WITH_WORK = argv.includes('--with-work');
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', '.DS_Store']);
const EXCLUDE_TOP = new Set(['.git', 'node_modules']);
const WORK_DIRS = new Set(['.ai-workflow', 'eval-results']);
const WORK_FILES = new Set(['HANDOFF.md']);
function excluded(name, rel) {
  if (rel === OUT || path.resolve(pkgRoot, rel) === path.resolve(OUT)) return true;
  if (/\.zip$/i.test(name)) return true;
  if (/^\.env/.test(name)) return true;
  if (!WITH_WORK && WORK_FILES.has(rel)) return true;
  return false;
}

// ---- CRC32 ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const skipped = [];
function walk(dir, base, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const rel = path.relative(pkgRoot, p).split(path.sep).join('/');
    if (e.name === '.git' || EXCLUDE_DIRS.has(e.name)) continue;
    if (e.isDirectory() && !WITH_WORK && WORK_DIRS.has(e.name)) { skipped.push(rel + '/'); continue; }
    if (e.isDirectory()) { if (!EXCLUDE_TOP.has(e.name)) walk(p, base, acc); }
    else if (e.isFile() && !excluded(e.name, rel)) acc.push(rel);
  }
  return acc;
}

const files = walk(pkgRoot, pkgRoot, []).sort();
const localParts = [];
const central = [];
let offset = 0;
for (const rel of files) {
  const data = fs.readFileSync(path.join(pkgRoot, rel));
  const nameBuf = Buffer.from('ai-workflow/' + rel, 'utf8');
  const crc = crc32(data);
  const size = data.length;
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);       // version needed
  local.writeUInt16LE(0, 6);        // flags
  local.writeUInt16LE(0, 8);        // method 0 = store
  local.writeUInt16LE(0, 10);       // mod time
  local.writeUInt16LE(0, 12);       // mod date
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(size, 18);    // compressed = uncompressed (store)
  local.writeUInt32LE(size, 22);    // uncompressed
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);
  localParts.push(local, nameBuf, data);
  const cen = Buffer.alloc(46);
  cen.writeUInt32LE(0x02014b50, 0);
  cen.writeUInt16LE(20, 4);         // version made by
  cen.writeUInt16LE(20, 6);         // version needed
  cen.writeUInt16LE(0, 8);
  cen.writeUInt16LE(0, 10);
  cen.writeUInt16LE(0, 12);
  cen.writeUInt16LE(0, 14);
  cen.writeUInt32LE(crc, 16);
  cen.writeUInt32LE(size, 20);
  cen.writeUInt32LE(size, 24);
  cen.writeUInt16LE(nameBuf.length, 28);
  cen.writeUInt16LE(0, 30);
  cen.writeUInt16LE(0, 32);
  cen.writeUInt16LE(0, 34);
  cen.writeUInt16LE(0, 36);
  cen.writeUInt32LE(0, 38);
  cen.writeUInt32LE(offset, 42);
  central.push(cen, nameBuf);
  offset += local.length + nameBuf.length + data.length;
}
const localBuf = Buffer.concat(localParts);
const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([localBuf, centralBuf, end]));

const bytes = fs.statSync(OUT).size;
const hasGit = files.some(f => f.startsWith('.git/'));
console.log(`PACK ${OUT}`);
console.log(`FILES=${files.length} BYTES=${bytes} VERSION=${VERSION} GIT_EXCLUDED=${hasGit ? 'NO!' : 'yes'}`);
if (skipped.length) console.log(`WORK_EXCLUDED=${WITH_WORK ? 'no (--with-work)' : skipped.join(',')}`);
if (hasGit) { console.error('FAIL: .git leaked into zip'); process.exit(1); }
console.log('OK');
