#!/usr/bin/env node
/**
 * 大屏工坊 · 构建 + 自检 + 交付
 * 用法：node verify.mjs --id port-ops [--out <dir>] [--port 5199] [--bake-preview] [--no-build]
 *       [--engine <dir>] [--remote <git url>] [--update]
 * 流程：确保引擎可用 → 构建单文件 → 起本地服务 → Playwright 1920 截图 → 检查报错/溢出
 *      → 交付 out/<id>/<id>.html + out/<id>/<id>-1920.png + out/<id>/<id>-report.json
 */
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
} from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { DEFAULT_REMOTE, enginePath, prepareEngine } from './engine.mjs';

const SKILL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes('--' + name);

const id = arg('id');
const port = Number(arg('port', '5199'));
const outRoot = path.resolve(arg('out', path.join(SKILL, 'out')));
const out = path.join(outRoot, id);
const bake = has('bake-preview');
const noBuild = has('no-build');

if (!id) {
  console.error('[verify] 缺少 --id');
  process.exit(1);
}

const result = { ok: false, id, out, errors: [], warnings: [], screenshots: [] };
// 页面脚本抛错时也要能关掉浏览器：Playwright 的连接不关，进程会挂住不退出
let activeBrowser = null;

const waitFor = async (url, timeout = 15000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* 服务还没起来 */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};

// 端口被别的服务占着就顺延，不要直接报「预览服务启动失败」
const listenWithFallback = async (server, startPort, span = 10) => {
  for (let p = startPort; p < startPort + span; p++) {
    try {
      await new Promise((resolve, reject) => {
        const onError = (error) => reject(error);
        server.once('error', onError);
        server.listen(p, '127.0.0.1', () => {
          server.off('error', onError);
          resolve();
        });
      });
      return p;
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
    }
  }
  throw new Error(
    '端口 ' + startPort + '–' + (startPort + span - 1) + ' 都被占用，用 --port 换一个',
  );
};

// Playwright 版本与本地缓存的浏览器版本常常对不上，兜底找已安装的 Chromium
function findChromium() {
  const roots = [
    path.join(os.homedir(), 'Library/Caches/ms-playwright'),
    path.join(os.homedir(), '.cache/ms-playwright'),
  ];
  const candidates = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root)) {
      if (!/^chromium-\d+$/.test(dir)) continue;
      const base = path.join(root, dir);
      candidates.push(
        path.join(
          base,
          'chrome-mac-arm64',
          'Google Chrome for Testing.app',
          'Contents',
          'MacOS',
          'Google Chrome for Testing',
        ),
        path.join(
          base,
          'chrome-mac-x64',
          'Google Chrome for Testing.app',
          'Contents',
          'MacOS',
          'Google Chrome for Testing',
        ),
        path.join(base, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        path.join(base, 'chrome-linux', 'chrome'),
        path.join(base, 'chrome-win', 'chrome.exe'),
      );
    }
  }
  return candidates.filter((p) => existsSync(p)).pop() || null;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve(stdout.trim())
        : reject(
            new Error(
              `${command} ${args.join(' ')} → ${code}\n${(stderr || stdout).trim().slice(-800)}`,
            ),
          ),
    );
  });
}

try {
  const engine = prepareEngine({
    dir: enginePath(arg('engine')),
    remote: arg('remote', DEFAULT_REMOTE),
    update: has('update'),
    deps: !has('skip-deps'),
  });
  result.engine = engine.dir;
  if (!engine.python) throw new Error('引擎 Python 依赖不可用（需要 Python 3.10+ 与 Pillow）');
  if (!engine.screenshot) result.warnings.push('Node 依赖缺失，截图与自检不可用（请在该引擎目录执行 npm ci）');

  const buildDir = path.join(out, '.build');
  const siteDir = path.join(buildDir, 'standalone');
  const built = path.join(siteDir, id + '.html');
  // --no-build 只在真有可复用产物时生效：out/<id>/.build 默认跑完就删，
  // 上一次没带 --keep-build 的话这里自动补构建，免得报「构建产物不存在」
  const reuse = noBuild && existsSync(built);
  if (!reuse) {
    if (noBuild) result.warnings.push('没有可复用的构建产物，已自动重新构建');
    rmSync(buildDir, { recursive: true, force: true });
    result.build = await run(
      engine.python,
      ['scripts/build.py', '--target', id, '--mode', 'standalone', '--out', buildDir],
      { cwd: engine.dir },
    );
  }
  if (!existsSync(built)) throw new Error('构建产物不存在: ' + built);

  // 交付单文件
  mkdirSync(out, { recursive: true });
  const deliverable = path.join(out, id + '.html');
  copyFileSync(built, deliverable);
  result.html = deliverable;

  if (!engine.screenshot) {
    result.ok = true;
    result.warnings.push('已产出单文件，但未做截图自检');
  } else {
    const { createServer } = await import(
      pathToFileURL(path.join(engine.dir, 'scripts/server.mjs')).href
    );
    const server = createServer(siteDir);
    const actualPort = await listenWithFallback(server, port);
    result.port = actualPort;
    const cleanup = () => {
      try {
        server.close();
      } catch {
        /* ignore */
      }
    };
    process.on('exit', cleanup);

    const pageUrl = `http://127.0.0.1:${actualPort}/${id}.html`;
    if (!(await waitFor(`http://127.0.0.1:${actualPort}/home.html`)))
      throw new Error('预览服务启动失败（端口 ' + actualPort + '）');

    const require = createRequire(pathToFileURL(path.join(engine.dir, 'package.json')));
    const { chromium } = require('playwright');
    const launchArgs = [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ];
    let browser;
    try {
      browser = await chromium.launch({ args: launchArgs });
    } catch (error) {
      const exe = findChromium();
      if (!exe)
        throw new Error(
          'Chromium 未安装，请先运行 npx playwright install chromium（' + error.message + '）',
        );
      result.browser = exe;
      browser = await chromium.launch({ executablePath: exe, args: launchArgs });
    }
    activeBrowser = browser;
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

    const response = await page.goto(pageUrl, { waitUntil: 'load', timeout: 30000 });
    if (!response || !response.ok()) throw new Error('页面打不开: ' + pageUrl);
    await page.waitForTimeout(1800);

    const audit = await page.evaluate(() => {
      const stage = document.querySelector('#screen');
      const box = stage ? stage.getBoundingClientRect() : null;
      const scale = box ? box.width / 1920 : 0;
      const overflow = [];
      // 指标卡右上角的装饰圆会撑大 scrollWidth，只对面板做横向判定
      document.querySelectorAll('.ds-panel, .ob-panel, .ds-kpi, .ob-metric').forEach((el) => {
        const panel = el.classList.contains('ds-panel') || el.classList.contains('ob-panel');
        if (el.scrollHeight > el.clientHeight + 2 || (panel && el.scrollWidth > el.clientWidth + 2)) {
          overflow.push({
            cls: el.className,
            title:
              (el.querySelector('h2') || el.querySelector('.ds-kpi-label') || {}).textContent || '',
            scroll: [el.scrollWidth, el.scrollHeight],
            client: [el.clientWidth, el.clientHeight],
          });
        }
      });
      const empty = [...document.querySelectorAll('.ds-panel-body, .ob-panel')].filter(
        (el) => el.textContent.trim().length < 2 && !el.querySelector('canvas,svg'),
      ).length;
      return {
        title: document.title,
        stage: box
          ? { w: Math.round(box.width), h: Math.round(box.height), scale: +scale.toFixed(3) }
          : null,
        docScroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
        canvas: document.querySelectorAll('canvas').length,
        renderer: document.querySelector('#observatory')?.dataset.renderer || null,
        drawCalls: document.querySelector('canvas')?.dataset.drawCalls || null,
        overflow,
        emptyPanels: empty,
        bodyText: document.body.innerText.trim().length,
      };
    });

    const shot = path.join(out, id + '-1920.png');
    await page.screenshot({ path: shot });
    result.screenshots.push(shot);
    result.audit = audit;
    if (consoleErrors.length) result.errors.push(...consoleErrors);
    if (audit.overflow.length)
      result.warnings.push('有 ' + audit.overflow.length + ' 个面板内容溢出，需要压缩字号/间距或减少条目');
    if (audit.emptyPanels) result.warnings.push('有 ' + audit.emptyPanels + ' 个空面板');
    if (audit.bodyText < 200) result.warnings.push('页面文字过少，可能渲染失败');
    if (audit.docScroll[0] > 1920 || audit.docScroll[1] > 1080)
      result.warnings.push('页面出现滚动条，舞台溢出 1920×1080');

    if (bake) {
      const preview = path.join(engine.dir, 'assets/previews', id + '.png');
      copyFileSync(shot, preview);
      const registryPath = path.join(engine.dir, 'config/screens.json');
      const raw = readFileSync(registryPath, 'utf8');
      // 只改本条的 preview 字段：整份 JSON.stringify 会把行内 tags 数组拆成多行，
      // 让引擎仓库多出几十行纯格式 diff。
      const pattern = new RegExp(
        '("id"\\s*:\\s*"' + id + '"[\\s\\S]*?"preview"\\s*:\\s*")[^"]*(")',
      );
      const next = raw.replace(pattern, '$1assets/previews/' + id + '.png$2');
      if (next !== raw) writeFileSync(registryPath, next);
      result.preview = preview;
    }

    await browser.close();
    activeBrowser = null;
    cleanup();
    result.ok =
      result.errors.length === 0 &&
      audit.bodyText > 200 &&
      audit.docScroll[0] <= 1920 &&
      audit.docScroll[1] <= 1080;
  }
} catch (error) {
  result.errors.push(String(error.message || error));
} finally {
  if (activeBrowser) {
    try {
      await activeBrowser.close();
    } catch {
      /* 已经关了就算了 */
    }
  }
  // out/ 只留交付物，构建中间产物默认清掉（--keep-build 可保留）
  if (!has('keep-build')) {
    try {
      rmSync(path.join(out, '.build'), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  const report = path.join(out, id + '-report.json');
  result.report = report;
  try {
    mkdirSync(out, { recursive: true });
    writeFileSync(
      report,
      JSON.stringify({ ...result, generatedAt: new Date().toISOString() }, null, 2) + '\n',
    );
  } catch {
    /* 交付目录不可写时忽略 */
  }
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
