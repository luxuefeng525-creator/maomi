#!/usr/bin/env node
// browser.mjs — 真正的浏览器控制（点击/填表/断言/多步 E2E），不只是截图。
// 依赖可选的 playwright / playwright-core / puppeteer；缺失时输出 JSON 并优雅退出（exit 3）。
// 用法：
//   node scripts/browser.mjs --url http://localhost:5173 --steps steps.json
//   node scripts/browser.mjs --steps '[{"goto":"http://x"},{"click":"#btn"},{"assertText":["#out","成功"]}]'
//   node scripts/browser.mjs --url http://x --screenshot out.png --headed
// 步骤 DSL（JSON 数组，按序执行）：
//   {"goto":"url"} {"click":"sel"} {"fill":["sel","text"]} {"press":"Enter"}
//   {"waitFor":"sel"} {"wait":1000} {"assertText":["sel","substr"]}
//   {"assertVisible":"sel"} {"assertUrl":"substr"} {"screenshot":"path"} {"eval":"js"}
// 选项：--timeout 单步ms(默认15000) --overall 总ms(默认180000) --headed --width --height --out --allow-console
// 输出（stdout 纯 JSON）：{ ok, failedStep, steps, consoleErrors, pageErrors, screenshot }
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
function opt(n, d) { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; }
const URL_BASE = opt('--url', null);
const OUT = opt('--out', null);
const WIDTH = parseInt(opt('--width', '1920'), 10);
const HEIGHT = parseInt(opt('--height', '1080'), 10);
const STEP_MS = Math.max(500, parseInt(opt('--timeout', '15000'), 10) || 15000);
const OVERALL_MS = Math.max(1000, parseInt(opt('--overall', '180000'), 10) || 180000);
const HEADED = argv.includes('--headed');
const ALLOW_CONSOLE = argv.includes('--allow-console');
const SHOT = opt('--screenshot', null);

function emit(obj, code) { process.stdout.write(JSON.stringify(obj, null, 2) + '\n'); process.exit(code); }

// 载入步骤：--steps 文件或内联 JSON；否则用 --url + --screenshot 生成默认步骤
let steps = [];
const stepsArg = opt('--steps', null);
if (stepsArg) {
  try {
    const raw = fs.existsSync(stepsArg) ? fs.readFileSync(stepsArg, 'utf8') : stepsArg;
    steps = JSON.parse(raw);
    if (!Array.isArray(steps)) throw new Error('steps 必须是数组');
  } catch (e) { emit({ ok: false, error: 'STEPS_INVALID: ' + e.message }, 1); }
}
if (!steps.length) {
  if (!URL_BASE) emit({ ok: false, error: '用法：--url <url> --steps <file|json>（或 --url + --screenshot）' }, 1);
  steps = [{ goto: URL_BASE }];
}
if (URL_BASE && !steps.some(s => s.goto)) steps.unshift({ goto: URL_BASE });

// 解析浏览器依赖（与 verify-visual 同策略）
let launch = null;
for (const mod of ['playwright', 'playwright-core', 'puppeteer']) {
  try {
    const m = await import(mod);
    const pw = m.default || m;
    const chromium = pw.chromium || (pw.launch ? pw : null);
    if (chromium && chromium.launch) { launch = chromium.launch.bind(chromium); break; }
    if (pw.launch) { launch = pw.launch.bind(pw); break; }
  } catch { /* next */ }
}
if (!launch) {
  emit({ ok: false, error: 'NO_BROWSER_DEP', hint: '未安装 playwright/playwright-core/puppeteer。执行 `npm i -D playwright && npx playwright install chromium`，或让宿主提供浏览器工具。' }, 3);
}

const deadline = Date.now() + OVERALL_MS;
function withTimeout(p, ms, label) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`TIMEOUT ${label} > ${ms}ms`)), ms)),
  ]);
}

let browser;
try {
  browser = await launch({ headless: !HEADED, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
} catch (e) { emit({ ok: false, error: 'BROWSER_LAUNCH_FAILED: ' + e.message }, 3); }

const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
const consoleErrors = [], pageErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => pageErrors.push(e.message));

const results = [];
let failedStep = null;
for (let i = 0; i < steps.length; i++) {
  const s = steps[i];
  const op = Object.keys(s)[0];
  const val = s[op];
  const rec = { i, op, ok: true };
  try {
    if (Date.now() > deadline) throw new Error(`OVERALL_TIMEOUT > ${OVERALL_MS}ms`);
    if (op === 'goto') await withTimeout(page.goto(val, { waitUntil: 'networkidle', timeout: STEP_MS }), STEP_MS, 'goto');
    else if (op === 'click') await withTimeout(page.click(val, { timeout: STEP_MS }), STEP_MS, 'click');
    else if (op === 'fill') await withTimeout(page.fill(val[0], String(val[1]), { timeout: STEP_MS }), STEP_MS, 'fill');
    else if (op === 'press') await withTimeout(page.keyboard.press(val), STEP_MS, 'press');
    else if (op === 'waitFor') await withTimeout(page.waitForSelector(val, { timeout: STEP_MS }), STEP_MS, 'waitFor');
    else if (op === 'wait') await new Promise(r => setTimeout(r, Math.min(Number(val) || 0, STEP_MS)));
    else if (op === 'assertVisible') {
      const v = await withTimeout(page.isVisible(val), STEP_MS, 'assertVisible');
      if (!v) throw new Error(`断言失败：${val} 不可见`);
    } else if (op === 'assertText') {
      await withTimeout(page.waitForSelector(val[0], { timeout: STEP_MS }), STEP_MS, 'assertText.wait');
      const txt = (await page.textContent(val[0])) || '';
      if (!txt.includes(val[1])) throw new Error(`断言失败：${val[0]} 文本不含 "${val[1]}"（实际 "${txt.slice(0, 80)}"）`);
    } else if (op === 'assertUrl') {
      if (!page.url().includes(val)) throw new Error(`断言失败：URL 不含 "${val}"（实际 ${page.url()}）`);
    } else if (op === 'screenshot') {
      const p = path.resolve(OUT || '.', val);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      await page.screenshot({ path: p, fullPage: false });
      rec.path = p;
    } else if (op === 'eval') {
      rec.value = await page.evaluate(val);
    } else throw new Error(`未知步骤: ${op}`);
  } catch (e) {
    rec.ok = false; rec.error = e.message;
    failedStep = i; results.push(rec); break;
  }
  results.push(rec);
}

let screenshotPath = null;
if (SHOT && !failedStep) {
  screenshotPath = path.resolve(OUT || '.', SHOT);
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
}
await browser.close().catch(() => {});

const ok = !failedStep && (ALLOW_CONSOLE || (consoleErrors.length === 0 && pageErrors.length === 0));
emit({ ok, failedStep, steps: results, consoleErrors, pageErrors, screenshot: screenshotPath }, ok ? 0 : 2);
