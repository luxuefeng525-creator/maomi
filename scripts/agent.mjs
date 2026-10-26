#!/usr/bin/env node
/**
 * Agent 编排入口：把「定档 → 建账本 → 闸门预检 → 验收」串成一条闭环。
 * 它不替模型写代码，只负责确定性的调度与证据；内容生成由调用方（模型）完成。
 *
 * 用法：
 *   node scripts/agent.mjs plan   --task "<目标>" [--slug <目录名>] [--files <n>] [--cross <n>]
 *                                 [--schema] [--api] [--route] [--profile package|app] [--cwd <目录>]
 *   node scripts/agent.mjs run    --task "<目标>" [--executor <id>] [--max-steps <n>] [--timeout <ms>]
 *                                 [--slug <目录名>] [--files <n>] [--cross <n>] [--keep] [--dry-run] [--no-rules] [--cwd <目录>]
 *   node scripts/agent.mjs clean  [--days <n>] [--dry-run] [--cwd <目录>]
 *   node scripts/agent.mjs step   [--cwd <目录>] [--file <tasks.json>] [--json]
 *   node scripts/agent.mjs guard  --tool <工具名> --input '<JSON>' [--cwd <目录>]
 *   node scripts/agent.mjs status [--cwd <目录>] [--file <tasks.json>]
 *   node scripts/agent.mjs finish [--cwd <目录>] [--file <tasks.json>]
 *
 * 退出码：plan/step/guard/status 恒 0（供编排读取）；finish 验收不过为 1。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readLedger, writeLedger, depsMissing, nextTask, validateLedger } from '../skills/project-orchestrator/scripts/task.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const cmd = args[0];
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const has = n => args.includes('--' + n);
const asJson = has('json');

const cwd = path.resolve(getArg('cwd') || process.cwd());
const guardScript = path.join(scriptDir, 'pre-tool-guard.mjs');
const stopScript = path.join(scriptDir, 'stop-gate.mjs');
const rulesFile = path.join(root, 'rules', 'agent-rules.md');

/** 读取注入规则；缺失时返回空串，由调用方打印警告但不阻断 */
function loadRules() {
  try { return fs.readFileSync(rulesFile, 'utf8').trim(); } catch { return ''; }
}

/** 规则指纹：写进运行证据，便于回答「这次执行到底注入了哪版规则」 */
function rulesFingerprint(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 12);
}

/** 阶段模板：L2 在业务项目跑全 8 环，在包/库项目裁掉「后台同批」「三端对账」 */
const STAGES_APP = {
  L0: [['T1', '实现'], ['T2', '测试']],
  L1: [['T1', '实现'], ['T2', '测试'], ['T3', '验收']],
  L2: [
    ['T1', '需求与对标'], ['T2', '设计文档'], ['T3', '实现'], ['T4', '测试'],
    ['T5', '浏览器验收'], ['T6', '后台同批'], ['T7', '三端对账'], ['T8', '构建重载健康检查'],
  ],
};
const STAGES_PACKAGE = {
  L0: [['T1', '实现'], ['T2', '测试']],
  L1: [['T1', '实现'], ['T2', '测试'], ['T3', '验收']],
  L2: [['T1', '需求与对标'], ['T2', '设计文档'], ['T3', '实现'], ['T4', '测试'], ['T5', '验收']],
};

/**
 * 按 ai-workflow 1.0 判据定档；返回档位与判定依据（依据要一并报给用户，便于当场改判）。
 * @param {{files:number, cross:number, schema:boolean, api:boolean, route:boolean}} o - 影响面输入
 * @returns {{tier:string, reasons:string[]}} 档位与命中理由
 */
function decideTier(o) {
  const reasons = [];
  if (o.schema) reasons.push('动库表/schema');
  if (o.api) reasons.push('改对外接口');
  if (o.route) reasons.push('新增页面或路由');
  if (o.cross >= 2) reasons.push(`跨 ${o.cross} 端`);
  if (o.files >= 5) reasons.push(`${o.files} 个文件（≥5）`);
  if (reasons.length) return { tier: 'L2', reasons };
  if (o.cross >= 1) return { tier: 'L1', reasons: [`单端 · ${o.files} 个文件`] };
  if (o.files >= 2) return { tier: 'L1', reasons: [`单端 · ${o.files} 个文件`] };
  return { tier: 'L0', reasons: ['单文件小改'] };
}

/** 找账本：显式 --file 优先，否则取 docs 下最近修改的 tasks.json */
function findLedger(cliFile) {
  if (cliFile) return path.resolve(cwd, cliFile);
  const docs = path.join(cwd, 'docs');
  if (!fs.existsSync(docs)) return null;
  const found = [];
  for (const d of fs.readdirSync(docs)) {
    const p = path.join(docs, d, 'tasks.json');
    if (fs.existsSync(p)) found.push({ p, t: fs.statSync(p).mtimeMs });
  }
  found.sort((a, b) => b.t - a.t);
  return found[0]?.p || null;
}

/** 把一次工具调用交给 pre-tool-guard 判定；guard 自身异常按放行（fail-open） */
function guardDecide(tool, input) {
  const event = { session_id: 'agent-mjs', cwd, hook_event_name: 'PreToolUse', tool_name: tool, tool_input: input };
  const r = spawnSync(process.execPath, [guardScript, '--cwd', cwd], { input: JSON.stringify(event), encoding: 'utf8' });
  const m = (r.stdout || '').match(/\{[\s\S]*\}$/);
  try {
    const o = JSON.parse(m ? m[0] : r.stdout).hookSpecificOutput;
    return { decision: o.permissionDecision, reason: o.permissionDecisionReason };
  } catch {
    return { decision: 'allow', reason: 'guard 输出无法解析，按放行处理' };
  }
}

function cmdPlan() {
  const task = getArg('task');
  if (!task) { console.error('缺少 --task'); process.exit(1); }
  const profile = getArg('profile') || 'package';
  const { data, tier, reasons } = buildLedger(task, readImpact(), profile);
  const slug = getArg('slug') || 'task-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const file = path.join(cwd, 'docs', slug, 'tasks.json');
  if (fs.existsSync(file) && !has('force')) {
    console.error(`账本已存在，未覆盖：${file}（确需覆盖加 --force）`);
    process.exit(1);
  }
  const invalid = validateLedger(data);
  if (invalid.length) { console.error('账本非法：' + invalid.join('；')); process.exit(1); }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeLedger(file, data);
  const rel = path.relative(cwd, file).split(path.sep).join('/');
  if (asJson) console.log(JSON.stringify({ tier, reasons, profile, ledger: rel, tasks: data.tasks }, null, 2));
  else {
    console.log(`[档位] ${tier} · ${reasons.join(' / ')} · profile=${profile}`);
    console.log(`LEDGER ${rel} 共 ${data.tasks.length} 件`);
    for (const t of data.tasks) console.log(`  ${t.id} ${t.title}${t.deps.length ? ' <- ' + t.deps.join(',') : ''}`);
    console.log(`下一步：node scripts/agent.mjs step --cwd ${cwd}`);
  }
}

/** 读取影响面参数（文件数/端数/schema/接口/路由） */
function readImpact() {
  return {
    files: Number(getArg('files') || 1),
    cross: Number(getArg('cross') || 0),
    schema: has('schema'),
    api: has('api'),
    route: has('route'),
  };
}

/** 按档位生成账本数据；plan 与 run 共用，避免两套构造逻辑 */
function buildLedger(task, o, profile) {
  const { tier, reasons } = decideTier(o);
  const table = profile === 'app' ? STAGES_APP : STAGES_PACKAGE;
  const stages = table[tier];
  const data = {
    task,
    tier,
    profile,
    tasks: stages.map(([id, title], i) => ({
      id, title, deps: i ? [stages[i - 1][0]] : [], files: [], status: 'todo', evidence: '',
    })),
  };
  return { data, tier, reasons };
}

const providersFile = path.join(root, 'tests', 'behavior', 'providers.json');

/** 读取外部执行器定义；直接复用 tests/behavior/providers.json，不另造配置 */
function executorSpec(id) {
  if (!fs.existsSync(providersFile)) return null;
  try {
    return (JSON.parse(fs.readFileSync(providersFile, 'utf8')).providers || {})[id] || null;
  } catch { return null; }
}

/** 工作区改动集合（git status 后两列之后的路径）；非 git 仓库返回 null */
function changedPaths() {
  const r = spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' });
  if (r.status !== 0) return null;
  return new Set((r.stdout || '').split('\n').filter(Boolean).map(l => l.slice(3).trim()));
}

/** 调外部执行器跑一步：返回退出码、输出，不抛异常 */
function runExecutor(prompt, specId, timeout) {
  const p = executorSpec(specId);
  if (!p) return { ok: false, status: null, out: '未知 executor: ' + specId };
  const vars = { cwd, response: path.join(cwd, 'response.md'), prompt };
  const argv = (p.args || []).map(a => String(a).replace(/\{(cwd|response|prompt)\}/g, (_, k) => vars[k] ?? ''));
  const r = spawnSync(p.cmd, argv, {
    cwd,
    encoding: 'utf8',
    timeout,
    input: p.promptVia === 'stdin' ? prompt : undefined,
    shell: process.platform === 'win32' && /\.(cmd|ps1)$/i.test(p.cmd),
  });
  return { ok: !r.error && r.status === 0, status: r.status, out: ((r.stdout || '') + (r.stderr || '')).trim() };
}

/** 单步提示词：规则置顶、限定范围，禁止模型自改账本 */
function stepPrompt(task, t, slug, rules = '') {
  const lines = [];
  if (rules) lines.push('【执行规则（必须遵守）】', rules, '');
  lines.push(
    '你是执行器，只完成当前这一步，不要越界。',
    '',
    '总目标：' + task,
    '当前步骤：' + t.id + ' ' + t.title,
    '工作目录：' + cwd,
    '',
    '要求：',
    '1. 只做这一步，不要提前做后续步骤。',
    '2. 不要修改 docs/' + slug + '/tasks.json（状态由调度器维护）。',
    '3. 测试/验收步骤优先跑最小相关命令，避免全量长耗时套件。',
    '4. 完成后用一句话说明做了什么、改了哪些文件。',
  );
  return lines.join('\n');
}

/** 自主执行：定档 → 建账 → 逐步调执行器 → 记账 → 闸门验收 */
function cmdRun() {
  const task = getArg('task');
  if (!task) { console.error('缺少 --task'); process.exit(1); }
  const executor = getArg('executor') || 'mimo-agnes';
  if (!executorSpec(executor)) { console.error('未知 executor: ' + executor); process.exit(1); }
  const maxSteps = Number(getArg('max-steps') || 6);
  const timeout = Number(getArg('timeout') || 480000);
  const profile = getArg('profile') || 'package';
  const { data, reasons } = buildLedger(task, readImpact(), profile);
  const slug = getArg('slug') || 'run-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const file = path.join(cwd, 'docs', slug, 'tasks.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // 账本已存在则续跑，不覆盖进度；确需重建加 --force
  const resumed = fs.existsSync(file) && !has('force');
  // 规则注入默认开启；--no-rules 仅用于对照实验，正常执行不要关
  const rules = has('no-rules') ? '' : loadRules();
  // dry-run 只预览提示词，不写账本、不动工作区
  const board = resumed ? readLedger(file).data : data;
  const rel = path.relative(cwd, file).split(path.sep).join('/');
  console.log(`[档位] ${board.tier}${resumed ? '（续跑，沿用已有账本）' : ' · ' + reasons.join(' / ')}`);
  console.log(`[执行器] ${executor} · 最多 ${maxSteps} 步 · 单步超时 ${timeout}ms`);
  console.log(`[规则] ${rules ? `${path.relative(root, rulesFile).split(path.sep).join('/')} sha256=${rulesFingerprint(rules)} chars=${rules.length}` : '未注入（--no-rules）'}`);
  console.log(`LEDGER ${rel} 共 ${board.tasks.length} 件`);
  console.log('');

  if (has('dry-run')) {
    const n = nextTask(board);
    if (!n) { console.log('无待办步骤'); return; }
    console.log(stepPrompt(task, n.task, slug, rules));
    return;
  }
  if (!resumed) writeLedger(file, data);
  // 留运行证据：这次执行注入的规则版本，clean 不清理（属于审计记录）
  if (rules) {
    const dir = path.join(cwd, '.agent-runs');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'rules.json'), JSON.stringify({
      file: path.relative(root, rulesFile).split(path.sep).join('/'),
      sha256: rulesFingerprint(rules),
      chars: rules.length,
      injectedAt: new Date().toISOString(),
      executor,
    }, null, 2) + '\n', 'utf8');
  }

  let executed = 0;
  while (executed < maxSteps) {
    const cur = readLedger(file).data;
    const n = nextTask(cur);
    if (!n) break;
    const t = n.task;
    if (t.status === 'todo') { t.status = 'doing'; writeLedger(file, cur); }
    const before = changedPaths();
    console.log(`--- ${t.id} ${t.title} 开始 ---`);
    const r = runExecutor(stepPrompt(task, t, slug, rules), executor, timeout);
    const after = changedPaths();
    // 执行器自身产物（response.md / .mimocode 会话库）与账本目录不算任务产物，否则会误判成完成
    const SELF_OUT = /^(response\.md|\.mimocode\/|\.agent-runs\/|\.agent-index\/)/;
    const added = before && after
      ? [...after].filter(x => !before.has(x) && !SELF_OUT.test(x) && !x.startsWith('docs/' + slug + '/'))
      : [];
    // 执行器输出可能带 ANSI 颜色码，写进账本前必须剥掉
    const clean = s => String(s).replace(/\u001b\[[0-9;]*m/g, '');
    const tail = clean(r.out || '').split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 300);
    const isVerify = /测试|验收/.test(t.title);
    // 测试/验收步不必然产文件；其余步骤必须有真实变更，否则视为假完成
    const ok = r.ok && (isVerify || added.length > 0);
    const fresh = readLedger(file).data;
    const target = fresh.tasks.find(x => x.id === t.id);
    if (ok) {
      target.status = 'done';
      target.evidence = (added.length ? added.slice(0, 5).join(', ') : '执行器输出') + '｜' + tail;
      console.log(`DONE ${t.id} | 变更 ${added.length} 个文件`);
    } else {
      target.status = 'blocked';
      const why = r.ok ? '无产物变更（疑似假完成）' : (r.status === null ? '执行器超时或无法启动' : '执行器退出 ' + r.status);
      target.note = why + '｜' + tail;
      console.log(`BLOCK ${t.id} | ${why}`);
    }
    writeLedger(file, fresh);
    executed++;
    console.log('   ' + tail);
    if (!ok) break;
  }

  console.log('');
  const fin = spawnSync(process.execPath, [stopScript, '--cwd', cwd, '--file', file], { encoding: 'utf8' });
  let gate = null;
  try { gate = JSON.parse((fin.stdout || '').trim()); } catch { /* 解析失败按未放行 */ }
  const finalData = readLedger(file).data;
  const stats = ['todo', 'doing', 'blocked', 'done'].map(k => `${k}=${finalData.tasks.filter(x => x.status === k).length}`).join(' ');
  console.log(`RUN 结束 | 执行 ${executed} 步 | ${stats}`);
  const blockedList = finalData.tasks.filter(x => x.status === 'blocked');
  if (blockedList.length) {
    console.log(`WARN ${blockedList.length} 个任务阻塞未完成（闸门允许交接，但交付不完整）：`);
    for (const b of blockedList) console.log(`  ${b.id} ${b.title} | ${b.note || '无原因记录'}`);
  }
  console.log(`STOPGATE ${gate && gate.continue === true ? 'ALLOW' : 'BLOCK'} | ${gate ? JSON.stringify(gate) : '输出无法解析'}`);
  // 对标 OpenHands SANDBOX_KEEP_RUNTIME_ALIVE=false：默认不保留执行器运行时产物
  if (!has('keep')) {
    let n = 0;
    for (const rel of ['.mimocode', 'response.md']) {
      const abs = path.join(cwd, rel);
      if (fs.existsSync(abs)) { fs.rmSync(abs, { recursive: true, force: true }); n++; }
    }
    if (n) console.log(`CLEAN 已清理执行器自身产物 ${n} 项（--keep 可保留）`);
  }
  process.exitCode = gate && gate.continue === true ? 0 : 1;
}

/** 清理目标：Agent 自己产生的临时与过期产物；用户源码与提交从不在此列 */
const CLEAN_TARGETS = [
  { rel: 'tests/behavior/.external', desc: '跨模型评测沙箱（含千文件夹具）' },
  { rel: 'tests/behavior/.model-runs', desc: '宿主模型会话产物' },
  { rel: 'tests/behavior/.rerun', desc: '夹具复跑副本' },
  { rel: 'tests/behavior/.sandbox', desc: '行为场景沙箱' },
  { rel: 'tests/.tmp', desc: '单测临时目录' },
  { rel: 'tests/.eval', desc: '评测临时目录' },
  { rel: '.mimocode', desc: '执行器会话库（mimo 在 cwd 生成）' },
  { rel: 'response.md', desc: '执行器最后一条回复落盘' },
];

/** 按天数判定是否过期；0 表示不看时间全清 */
function olderThan(abs, days) {
  if (days <= 0) return true;
  try { return (Date.now() - fs.statSync(abs).mtimeMs) / 86400000 >= days; } catch { return false; }
}

/** 统计目录体积，用于报告回收量 */
function sizeOf(abs) {
  let total = 0;
  const walk = p => {
    let st;
    try { st = fs.lstatSync(p); } catch { return; }
    if (st.isDirectory()) {
      let names = [];
      try { names = fs.readdirSync(p); } catch { return; }
      for (const n of names) walk(path.join(p, n));
    } else total += st.size;
  };
  walk(abs);
  return total;
}

function cmdClean() {
  const days = Number(getArg('days') || 7);
  const dry = has('dry-run');
  let freed = 0;
  let removed = 0;
  console.log(`[清理] 阈值 ${days} 天${dry ? ' · 仅预览（--dry-run）' : ''}`);
  for (const t of CLEAN_TARGETS) {
    const abs = path.join(cwd, t.rel);
    if (!fs.existsSync(abs)) continue;
    if (!olderThan(abs, days)) { console.log(`SKIP ${t.rel} 未过期`); continue; }
    const bytes = sizeOf(abs);
    if (dry) {
      console.log(`WOULD ${t.rel} ${(bytes / 1024).toFixed(0)}KB · ${t.desc}`);
    } else {
      fs.rmSync(abs, { recursive: true, force: true });
      console.log(`DEL  ${t.rel} ${(bytes / 1024).toFixed(0)}KB · ${t.desc}`);
      removed++;
      freed += bytes;
    }
  }
  if (dry) console.log('预览结束，未删除任何文件');
  else console.log(`清理完成：删除 ${removed} 项，回收 ${(freed / 1024 / 1024).toFixed(2)}MB`);
}

function cmdStep() {
  const file = findLedger(getArg('file'));
  if (!file) { console.log('LEDGER NONE 未找到 docs/*/tasks.json，先跑 plan'); return; }
  const { data } = readLedger(file);
  const invalid = validateLedger(data);
  const n = nextTask(data);
  const c = k => data.tasks.filter(t => t.status === k).length;
  const rel = path.relative(cwd, file).split(path.sep).join('/');
  if (asJson) {
    console.log(JSON.stringify({ ledger: rel, tier: data.tier, counts: { todo: c('todo'), doing: c('doing'), blocked: c('blocked'), done: c('done') }, invalid, next: n || null }, null, 2));
    return;
  }
  console.log(`LEDGER ${rel} | ${data.tier} | todo=${c('todo')} doing=${c('doing')} blocked=${c('blocked')} done=${c('done')}`);
  if (invalid.length) console.log('WARN 账本问题：' + invalid.join('；'));
  if (!n) { console.log('NEXT NONE 全部完成或全部阻塞'); return; }
  console.log(`NEXT ${n.task.id} | ${n.task.title}${n.resumed ? '（续跑）' : ''}`);
  const missing = depsMissing(data, n.task);
  if (missing.length) console.log(`WARN 依赖未完成：${missing.join(',')}`);
  // 闸门预检：任务已声明文件时，逐个按 Write 预判是否会拒
  for (const f of n.task.files || []) {
    const d = guardDecide('Write', { file_path: f });
    if (d.decision !== 'allow') console.log(`GUARD ${f} -> ${d.decision}：${d.reason}`);
  }
}

function cmdGuard() {
  const tool = getArg('tool');
  const raw = getArg('input');
  if (!tool || !raw) { console.error('需要 --tool 与 --input'); process.exit(1); }
  let input;
  try { input = JSON.parse(raw); } catch (e) { console.error('--input 不是合法 JSON: ' + e.message); process.exit(1); }
  const d = guardDecide(tool, input);
  if (asJson) console.log(JSON.stringify(d, null, 2));
  else console.log(`${d.decision.toUpperCase()} ${tool} | ${d.reason}`);
}

function cmdStatus() {
  const file = findLedger(getArg('file'));
  if (!file) { console.log('LEDGER NONE'); return; }
  const { data } = readLedger(file);
  const invalid = validateLedger(data);
  const stats = ['todo', 'doing', 'blocked', 'done'].map(k => `${k}=${data.tasks.filter(t => t.status === k).length}`).join(' ');
  console.log(`${path.relative(cwd, file).split(path.sep).join('/')} | ${data.tier} | ${stats} | invalid=${invalid.length}`);
  for (const t of data.tasks) console.log(`  ${t.status.padEnd(7)} ${t.id} ${t.title}${t.evidence ? ' | ' + t.evidence : ''}`);
}

function cmdFinish() {
  const file = findLedger(getArg('file'));
  if (!file) { console.error('LEDGER NONE，无法验收'); process.exit(1); }
  const { data } = readLedger(file);
  const invalid = validateLedger(data);
  const r = spawnSync(process.execPath, [stopScript, '--cwd', cwd, '--file', file], { encoding: 'utf8' });
  let gate = null;
  try { gate = JSON.parse((r.stdout || '').trim()); } catch { /* 解析失败按未放行 */ }
  const rel = path.relative(cwd, file).split(path.sep).join('/');
  const allow = gate && gate.continue === true && invalid.length === 0;
  if (asJson) {
    console.log(JSON.stringify({ ledger: rel, allow, gate, invalid }, null, 2));
  } else {
    console.log(`LEDGER ${rel}`);
    console.log(`VALIDATE ${invalid.length ? 'FAIL ' + invalid.join('；') : 'OK'}`);
    console.log(`STOPGATE ${allow ? 'ALLOW' : 'BLOCK'} | ${gate ? JSON.stringify(gate) : '闸门输出无法解析'}`);
    const undone = data.tasks.filter(t => t.status !== 'done');
    if (undone.length) console.log('未完成：' + undone.map(t => `${t.id}(${t.status})`).join(' '));
  }
  process.exitCode = allow ? 0 : 1;
}

try {
  if (cmd === 'plan') cmdPlan();
  else if (cmd === 'run') cmdRun();
  else if (cmd === 'clean') cmdClean();
  else if (cmd === 'step') cmdStep();
  else if (cmd === 'guard') cmdGuard();
  else if (cmd === 'status') cmdStatus();
  else if (cmd === 'finish') cmdFinish();
  else {
    console.error('用法: plan | run | clean | step | guard | status | finish（详见文件头注释）');
    process.exit(1);
  }
} catch (e) {
  console.error('FAIL ' + (e && e.message));
  process.exit(1);
}
