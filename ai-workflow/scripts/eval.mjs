#!/usr/bin/env node
// ai-workflow 评测 / 基准助手。零依赖、零 LLM、默认输出极简（省 token 第一位）。
// 用法：
//   node scripts/eval.mjs trigger [--json] [--file <evals.json>] [--out <结果目录>]
//   node scripts/eval.mjs record <with_skill|baseline> <evalId> --pass 3/4 --tokens 12345 --ms 23400 [--iter 1] [--note "..."]
//   node scripts/eval.mjs compare [--iter 1] [--json] [--out <结果目录>]
//   node scripts/eval.mjs snapshot <目录>              # 改包前存快照（仅文本+各技能 SKILL.md，不搬资源）
//   node scripts/eval.mjs diff <快照目录> [--json]      # 0 LLM 对比两版 F1 + 用例级 GAIN/LOSS
// 安全：绝不自动改技能、不自动提交、不调 LLM、不估算 token（缺实测值直接报错）。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(scriptDir, '..');
const DEF_EVALS = path.join(pkgRoot, 'evals', 'evals.json');
const DEF_OUT = path.join(pkgRoot, 'eval-results');
const routeScript = path.join(scriptDir, 'route.mjs');

const argv = process.argv.slice(2);
const cmd = argv[0];
const asJson = argv.includes('--json');
function opt(name, def) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : def;
}
const evalsFile = opt('--file', DEF_EVALS);
const outDir = opt('--out', DEF_OUT);
const iter = Number(opt('--iter', '1'));

function die(msg) { console.log('ERROR ' + msg); process.exit(1); }
function fmtK(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n)); }
function fmtS(ms) { return (ms / 1000).toFixed(1) + 's'; }
function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function sd(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map(x => (x - m) ** 2)));
}
function loadEvals() {
  if (!fs.existsSync(evalsFile)) die(`用例集不存在: ${evalsFile}`);
  try { return JSON.parse(fs.readFileSync(evalsFile, 'utf8')); }
  catch (e) { die(`用例集 JSON 非法: ${e.message}`); }
}

// ---------- ① 触发准确率：复用真实 route.mjs 打分，零 LLM ----------
function runTrigger(routePath, cases) {
  return cases.map(c => {
    let out = '';
    try {
      out = execFileSync(process.execPath, [routePath, c.query], {
        encoding: 'utf8', timeout: 15000, cwd: pkgRoot,
        windowsHide: true, stdio: ['ignore', 'pipe', 'ignore']
      });
    } catch { out = 'ROUTE_NONE'; }
    const first = out.split('\n').find(l => /^\d+\.\s+\S+/.test(l.trim())) || '';
    const m = first.trim().match(/^\d+\.\s+(\S+)/);
    const hit = out.includes('ROUTE_NONE') ? null : (m ? m[1] : null);
    const correct = c.should_trigger
      ? (hit !== null && (!c.expect || hit === c.expect))
      : (hit === null);
    const kind = c.should_trigger ? (correct ? 'TP' : 'FN') : (correct ? 'TN' : 'FP');
    return { id: c.id, query: c.query, expect: c.expect ?? null, hit, kind };
  });
}
function metrics(rows) {
  const n = rows.length;
  const cnt = k => rows.filter(r => r.kind === k).length;
  const TP = cnt('TP'), TN = cnt('TN'), FP = cnt('FP'), FN = cnt('FN');
  const P = TP + FP ? TP / (TP + FP) : 0;
  const R = TP + FN ? TP / (TP + FN) : 0;
  return { n, TP, TN, FP, FN, P, R,
    F1: P + R ? 2 * P * R / (P + R) : 0, acc: n ? (TP + TN) / n : 0 };
}
function doTrigger() {
  const cases = loadEvals().trigger_cases || [];
  if (!cases.length) die('trigger_cases 为空');
  if (!fs.existsSync(routeScript)) die(`路由脚本缺失: ${routeScript}`);
  const rows = runTrigger(routeScript, cases);
  const m = metrics(rows), f = x => x.toFixed(2);
  const misses = rows.filter(r => r.kind === 'FP' || r.kind === 'FN');
  if (asJson) {
    console.log(JSON.stringify({ n: m.n, accuracy: m.acc, precision: m.P, recall: m.R,
      f1: m.F1, TP: m.TP, TN: m.TN, FP: m.FP, FN: m.FN, rows }, null, 2));
    return;
  }
  console.log(`TRIGGER n=${m.n} acc=${f(m.acc)} P=${f(m.P)} R=${f(m.R)} F1=${f(m.F1)} | TP=${m.TP} TN=${m.TN} FP=${m.FP} FN=${m.FN}`);
  if (misses.length) {
    console.log(`MISS(${misses.length}) ` + misses.slice(0, 4).map(r =>
      `#${r.id} ${r.kind}→${r.hit || 'ROUTE_NONE'}`).join('  '));
    if (misses.length > 4) console.log(`…另有 ${misses.length - 4} 条，--json 查看明细`);
    console.log('注：误命中/漏命中都是真实暴露，不要删用例凑全绿；据此收紧或补充触发词再测。');
  } else console.log('MISS(0) 全部用例符合预期');
}

// ---------- ④ 版本快照 / 确定性跨版本对比（0 LLM，控制变量） ----------
// 手动递归复制：部分 Windows/沙箱环境下 fs.cpSync({recursive:true}) 会让 node 静默以 127 退出
function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyTree(s, d);
    else if (e.isFile()) fs.copyFileSync(s, d);
  }
}
function doSnapshot() {
  const dest = argv[1];
  if (!dest) die('缺快照目录（建议放包同级，使两版 hostRoot 扫描一致）');
  const abs = path.resolve(dest);
  if (abs === pkgRoot) die('快照目录不可与包自身相同');
  fs.mkdirSync(abs, { recursive: true });
  fs.copyFileSync(path.join(pkgRoot, 'SKILL.md'), path.join(abs, 'SKILL.md'));
  // catalog.json 是 route.mjs 的首选输入（缺它就会退回只读 SKILL.md，丢掉 触发词/syncs/negatives，
  // 造成「假回归」：同一份代码 diff 出 ΔF1=-0.47）。必须一起快照，才算真正控制变量。
  for (const f of ['catalog.json']) {
    const s = path.join(pkgRoot, f);
    if (fs.existsSync(s)) fs.copyFileSync(s, path.join(abs, f));
  }
  for (const d of ['scripts', 'evals', 'references']) {
    const s = path.join(pkgRoot, d);
    if (fs.existsSync(s)) copyTree(s, path.join(abs, d));
  }
  // 只搬每个技能的 SKILL.md（route.mjs 仅读它），不搬 77MB 资源；技能集合与当前包一致 = 控制变量
  const srcSkills = path.join(pkgRoot, 'skills'), dstSkills = path.join(abs, 'skills');
  fs.mkdirSync(dstSkills, { recursive: true });
  let n = 0;
  for (const name of fs.readdirSync(srcSkills)) {
    const sk = path.join(srcSkills, name, 'SKILL.md');
    if (!fs.existsSync(sk)) continue;
    fs.mkdirSync(path.join(dstSkills, name), { recursive: true });
    fs.copyFileSync(sk, path.join(dstSkills, name, 'SKILL.md'));
    n++;
  }
  console.log(`SNAPSHOT ${abs} | 文本脚本+用例+${n} 个 SKILL.md（不含资源，控制变量）`);
}

function doDiff() {
  const snap = argv[1];
  if (!snap || !fs.existsSync(snap)) die('缺快照目录或不存在（先 snapshot）');
  const oldRoute = path.join(snap, 'scripts', 'route.mjs');
  if (!fs.existsSync(oldRoute)) die(`快照缺 route.mjs: ${oldRoute}`);
  const cases = loadEvals().trigger_cases || [];
  if (!cases.length) die('trigger_cases 为空');
  const oldRows = runTrigger(oldRoute, cases);   // 同一用例集、同一技能集合
  const newRows = runTrigger(routeScript, cases);
  const o = metrics(oldRows), v = metrics(newRows);
  const good = k => k === 'TP' || k === 'TN';
  const gains = [], losses = [];
  for (let i = 0; i < cases.length; i++) {
    const a = oldRows[i].kind, b = newRows[i].kind;
    if (a === b) continue;
    if (good(b) && !good(a)) gains.push(`#${cases[i].id} ${a}→${b}`);
    else if (good(a) && !good(b)) losses.push(`#${cases[i].id} ${a}→${b}`);
  }
  const f = x => x.toFixed(2), sg = x => (x >= 0 ? '+' : '') + x.toFixed(2);
  if (asJson) {
    console.log(JSON.stringify({ old: o, new: v,
      delta: { f1: v.F1 - o.F1, acc: v.acc - o.acc, FP: v.FP - o.FP, FN: v.FN - o.FN },
      gains, losses }, null, 2));
    return;
  }
  console.log(`DIFF old F1=${f(o.F1)} acc=${f(o.acc)} FP=${o.FP} FN=${o.FN} → new F1=${f(v.F1)} acc=${f(v.acc)} FP=${v.FP} FN=${v.FN} | ΔF1=${sg(v.F1 - o.F1)} ΔFP=${v.FP - o.FP}`);
  console.log(`GAIN(${gains.length}) ` + (gains.slice(0, 4).join('  ') || '无') + (gains.length > 4 ? ` …另${gains.length - 4}条` : ''));
  console.log(`LOSS(${losses.length}) ` + (losses.slice(0, 4).join('  ') || '无') + (losses.length > 4 ? ` …另${losses.length - 4}条` : ''));
  console.log(v.F1 > o.F1 && !losses.length ? 'VERDICT 新版本更好（F1↑ 且零回归）'
    : v.F1 < o.F1 || losses.length ? 'VERDICT 存在回归，禁止宣称更好'
    : 'VERDICT 无显著差异（F1 持平）');
}

// ---------- ② 记录一次真实任务结果（只记，不重跑、不估算） ----------
function doRecord() {
  const config = argv[1], evalId = argv[2];
  if (!['with_skill', 'baseline'].includes(config)) die('config 必须是 with_skill | baseline');
  if (!evalId) die('缺 evalId');
  const passRaw = opt('--pass', null);
  const tokensRaw = opt('--tokens', null);
  const msRaw = opt('--ms', null);
  if (!passRaw || !/^\d+\/\d+$/.test(passRaw)) die('缺 --pass <已通过>/<总断言>（必须实测，不可估算）');
  if (!tokensRaw || !/^\d+$/.test(tokensRaw)) die('缺 --tokens <实测 total_tokens>（只在任务结束时可得）');
  if (!msRaw || !/^\d+$/.test(msRaw)) die('缺 --ms <实测 duration_ms>');
  const [passed, total] = passRaw.split('/').map(Number);
  if (total <= 0 || passed > total) die('--pass 数值非法');
  const rec = {
    eval_id: evalId, config, iter, passed, total,
    pass_rate: +(passed / total).toFixed(4),
    total_tokens: Number(tokensRaw), duration_ms: Number(msRaw),
    note: opt('--note', ''), captured_at: new Date().toISOString()
  };
  const dir = path.join(outDir, `iteration-${iter}`, config);
  fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, `eval-${evalId}.json`);
  fs.writeFileSync(fp, JSON.stringify(rec, null, 2));
  console.log(`RECORDED iter=${iter} ${config}/eval-${evalId} pass=${passed}/${total} tokens=${fmtK(rec.total_tokens)} ms=${fmtS(rec.duration_ms)}`);
}

// ---------- ③ 对比 with_skill vs baseline ----------
function doCompare() {
  const base = path.join(outDir, `iteration-${iter}`);
  function collect(config) {
    const dir = path.join(base, config);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
      catch { return null; }
    }).filter(Boolean);
  }
  function stat(rows) {
    return {
      n: rows.length,
      pass: mean(rows.map(r => r.pass_rate)), passSd: sd(rows.map(r => r.pass_rate)),
      tokens: mean(rows.map(r => r.total_tokens)), tokensSd: sd(rows.map(r => r.total_tokens)),
      ms: mean(rows.map(r => r.duration_ms)), msSd: sd(rows.map(r => r.duration_ms))
    };
  }
  const A = collect('with_skill'), B = collect('baseline');
  if (!A.length) die(`iteration-${iter} 无 with_skill 结果（先 record）`);
  const a = stat(A), b = B.length ? stat(B) : null;
  if (asJson) { console.log(JSON.stringify({ iter, with_skill: a, baseline: b }, null, 2)); return; }
  const line = (name, s) => `${name.padEnd(10)} n=${s.n} pass=${s.pass.toFixed(2)}±${s.passSd.toFixed(2)} tokens=${fmtK(s.tokens)}±${fmtK(s.tokensSd)} ms=${fmtS(s.ms)}±${fmtS(s.msSd)}`;
  console.log(`COMPARE iter=${iter}`);
  console.log(line('with_skill', a));
  if (!b) {
    console.log('baseline  无数据 —— 需同轮采集 baseline，否则 delta 不可信');
    return;
  }
  console.log(line('baseline', b));
  const dp = a.pass - b.pass, dt = a.tokens - b.tokens, dm = a.ms - b.ms;
  const pct = (d, baseV) => baseV ? `${((d / baseV) * 100).toFixed(0)}%` : 'n/a';
  console.log(`DELTA     pass ${dp >= 0 ? '+' : ''}${dp.toFixed(2)}  tokens ${dt >= 0 ? '+' : ''}${fmtK(dt)} (${pct(dt, b.tokens)})  time ${dm >= 0 ? '+' : ''}${fmtS(dm)} (${pct(dm, b.ms)})`);
  console.log(dp > 0 && dt < 0 ? 'VERDICT   产出更好且更省 token ✅' : 'VERDICT   未同时达成「pass↑ 且 tokens↓」，继续迭代');
}

// ---------- ⑥ 定档准确率：跑真实 classify.mjs，零 LLM ----------
function doTier() {
  const cases = loadEvals().tier_cases || [];
  if (!cases.length) die('tier_cases 为空（在 evals.json 里补 {"query","expect"}）');
  const cls = path.join(scriptDir, 'classify.mjs');
  if (!fs.existsSync(cls)) die(`定档脚本缺失: ${cls}`);
  const rows = cases.map(c => {
    let out = '';
    try {
      out = execFileSync(process.execPath, [cls, c.query], {
        encoding: 'utf8', timeout: 15000, cwd: pkgRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore']
      });
    } catch { out = ''; }
    const m = out.match(/TIER=(L[012])/);
    const got = m ? m[1] : 'ERR';
    const ok = got === c.expect;
    return { id: c.id, query: c.query, expect: c.expect, got, ok };
  });
  const ok = rows.filter(r => r.ok).length;
  const acc = rows.length ? ok / rows.length : 0;
  const confuse = {};
  for (const r of rows) if (!r.ok) { const k = `${r.expect}->${r.got}`; confuse[k] = (confuse[k] || 0) + 1; }
  if (asJson) { console.log(JSON.stringify({ n: rows.length, accuracy: acc, ok, rows }, null, 2)); return; }
  console.log(`TIER n=${rows.length} acc=${acc.toFixed(2)} ok=${ok}/${rows.length}`);
  const ks = Object.keys(confuse);
  if (ks.length) {
    console.log('CONFUSE ' + ks.map(k => `${k} x${confuse[k]}`).join('  '));
    console.log('MISS ' + rows.filter(r => !r.ok).slice(0, 5).map(r => `#${r.id} ${r.expect}->${r.got}`).join('  '));
  } else console.log('CONFUSE 0');
  console.log('注：高估档位=多花 token，低估档位=漏闸门，两者都要看，不要只盯 acc。');
}

if (cmd === 'trigger') doTrigger();
else if (cmd === 'record') doRecord();
else if (cmd === 'compare') doCompare();
else if (cmd === 'snapshot') doSnapshot();
else if (cmd === 'diff') doDiff();
else if (cmd === 'tier') doTier();
else console.log('eval.mjs: trigger | tier | record | compare | snapshot | diff   （评测按需手动触发，不进每轮六步）');
