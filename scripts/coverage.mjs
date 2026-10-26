#!/usr/bin/env node
/**
 * 覆盖率基线（零依赖，不引入 c8/nyc）。
 * 用法：node scripts/coverage.mjs [--min <百分比>] [--keep] [--only run|eval]
 *
 * 做法：用 NODE_V8_COVERAGE=<临时目录> 跑单测与场景评测（子进程继承 env，
 * 脚本里的孙进程同样会被采集），再解析 V8 coverage JSON，对 scripts/**.mjs 计算行覆盖率。
 *
 * 判据：`--min` 高于实测值时 exit 1（反例自证不是空跑）；低于实测值时 exit 0。
 * 口径：行是否覆盖，取「包含该行首偏移的最内层区间」的 count ——
 *       只按最外层区间判会把整文件标绿（V8 顶层区间 count=1 覆盖全文），那是假绿。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };

const min = Number(getArg('min') || 0);
const keep = args.includes('--keep');
const only = getArg('only');
const node = process.execPath;

const covDir = fs.mkdtempSync(path.join(os.tmpdir(), 'awb-cov-'));
const env = { ...process.env, NODE_V8_COVERAGE: covDir };

const suites = [
  { id: 'run', script: path.join(root, 'tests', 'run.mjs') },
  { id: 'eval', script: path.join(root, 'tests', 'eval.mjs') },
].filter(s => !only || s.id === only);

let suiteFailed = false;
for (const s of suites) {
  const r = spawnSync(node, [s.script], { cwd: root, env, encoding: 'utf8' });
  const tail = (r.stdout || '').trim().split('\n').slice(-1)[0] || '';
  console.log(`SUITE ${s.id} exit=${r.status ?? 'null'} | ${tail}`);
  if (r.status !== 0) {
    suiteFailed = true;
    console.log('覆盖率采集时套件失败，先修套件再看覆盖率：');
    console.log((r.stdout || '').split('\n').filter(l => l.startsWith('FAIL')).slice(0, 10).join('\n'));
  }
}
if (suiteFailed) {
  cleanup();
  process.exit(1);
}

/** 本仓库 scripts/ 下的脚本源文件 */
const targets = fs.readdirSync(path.join(root, 'scripts'))
  .filter(f => f.endsWith('.mjs'))
  .map(f => path.join(root, 'scripts', f));
const targetSet = new Set(targets.map(f => path.resolve(f)));

/** 行首偏移表（用于把 V8 的字符偏移换算成行号） */
const lineStarts = text => {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return starts;
};

/** 收集每个文件的全部覆盖区间（含 count=0 的「未执行」子区间） */
const rangesByFile = new Map();
for (const f of targets) rangesByFile.set(path.resolve(f), []);

const files = fs.readdirSync(covDir).filter(f => f.endsWith('.json'));
for (const name of files) {
  let data;
  try { data = JSON.parse(fs.readFileSync(path.join(covDir, name), 'utf8')); } catch { continue; }
  for (const entry of data.result || []) {
    const url = entry.url || '';
    if (!url.startsWith('file://')) continue;
    let abs;
    try { abs = path.resolve(fileURLToPath(url)); } catch { continue; }
    if (!targetSet.has(abs)) continue;
    const bucket = rangesByFile.get(abs);
    for (const fn of entry.functions || []) {
      for (const r of fn.ranges || []) bucket.push({ start: r.startOffset, end: r.endOffset, count: r.count });
    }
  }
}

/** 行是否被覆盖：取包含该偏移的最内层区间（区间最短者）的 count */
const isOffsetCovered = (ranges, offset) => {
  let best = null;
  for (const r of ranges) {
    if (offset < r.start || offset > r.end) continue;
    if (!best || (r.end - r.start) < (best.end - best.start)) best = r;
  }
  return Boolean(best && best.count > 0);
};

let totalLines = 0, totalCovered = 0;
const rows = [];
for (const f of targets) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  const starts = lineStarts(text);
  const ranges = rangesByFile.get(path.resolve(f)) || [];
  let lines_ = 0, cov = 0;
  // 只统计「可执行倾向」的行：去掉空行与纯注释行，避免注释稀释覆盖率口径
  let inBlockComment = false;
  lines.forEach((line, i) => {
    const t = line.trim();
    if (inBlockComment) { if (t.includes('*/')) inBlockComment = false; return; }
    if (t.startsWith('/*')) { if (!t.includes('*/')) inBlockComment = true; return; }
    if (!t || t.startsWith('//')) return;
    lines_++;
    if (isOffsetCovered(ranges, starts[i] ?? 0)) cov++;
  });
  totalLines += lines_;
  totalCovered += cov;
  rows.push({ file: path.relative(root, f).split(path.sep).join('/'), lines: lines_, cov, pct: lines_ ? Math.round((cov / lines_) * 1000) / 10 : 100 });
}

rows.sort((a, b) => a.pct - b.pct);
for (const r of rows) console.log(`COV ${String(r.pct).padStart(5)}%  ${r.file}  (${r.cov}/${r.lines})`);
const totalPct = totalLines ? Math.round((totalCovered / totalLines) * 1000) / 10 : 100;
console.log(`COVERAGE total=${totalPct}% files=${rows.length} lines=${totalCovered}/${totalLines}`);
let exitCode = 0;
if (min && totalPct < min) {
  console.log(`COVERAGE_BELOW_MIN total=${totalPct} < min=${min}`);
  exitCode = 1;
} else if (min) {
  console.log(`COVERAGE_OK total=${totalPct} >= min=${min}`);
}
cleanup();
process.exitCode = exitCode;

function cleanup() {
  if (keep) { console.log('保留覆盖率原始数据：' + covDir); return; }
  try { fs.rmSync(covDir, { recursive: true, force: true }); } catch { /* 清理失败不影响结论 */ }
}
