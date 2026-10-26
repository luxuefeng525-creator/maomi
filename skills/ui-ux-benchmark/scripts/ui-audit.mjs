#!/usr/bin/env node
/**
 * UI 静态检查：只查可判定的项，不做审美评分。
 * 用法：node scripts/ui-audit.mjs --files "src/pages/a.vue,src/pages/b.html" [--json]
 * 相对路径按当前工作目录解析；FAIL>0 退出码 1，WARN 只提示。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.cwd();

const args = process.argv.slice(2);
const getArg = name => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};
const filesArg = getArg('files');
const asJson = args.includes('--json');
if (!filesArg) {
  console.error('缺少 --files（逗号分隔的 .vue 路径）');
  process.exit(1);
}

const BANNED = ['赋能', '一站式', '极致', '重磅', '立即开启', '全面提升', '开启新篇章', '遥遥领先', 'YYDS'];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const files = filesArg.split(',').map(s => s.trim()).filter(Boolean)
  .map(f => path.isAbsolute(f) ? f : path.join(base, f));

const results = [];
let totalFail = 0;
let totalWarn = 0;

for (const file of files) {
  const item = { file, fail: [], warn: [] };
  if (!fs.existsSync(file)) {
    item.fail.push({ check: '文件存在', detail: '不存在' });
    totalFail++;
    results.push(item);
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');
  const tpl = src.match(/<template>([\s\S]*)<\/template>/)?.[1] ?? src;

  for (const w of BANNED) {
    const idx = src.indexOf(w);
    if (idx >= 0) item.fail.push({ check: '营销词', detail: `「${w}」@${src.slice(0, idx).split('\n').length}` });
  }

  for (const tag of src.match(/<img\b[^>]*>/g) || []) {
    if (!/\balt\s*=/.test(tag)) item.fail.push({ check: '图片缺 alt', detail: tag.slice(0, 60) });
  }

  const hasOutlineNone = /outline\s*:\s*none/.test(src);
  const hasAltFocus = /:focus-visible/.test(src) || /:focus\b/.test(src);
  if (hasOutlineNone && !hasAltFocus) item.fail.push({ check: '焦点被移除', detail: 'outline: none 且无 :focus / :focus-visible' });

  const badTab = src.match(/tabindex\s*=\s*"([1-9]\d*)"/);
  if (badTab) item.fail.push({ check: 'tabindex>0', detail: badTab[0] });

  if (EMOJI.test(tpl)) item.fail.push({ check: 'emoji 当图标', detail: tpl.match(EMOJI)[0] });

  if (!/loading|isLoading|v-loading|skeleton|骨架/i.test(src)) item.warn.push({ check: 'loading 态', detail: '未见' });
  if (!/empty|暂无|没有数据|el-empty/i.test(src)) item.warn.push({ check: '空态', detail: '未见' });
  if (!/error|失败|catch|重试|retry/i.test(src)) item.warn.push({ check: '错误态/重试', detail: '未见' });
  if (!/disabled/i.test(src)) item.warn.push({ check: 'disabled 态', detail: '未见' });
  if (!/:hover|hover-class/i.test(src)) item.warn.push({ check: 'hover 态', detail: '未见' });
  if (!/:focus|focus-visible/i.test(src)) item.warn.push({ check: 'focus 可见', detail: '未见' });
  if (!/@keydown|aria-|role\s*=/.test(src)) item.warn.push({ check: '键盘/语义', detail: '未见' });
  if (!/navigateBack|router\.back|redirectTo|reLaunch|navigateTo|switchTab/.test(src)) item.warn.push({ check: '返回路径', detail: '未见路由回退调用' });
  if (/暂无数据/.test(src)) item.warn.push({ check: '空态文案', detail: '仅「暂无数据」，缺下一步' });

  for (const m of src.match(/<div\b[^>]*@click[^>]*>/g) || []) {
    if (!/role\s*=/.test(m) && !/tabindex/.test(m)) item.warn.push({ check: '可点 div 无语义', detail: m.slice(0, 60) });
  }

  totalFail += item.fail.length;
  totalWarn += item.warn.length;
  results.push(item);
}

if (asJson) {
  console.log(JSON.stringify({ files: results, summary: { fail: totalFail, warn: totalWarn } }, null, 2));
} else {
  for (const r of results) {
    console.log('FILE ' + path.relative(base, r.file));
    for (const f of r.fail) console.log('  FAIL ' + f.check + ' | ' + f.detail);
    for (const w of r.warn) console.log('  WARN ' + w.check + ' | ' + w.detail);
  }
  console.log('---');
  console.log('SUMMARY files=' + results.length + ' FAIL=' + totalFail + ' WARN=' + totalWarn);
}
if (totalFail) process.exitCode = 1;
