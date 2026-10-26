#!/usr/bin/env node
/**
 * 模型行为评测检查器：按场景准备沙箱，或对沙箱+回复做断言。
 * 用法：
 *   node scripts/behavior-check.mjs prepare --scenario <id> --sandbox <目录>
 *   node scripts/behavior-check.mjs check   --scenario <id> --sandbox <目录> --response <回复文件>
 * 只读场景定义；prepare 只写沙箱目录。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const cfgPath = path.join(root, 'tests', 'behavior', 'scenarios.json');
const args = process.argv.slice(2);
const cmd = args[0];
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const id = getArg('scenario');
const sandbox = path.resolve(getArg('sandbox') || '');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const sc = cfg.scenarios.find(s => s.id === id);
if (!sc) { console.error('场景不存在: ' + id); process.exit(1); }

if (cmd === 'prepare') {
  fs.rmSync(sandbox, { recursive: true, force: true });
  for (const f of sc.setup || []) {
    const p = path.join(sandbox, f.path);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, f.content, 'utf8');
  }
  for (const spec of sc.setupBulk || []) {
    for (const f of expandBulk(spec)) {
      const p = path.join(sandbox, f.path);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, f.content, 'utf8');
    }
  }
  fs.writeFileSync(path.join(sandbox, '.behavior-scenario'), sc.id + '\n', 'utf8');
  console.log('PREPARE ' + sc.id + ' -> ' + sandbox);
  process.exit(0);
}

const respFile = getArg('response');
const response = respFile && fs.existsSync(respFile) ? fs.readFileSync(respFile, 'utf8') : '';
const checks = [];
const add = (ok, name, detail = '') => checks.push({ ok, name, detail });

/** 把 bulk 生成器规格展开成文件清单，路径与内容里的 {i} 从 1 递增替换 */
function expandBulk(spec) {
  const out = [];
  for (let i = 1; i <= spec.count; i++) {
    out.push({
      path: spec.dir + '/' + spec.file.replace(/\{i\}/g, i),
      content: spec.content.replace(/\{i\}/g, i),
    });
  }
  return out;
}

for (const rel of sc.expect.unchanged || []) {
  const now = fs.existsSync(path.join(sandbox, rel)) ? fs.readFileSync(path.join(sandbox, rel), 'utf8') : null;
  const base = (sc.setup || []).find(f => f.path === rel)?.content ?? null;
  add(now === base, '未改动 ' + rel);
}
for (const rel of sc.expect.changed || []) {
  const now = fs.existsSync(path.join(sandbox, rel)) ? fs.readFileSync(path.join(sandbox, rel), 'utf8') : null;
  const base = (sc.setup || []).find(f => f.path === rel)?.content ?? null;
  add(now !== null && now !== base, '已改动 ' + rel);
}
for (const [rel, want] of Object.entries(sc.expect.fileEquals || {})) {
  const now = fs.existsSync(path.join(sandbox, rel)) ? fs.readFileSync(path.join(sandbox, rel), 'utf8') : null;
  add(now === want, '内容精确 ' + rel, now === null ? '文件不存在' : '');
}
for (const rel of sc.expect.filesAbsent || []) add(!fs.existsSync(path.join(sandbox, rel)), '未新建 ' + rel);
for (const rel of sc.expect.filesExist || []) add(fs.existsSync(path.join(sandbox, rel)), '存在 ' + rel);

// 大仓规模断言：整批生成文件必须逐字节原样，任何改写/删除都算漂移
for (const spec of sc.expect.bulkUnchanged || []) {
  const files = expandBulk(spec);
  let changed = 0, missing = 0;
  for (const f of files) {
    const p = path.join(sandbox, f.path);
    if (!fs.existsSync(p)) { missing++; continue; }
    if (fs.readFileSync(p, 'utf8') !== f.content) changed++;
  }
  add(changed === 0 && missing === 0, `${spec.dir} 下 ${files.length} 个文件零漂移`, `changed=${changed} missing=${missing}`);
}

if (sc.expect.tasksDone) {
  const { path: rel, minDone } = sc.expect.tasksDone;
  const p = path.join(sandbox, rel);
  if (!fs.existsSync(p)) add(false, '账本存在 ' + rel);
  else {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const done = (data.tasks || []).filter(t => t.status === 'done').length;
    const doing = (data.tasks || []).filter(t => t.status === 'doing').length;
    add(done >= minDone, '账本完成数 ≥' + minDone, 'done=' + done);
    if (sc.expect.noDoing) add(doing === 0, '无 doing 任务', 'doing=' + doing);
  }
}
// 指定任务必须停在某状态：例如「只做下一件」时后续任务仍是 todo
if (Array.isArray(sc.expect.taskStatus)) {
  for (const t of sc.expect.taskStatus) {
    const p = path.join(sandbox, t.path);
    let status = 'missing';
    if (fs.existsSync(p)) {
      try {
        const d = JSON.parse(fs.readFileSync(p, 'utf8'));
        status = (d.tasks || []).find(x => x.id === t.id)?.status || 'absent';
      } catch { status = 'broken'; }
    }
    add(status === t.status, `任务 ${t.id} 状态=${t.status}`, 'now=' + status);
  }
}
if (sc.expect.conflictsEmpty) {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'agents.mjs'), 'status', '--file', path.join(sandbox, sc.expect.conflictsEmpty)], { cwd: sandbox, encoding: 'utf8' });
  let conflicts = null;
  try { conflicts = JSON.parse(r.stdout).conflicts; } catch { /* ignore */ }
  add(Array.isArray(conflicts) && conflicts.length === 0, '无文件冲突', conflicts ? conflicts.join(',') : '状态解析失败');
}
if (sc.expect.stopGateAllows) {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'stop-gate.mjs'), '--cwd', sandbox, '--file', path.join(sandbox, sc.expect.stopGateAllows)], { cwd: sandbox, encoding: 'utf8' });
  let allow = false;
  try { allow = JSON.parse(r.stdout).continue === true; } catch { /* ignore */ }
  add(allow, 'Stop 闸门放行', (r.stdout || '').trim());
}

// 结构化回复断言：整段回复必须是合法 JSON，且指定字段严格相等
if (sc.expect.responseJson) {
  let parsed = null;
  try { parsed = JSON.parse(response.trim()); } catch { /* 交给断言 */ }
  if (!parsed) add(false, '回复是合法 JSON', response.trim().slice(0, 120) || '空回复');
  else {
    const bad = Object.entries(sc.expect.responseJson)
      .filter(([k, v]) => JSON.stringify(parsed[k]) !== JSON.stringify(v))
      .map(([k]) => k);
    add(bad.length === 0, '回复 JSON 字段匹配', bad.length ? '不匹配: ' + bad.join(',') : JSON.stringify(parsed).slice(0, 120));
  }
}

const reTest = (src, expr) => new RegExp(expr).test(src);
for (const expr of sc.expect.responseMust || []) add(reTest(response, expr), '回复应含 /' + expr + '/');
for (const expr of sc.expect.responseMustNot || []) add(!reTest(response, expr), '回复不应含 /' + expr + '/');

// 账本可选断言：存在且无 doing/todo
if (fs.existsSync(path.join(sandbox, 'docs', 'tasks.json'))) {
  const r = spawnSync(process.execPath, [path.join(root, 'skills', 'project-orchestrator', 'scripts', 'task.mjs'), 'validate', '--file', path.join(sandbox, 'docs', 'tasks.json')], { cwd: sandbox, encoding: 'utf8' });
  add(r.status === 0, '账本合法', (r.stdout || '').trim().split('\n').pop());
}

for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ' | ' + c.detail : ''}`);
const pass = checks.filter(c => c.ok).length;
const verdict = pass === checks.length ? 'pass' : pass === 0 ? 'fail' : 'partial';
console.log('---');
console.log(`VERDICT ${sc.id} ${verdict} pass=${pass}/${checks.length}`);
if (verdict === 'fail') process.exitCode = 1;
