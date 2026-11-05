#!/usr/bin/env node
// agent.mjs — 子代理编排器（确定性、零 LLM）：派谁、给什么上下文、怎么收口，先算好再交给人/模型。
// 用法：
//   node scripts/agent.mjs plan "<任务>" [--parallel 2] [--save]
//   node scripts/agent.mjs review [--base HEAD~1] [--phase both]
//   node scripts/agent.mjs budget [路径...] [--max 40]
//   node scripts/agent.mjs check
// 设计：只读仓库，只写 .ai-workflow/，输出短（省 token），不联网。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const ROOT = process.cwd();
const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = new Set(argv.filter(a => a.startsWith('--')));
function opt(n, d) { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; }
// 通用参数解析：--flag 后面若紧跟非 -- 开头的词，视为该 flag 的值（不会被当成任务文本）。
const FLAGS_WITH_VALUE = new Set(['--parallel', '--base', '--max', '--phase', '--scope', '--accept', '--cmd', '--host', '--file', '--out']);
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) { if (FLAGS_WITH_VALUE.has(a)) i++; continue; }
  pos.push(a);
}
const text = pos.slice(1).join(' ').trim();

function js(script, args) {
  try {
    return execFileSync(process.execPath, [path.join(HERE, script), ...args], {
      encoding: 'utf8', cwd: ROOT, timeout: 20000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch { return ''; }
}
function stamp() { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); }
function save(dir, name, body) {
  const d = path.join(ROOT, '.ai-workflow', dir);
  fs.mkdirSync(d, { recursive: true });
  const f = path.join(d, name);
  fs.writeFileSync(f, body, 'utf8');
  return path.relative(ROOT, f).replace(/\\/g, '/');
}
function cjk(s) { return (s.match(/[\u3000-\u9fff\uff00-\uffef]/g) || []).length; }
function estTokens(s) { return Math.round(cjk(s) * 0.95 + (s.length - cjk(s)) / 3.6); }

// ---------- plan：定档 + 选技能 + 决定派几个子代理 + 出派工单 ----------
function doPlan() {
  if (!text) { console.log('用法：agent.mjs plan "<任务>" [--parallel 2] [--save]'); process.exit(1); }
  let tier = 'L1', cls = {}, route = [];
  try { cls = JSON.parse(js('classify.mjs', [text, '--json']) || '{}'); } catch {}
  try { route = (JSON.parse(js('route.mjs', [text, '--json']) || '{}').route) || []; } catch {}
  if (cls.tier) tier = cls.tier;

  // 子代理数量：确定性映射。L0 不派（派出去的钱比活贵）；L1 最多 1 个只读审查；L2 三段式。
  const cap = Number(opt('--parallel', tier === 'L2' ? 3 : tier === 'L1' ? 1 : 0));
  const roles = tier === 'L0' ? []
    : tier === 'L1' ? (cap >= 1 ? ['reviewer'] : [])
    : ['scout', 'builder', 'reviewer'];

  const out = [];
  out.push('# 派工单 · ' + text);
  out.push('');
  out.push('- 档位：' + tier + (cls.reason ? ' · ' + cls.reason : ''));
  out.push('- 环：' + (cls.rings || '-') + ' · 技能预算：' + (cls.budget || '-'));
  out.push('- 技能：' + (route.length ? route.map(r => r.name + '(' + r.score + ')').join(' → ') : '无（按通用纪律）'));
  out.push('- 闸门：' + (cls.gate || '-') + (cls.risk ? ' · **含不可逆动作，先停等确认**' : ''));
  out.push('- 子代理：' + (roles.length ? roles.length + ' 个（' + roles.join(' → ') + '）' : '0 个（自己做完更快）'));
  out.push('');
  const T = {
    scout: ['只读侦察', '把事实凑齐，产出可引用的证据',
      '1) 列出与本任务相关的文件与符号（`path:line`）。2) 现有实现/契约是什么。3) 有哪些已存在的可复用件。4) 不确定点按可信度排序。',
      '不得编辑任何文件；不得给"建议方案"，只给事实与证据。'],
    builder: ['单写者实现', '在最小责任层完成改动并自证',
      '1) 先复述验收条件。2) 只改必要文件；同一文件在任一时刻只有一个写者。3) 跑受影响测试/类型检查。4) 交付真实命令与退出码。',
      '无命令输出即未完成；不得改与验收无关的文件；超范围先停。'],
    reviewer: ['独立审查', '两阶段：规格合规 → 代码质量',
      '1) 逐条比对验收条件，给 PASS/FAIL + 证据。2) 再看质量：路径正确性、边界、错误处理、测试覆盖、死代码。3) 每条 findings 必须给 `path:line`。',
      '全程只读；禁止"看起来没问题"这类无证据结论；不顺手修。'],
  };
  for (const r of roles) {
    const [title, goal, steps, forbid] = T[r];
    out.push('## ' + r + ' · ' + title);
    out.push('- 目标：' + goal);
    out.push('- 步骤：' + steps);
    out.push('- 禁止：' + forbid);
    out.push('- 交付：' + (r === 'reviewer' ? 'SPEC: PASS|FAIL + QUALITY: PASS|FAIL|WARN，每行带 path:line' : '结论 + 证据（命令、退出码、diff 摘要）'));
    out.push('');
  }
  out.push('## 并行纪律');
  out.push('- 可并行：只读侦察、多个目录的检索、独立测试套件。');
  out.push('- 不可并行：同一文件的编辑；有依赖关系的步骤（后一步要用前一步的产物）。');
  out.push('- 写者唯一：任一时刻只有一个子代理能写同一个文件；冲突即回退到串行。');
  out.push('');
  out.push('## 收口');
  out.push('- 子代理的自述不算证据：只看命令输出、diff、截图 JSON。');
  out.push('- 审查不过 → 回到 builder，最多两轮；两轮不过就停下问用户。');

  const md = out.join('\n');
  if (flags.has('--save')) {
    const f = save('plans', stamp() + '-plan.md', md);
    const head = out.slice(0, 7).join('\n');
    console.log(head.replace(/^# /, 'PLAN ') + '\n派工单 ' + f);
  } else {
    console.log(md);
  }
}

// ---------- review：圈定 diff 范围 + 出两阶段审查单（喂给全新只读子代理） ----------
function git(args) {
  try { return execFileSync('git', args, { encoding: 'utf8', cwd: ROOT, timeout: 15000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}
function doReview() {
  const base = opt('--base', 'HEAD');
  const phase = opt('--phase', 'both');
  const inGit = git(['rev-parse', '--is-inside-work-tree']) === 'true';
  if (!inGit) { console.log('ERROR 当前目录不是 git 仓库：审查需要一个可 diff 的范围。先 git init 或指定 --base。'); process.exit(1); }
  const changed = git(['diff', '--name-only', base]).split('\n').filter(Boolean);
  const staged = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
  const dirty = git(['status', '--porcelain']).split('\n').filter(Boolean).map(l => l.slice(3)).filter(Boolean);
  const files = [...new Set([...changed, ...staged, ...dirty])];
  const stat = git(['diff', '--stat', base]) || git(['diff', '--stat']);
  const out = [];
  out.push('# 审查单 · base=' + base);
  out.push('');
  out.push('改动文件（' + files.length + '）：' + (files.length ? files.join(', ') : '无'));
  out.push('');
  out.push('```');
  out.push(stat || '(无 diff 统计)');
  out.push('```');
  out.push('');
  out.push('## 交给谁');
  out.push('派一个**全新、只读**的子代理（不带自己的实现上下文，避免自我背书）。工作目录：' + ROOT);
  out.push('');
  if (phase !== 'quality') {
    out.push('### 阶段一 · 规格合规');
    out.push('逐条对照验收条件，回答：每条是否满足？证据在哪（`path:line` 或命令输出）？有没有做了没被要求的改动？');
    out.push('输出：`SPEC: PASS|FAIL` + 每条的判定与证据。');
    out.push('');
  }
  if (phase !== 'spec') {
    out.push('### 阶段二 · 代码质量（只在阶段一 PASS 后做）');
    out.push('边界与空值、错误处理、并发/幂等、命名与分层、死代码与重复、测试是否真能失败、可回滚性。');
    out.push('每条 findings 一行：`path:line — 问题 — 修法`，按严重度排序。');
    out.push('输出：`QUALITY: PASS|FAIL|WARN` + findings。');
    out.push('');
  }
  out.push('## 硬约束');
  out.push('- 只读：不许编辑、不许 git 操作、不许"顺手修"。');
  out.push('- 无证据的结论视为无效；`看起来没问题` 不是结论。');
  out.push('- 不确定就写"不确定，需要 X 才能判断"。');
  const md = out.join('\n');
  const f = save('reviews', stamp() + '-review.md', md);
  console.log('REVIEW base=' + base + ' files=' + files.length + ' phase=' + phase);
  console.log('审查单 ' + f);
  if (files.length) console.log('范围 ' + files.slice(0, 8).join(' ') + (files.length > 8 ? ' …' : ''));
}

// ---------- budget：载入前先算 token，别读完了才后悔 ----------
function doBudget() {
  const maxK = Number(opt('--max', '40'));
  let targets = pos.slice(1);
  if (!targets.length) {
    const sk = path.join(PKG, 'skills');
    if (fs.existsSync(sk)) for (const n of fs.readdirSync(sk)) {
      const f = path.join(sk, n, 'SKILL.md');
      if (fs.existsSync(f)) targets.push(path.relative(ROOT, f));
    }
    for (const f of ['catalog.json']) {
      const q = path.join(PKG, f);
      if (fs.existsSync(q)) targets.push(path.relative(ROOT, q));
    }
    const rf = path.join(PKG, 'references');
    if (fs.existsSync(rf)) for (const n of fs.readdirSync(rf)) targets.push(path.relative(ROOT, path.join(rf, n)));
  }
  const rows = [];
  let total = 0;
  for (const t of targets) {
    let s = '';
    try { s = fs.readFileSync(path.resolve(ROOT, t), 'utf8'); } catch { continue; }
    const tk = estTokens(s);
    total += tk;
    rows.push({ t, tk, lines: s.split('\n').length });
  }
  rows.sort((a, b) => b.tk - a.tk);
  const over = rows.filter(r => r.tk > maxK * 1000);
  console.log('BUDGET files=' + rows.length + ' est=' + (total / 1000).toFixed(1) + 'K tokens  阈值=' + maxK + 'K/文件');
  for (const r of rows.slice(0, 12)) {
    console.log('  ' + String(r.tk).padStart(6) + '  ' + String(r.lines).padStart(5) + 'L  ' + r.t);
  }
  if (over.length) {
    console.log('超阈值（改成分段读，别整份载入）：');
    for (const r of over) console.log('  ' + r.t + ' ≈' + (r.tk / 1000).toFixed(1) + 'K → 先读前 80 行 + grep 定位，再读命中段');
  }
  console.log('提示：技能描述常驻开销已由 catalog.json + references/dispatch-table.md 承担，别再整份读 SKILL.md 正文。');
}

// ---------- check：技能与派工单自检 ----------
function doCheck() {
  const sk = path.join(PKG, 'skills');
  const names = fs.existsSync(sk) ? fs.readdirSync(sk).filter(n => fs.existsSync(path.join(sk, n, 'SKILL.md'))) : [];
  let long = 0, noDesc = 0;
  for (const n of names) {
    const txt = fs.readFileSync(path.join(sk, n, 'SKILL.md'), 'utf8');
    const m = txt.match(/^description:\s*(?:['"])([\s\S]*?)(?:['"])\s*$/m) || txt.match(/^description:\s*(.+)$/m);
    const d = m ? m[1] : '';
    if (!d) { noDesc++; console.log('  NO_DESC ' + n); }
    else if (d.length > 260) { long++; console.log('  LONG(' + d.length + ') ' + n); }
  }
  const hasAgent = fs.existsSync(path.join(PKG, 'scripts', 'agent.mjs'));
  console.log('CHECK skills=' + names.length + ' longDesc=' + long + ' noDesc=' + noDesc + ' agent.mjs=' + (hasAgent ? 'ok' : 'MISSING'));
}

// ---------- contract：结构化派工对象（对齐 references/parallel.md，子代理只拿这个） ----------
function doContract() {
  if (!text) { console.log('用法：agent.mjs contract "<任务>" [--scope a.ts,b.ts] [--accept "条件1;条件2"] [--json]'); process.exit(1); }
  let tier = 'L1', route = [];
  try { tier = (JSON.parse(js('classify.mjs', [text, '--json']) || '{}').tier) || 'L1'; } catch {}
  try { route = (JSON.parse(js('route.mjs', [text, '--json']) || '{}').route) || []; } catch {}
  const scope = (opt('--scope', '') || '').split(',').map(x => x.trim()).filter(Boolean);
  const accept = (opt('--accept', '') || '').split(';').map(x => x.trim()).filter(Boolean);
  const dirty = (git(['status', '--porcelain']) || '').split('\n').filter(Boolean).map(l => l.slice(3).trim()).filter(Boolean);
  const obj = {
    task: text,
    tier,
    skills: route.map(r => r.name),
    scope: scope.length ? scope : '(控制器填：只列本子任务独占的文件/目录)',
    constraints: ['不改与验收无关的文件', '同一文件任一时刻只有一个写者', '保留现有公开接口与用户改动'],
    acceptance: accept.length ? accept : ['(控制器填：可判定的验收条件，每条能被命令/截图证实)'],
    output_schema: { files_modified: ['string'], evidence: ['命令 + 退出码 / 截图 JSON / path:line'], summary: 'string', blocked: { reason: 'string', needs: 'string' } },
    forbid: ['整段父会话历史', '控制器自己的结论', '在只读角色里编辑文件'],
  };
  if (flags.has('--json')) {
    console.log(JSON.stringify(obj, null, 2));
    return;
  }
  const f = save('contracts', stamp() + '-contract.json', JSON.stringify(obj, null, 2));
  console.log('CONTRACT ' + f + '  tier=' + tier + ' scope=' + (scope.length || '待填'));
  if (dirty.length) console.log('注意：工作区已有 ' + dirty.length + ' 个未提交改动，scope 要避开它们或明确接管');
}

// ---------- hooks：把纪律变成自动触发（对齐 references/hooks.md） ----------
function doHooks() {
  const host = opt('--host', 'claude');
  const H = {
    SessionStart: 'node scripts/start.mjs',
    PreToolUse: 'node scripts/agent.mjs guard --json',
    PostToolUse: 'node scripts/git-atomic.mjs plan --json',
    Stop: 'node scripts/agent.mjs review --base HEAD --json',
  };
  if (host === 'claude') {
    const cfg = {
      hooks: {
        SessionStart: [{ hooks: [{ type: 'command', command: H.SessionStart }] }],
        PreToolUse: [{ matcher: 'Write|Edit|Bash', hooks: [{ type: 'command', command: H.PreToolUse }] }],
        PostToolUse: [{ matcher: 'Edit|Write', hooks: [{ type: 'command', command: H.PostToolUse }] }],
        Stop: [{ hooks: [{ type: 'command', command: H.Stop }] }],
      },
    };
    const f = save('hooks', stamp() + '-claude-settings.json', JSON.stringify(cfg, null, 2));
    console.log('HOOKS claude -> ' + f);
    console.log('用法：把 hooks 段合并进 .claude/settings.json（不要整份覆盖已有键）');
  } else {
    console.log('HOOKS ' + host + '：该宿主钩子字段各不相同，按下表手动接，命令已备好：');
    for (const [k, v] of Object.entries(H)) console.log('  ' + k + ' → ' + v);
  }
  console.log('红线：钩子不得自动 commit/push/reset、不得装插件、不得改技能文件；单次 <2s。');
}

// ---------- guard：PreToolUse 用的危险动作闸门（只读判断，永远 exit 0，靠 JSON 表达） ----------
function doGuard() {
  const cmdText = opt('--cmd', '') || text;
  const hits = [];
  const rules = [
    [/(^|\s)rm\s+-[a-z]*[rf]/i, '递归删除：确认目标路径，优先 git restore / 移到回收站'],
    [/\bgit\s+(push|reset\s+--hard|clean\s+-[a-z]*f)/i, '不可逆 git 操作：先确认分支与未提交改动'],
    [/\b(drop\s+(table|database)|truncate\s+table)\b/i, '破坏性 SQL：先备份，再在事务里跑'],
    [/(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY)/, '疑似密钥：写进代码或日志即泄漏，改用环境变量'],
    [/\b(curl|wget)[^|]*\|\s*(ba)?sh\b/, '管道执行远程脚本：先下载读一遍再执行'],
    [/>>?\s*\/dev\/null\s*2>&1\s*$/, '吞掉全部输出：会制造"看起来成功"的假证据'],
  ];
  for (const [re, msg] of rules) if (re.test(cmdText)) hits.push(msg);
  const res = { ok: hits.length === 0, warnings: hits, command: cmdText.slice(0, 200) };
  if (flags.has('--json')) console.log(JSON.stringify(res, null, 2));
  else if (!hits.length) console.log('GUARD ok');
  else { console.log('GUARD ' + hits.length + ' 条提醒（不阻断，但要先回答）：'); hits.forEach(h => console.log('  - ' + h)); }
}

// ---------- handoff：跨会话接力卡（对齐 references/long-tasks.md） ----------
function doHandoff() {
  const cp = path.join(ROOT, '.ai-workflow', 'checkpoint.json');
  let task = text || '(未命名)', steps = [];
  try {
    const s = JSON.parse(fs.readFileSync(cp, 'utf8'));
    task = text || s.task || task;
    steps = (s.steps || []).map(x => (typeof x === 'string' ? { name: x, status: 'pending' } : x));
  } catch {}
  const files = (git(['status', '--porcelain']) || '').split('\n').filter(Boolean).map(l => l.slice(3).trim()).filter(Boolean);
  const L = [];
  L.push('# HANDOFF · ' + task);
  L.push('');
  L.push('生成于 ' + new Date().toISOString().slice(0, 19).replace('T', ' '));
  L.push('');
  L.push('## 下一步（从这里接着做，别整任务重跑）');
  const next = steps.find(s => s.status !== 'done');
  L.push(next ? '- ' + next.name : '- （无剩余步骤；先确认验收再关账）');
  L.push('');
  L.push('## 进度');
  if (steps.length) for (const s of steps) L.push('- [' + (s.status === 'done' ? 'x' : ' ') + '] ' + s.name + (s.note ? ' — ' + s.note : ''));
  else L.push('- （未建检查点：先 `node scripts/checkpoint.mjs start "<任务>" --steps "a|b|c"`）');
  L.push('');
  L.push('## 未提交改动（' + files.length + '）');
  files.slice(0, 30).forEach(f => L.push('- ' + f));
  if (files.length > 30) L.push('- …共 ' + files.length + ' 个');
  L.push('');
  L.push('## 已知的坑');
  L.push('- （上一个会话踩过的坑写这里：报错原文、错误假设、已排除的方向）');
  const md = L.join('\n');
  const f = save('handoff', stamp() + '-HANDOFF.md', md);
  const rootCopy = path.join(ROOT, 'HANDOFF.md');
  try { fs.writeFileSync(rootCopy, md, 'utf8'); } catch {}
  console.log('HANDOFF ' + f + (fs.existsSync(rootCopy) ? ' (+ HANDOFF.md)' : ''));
  console.log('下一步 ' + (next ? next.name : '确认验收'));
}

if (cmd === 'plan') doPlan();
else if (cmd === 'review') doReview();
else if (cmd === 'budget') doBudget();
else if (cmd === 'check') doCheck();
else if (cmd === 'contract') doContract();
else if (cmd === 'hooks') doHooks();
else if (cmd === 'guard') doGuard();
else if (cmd === 'handoff') doHandoff();
else console.log('agent.mjs: plan "<任务>" | contract "<任务>" | review [--base X] | budget [路径] | hooks [--host claude] | guard --cmd "…" | handoff | check');
