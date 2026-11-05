#!/usr/bin/env node
/**
 * 大屏工坊 · 引擎准备与路径解析
 * 引擎 = 大屏渲染底座仓库（screen-picture-demo / vizlab）。
 * 优先使用工作区内已合并的本地引擎 ./vizlab（与本 skill 同处 big-screen 工作区）；
 * 本地引擎不存在时回退到 ~/.bigscreen-ai/cache/bigscreen-engine（跨项目缓存，首次自动 clone GitHub）。
 * 可用 --engine / VIZLAB_ENGINE 覆盖。
 */
import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export const DEFAULT_REMOTE = 'https://github.com/alinkiot/screen-picture-demo.git';
export const DEFAULT_ENGINE = path.join(os.homedir(), '.bigscreen-ai', 'cache', 'bigscreen-engine');

// 本地已合并引擎：engine.mjs 位于 <workspace>/skills/bigscreen-studio/scripts/，
// 引擎在 <workspace>/vizlab，即由此文件上溯三级再进 vizlan。
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LOCAL_ENGINE = path.resolve(__dirname, '..', '..', '..', 'vizlab');

export function enginePath(explicit) {
  if (explicit) return path.resolve(explicit);
  if (process.env.VIZLAB_ENGINE) return path.resolve(process.env.VIZLAB_ENGINE);
  // 优先用工作区内已合并的本地引擎，避免每次都去 GitHub 克隆
  if (isEngine(LOCAL_ENGINE)) return LOCAL_ENGINE;
  return DEFAULT_ENGINE;
}

export function isEngine(dir) {
  return (
    existsSync(path.join(dir, 'config/screens.json')) &&
    existsSync(path.join(dir, 'scripts/build.py'))
  );
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      [command, ...args].join(' ') +
        ' → ' +
        result.status +
        '\n' +
        (result.stderr || result.stdout || '').trim().slice(-800),
    );
  }
  return (result.stdout || '').trim();
}

export function resolvePython(dir) {
  const candidates = [
    path.join(dir, '.venv', 'bin', 'python'),
    path.join(dir, '.venv', 'Scripts', 'python.exe'),
    'python3',
    'python',
  ];
  for (const candidate of candidates) {
    if (candidate.includes(path.sep) && !existsSync(candidate)) continue;
    const probe = spawnSync(
      candidate,
      ['-c', 'import PIL, sys; assert sys.version_info >= (3, 10)'],
      { stdio: 'ignore' },
    );
    if (probe.status === 0) return candidate;
  }
  return null;
}

function ensurePython(dir, log) {
  if (resolvePython(dir)) return resolvePython(dir);
  log('准备 Python 依赖（.venv + Pillow）…');
  try {
    run('python3', ['-m', 'venv', '.venv'], { cwd: dir });
  } catch (error) {
    throw new Error('创建 .venv 失败，请确认已安装 Python 3.10+：' + error.message);
  }
  const local = path.join(
    dir,
    '.venv',
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
  );
  try {
    run(local, ['-m', 'pip', 'install', '--disable-pip-version-check', '-q', '-r', 'requirements.txt'], {
      cwd: dir,
    });
  } catch {
    run(local, ['-m', 'pip', 'install', '--disable-pip-version-check', '-q', 'pillow'], { cwd: dir });
  }
  return local;
}

function ensureNodeModules(dir, log) {
  if (existsSync(path.join(dir, 'node_modules', 'playwright'))) return true;
  log('安装引擎 Node 依赖（npm ci，用于截图自检）…');
  try {
    run('npm', ['ci', '--no-audit', '--no-fund'], { cwd: dir });
    return true;
  } catch (error) {
    log('npm ci 失败，截图自检将不可用：' + String(error.message).split('\n')[0]);
    return false;
  }
}

/**
 * 确保引擎可用：不存在就 clone，存在且 update 为真就拉最新，再补依赖。
 * @returns {{dir:string, remote:string, cloned:boolean, updated:boolean, python:string|null, screenshot:boolean}}
 */
export function prepareEngine({
  dir = DEFAULT_ENGINE,
  remote = DEFAULT_REMOTE,
  update = false,
  deps = true,
  log = (message) => console.error('[engine] ' + message),
} = {}) {
  const target = path.resolve(dir);
  let cloned = false;
  let updated = false;

  if (!isEngine(target)) {
    if (existsSync(target) && !existsSync(path.join(target, '.git'))) {
      throw new Error('目标目录已存在但不是引擎仓库，请换 --engine 或先清理：' + target);
    }
    log('克隆引擎 ' + remote + ' → ' + target);
    mkdirSync(path.dirname(target), { recursive: true });
    run('git', ['clone', '--depth', '1', '--single-branch', remote, target]);
    cloned = true;
  } else if (update) {
    log('拉取引擎最新代码…');
    run('git', ['-C', target, 'fetch', '--depth', '1', 'origin']);
    run('git', ['-C', target, 'reset', '--hard', 'FETCH_HEAD']);
    updated = true;
  }

  if (!cloned) {
    // 已有工作副本：远端地址和本次请求不一致时同步一下（例如仓库从 SSH 换成 HTTPS），
    // 否则 --update 会一直用旧地址，没配对应凭据就拉不下来。
    try {
      const current = run('git', ['-C', target, 'remote', 'get-url', 'origin']);
      if (current && current !== remote) {
        run('git', ['-C', target, 'remote', 'set-url', 'origin', remote]);
        log('引擎远端地址已同步 → ' + remote);
      }
    } catch {
      /* 没有 origin 或不是 git 仓库，忽略 */
    }
  }

  let python = null;
  let screenshot = false;
  if (deps) {
    python = ensurePython(target, log);
    screenshot = ensureNodeModules(target, log);
  } else {
    python = resolvePython(target);
    screenshot = existsSync(path.join(target, 'node_modules', 'playwright'));
  }

  return { dir: target, remote, cloned, updated, python, screenshot };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const arg = (name, fallback = '') => {
    const i = argv.indexOf('--' + name);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
  };
  try {
    const info = prepareEngine({
      dir: enginePath(arg('engine')),
      remote: arg('remote', DEFAULT_REMOTE),
      update: argv.includes('--update'),
      deps: !argv.includes('--skip-deps'),
    });
    console.log(JSON.stringify({ ok: true, ...info }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ ok: false, error: String(error.message || error) }, null, 2));
    process.exitCode = 1;
  }
}
