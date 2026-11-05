#!/usr/bin/env node
// verify-visual.mjs — 浏览器视觉自检（对标 anthropics/webapp-testing 与 big-screen 的截图自检）
// 功能：起无头 Chromium，按 1920×1080 打开 URL/HTML，捕获控制台报错与页面异常，
//       截图，检测面板溢出/横向滚动，输出 JSON 审计结论。无依赖时优雅降级。
//
// 用法：
//   node scripts/verify-visual.mjs --url https://example.com
//   node scripts/verify-visual.mjs --file dist/index.html
//   node scripts/verify-visual.mjs --url http://localhost:5173 --out ./out --width 1920 --height 1080
//
// 输出（stdout 纯 JSON）：{ ok, errors, warnings, audit:{ overflow, console, viewport }, html, screenshot, report }

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function getOpt(name, def) {
  const i = args.indexOf(name);
  if (i === -1) return def;
  return args[i + 1] !== undefined ? args[i + 1] : def;
}

const url = getOpt('--url', null);
const file = getOpt('--file', null);
const out = getOpt('--out', null);
const width = parseInt(getOpt('--width', '1920'), 10);
const height = parseInt(getOpt('--height', '1080'), 10);
const waitMs = parseInt(getOpt('--wait', '1200'), 10);

function fail(msg) {
  const r = { ok: false, errors: [msg], warnings: [], audit: { overflow: [], console: [], viewport: { width, height } }, html: null, screenshot: null, report: null };
  process.stdout.write(JSON.stringify(r, null, 2));
  process.exit(1);
}

if (!url && !file) fail('用法：verify-visual.mjs --url <url> | --file <html路径> [--out <dir>]');

let target = url;
if (file) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) fail(`文件不存在：${abs}`);
  target = 'file://' + abs;
}

// 解析浏览器依赖（playwright / playwright-core / puppeteer），任一可用即可
let launch = null;
const candidates = ['playwright', 'playwright-core', 'puppeteer'];
for (const mod of candidates) {
  try {
    const m = await import(mod);
    const pw = m.default || m;
    const chromium = pw.chromium || (pw.launch ? pw : null);
    if (chromium && chromium.launch) { launch = chromium.launch.bind(chromium); break; }
    if (pw.launch) { launch = pw.launch.bind(pw); break; }
  } catch { /* try next */ }
}

if (!launch) {
  fail('未安装浏览器自动化依赖（playwright / playwright-core / puppeteer）。请先 `npm i -D playwright` 并 `npx playwright install chromium`，或在工作区已有的截图流程中复用。');
}

let browser;
try {
  browser = await launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
} catch (e) {
  fail(`浏览器启动失败：${e.message}`);
}

const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const consoleErrors = [];
const pageErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => pageErrors.push(e.message));

try {
  await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(waitMs);
} catch (e) {
  await browser.close().catch(() => {});
  fail(`页面加载失败：${e.message}`);
}

// 溢出检测：横向滚动 + 超出视口的元素
const overflow = await page.evaluate((vw, vh) => {
  const res = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > vw + 2) res.push(`horizontal-scroll: scrollWidth=${doc.scrollWidth} > ${vw}`);
  if (doc.scrollHeight > vh + 2) res.push(`vertical-scroll: scrollHeight=${doc.scrollHeight} > ${vh}`);
  const seen = new Set();
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 4 || r.left < -4 || r.bottom > vh + 4 || r.top < -4) {
      const key = (el.tagName + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''));
      if (!seen.has(key)) { seen.add(key); res.push(`${key} 超出视口 @(${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)})`); }
    }
    if (seen.size >= 20) break;
  }
  return res;
}, width, height);

const html = page.url();
let screenshotPath = null;
let reportPath = null;
if (out) {
  fs.mkdirSync(out, { recursive: true });
  const base = path.join(out, 'verify-visual');
  screenshotPath = base + '.png';
  reportPath = base + '-report.json';
  await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
}

await browser.close().catch(() => {});

const errors = [...consoleErrors, ...pageErrors];
const ok = errors.length === 0 && overflow.length === 0;
const result = {
  ok,
  errors,
  warnings: consoleErrors.length ? [] : [],
  audit: { overflow, console: consoleErrors, pageErrors, viewport: { width, height } },
  html,
  screenshot: screenshotPath,
  report: reportPath,
};
if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
process.stdout.write(JSON.stringify(result, null, 2));
process.exit(ok ? 0 : 2);
