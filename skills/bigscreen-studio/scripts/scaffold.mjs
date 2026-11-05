#!/usr/bin/env node
/**
 * 大屏工坊 · 脚手架
 * 用法：
 *   node scaffold.mjs --id port-ops --preset flat --title "智慧港口运营中心"
 * 可选：--desc --label --category 3d|geo|operations --brand --brand-en --eyebrow --footer --tags a,b
 *       --engine <dir>（默认 ~/.bigscreen-ai/cache/bigscreen-engine）--remote <git url> --update --skip-deps
 * 引擎不存在时会自动 clone https://github.com/alinkiot/screen-picture-demo.git
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_REMOTE, enginePath, prepareEngine } from './engine.mjs';

const SKILL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const argv = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes('--' + name);

const id = arg('id');
const preset = arg('preset', 'flat');
const title = arg('title', '');
const desc = arg('desc', '');
const label = arg('label', '');
const category = arg('category', 'operations');
const brand = arg('brand', title);
const brandEn = arg('brand-en', label || 'DATA INTELLIGENCE');
const eyebrow = arg('eyebrow', (label || 'DATA INTELLIGENCE') + ' / LIVE OVERVIEW');
const footer = arg('footer', '演示数据 · 所有指标与操作均为本地模拟');
const tags = (arg('tags', '数据大屏,实时监测') || '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean)
  .slice(0, 5);

const fail = (message) => {
  console.error('[scaffold] ' + message);
  process.exit(1);
};

if (!id) fail('缺少 --id（小写字母开头，可含数字与连字符，2–40 位）');
if (!/^[a-z][a-z0-9-]{1,39}$/.test(id)) fail('非法 id: ' + id);
if (!title) fail('缺少 --title');
if (!['flat', 'observatory'].includes(preset)) fail('preset 只能是 flat 或 observatory');
if (!['3d', 'geo', 'operations'].includes(category)) fail('category 只能是 3d / geo / operations');

const engine = prepareEngine({
  dir: enginePath(arg('engine')),
  remote: arg('remote', DEFAULT_REMOTE),
  update: has('update'),
  deps: !has('skip-deps'),
});

const registryPath = path.join(engine.dir, 'config/screens.json');
const entries = JSON.parse(readFileSync(registryPath, 'utf8'));
const target = path.join(engine.dir, 'src/screens', id);
if (entries.some((e) => e.id === id) || existsSync(target)) fail('大屏已存在: ' + id);

const fill = (text) =>
  text
    .replaceAll('{{ID}}', id)
    .replaceAll('{{TITLE}}', title)
    .replaceAll('{{DESCRIPTION}}', desc || title)
    .replaceAll('{{BRAND}}', brand)
    .replaceAll('{{BRAND_EN}}', brandEn)
    .replaceAll('{{EYEBROW}}', eyebrow)
    .replaceAll('{{FOOTER}}', footer);

mkdirSync(target, { recursive: true });

if (preset === 'flat') {
  const src = path.join(SKILL, 'assets/flat');
  for (const file of ['template.html', 'styles.css', 'app.js']) {
    writeFileSync(path.join(target, file), fill(readFileSync(path.join(src, file), 'utf8')));
  }
} else {
  const src = path.join(engine.dir, 'src/screens/park');
  if (!existsSync(src)) fail('引擎缺少 observatory 参考场景 src/screens/park');
  for (const file of ['template.html', 'styles.css', 'app.js', 'model.js']) {
    let text = readFileSync(path.join(src, file), 'utf8');
    // 新场景没有定制头图，置空即可：流光线仍会渲染，构建也不会去找缺失的 png
    text = text.replace('data-header-art="/*__OBSERVATORY_HEADER_ART__*/"', 'data-header-art=""');
    text = text.replace(/builders\.park\b/g, "builders['" + id + "']");
    text = text.replace(/id:\s*'park'/g, "id: '" + id + "'");
    text = text.replace(
      /<title>[^<]*<\/title>/,
      '<title>' + title + '</title>\n    <link rel="icon" href="data:," />',
    );
    text = text.replace(
      /<meta name="description" content="[^"]*" \/>/,
      '<meta name="description" content="' + (desc || title) + '" />',
    );
    writeFileSync(path.join(target, file), text);
  }
}

// 占位预览图（构建要求 preview 必须是存在的本地文件）
const previewName = id + '.svg';
const previewPath = path.join(engine.dir, 'assets/previews', previewName);
mkdirSync(path.dirname(previewPath), { recursive: true });
writeFileSync(
  previewPath,
  `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#08101f"/><stop offset="1" stop-color="#12233d"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#g)"/><text x="120" y="520" fill="#3ad7ff" font-size="72" font-family="sans-serif">${id}</text><text x="120" y="600" fill="#8ea3c2" font-size="30" font-family="sans-serif">${title}</text></svg>\n`,
);

const entry = {
  id,
  title,
  description: desc || title,
  category,
  label: label || id.toUpperCase(),
  width: 1920,
  height: 1080,
  preview: 'assets/previews/' + previewName,
  tags: tags.length ? tags : ['数据大屏'],
  renderer: 'generic',
};

// 只往顶层数组尾部追加一段文本：JSON.stringify 重排会把行内 tags 数组拆成多行，
// 让引擎仓库凭空多出几十行纯格式 diff。这里保持原有排版不动。
const rawRegistry = readFileSync(registryPath, 'utf8');
const closeAt = rawRegistry.lastIndexOf(']');
if (closeAt < 0) fail('config/screens.json 结构异常：找不到顶层数组结尾');
const head = rawRegistry.slice(0, closeAt).replace(/\s+$/, '');
const entryText = JSON.stringify(entry, null, 2)
  .split('\n')
  .map((line) => '  ' + line)
  .join('\n');
writeFileSync(
  registryPath,
  head + (head.endsWith('[') ? '' : ',') + '\n' + entryText + '\n' + rawRegistry.slice(closeAt),
);

console.log(
  JSON.stringify(
    {
      ok: true,
      id,
      preset,
      engine: engine.dir,
      remote: engine.remote,
      files: [
        'template.html',
        'styles.css',
        'app.js',
        ...(preset === 'observatory' ? ['model.js'] : []),
      ].map((f) => path.join(target, f)),
      registry: registryPath,
      preview: previewPath,
      next: [
        '编辑 src/screens/' + id + '/app.js（数据与面板）',
        preset === 'observatory' ? '编辑 src/screens/' + id + '/model.js（三维场景）' : null,
        'node verify.mjs --id ' + id,
      ].filter(Boolean),
    },
    null,
    2,
  ),
);
