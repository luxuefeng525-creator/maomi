'use strict';
/*
 * build-raster-icons.js
 * 由 assets/iotview-icons/mxGraph.json 生成可复用、AI 友好的位图图标索引：
 *   - assets/iotview-icons/raster-icons.json  : 机器可读清单（id / 中文名 / 分类 / 相对路径）
 *   - references/raster-icon-library.md        : 人/AI 检索索引（按分类分组）
 *
 * 这批图标是 PNG 位图（来自 iotview / mxGraph 图形库），与 FUXA 矢量图元不同：
 *   - 固定像素，不能用 currentColor 改状态色；放大会失真
 *   - 适合写实设备示意 / 装饰，用 <img src="相对路径"> 引用
 *
 * 用法：node scripts/build-raster-icons.js
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ICON_DIR = path.join(ROOT, 'assets', 'iotview-icons');
const srcJson = path.join(ICON_DIR, 'mxGraph.json');

if (!fs.existsSync(srcJson)) {
  console.error('找不到 mxGraph.json：' + srcJson);
  process.exit(2);
}

const groups = JSON.parse(fs.readFileSync(srcJson, 'utf8'));
const icons = [];
const byCat = {};

for (const g of groups) {
  if (!g.files) continue;
  const cat = (g.title || '未分类').trim();
  for (const f of g.files) {
    if (!f.path) continue;
    // mxGraph path 形如 shapes/38/31.png → 移入 skill 后为 assets/iotview-icons/38/31.png
    const rel = f.path.replace(/^shapes\//, '');
    const absRel = 'assets/iotview-icons/' + rel;
    // 只收实际存在的文件
    if (!fs.existsSync(path.join(ROOT, absRel))) continue;
    const id = 'iv-' + rel.replace(/\//g, '-').replace(/\.[^.]+$/, ''); // iv-38-31
    const label = (f.title || cat).trim();
    icons.push({ id, label, category: cat, path: absRel });
    (byCat[cat] ||= []).push(id);
  }
}

const json = {
  source: 'iotview / mxGraph 图形库',
  type: 'raster-png',
  note: 'PNG 位图，不可用 currentColor 改色、放大会失真；用 <img src="path"> 引用。适合写实设备示意/装饰，需要动态状态色的工艺图元请用 FUXA 矢量库（process-symbols）。',
  count: icons.length,
  categories: Object.keys(byCat).sort(),
  icons,
};
fs.writeFileSync(path.join(ICON_DIR, 'raster-icons.json'), JSON.stringify(json, null, 2), 'utf8');

// Markdown 索引
const catSorted = Object.entries(byCat).sort((a, b) => b[1].length - a[1].length);
const lines = [];
lines.push('# 工业位图图标库（iotview，AI 可复用）');
lines.push('');
lines.push(`共 **${icons.length}** 个 PNG 位图图标，源自 iotview / mxGraph 图形库，带中文命名，覆盖 ${catSorted.length} 个设备/工艺分类。`);
lines.push('');
lines.push('## 与 FUXA 矢量库的区别（选用前先读）');
lines.push('');
lines.push('| 维度 | FUXA `process-symbols`（矢量） | 本库 iotview（位图） |');
lines.push('| --- | --- | --- |');
lines.push('| 格式 | SVG `<symbol>`/`<use>` | PNG `<img>` |');
lines.push('| 状态色 | `currentColor` 可随状态变色 | 固定像素，**不可改色** |');
lines.push('| 缩放 | 无损 | 放大失真 |');
lines.push('| 适用 | 需动态变色的工艺图元（P&ID） | 写实设备示意 / 装饰 / 图例缩略 |');
lines.push('');
lines.push('> 需要“运行绿 / 故障红 / 离线灰”动态着色的设备，用 FUXA 矢量库；只需一张好看的设备图、不随状态变色，用本库。');
lines.push('');
lines.push('## 文件');
lines.push('');
lines.push('| 文件 | 用途 |');
lines.push('| --- | --- |');
lines.push('| `assets/iotview-icons/<分组>/<n>.png` | 图标位图本体（已随 skill 一同存放） |');
lines.push('| `assets/iotview-icons/raster-icons.json` | 机器可读清单（id / 中文名 / 分类 / 相对路径），供 AI 检索 |');
lines.push('| `assets/iotview-icons/mxGraph.json` | 原始 mxGraph 清单（保留备查） |');
lines.push('| `scripts/build-raster-icons.js` | 重建本索引 |');
lines.push('');
lines.push('## 怎么用（AI 复用步骤）');
lines.push('');
lines.push('1. 按设备名在下表分类里检索，或在 `raster-icons.json` 里按 `label`/`category` 过滤，拿到 `path`。');
lines.push('2. 用 `<img>` 引用（路径相对于交付 HTML 所在位置；本 skill 的 `out/<场景>/index.html` 到 assets 的相对前缀为 `../../assets/iotview-icons/...`）：');
lines.push('');
lines.push('```html');
lines.push('<img src="../../assets/iotview-icons/38/31.png" alt="鼓风机"');
lines.push('     width="64" height="64" style="object-fit:contain">');
lines.push('```');
lines.push('');
lines.push('3. 位图无法改色；如需状态指示，用外层边框/角标/文字表达状态，不要指望改图本身颜色。放大不超过原始像素以免失真。');
lines.push('');
lines.push('## 分类索引');
lines.push('');
lines.push('| 分类 | 数量 | id 前缀示例 | 路径目录 |');
lines.push('| --- | --- | --- | --- |');
for (const [cat, ids] of catSorted) {
  const sample = icons.find(i => i.id === ids[0]);
  const dir = sample ? sample.path.split('/').slice(0, -1).join('/') : '';
  lines.push(`| ${cat} | ${ids.length} | \`${ids[0]}\` | \`${dir}\` |`);
}
lines.push('');
lines.push('> 完整逐条清单（1500+ 项）见 `assets/iotview-icons/raster-icons.json`，Markdown 不逐条铺开以保持可读。按分类定位目录后，该目录下所有 PNG 均属同类。');
lines.push('');
lines.push('## 换热站 / 水务常用分类速查');
lines.push('');
lines.push('| 场景部件 | 分类 |');
lines.push('| --- | --- |');
lines.push('| 鼓风机 | 鼓风机 |');
lines.push('| 水泵 / 加压泵 | 泵 |');
lines.push('| 阀门 | 阀门、阀门符号 |');
lines.push('| 锅炉 / 换热 | 锅炉、制程加热、制程冷却、加热器 |');
lines.push('| 流量计 / 仪表 | 流量计、仪表 |');
lines.push('| 管道 | 管道、电线 |');
lines.push('| 水处理 | 废水处理、水槽 |');
lines.push('| 暖通 | HAVC |');
lines.push('| 搅拌 | 搅拌器 |');
lines.push('');

fs.writeFileSync(path.join(ROOT, 'references', 'raster-icon-library.md'), lines.join('\n') + '\n', 'utf8');

console.log('生成完成：');
console.log('  清单 : assets/iotview-icons/raster-icons.json （' + icons.length + ' 个图标）');
console.log('  索引 : references/raster-icon-library.md （' + catSorted.length + ' 分类）');
console.log('  分类 : ' + catSorted.map(([k, v]) => k + ':' + v.length).join('  '));
