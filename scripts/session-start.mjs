#!/usr/bin/env node
/**
 * 会话自举：读取账本，输出「下一件 + 状态」，供 SessionStart Hook 注入上下文。
 * 用法：node scripts/session-start.mjs [--cwd <目录>] [--file <tasks.json>] [--json]
 * 作为 Hook 时从 stdin 读 JSON（含 cwd / workspace_roots）；纯文本输出会被注入模型上下文。
 * 默认只读；安装清单 autoCheck=true 时比对上游版本，autoApply=true 才自动重装；始终退出码 0，不阻断会话。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { nextTask, validateLedger } from '../skills/project-orchestrator/scripts/task.mjs';
import { fitSections } from './context-budget.mjs';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };

let hook = {};
try {
  if (!process.stdin.isTTY) {
    const raw = fs.readFileSync(0, 'utf8').trim();
    if (raw) hook = JSON.parse(raw);
  }
} catch { /* 非 JSON 输入按无处理 */ }

const cwd = path.resolve(getArg('cwd') || hook.cwd || process.cwd());
const explicit = getArg('file');

function findLedger() {
  if (explicit) return path.resolve(cwd, explicit);
  const docs = path.join(cwd, 'docs');
  if (!fs.existsSync(docs)) return null;
  const files = [];
  for (const d of fs.readdirSync(docs)) {
    const p = path.join(docs, d, 'tasks.json');
    if (fs.existsSync(p)) files.push({ p, t: fs.statSync(p).mtimeMs });
  }
  files.sort((a, b) => b.t - a.t);
  return files[0]?.p || null;
}

const projectMd = path.join(cwd, '.agent', 'project.md');
const projectText = fs.existsSync(projectMd) ? fs.readFileSync(projectMd, 'utf8') : '';
const memRoot = projectText.match(/^(?:-\s*)?memory_root:\s*(.+)$/m)?.[1]?.trim();
const memoryIdx = memRoot ? path.resolve(memRoot, 'project_memory.md') : path.join(cwd, '.agent-memory', 'project_memory.md');
const ledgerFile = findLedger();

let ledgerLine = 'LEDGER NONE 未找到 docs/*/tasks.json';
let nextLine = '';
let invalid = 0;
if (ledgerFile && fs.existsSync(ledgerFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
    const tasks = data.tasks || [];
    const c = k => tasks.filter(t => t.status === k).length;
    invalid = validateLedger(data).length;
    const n = nextTask(data);
    const rel = path.relative(cwd, ledgerFile).split(path.sep).join('/');
    ledgerLine = `LEDGER ${rel} | todo=${c('todo')} doing=${c('doing')} blocked=${c('blocked')} done=${c('done')} | invalid=${invalid}`;
    nextLine = n ? `NEXT ${n.task.id} | ${n.task.title}${n.resumed ? '（续跑）' : ''}` : 'NEXT NONE 全部完成或全部阻塞';
  } catch (e) {
    ledgerLine = 'LEDGER BROKEN ' + e.message;
  }
}

const memLine = fs.existsSync(memoryIdx)
  ? `MEMORY ${path.relative(cwd, memoryIdx) || memoryIdx} ${fs.readFileSync(memoryIdx, 'utf8').split(/\r?\n/).length} 行`
  : `MEMORY MISSING（${memRoot ? memRoot : '.agent-memory'}；可跑 project-memory init）`;
const cfgLine = fs.existsSync(projectMd) ? 'CONFIG .agent/project.md OK' : 'CONFIG .agent/project.md MISSING';

// 版本自检：有安装清单时比对上游；autoApply=true 才自动重装
const installManifest = [
  path.join(cwd, '.trae', 'skills', '.agent-install.json'),
  path.join(cwd, '.agent', 'skills', '.agent-install.json'),
].find(p => fs.existsSync(p));
let versionLine = '';
if (installManifest) {
  try {
    const m = JSON.parse(fs.readFileSync(installManifest, 'utf8'));
    versionLine = `VERSION ${m.version || '?'}`;
    if (m.autoCheck !== false) {
      const upd = path.join(pkgRoot, 'scripts', 'update.mjs');
      const r = spawnSync(process.execPath, [upd, '--manifest', installManifest, '--check', '--quiet', '--no-write', '--timeout', '8000'], { encoding: 'utf8', timeout: 12000 });
      const v = String(r.stdout || '').split('\n').find(l => l.startsWith('VERSION'));
      if (v && /status=UPDATE/.test(v)) {
        const latest = v.match(/latest=([\d.]+)/)?.[1] || '';
        if (m.autoApply === true) {
          const a = spawnSync(process.execPath, [upd, '--manifest', installManifest, '--apply', '--quiet', '--timeout', '30000'], { encoding: 'utf8', timeout: 40000 });
          const av = String(a.stdout || '').split('\n').find(l => l.startsWith('VERSION'));
          versionLine = av && /UPDATED/.test(av) ? `UPDATE applied latest=${latest}（重载 IDE 生效）` : `UPDATE pending latest=${latest}（自动更新失败，手动跑 node scripts/update.mjs --apply）`;
        } else {
          versionLine = `UPDATE available latest=${latest}（node scripts/update.mjs --apply）`;
        }
      } else if (v && /status=NEWEST/.test(v)) {
        versionLine += ' newest';
      }
    }
  } catch { /* 清单损坏或网络失败不阻断会话 */ }
}

const indexFile = path.join(cwd, '.agent-index', 'repo.json');
let indexLine = 'INDEX missing（跑 repo-index.mjs build）';
let indexStatus = 'missing';
if (fs.existsSync(indexFile)) {
  try {
    const idx = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    const hours = (Date.now() - new Date(idx.generatedAt).getTime()) / 3600000;
    indexStatus = hours > 24 ? 'stale' : 'ok';
    indexLine = `INDEX ${indexStatus} ${hours.toFixed(0)}h（files=${idx.files}）`;
  } catch { indexStatus = 'broken'; indexLine = 'INDEX broken（重建）'; }
}

const out = { cwd, ledger: ledgerFile ? path.relative(cwd, ledgerFile).split(path.sep).join('/') : null, invalid, projectConfig: fs.existsSync(projectMd), memory: fs.existsSync(memoryIdx), index: indexStatus, version: versionLine || null };
if (!args.includes('--no-receipt')) {
  try {
    const dir = path.join(cwd, '.agent-runs');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'session-start.log'), JSON.stringify({
      ts: new Date().toISOString(), session: hook.session_id || '', event: hook.hook_event_name || 'manual', source: hook.source || '', cwd,
    }) + '\n', 'utf8');
  } catch { /* 回执失败不影响注入 */ }
}
if (args.includes('--json')) console.log(JSON.stringify(out, null, 2));
else {
  // 注入走预算：必需段（会话/配置/账本/下一件）优先，索引与记忆按剩余预算裁
  const budget = Number(getArg('budget') || 4000);
  const sections = [
    { name: 'SESSION', text: '[SESSION] ' + cwd, priority: 1, ref: cwd },
    { name: 'CONFIG', text: cfgLine, priority: 1, ref: projectMd },
    { name: 'LEDGER', text: ledgerLine, priority: 1, ref: ledgerFile || '' },
    ...(nextLine ? [{ name: 'NEXT', text: nextLine, priority: 1, ref: ledgerFile || '' }] : []),
    { name: 'INDEX', text: indexLine, priority: 2, ref: indexFile },
    ...(versionLine ? [{ name: 'VERSION', text: versionLine, priority: 2, ref: installManifest }] : []),
    { name: 'MEMORY', text: memLine, priority: 3, ref: memoryIdx },
  ];
  console.log(fitSections(sections, budget).text);
}
