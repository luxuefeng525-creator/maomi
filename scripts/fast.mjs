#!/usr/bin/env node
// 一轮一次：合并 自举+定档+记忆+路由 到单个进程，只输出 4 行结论（省上下文 = 更快）。
// 用法：node scripts/fast.mjs "<用户需求一句话>"
// 目的：L1/L2 不再分别跑 start/classify/memory/route 四个脚本（4 次工具调用 + 4 段输出）。
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const req = process.argv.slice(2).join(' ').trim();

function run(name, args = []) {
  try {
    return execFileSync(process.execPath, [path.join(dir, name), ...args], {
      encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true
    }).trim();
  } catch (e) {
    return ((e.stdout || '') + '').trim();
  }
}

const startRaw = run('start.mjs');
const start = startRaw.split('\n').filter(l => /^(VERSION|LEDGER|NEXT)/.test(l)).join(' | ') || 'VERSION ?';

let tier = 'TIER ?';
if (req) {
  const c = run('classify.mjs', [req]).split('\n').find(l => /TIER=|\[档位\]/.test(l));
  if (c) tier = c.trim();
}

let mem = 'SKIP';
if (req) {
  const m = run('memory.mjs', ['search', req]).split('\n').filter(l => l && !/^NONE$/.test(l.trim())).slice(0, 2);
  mem = m.length ? m.join(' / ') : 'NONE';
}

let route = 'SKIP';
if (req) {
  const r = run('route.mjs', [req]).split('\n').find(l => /^\s*\d+\.\s+\S+/.test(l));
  route = r ? r.trim() : 'ROUTE_NONE';
}

console.log(start);
console.log(tier);
console.log('MEM ' + mem);
console.log('ROUTE ' + route);
