#!/usr/bin/env node
/**
 * 一键诊断：把「环境/配置/账本/索引/记忆」各查一层，给出三态结论与下一步。
 *
 * 设计参考：Blender 教程的 `health → doctor → who` 三级自检——排错第一步永远是同一条命令，
 * 且 doctor 必须真跑一次依赖检查，不能只看进程在不在。
 *
 * 三态：ok / degraded / fail（degraded 不算通过，但可继续干活）
 * 用法：node scripts/doctor.mjs [--cwd <项目>] [--json] [--no-hook]
 * 退出码：ok/degraded → 0；fail → 1。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateLedger } from '../skills/project-orchestrator/scripts/task.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const cwd = path.resolve(getArg('cwd') || process.cwd());
const asJson = args.includes('--json');
const noHook = args.includes('--no-hook');

const checks = [];
const add = (name, state, detail, next = '') => checks.push({ name, state, detail, next });

/**
 * 数宿主机真实触发的会话回执：排除人工探针与合成调用。
 * 依据 session-start.mjs 写入的 .agent-runs/session-start.log（每行一条 JSON）。
 * 注意：真实宿主的 source 是 "startup"，不能把「有 source」就当合成调用（曾因此把真实会话漏算）。
 * 只排除：event 非 SessionStart、source=check（check-hook 合成调用）、
 * session 以 check/verify/manual/probe 开头（人工探针会自己命名）。
 * @param {string} logFile - 回执日志绝对路径
 * @returns {number} 真实会话条数；文件缺失或损坏返回 0
 */
function countHostFires(logFile) {
  if (!fs.existsSync(logFile)) return 0;
  let n = 0;
  for (const line of fs.readFileSync(logFile, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (o.event !== 'SessionStart') continue;
    if (o.source === 'check') continue;
    if (/^(check|verify|manual|probe)/i.test(String(o.session || ''))) continue;
    n++;
  }
  return n;
}

/**
 * 读 Hook 心跳（pre-tool-guard 每次执行都会覆盖写）。
 * SessionStart 每会话只触发一次，本会话错过就永远等不到回执；
 * 心跳能证明「Hook 确实在跑」，避免把已生效误报成没启用。
 * @param {string} f - 心跳文件绝对路径
 * @returns {{ageMin:number}|null} 新鲜度（分钟）；缺失、损坏或未来时间返回 null
 */
function readHeartbeat(f) {
  if (!fs.existsSync(f)) return null;
  try {
    const o = JSON.parse(fs.readFileSync(f, 'utf8'));
    const t = new Date(o.time).getTime();
    if (!Number.isFinite(t)) return null;
    const ageMin = Math.round((Date.now() - t) / 60000);
    return ageMin >= 0 ? { ageMin } : null;
  } catch { return null; }
}

/**
 * 向上查父级 .agent-runs 回执：宿主（Trae 等）的项目根可能是本包所在仓库的父目录，
 * 此时 Hook 照常触发，但回执写在父级 .agent-runs —— 只看自己 cwd 会误报「从未触发」。
 * 只在「本目录配置齐全但没有回执证据」时调用；判定口径与 countHostFires 完全一致（合成回执仍排除）。
 * @param {string} start - 起始目录（通常是 doctor 的 cwd）
 * @returns {{dir:string,fired:number,beat:object|null}|null} 最近一级有真实证据的父目录
 */
function findUpstreamRuns(start) {
  let dir = path.resolve(start);
  for (let i = 0; i < 5; i++) {
    const up = path.dirname(dir);
    if (!up || up === dir) return null; // 到盘符根
    dir = up;
    const runs = path.join(dir, '.agent-runs');
    if (!fs.existsSync(runs)) continue;
    const fired = countHostFires(path.join(runs, 'session-start.log'));
    const beat = readHeartbeat(path.join(runs, 'hook-heartbeat.json'));
    if (fired > 0) return { dir, fired, beat: null };
    if (beat && beat.ageMin <= 1440) return { dir, fired: 0, beat };
  }
  return null;
}

const run = (script, argv = [], timeout = 20000) => {
  const r = spawnSync(process.execPath, [path.join(root, script), ...argv], { cwd: root, encoding: 'utf8', timeout });
  return { ok: r.status === 0, out: ((r.stdout || '') + (r.stderr || '')).trim(), timeout: r.error?.code === 'ETIMEDOUT' };
};

// 1 运行时
const major = Number(process.versions.node.split('.')[0]);
add('node', major >= 18 ? 'ok' : 'fail', process.versions.node, major >= 18 ? '' : '升级 Node ≥18');

// 2 技能门禁（只跑一次，失败即阻断）
const val = run('scripts/validate.mjs');
add('validate', val.timeout ? 'fail' : val.ok ? 'ok' : 'fail', val.timeout ? '超时' : val.out.split('\n').slice(-1)[0], '修 skills 结构后再跑 doctor');

// 3 注册表
const reg = run('scripts/index-skills.mjs', ['--check']);
add('registry', reg.timeout ? 'fail' : reg.ok ? 'ok' : 'fail', reg.out.split('\n').slice(-1)[0], '修 registry 重名/超限项');

// 4 Hook 配置 + 宿主是否真加载（只写了文件但宿主没启用 = 闸门空转，必须降级报出来）
if (noHook) add('hook', 'degraded', 'SKIP（--no-hook）', '');
else {
  const hooksFile = path.join(cwd, '.trae', 'hooks.json');
  if (!fs.existsSync(hooksFile)) add('hook', 'degraded', '未安装 .trae/hooks.json', 'node scripts/install-hook.mjs --target trae-project --cwd .');
  else {
    try {
      const h = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
      const events = ['SessionStart', 'PreToolUse', 'Stop'].filter(e => Array.isArray(h?.hooks?.[e]) && h.hooks[e].length);
      if (events.length < 3) {
        add('hook', 'degraded', `${events.length}/3 事件（${events.join(',') || 'none'}）`, '重跑 install-hook 补齐三事件，并在设置 → Hooks 启用');
      } else {
        // 配置齐全 ≠ 生效：查真实回执，看宿主机有没有真的调过 hook。
        // 两种生效证据：① SessionStart 真实回执；② PreToolUse 心跳（SessionStart 每会话仅一次，错过就等不到）。
        // check-hook.mjs 的合成调用会带 source=check / session=check-hook，必须排除，否则自己造假绿。
        const fired = countHostFires(path.join(cwd, '.agent-runs', 'session-start.log'));
        const beat = readHeartbeat(path.join(cwd, '.agent-runs', 'hook-heartbeat.json'));
        if (fired > 0) {
          add('hook', 'ok', `3/3 事件，宿主机已触发 ${fired} 次会话`, '');
        } else if (beat && beat.ageMin <= 1440) {
          add('hook', 'ok', `3/3 事件，PreToolUse 心跳 ${beat.ageMin} 分钟前（SessionStart 待下次会话自举）`, '');
        } else {
          // 本目录没有回执：宿主可能把项目根设在父目录（回执落在父级 .agent-runs），
          // 只看自己 cwd 会误报「从未触发」，让使用者去重复启用 Hook。
          const up = findUpstreamRuns(cwd);
          if (up) {
            const ev = up.fired > 0
              ? `真实会话回执 ${up.fired} 次`
              : `PreToolUse 心跳 ${up.beat.ageMin} 分钟前`;
            add('hook', 'ok', `3/3 事件，证据在父级 ${up.dir}（${ev}）——宿主项目根是父目录`, '');
          } else {
            add('hook', 'degraded', `3/3 已配置，但宿主机从未触发（回执 0 条真实会话、无心跳，父级 5 层内也无）`,
              '打开 Trae → 设置 → Hooks → 项目 → 启用 → 重启；只写 .trae/hooks.json 不会被加载');
          }
        }
      }
    } catch (e) { add('hook', 'fail', 'hooks.json 非法: ' + e.message, '修 JSON 或重跑 install-hook'); }
  }
}

// 5 账本：取最近修改的 docs/*/tasks.json
let ledger = null;
const docs = path.join(cwd, 'docs');
if (fs.existsSync(docs)) {
  const found = fs.readdirSync(docs)
    .map(d => path.join(docs, d, 'tasks.json'))
    .filter(p => fs.existsSync(p))
    .map(p => ({ p, t: fs.statSync(p).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  ledger = found[0]?.p || null;
}
if (!ledger) add('ledger', 'degraded', '无 docs/*/tasks.json', '用 task.mjs init 建账本');
else {
  try {
    const data = JSON.parse(fs.readFileSync(ledger, 'utf8'));
    const errs = validateLedger(data);
    const tasks = data.tasks || [];
    const c = k => tasks.filter(t => t.status === k).length;
    const rel = path.relative(cwd, ledger).split(path.sep).join('/');
    add('ledger', errs.length ? 'fail' : 'ok', `${rel} todo=${c('todo')} doing=${c('doing')} done=${c('done')} invalid=${errs.length}`, errs.length ? 'task.mjs validate 看具体错' : '');
  } catch (e) { add('ledger', 'fail', '账本不是合法 JSON: ' + e.message, '修 JSON 或重建账本'); }
}

// 6 索引新鲜度
const idxFile = path.join(cwd, '.agent-index', 'repo.json');
if (!fs.existsSync(idxFile)) add('index', 'degraded', '未建索引', 'node scripts/repo-index.mjs build');
else {
  try {
    const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
    const hours = (Date.now() - new Date(idx.generatedAt).getTime()) / 3600000;
    add('index', hours > 24 ? 'degraded' : 'ok', `${hours.toFixed(0)}h files=${idx.files}`, hours > 24 ? 'repo-index.mjs build 重建' : '');
  } catch { add('index', 'fail', 'repo.json 解析失败', 'repo-index.mjs build 重建'); }
}

// 7 项目配置与记忆
const projMd = path.join(cwd, '.agent', 'project.md');
add('project_config', fs.existsSync(projMd) ? 'ok' : 'degraded', fs.existsSync(projMd) ? '.agent/project.md' : '缺 .agent/project.md', '按 AGENTS.md 建项目配置');
const projText = fs.existsSync(projMd) ? fs.readFileSync(projMd, 'utf8') : '';
const memRoot = projText.match(/^(?:-\s*)?memory_root:\s*(.+)$/m)?.[1]?.trim();
const memIdx = memRoot ? path.resolve(memRoot, 'project_memory.md') : path.join(cwd, '.agent-memory', 'project_memory.md');
add('memory', fs.existsSync(memIdx) ? 'ok' : 'degraded', fs.existsSync(memIdx) ? path.relative(cwd, memIdx) || memIdx : '记忆索引缺失', 'memory.mjs init 或补 memory_root');

const verdict = checks.some(c => c.state === 'fail') ? 'fail' : checks.some(c => c.state === 'degraded') ? 'degraded' : 'ok';
const next = (checks.find(c => c.state === 'fail') || checks.find(c => c.state === 'degraded'))?.next || '';

if (asJson) {
  console.log(JSON.stringify({ cwd, verdict, next, checks }, null, 2));
} else {
  for (const c of checks) console.log(`${c.state.toUpperCase().padEnd(8)} ${c.name} | ${c.detail}`);
  console.log('---');
  console.log(`VERDICT ${verdict}${next ? ' | NEXT ' + next : ''}`);
}
process.exit(verdict === 'fail' ? 1 : 0);
