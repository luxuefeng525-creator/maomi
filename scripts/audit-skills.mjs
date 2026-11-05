#!/usr/bin/env node
// 发布前技能审计：批量跑 validate-skill，汇总 PASS/FAIL。任一失败 exit 1。
// 用法：node scripts/audit-skills.mjs [--dir skills] [--json]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const root = path.resolve(opt('--dir', path.join(here, '..', 'skills')));
const asJson = argv.includes('--json');

const skills = fs.readdirSync(root, { withFileTypes: true })
  .filter(e => e.isDirectory() && fs.existsSync(path.join(root, e.name, 'SKILL.md')))
  .map(e => e.name).sort();

const results = [];
for (const s of skills) {
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [path.join(here, 'validate-skill.mjs'), path.join(root, s)],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    code = e.status || 1;
    out = (e.stdout || '').toString();
  }
  results.push({ skill: s, ok: code === 0, fails: out.split('\n').filter(l => l.startsWith('FAIL ')) });
}

const pass = results.filter(r => r.ok).length;
const fail = results.length - pass;
if (asJson) {
  console.log(JSON.stringify({ total: results.length, pass, fail, results }, null, 2));
} else {
  for (const r of results) if (!r.ok) console.log(`FAIL ${r.skill}: ${r.fails.join(' | ')}`);
  console.log(`SKILL AUDIT total=${results.length} pass=${pass} fail=${fail}`);
}
process.exit(fail ? 1 : 0);
