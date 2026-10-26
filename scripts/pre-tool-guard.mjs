#!/usr/bin/env node
/**
 * PreToolUse 守卫：危险命令、越界写入、修改自身规则。
 *
 * 宿主契约（TRAE 官方 Hook 配置详解）：
 * - stdin: { session_id, cwd, hook_event_name:"PreToolUse", tool_name, tool_input }
 * - stdout: {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow|deny|ask","permissionDecisionReason":"..."}}
 * - 优先级 deny > ask > allow；退出码 2 等价 deny。
 *
 * 策略：
 * - 内部异常一律放行（fail-open），避免把会话锁死；异常原因写 stderr。
 * - deny/ask 决策追加一行 JSON 到 <cwd>/.agent-runs/guard.log，作为证据。
 * - 修改自身规则（skills / hooks / guard 配置）默认 deny；确需改动设 AGENT_GUARD_ALLOW_SELF=1。
 *
 * 用法：
 *   node scripts/pre-tool-guard.mjs [--event <json文件>] [--cwd <目录>] [--dry-run]
 *   （Hook 模式不传 --event，从 stdin 读）
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = args.includes('--dry-run');

const DEFAULT_DENY = [
  String.raw`\brm\s+-[a-z-]*r[a-z-]*f[a-z-]*\s+(\/|~|\$HOME|[a-z]:[\\/]|\*)`,
  String.raw`\bgit\s+reset\s+--hard\b`,
  String.raw`\bgit\s+clean\s+-[a-z-]*[fx]`,
  String.raw`\bgit\s+push\b[^\n]*(--force(\s|$)|-f\b)`,
  String.raw`\b(drop|truncate)\s+(database|table)\b`,
  String.raw`\bformat\s+[a-z]:`,
  String.raw`\bmkfs(\.|\s)`,
  String.raw`\b(shutdown|reboot)\b`,
  String.raw`\bpm2\s+delete\s+all\b`,
  String.raw`\b(curl|wget)\b[^|\n]*\|\s*(bash|sh|powershell)\b`,
  String.raw`\bRemove-Item\b[^\n]*-Recurse[^\n]*-Force[^\n]*(SystemDrive|[a-z]:\\|\\\\)`,
];
const DEFAULT_ASK = [
  String.raw`\brm\s+-[a-z-]*r[a-z-]*f`,
  String.raw`\bRemove-Item\b[^\n]*-Recurse[^\n]*-Force`,
  String.raw`\b(del|erase)\b[^\n]*\/s`,
  String.raw`\bnpm\s+publish\b`,
  String.raw`\bdocker\s+(system|volume)\s+prune\b`,
];
const DEFAULT_PROTECT = ['.git', 'node_modules', 'dist'];
const SELF_PATHS = ['.trae/skills', '.agent/skills', '.trae/hooks.json', '.agent/guard.json'];
const CONTENT_KEYS = /^(content|new_string|old_string|text|patch|diff|body)$/i;

const norm = s => String(s).replace(/\s+/g, ' ').trim();
const compile = (list, label) => {
  const out = [];
  for (const p of list || []) {
    try { out.push(new RegExp(p, 'i')); } catch (e) { console.error(`[GUARD] ${label} 正则非法，已忽略: ${p}`); }
  }
  return out;
};

/** 递归收集字符串字段，带上最近一层 key 名 */
function walk(obj, fn, key = '') {
  if (obj == null) return;
  if (typeof obj === 'string') { fn(key, obj); return; }
  if (Array.isArray(obj)) { for (const v of obj) walk(v, fn, key); return; }
  if (typeof obj === 'object') for (const [k, v] of Object.entries(obj)) walk(v, fn, k);
}

function readEvent() {
  const file = getArg('event');
  if (file) return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  if (process.stdin.isTTY) return {};
  const raw = fs.readFileSync(0, 'utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function loadConfig(cwd) {
  const file = path.join(cwd, '.agent', 'guard.json');
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.error('[GUARD] .agent/guard.json 非法，按默认规则: ' + e.message); return {}; }
}

function insideWorkspace(cwd, p) {
  const abs = path.resolve(cwd, p);
  const rel = path.relative(cwd, abs).split(path.sep).join('/');
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return { abs, rel, inside: false };
  return { abs, rel, inside: true };
}

function isTemp(abs) {
  const t = path.resolve(os.tmpdir()).toLowerCase();
  return abs.toLowerCase().startsWith(t);
}

function relMatch(rel, needle) {
  const n = needle.split(path.sep).join('/').replace(/\/+$/, '');
  return rel === n || rel.startsWith(n + '/');
}

function decide(event, cfg) {
  const cwd = path.resolve(getArg('cwd') || event.cwd || process.cwd());
  const tool = String(event.tool_name || event.llm_tool_name || '');
  const input = event.tool_input || {};
  const deny = compile([...DEFAULT_DENY, ...(cfg.denyCommands || [])], 'denyCommands');
  const ask = compile([...DEFAULT_ASK, ...(cfg.askCommands || [])], 'askCommands');
  const protect = [...DEFAULT_PROTECT, ...(cfg.protectPaths || [])];
  const allowSelf = process.env.AGENT_GUARD_ALLOW_SELF === '1';

  let verdict = { decision: 'allow', reason: '' };
  const set = (d, r) => {
    if (verdict.decision === 'deny') return;
    if (d === 'deny' || verdict.decision === 'allow') verdict = { decision: d, reason: r };
  };

  const pathKeys = /^(file_?path|path|file|filename|target|absolute_?path)$/i;
  const cmdKeys = /^(command|cmd|script|shell)$/i;
  const looksShell = /runcommand|shell|bash|terminal|command/i.test(tool);

  walk(input, (key, value) => {
    // 1) 路径：越界 / 保护目录 / 自改规则
    // 已知字段名优先；非 Shell 工具再用「含分隔符 + 扩展名」启发式兜底未知字段
    const looksPath = pathKeys.test(key) || (
      !looksShell && !CONTENT_KEYS.test(key) && value.length < 400
      && !/^[a-z]+:\/\//i.test(value)
      && /[\\/]/.test(value) && /\.[a-z0-9]{1,8}$/i.test(value)
    );
    if (looksPath) {
      const { abs, rel, inside } = insideWorkspace(cwd, value);
      if (!inside && !isTemp(abs)) {
        set('deny', `越界写入：${value} 不在工作区 ${cwd} 内`);
        return;
      }
      if (inside) {
        if (!allowSelf && SELF_PATHS.some(p => relMatch(rel, p))) {
          set('deny', `修改自身规则：${rel}（确需改动设 AGENT_GUARD_ALLOW_SELF=1）`);
          return;
        }
        if (/(^|\/)\.env(\..*)?$/.test(rel)) {
          set('deny', `写入环境文件：${rel}（凭据禁止由 Agent 改写）`);
          return;
        }
        for (const p of protect) {
          if (relMatch(rel, p)) { set('deny', `写入保护目录：${rel} 命中 ${p}`); return; }
        }

      }
    }
    // 2) 命令：危险动作
    if (cmdKeys.test(key) || looksShell) {
      const cmd = norm(value);
      if (!cmd) return;
      for (const re of deny) if (re.test(cmd)) { set('deny', `危险命令：${cmd.slice(0, 120)}`); return; }
      for (const re of ask) if (re.test(cmd)) { set('ask', `需确认的命令：${cmd.slice(0, 120)}`); return; }
    }
  });

  return { cwd, tool, ...verdict };
}

/**
 * 写 Hook 心跳：allow 也写，证明宿主机确实在调 PreToolUse。
 * 覆盖写单文件、不随调用次数增长；doctor 用它区分「Hook 根本没跑」与「在跑但本会话错过 SessionStart」。
 * @param {string} cwd - 项目根
 * @param {string} tool - 触发工具名
 * @param {string} decision - allow | ask | deny
 */
function writeHeartbeat(cwd, tool, decision) {
  try {
    const dir = path.join(cwd, '.agent-runs');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'hook-heartbeat.json'), JSON.stringify({
      time: new Date().toISOString(), event: 'PreToolUse', tool, decision,
    }) + '\n', 'utf8');
  } catch { /* 心跳失败不影响决策 */ }
}

function logDecision(cwd, tool, verdict) {
  if (dryRun) return;
  writeHeartbeat(cwd, tool, verdict.decision);
  if (verdict.decision === 'allow') return;
  try {
    const dir = path.join(cwd, '.agent-runs');
    fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify({
      time: new Date().toISOString(),
      tool,
      decision: verdict.decision,
      reason: verdict.reason,
    });
    fs.appendFileSync(path.join(dir, 'guard.log'), line + '\n', 'utf8');
  } catch { /* 日志失败不影响决策 */ }
}

function main() {
  const event = readEvent();
  const cfg = loadConfig(path.resolve(getArg('cwd') || event.cwd || process.cwd()));
  if (cfg.disabled) {
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: 'guard disabled by .agent/guard.json' } }));
    return;
  }
  const v = decide(event, cfg);
  logDecision(v.cwd, v.tool, v);
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: v.decision,
      permissionDecisionReason: v.reason || '未命中危险规则',
    },
  }));
}

try {
  main();
} catch (e) {
  // fail-open：守卫自身出错不能阻断正常工具调用
  console.error('[GUARD] 内部错误，放行: ' + (e && e.message));
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: 'guard 内部错误，按放行处理' } }));
}
