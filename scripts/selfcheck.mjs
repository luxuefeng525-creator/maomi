#!/usr/bin/env node
/**
 * Agent 自检：一次跑完注册表、结构门禁、单元测试、Hook 配置，输出 PASS/FAIL 汇总。
 * 用法：node scripts/selfcheck.mjs [--cwd <项目目录>] [--with-eval]
 * 退出码：全部通过 0，否则 1。--with-eval 会再跑场景评测（不要在评测里递归调用）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const cwd = path.resolve(getArg('cwd') || process.cwd());
const withEval = args.includes('--with-eval');
const noHook = args.includes('--no-hook');

const checks = [];
const run = (name, script, argv = []) => {
  const r = spawnSync(process.execPath, [path.join(root, script), ...argv], { cwd: root, encoding: 'utf8', timeout: 240000 });
  const ok = r.status === 0;
  checks.push({ name, ok, tail: (r.stdout || r.stderr || '').trim().split('\n').slice(-1)[0] || '' });
};

run('registry', 'scripts/index-skills.mjs', ['--check']);
run('validate', 'scripts/validate.mjs');
run('unit', 'tests/run.mjs');
if (withEval) run('eval', 'tests/eval.mjs');

// Hook 配置检查：文件合法 + 命令指向的脚本存在
const hooksFile = path.join(cwd, '.trae', 'hooks.json');
let hookOk = false;
let hookDetail = '无 hooks.json（未安装）';
if (noHook) { hookOk = true; hookDetail = 'SKIP（--no-hook）'; }
else if (fs.existsSync(hooksFile)) {
  try {
    const h = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
    const groups = h?.hooks?.SessionStart || [];
    const cmd = groups.flatMap(g => (g.hooks || []).map(x => x.command)).find(c => String(c).includes('session-start.mjs'));
    if (!cmd) hookDetail = 'hooks.json 存在但无 SessionStart';
    else {
      const target = String(cmd).match(/"([^"]+session-start\.mjs)"/)?.[1];
      hookOk = !!target && fs.existsSync(target);
      hookDetail = hookOk ? 'SessionStart -> 脚本存在' : '命令指向的脚本不存在';
    }
  } catch (e) { hookDetail = 'hooks.json 非法: ' + e.message; }
}
checks.push({ name: 'hook', ok: hookOk, tail: hookDetail });

for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} | ${c.tail}`);
const pass = checks.filter(c => c.ok).length;
console.log('---');
console.log(`SUMMARY checks=${checks.length} pass=${pass} fail=${checks.length - pass}`);
if (pass !== checks.length) process.exitCode = 1;
