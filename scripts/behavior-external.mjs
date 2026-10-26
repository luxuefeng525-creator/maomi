#!/usr/bin/env node
/**
 * 跨模型行为评测：把同一场景交给外部模型 CLI，沙箱产物 + 回复断言与宿主同一套。
 *
 * 用法：
 *   node scripts/behavior-external.mjs list
 *   node scripts/behavior-external.mjs run --scenario B14-long-context-extract --provider codex [--run 1] [--timeout 180000]
 *   node scripts/behavior-external.mjs matrix --providers codex,mimo-deepseek --scenarios B14-long-context-extract,B15-json-only
 *
 * 约定：
 * - 每次运行独立沙箱 tests/behavior/.external/<provider>/<scenario>/runN；
 * - 场景 prompt 原样保留，仅追加「把最终答复写入 response.md」这条 Harness 指令，与宿主会话口径一致；
 * - 模型没写 response.md 时，回退用 CLI stdout 落盘，并标注 fallback；
 * - 结果追加到 logs/external-results.jsonl，便于跨模型对照。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const cmd = args[0];
const getArg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const asJson = args.includes('--json');

const cfg = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'behavior', 'scenarios.json'), 'utf8'));
const providers = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'behavior', 'providers.json'), 'utf8')).providers;
const checker = path.join(root, 'scripts', 'behavior-check.mjs');

const HARNESS = '\n\n[Harness] 完成后把「给用户的最终答复正文」原样写入工作目录下的 response.md（UTF-8）；不要写过程日志。';

function scenario(id) {
  const sc = cfg.scenarios.find(s => s.id === id);
  if (!sc) throw new Error('场景不存在: ' + id);
  return sc;
}

function fill(template, vars) {
  return template.replace(/\{(cwd|response|prompt)\}/g, (_, k) => vars[k] ?? '');
}

function runOne(providerId, scenarioId, runNo) {
  const p = providers[providerId];
  if (!p) throw new Error('provider 不存在: ' + providerId);
  const sc = scenario(scenarioId);
  const sandbox = path.join(root, 'tests', 'behavior', '.external', providerId, sc.id, 'run' + runNo);
  const responseFile = path.join(sandbox, 'response.md');

  const prep = spawnSync(process.execPath, [checker, 'prepare', '--scenario', sc.id, '--sandbox', sandbox], { cwd: root, encoding: 'utf8' });
  if (prep.status !== 0) return { provider: providerId, scenario: sc.id, run: runNo, verdict: 'infra_fail', detail: 'prepare 失败: ' + (prep.stderr || '').trim() };

  const prompt = sc.prompt.replace('<SANDBOX>', sandbox) + HARNESS;
  const vars = { cwd: sandbox, response: responseFile, prompt };
  const argv = p.args.map(a => fill(a, vars));
  const timeout = Number(getArg('timeout') || 180000);
  const r = spawnSync(p.cmd, argv, {
    cwd: sandbox,
    encoding: 'utf8',
    timeout,
    input: p.promptVia === 'stdin' ? prompt : undefined,
    shell: process.platform === 'win32' && /\.(cmd|ps1)$/i.test(p.cmd),
  });

  const spawnErr = r.error ? String(r.error.message || r.error) : '';
  let fallback = false;
  if (!fs.existsSync(responseFile)) {
    const captured = (r.stdout || '').trim();
    if (captured) { fs.writeFileSync(responseFile, captured + '\n', 'utf8'); fallback = true; }
  }

  const check = spawnSync(process.execPath, [checker, 'check', '--scenario', sc.id, '--sandbox', sandbox, '--response', responseFile], { cwd: root, encoding: 'utf8' });
  const out = ((check.stdout || '') + (check.stderr || '')).trim();
  const verdictLine = out.split('\n').reverse().find(l => l.startsWith('VERDICT ')) || '';
  const verdict = (/ pass pass=\d+\/\d+/.test(verdictLine) ? 'pass' : / partial /.test(verdictLine) ? 'partial' : 'fail');
  const fails = out.split('\n').filter(l => l.startsWith('FAIL ')).slice(0, 3);

  const result = {
    time: new Date().toISOString(),
    provider: providerId,
    providerDesc: p.desc,
    scenario: sc.id,
    run: runNo,
    exit: r.status,
    spawnErr,
    outTail: ((r.stderr || '') + '\n' + (r.stdout || '')).trim().split('\n').slice(-5).join(' | '),
    timeout,
    fallback,
    verdict: spawnErr ? 'infra_fail' : (fs.existsSync(responseFile) ? verdict : 'infra_fail'),
    verdictLine,
    fails,
    sandbox: path.relative(root, sandbox).split(path.sep).join('/'),
  };
  fs.mkdirSync(path.join(root, 'logs'), { recursive: true });
  fs.appendFileSync(path.join(root, 'logs', 'external-results.jsonl'), JSON.stringify(result) + '\n', 'utf8');

  const tag = result.verdict.toUpperCase().padEnd(8);
  console.log(`${tag} ${providerId} ${sc.id} run${runNo}${fallback ? ' [stdout-fallback]' : ''}${spawnErr ? ' | ' + spawnErr.slice(0, 120) : ''}`);
  if (result.verdict === 'infra_fail' && result.outTail) console.log('  CLI: ' + result.outTail.slice(0, 400));
  for (const f of fails) console.log('  ' + f);
  if (asJson) console.log(JSON.stringify(result, null, 2));
  return result;
}

try {
  if (cmd === 'list') {
    for (const [id, p] of Object.entries(providers)) console.log(`${id}\t${p.desc}\t${p.cmd} ${(p.args || []).join(' ')}`);
  } else if (cmd === 'run') {
    const id = getArg('scenario');
    const provider = getArg('provider');
    if (!id || !provider) throw new Error('缺少 --scenario / --provider');
    runOne(provider, id, Number(getArg('run') || 1));
  } else if (cmd === 'matrix') {
    const ids = (getArg('providers') || Object.keys(providers).join(',')).split(',').map(s => s.trim()).filter(Boolean);
    const scs = (getArg('scenarios') || cfg.scenarios.slice(0, 3).map(s => s.id).join(',')).split(',').map(s => s.trim()).filter(Boolean);
    const results = [];
    for (const pid of ids) for (const sid of scs) results.push(runOne(pid, sid, Number(getArg('run') || 1)));
    const pass = results.filter(r => r.verdict === 'pass').length;
    console.log('---');
    console.log(`MATRIX providers=${ids.length} scenarios=${scs.length} runs=${results.length} pass=${pass}`);
    process.exitCode = pass === results.length ? 0 : 1;
  } else {
    console.error('用法: list | run | matrix（详见文件头）');
    process.exit(1);
  }
} catch (e) {
  console.error('FAIL ' + (e && e.message));
  process.exit(1);
}
