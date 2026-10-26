#!/usr/bin/env node
/**
 * Hook 配置检查：SessionStart / PreToolUse / Stop 的结构、命令目标、真实执行。
 * 用法：node scripts/check-hook.mjs [--cwd <项目>] [--hooks <hooks.json>] [--no-run] [--json]
 * 退出码：全部通过 0，否则 1。只读，不写文件。
 *
 * 关键点：直接把命令交给宿主的真实 shell 执行（Windows 上是 PowerShell），
 * 而不是自己拆出 node 路径去调用——后者会绕过 shell 语法层，
 * 测不出「两个引号串相邻」这类只在 PowerShell 里才报的语法错误（历史上正是它让 hook 全程 exit 1）。
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

// 宿主真实 shell：Windows 用 PowerShell（先 pwsh，退化到 powershell），其他平台用 sh
function hostShell() {
  if (process.platform !== 'win32') return { cmd: 'sh', args: ['-c'] };
  const pwsh = spawnSync('pwsh', ['-NoProfile', '-Command', 'exit 0'], { encoding: 'utf8' });
  if (pwsh.status === 0) return { cmd: 'pwsh', args: ['-NoProfile', '-Command'] };
  return { cmd: 'powershell', args: ['-NoProfile', '-Command'] };
}

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
              // 关键：把命令原样交给宿主真实 shell 执行，而不是自己拆路径调 node。
              // 这样才能捕获「宿主 shell 语法不兼容」这类只在该 shell 里才暴露的错误。
              const shell = hostShell();
              // 把 hook 的 stdin JSON 编成 shell 管道前的 heredoc/echo：
              // PowerShell 用单引号 here-string 传递更安全，这里退化为先写临时文件再重定向。
              const stdinJson = JSON.stringify({ session_id: 'check-hook', cwd, hook_event_name: event, source: 'check', stop_hook_active: false, loop_count: 0 });
              const tmpIn = path.join(cwd, '.agent-runs', '.check-hook-in.json');
              fs.mkdirSync(path.dirname(tmpIn), { recursive: true });
              fs.writeFileSync(tmpIn, stdinJson, 'utf8');
              const inEsc = tmpIn.split(path.sep).join('/');
              const full = process.platform === 'win32'
                ? `Get-Content -Raw -LiteralPath '${inEsc}' | ${h.command}`
                : `${h.command} < '${tmpIn}'`;
              const r = spawnSync(shell.cmd, [...shell.args, full], { cwd, encoding: 'utf8', timeout: 20000 });
              const out = (r.stdout || '') + (r.stderr || '');
              add(r.status === 0, event + ' 宿主 shell 可执行（' + shell.cmd + '）', 'exit=' + r.status + (r.status !== 0 ? ' | ' + (r.stderr || '').trim().split('\n')[0].slice(0, 100) : ''));
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
