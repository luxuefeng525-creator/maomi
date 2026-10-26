#!/usr/bin/env node
/**
 * 判分式自测：每个场景 = 输入 + 命令 + 期望产物，输出 pass / partial / fail / infra_fail。
 * 用法：node tests/eval.mjs [--only id]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(testsDir, 'eval', 'scenarios.json'), 'utf8'));
const tmpBase = path.join(testsDir, '.eval');
const only = (() => { const i = process.argv.indexOf('--only'); return i >= 0 ? process.argv[i + 1] : null; })();

fs.rmSync(tmpBase, { recursive: true, force: true });
fs.mkdirSync(tmpBase, { recursive: true });

const results = [];
for (const sc of cfg.scenarios) {
  if (only && sc.id !== only) continue;
  const dir = path.join(tmpBase, sc.id);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of sc.setup || []) {
    const p = path.join(dir, f.path);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, f.content, 'utf8');
  }
  const detail = [];
  let status = 'pass';
  for (const st of sc.steps) {
    const script = path.join(root, st.script);
    const r = spawnSync(process.execPath, [script, ...(st.args || [])], { cwd: dir, encoding: 'utf8', timeout: st.timeout || 20000 });
    const out = (r.stdout || '') + (r.stderr || '');
    if (r.error || r.status === null) { status = 'infra_fail'; detail.push(`infra: ${r.error?.message || 'timeout'}`); break; }
    const exitOk = r.status === (st.expectExit ?? 0);
    const miss = (st.stdout || []).filter(s => !out.includes(s));
    if (!exitOk) { status = 'fail'; detail.push(`${path.basename(st.script)} exit=${r.status} 期望 ${st.expectExit ?? 0}`); }
    else if (miss.length) { if (status === 'pass') status = 'partial'; detail.push(`缺输出: ${miss.join(' , ')}`); }
  }
  results.push({ id: sc.id, status, detail });
  fs.rmSync(dir, { recursive: true, force: true });
}
fs.rmSync(tmpBase, { recursive: true, force: true });

const summary = results.reduce((m, r) => { m[r.status] = (m[r.status] || 0) + 1; return m; }, {});
for (const r of results) console.log(`${r.status.toUpperCase().padEnd(10)} ${r.id}${r.detail.length ? ' | ' + r.detail.join(' ; ') : ''}`);
console.log('---');
console.log('S:' + JSON.stringify(summary));
if (summary.fail || summary.infra_fail) process.exitCode = 1;
