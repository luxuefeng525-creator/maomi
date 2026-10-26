#!/usr/bin/env node
/**
 * 项目记忆工具：追加、检索、查重、失效。
 * 文件为真源，索引可重建；只追加不改写历史。
 *
 * 用法：
 *   node memory.mjs init   --root <记忆根目录>
 *   node memory.mjs append --root <记忆根目录> --type decision|pitfall|fact|open --text "..." [--evidence "路径"] [--impact "..."] [--dry-run]
 *   node memory.mjs search --root <记忆根目录> --query "关键词 关键词" [--limit 10] [--days 30]
 *   node memory.mjs report --root <记忆根目录> [--threshold 0.85]
 *   node memory.mjs invalidate --root <记忆根目录> --id <目标条目ID> --reason "..."
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TYPES = ['decision', 'pitfall', 'fact', 'open'];
const HEADING = '## 记忆条目（自动追加）';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

function normalize(s) {
  return String(s).toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, '');
}

function bigrams(s) {
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

function jaccard(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function id8(text) {
  return crypto.createHash('sha256').update(normalize(text)).digest('hex').slice(0, 8);
}

function stamp(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return {
    day: `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
  };
}

function ensureRoot(root) {
  if (!root || root === true) {
    console.error('缺少 --root（记忆根目录）。禁止猜路径写入。');
    process.exit(1);
  }
  if (!fs.existsSync(root)) {
    console.error('记忆根目录不存在: ' + root);
    process.exit(1);
  }
}

function todayFile(root) {
  const { day } = stamp();
  return path.join(root, day, 'topics.md');
}

function listFiles(root) {
  const files = [];
  const idx = path.join(root, 'project_memory.md');
  if (fs.existsSync(idx)) files.push(idx);
  const vol = path.join(root, 'volumes');
  if (fs.existsSync(vol)) {
    for (const f of fs.readdirSync(vol)) if (f.endsWith('.md')) files.push(path.join(vol, f));
  }
  const dayDirs = fs.readdirSync(root).filter(d => /^\d{8}$/.test(d) && fs.statSync(path.join(root, d)).isDirectory()).sort().reverse();
  for (const d of dayDirs) {
    for (const f of fs.readdirSync(path.join(root, d))) if (f.endsWith('.md')) files.push(path.join(root, d, f));
  }
  return files;
}

function readLines(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/);
}

function cmdInit(args) {
  if (!args.root || args.root === true) { console.error('缺少 --root（记忆根目录）'); process.exit(1); }
  const root = path.resolve(args.root);
  fs.mkdirSync(path.join(root, 'volumes'), { recursive: true });
  const idx = path.join(root, 'project_memory.md');
  if (!fs.existsSync(idx)) {
    fs.writeFileSync(idx, [
      '# 项目记忆索引',
      '',
      '> 索引 ≤200 行；细节进 volumes/；日期日志由 memory.mjs 追加。',
      '',
      '## 硬规则',
      '',
      '- 待填：不可违反的项目约束。',
      '',
      '## 分卷导航',
      '',
      '| 关键词 | 文件 |',
      '| --- | --- |',
      '| 待填 | volumes/example.md |',
      '',
    ].join('\n'), 'utf8');
  }
  console.log('INIT root=' + root);
}

function cmdAppend(args) {
  ensureRoot(args.root);
  const type = args.type;
  const text = args.text;
  if (!TYPES.includes(type)) { console.error('--type 必须是 ' + TYPES.join('/')); process.exit(1); }
  if (!text || text === true) { console.error('缺少 --text'); process.exit(1); }

  const { date, time } = stamp();
  const id = id8(text);
  const file = todayFile(args.root);
  const existing = fs.existsSync(file) ? readLines(file) : [];
  const dup = existing.find(l => l.includes('id: ' + id));
  if (dup) { console.log('SKIP 已存在 id=' + id); return; }

  const line = `- [${type}] ${date} ${time} | ${text.trim()} | 证据: ${args.evidence && args.evidence !== true ? args.evidence : '未填'} | 影响: ${args.impact && args.impact !== true ? args.impact : '未填'} | id: ${id} | status: active`;
  if (args['dry-run']) { console.log('DRY-RUN ' + line); return; }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = existing.length ? existing : [];
  if (!body.includes(HEADING)) {
    if (body.length && body[body.length - 1].trim() !== '') body.push('');
    body.push(HEADING, '');
  }
  body.push(line);
  fs.writeFileSync(file, body.join('\n') + '\n', 'utf8');
  console.log('APPEND id=' + id + ' file=' + file);
}

function collectInvalid(files) {
  const set = new Set();
  for (const f of files) {
    for (const line of readLines(f)) {
      const m = line.match(/目标 id: ([0-9a-f]{8})/);
      if (m) set.add(m[1]);
    }
  }
  return set;
}

function cmdSearch(args) {
  ensureRoot(args.root);
  const q = args.query;
  if (!q || q === true) { console.error('缺少 --query'); process.exit(1); }
  const limit = Number(args.limit || 10);
  const days = Number(args.days || 30);
  const tokens = String(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) { console.error('查询词为空'); process.exit(1); }

  const files = listFiles(args.root).filter(f => {
    const m = f.match(/(\d{8})[\\/]/);
    if (!m) return true;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return m[1] >= stamp(cutoff).day;
  });

  const hits = [];
  const invalidIds = collectInvalid(files);
  for (const file of files) {
    const lines = readLines(file);
    lines.forEach((line, i) => {
      const n = normalize(line);
      if (!n) return;
      let score = 0;
      for (const t of tokens) {
        const nt = normalize(t);
        if (!nt) continue;
        if (n.includes(nt)) score += 3 + Math.min(2, Math.floor(n.split(nt).length - 1));
      }
      if (!score) return;
      const lb = bigrams(n);
      for (const t of tokens) score += Math.round(jaccard(lb, bigrams(normalize(t))) * 4);
      const lid = line.match(/id: ([0-9a-f]{8})/)?.[1];
      if (score > 0) hits.push({ file, line: i + 1, score, text: line.trim(), invalid: line.startsWith('- [invalid]') || (lid && invalidIds.has(lid)) });
    });
  }
  hits.sort((a, b) => b.score - a.score);
  if (!hits.length) { console.log('NO_HIT'); return; }
  for (const h of hits.slice(0, limit)) {
    console.log(`${h.score}\t${h.invalid ? '[失效] ' : ''}${h.file}:${h.line}\t${h.text.slice(0, 160)}`);
  }
}

function cmdReport(args) {
  ensureRoot(args.root);
  const threshold = Number(args.threshold || 0.85);
  const files = listFiles(args.root);
  const invalidIds = collectInvalid(files);
  const entries = [];
  for (const file of files) {
    readLines(file).forEach((line, i) => {
      if (!/^- \[(decision|pitfall|fact|open)\]/.test(line)) return;
      const lid = line.match(/id: ([0-9a-f]{8})/)?.[1];
      if (lid && invalidIds.has(lid)) return;
      const text = line.split('|')[1]?.trim() || line;
      entries.push({ file, line: i + 1, text, n: normalize(text), b: bigrams(normalize(text)) });
    });
  }
  let pairs = 0;
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const s = jaccard(entries[i].b, entries[j].b);
      if (s >= threshold) {
        pairs++;
        console.log(s.toFixed(2) + '\t' + entries[i].file + ':' + entries[i].line + '\t' + entries[j].file + ':' + entries[j].line + '\t' + entries[i].text.slice(0, 80));
      }
    }
  }
  console.log('---');
  console.log('条目=' + entries.length + ' 疑似重复=' + pairs + ' 阈值=' + threshold);
}

function cmdInvalidate(args) {
  ensureRoot(args.root);
  const target = args.id;
  const reason = args.reason;
  if (!target || target === true) { console.error('缺少 --id'); process.exit(1); }
  if (!reason || reason === true) { console.error('缺少 --reason'); process.exit(1); }
  const found = listFiles(args.root).some(f => readLines(f).some(l => l.includes('id: ' + target)));
  if (!found) { console.error('目标 id 不存在: ' + target); process.exit(1); }
  const { date, time } = stamp();
  const id = id8('invalid' + target + reason + date);
  const file = todayFile(args.root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = fs.existsSync(file) ? readLines(file) : [];
  if (!body.includes(HEADING)) { if (body.length && body[body.length - 1].trim() !== '') body.push(''); body.push(HEADING, ''); }
  body.push(`- [invalid] ${date} ${time} | 目标 id: ${target} | 原因: ${reason} | 证据: 未填 | 影响: 未填 | id: ${id} | status: active`);
  fs.writeFileSync(file, body.join('\n') + '\n', 'utf8');
  console.log('INVALIDATE target=' + target + ' id=' + id);
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];
if (cmd === 'init') cmdInit(args);
else if (cmd === 'append') cmdAppend(args);
else if (cmd === 'search') cmdSearch(args);
else if (cmd === 'report') cmdReport(args);
else if (cmd === 'invalidate') cmdInvalidate(args);
else {
  console.error('用法: init | append | search | report | invalidate（详见文件头注释）');
  process.exit(1);
}
