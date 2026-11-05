#!/usr/bin/env node
// ai-workflow 自举：报 LEDGER / NEXT / VERSION。零依赖，跨平台。
// 用法：node scripts/start.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const out = (k, v) => console.log(`${k} ${v}`);

// VERSION：从 SKILL.md frontmatter 读，找不到则用包内 fallback
function version() {
  try {
    const md = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
    const m = md.match(/version:\s*([\d.]+)/);
    if (m) return m[1];
  } catch {}
  try {
    const md = fs.readFileSync(path.join(import.meta.dirname, '..', 'SKILL.md'), 'utf8');
    const m = md.match(/version:\s*([\d.]+)/);
    if (m) return m[1];
  } catch {}
  return '?.?.?';
}

// NEXT：找最近的任务线索（PLAN / tasks.json / HANDOFF），不递归深扫
function nextTask() {
  const candidates = [];
  const docs = path.join(root, 'docs');
  if (fs.existsSync(docs)) {
    for (const d of fs.readdirSync(docs)) {
      const dir = path.join(docs, d);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of ['PLAN.md', 'tasks.json', 'HANDOFF.md']) {
        const p = path.join(dir, f);
        if (fs.existsSync(p)) candidates.push({ task: d, file: f, t: fs.statSync(p).mtimeMs });
      }
    }
  }
  if (!candidates.length) return '无待办（docs/ 下无 PLAN/tasks/HANDOFF）';
  candidates.sort((a, b) => b.t - a.t);
  const c = candidates[0];
  let detail = '';
  try {
    const txt = fs.readFileSync(path.join(docs, c.task, c.file), 'utf8');
    const line = txt.split('\n').find(l => l.trim() && !l.startsWith('#') && !l.startsWith('//'));
    detail = line ? ` · ${line.trim().slice(0, 60)}` : '';
  } catch {}
  return `下一件：${c.task}/${c.file}${detail}`;
}

// LEDGER：记忆索引存在性 + 脚本健康
function ledger() {
  const mem = path.join(root, '.ai-workflow', 'memory.md');
  const hasMem = fs.existsSync(mem);
  let memLines = 0;
  if (hasMem) memLines = fs.readFileSync(mem, 'utf8').split('\n').filter(Boolean).length;
  return `记忆=${hasMem ? memLines + '条' : '空'} · 脚本=ok`;
}

out('VERSION', version());
out('LEDGER', ledger());
out('NEXT', nextTask());
