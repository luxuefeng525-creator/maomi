#!/usr/bin/env node
/**
 * 大屏工坊 · 准备引擎（预热）
 * 用法：node prepare.mjs [--engine <dir>] [--remote <git url>] [--update] [--skip-deps]
 * 默认：clone https://github.com/alinkiot/screen-picture-demo.git → ~/.bigscreen-ai/cache/bigscreen-engine
 *      + 安装 Pillow（.venv）与 node 依赖（npm ci，用于截图）
 * scaffold / verify 会自动调用同样逻辑，通常不需要手动跑这个脚本。
 */
import { DEFAULT_REMOTE, enginePath, prepareEngine } from './engine.mjs';

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
