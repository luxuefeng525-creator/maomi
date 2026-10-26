#!/usr/bin/env node
/**
 * Hook 配置检查：SessionStart 与 Stop 的结构、命令目标、真实执行。
 * 用法：node scripts/check-hook.mjs [--cwd <项目>] [--hooks <hooks.json>] [--no-run] [--json]
 * 退出码：全部通过 0，否则 1。只读，不写文件。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const cwd = path.resolve(getArg('cwd') || process.cwd());
const file = path.resolve(getArg('hooks') || path.join(cwd, '.trae', 'hooks.json'));
const runIt = !args.includes('--no-run');
const asJson = args.includes('--json');

const checks = [];
const add = (ok, name, detail = '') => checks.push({ ok, name, detail });

if (!fs.existsSync(file)) {
  add(false, '文件存在', file);
} else {
  add(true, '文件存在', file);
  let cfg = null;
  try { cfg = JSON.parse(fs.readFileSync(file, 'utf8')); add(true, 'JSON 合法'); }
  catch (e) { add(false, 'JSON 合法', e.message); }

  if (cfg) {
    add(cfg.version === 1, 'version=1', String(cfg.version));
    for (const event of ['SessionStart', 'PreToolUse', 'Stop']) {
      const groups = cfg?.hooks?.[event];
      add(Array.isArray(groups) && groups.length > 0, event + ' 存在', Array.isArray(groups) ? `组=${groups.length}` : typeof groups);
      for (const [i, g] of (groups || []).entries()) {
        if (event === 'Stop' && g.loop_limit !== undefined) {
          add(typeof g.loop_limit === 'number' && g.loop_limit > 0, `Stop 组${i + 1} loop_limit`, String(g.loop_limit));
        }
        for (const [j, h] of (g.hooks || []).entries()) {
          add(h.type === 'command', `${event} 组${i + 1} hook${j + 1} type`, String(h.type));
          add(typeof h.command === 'string' && h.command.trim().length > 0, `${event} 组${i + 1} hook${j + 1} command`, h.command || '');
          if (h.timeout !== undefined) add(typeof h.timeout === 'number' && h.timeout > 0, `${event} 组${i + 1} timeout`, String(h.timeout));

          if (typeof h.command === 'string') {
            const quoted = [...h.command.matchAll(/"([^"]+)"/g)].map(m => m[1]);
            const nodePath = quoted.find(s => /node(\.exe)?$/i.test(s));
            const scriptPath = quoted.find(s => /\.mjs$/i.test(s));
            if (nodePath) add(fs.existsSync(nodePath), event + ' node 路径', nodePath);
            add(!!scriptPath && fs.existsSync(scriptPath), event + ' 脚本路径', scriptPath || '命令里没有 .mjs 路径');
            if (runIt && scriptPath && fs.existsSync(scriptPath)) {
              const r = spawnSync(nodePath && fs.existsSync(nodePath) ? nodePath : process.execPath, [scriptPath, '--cwd', cwd], {
                cwd, encoding: 'utf8', timeout: 20000,
                input: JSON.stringify({ session_id: 'check-hook', cwd, hook_event_name: event, source: 'check', stop_hook_active: false, loop_count: 0 }),
              });
              const out = (r.stdout || '') + (r.stderr || '');
              add(r.status === 0, event + ' 命令可执行', 'exit=' + r.status);
              add(/\[SESSION\]|LEDGER|CONFIG|"continue"|"decision"|"permissionDecision"/.test(out), event + ' 输出合法', out.trim().split('\n')[0].slice(0, 120) || '无输出');
            }
          }
        }
      }
    }
  }
}

for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ' | ' + c.detail : ''}`);
const pass = checks.filter(c => c.ok).length;
console.log('---');
if (asJson) console.log(JSON.stringify({ file, checks, pass, fail: checks.length - pass }, null, 2));
else console.log(`SUMMARY checks=${checks.length} pass=${pass} fail=${checks.length - pass}`);
if (pass !== checks.length) process.exitCode = 1;
