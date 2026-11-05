'use strict';
/*
 * gen-symbol-doc.js
 * 由 assets/symbol-library/process-symbols.json 生成
 * references/process-symbol-library.md —— 给 AI / 人类检索的图元索引。
 * 在 build-symbol-library.js 之后运行。
 */
const fs = require('node:fs');
const path = require('node:path');

const SKILL_ROOT = path.resolve(__dirname, '..');
const jsonPath = path.join(SKILL_ROOT, 'assets', 'symbol-library', 'process-symbols.json');
const outPath = path.join(SKILL_ROOT, 'references', 'process-symbol-library.md');

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const skJsonPath = path.join(SKILL_ROOT, 'assets', 'symbol-library', 'skill-symbols.json');
const skData = fs.existsSync(skJsonPath) ? JSON.parse(fs.readFileSync(skJsonPath, 'utf8')) : { symbols: [] };

const CAT_LABEL = {
  compressor: '压缩机 Compressor',
  pump: '泵 Pump',
  exchanger: '换热器 Exchanger',
  valve: '阀门 Valve',
  tank: '罐 / 容器 Tank',
  motor: '电机 Motor',
  pipe: '管件 Pipe & Fitting',
  mixer: '搅拌器 Mixer',
  separator: '分离 / 过滤 Separator',
  process: '其他工艺设备 Process',
  anim: '动画元件 Animated',
  shape: '基础形状 Shape',
  misc: '杂项 Misc',
  logo: '品牌 LOGO',
  instrument: '仪表 Instrument',
};
const CAT_ORDER = ['compressor','pump','exchanger','valve','tank','motor','pipe','mixer','separator','process','anim','shape','misc'];

const byCat = {};
for (const s of data.symbols) (byCat[s.category] ||= []).push(s);

const lines = [];
lines.push('# 工业工艺图元库（AI 可复用）');
lines.push('');
lines.push(`共 **${data.count}** 个与框架无关的工艺图元，源自 **FUXA**（\`frangoteam/FUXA\`，MIT License），已清洗元数据并把描边/填充统一改为 \`currentColor\`，颜色由外层 \`color\` 驱动，可直接接入本 skill 的状态色系统（绿=运行/橙=关注/红=报警/灰=离线/青=主数据）。`);
lines.push('');
lines.push('## 文件');
lines.push('');
lines.push('| 文件 | 用途 |');
lines.push('| --- | --- |');
lines.push('| `assets/symbol-library/process-symbols.svg` | 全部图元的 `<symbol>` sprite，复制所需 symbol 到目标 SVG 的 `<defs>` |');
lines.push('| `assets/symbol-library/process-symbols.json` | 机器可读清单（id / 中文名 / 分类 / 关键词），供 AI 检索 |');
lines.push('| `assets/symbol-library/skill-symbols.svg` + `.json` | 本 skill 自建图元（`sk-` 前缀）：LOGO、地源井、分集水器、水塔、仪表气泡、俯视叶轮 |');
lines.push('| `scripts/build-symbol-library.js` | 从 FUXA 仓库重建本库（图元增删时重跑） |');
lines.push('');
lines.push('## 怎么用（AI 复用步骤）');
lines.push('');
lines.push('1. 按设备名在下表「关键词 / 中文名」里检索，拿到 `id`（形如 `fx-compscrew`）。');
lines.push('2. 从 `process-symbols.svg` 复制对应 `<symbol id="...">…</symbol>` 到目标 HTML 内联 SVG 的 `<defs>` 中（只复制用到的，保持单文件精简）。');
lines.push('3. 在工艺图里放置并着色：');
lines.push('');
lines.push('```html');
lines.push('<svg viewBox="0 0 1120 540">');
lines.push('  <defs>');
lines.push('    <!-- 从 process-symbols.svg 复制需要的 symbol，例如： -->');
lines.push('    <symbol id="fx-compscrew" viewBox="0 0 24 24"> … </symbol>');
lines.push('  </defs>');
lines.push('  <!-- width/height 决定显示尺寸；style color 决定状态色 -->');
lines.push('  <use href="#fx-compscrew" x="430" y="222" width="60" height="60"');
lines.push('       style="color:var(--success)"/>');
lines.push('</svg>');
lines.push('```');
lines.push('');
lines.push('动效（随工况启停旋转）直接复用 skill 既有约定：给 `<use>` 加 `.spin` 类（已含 `transform-box:fill-box;transform-origin:center`），停机时移除类即可。竖轴设备不要做屏幕平面 360° 旋转——遵循 `design-system.md` 的动效边界。');
lines.push('');
lines.push('> 许可：FUXA 为 MIT，可自由使用/修改/商用，交付物中保留来源署名（本库文件头与界面注释已标注）。');
lines.push('');
lines.push('## 图元索引');
lines.push('');

for (const cat of CAT_ORDER) {
  const arr = byCat[cat];
  if (!arr || !arr.length) continue;
  lines.push(`### ${CAT_LABEL[cat] || cat} · ${arr.length}`);
  lines.push('');
  lines.push('| id | 中文名 | FUXA 原名 | 关键词 |');
  lines.push('| --- | --- | --- | --- |');
  for (const s of arr.sort((a, b) => a.id.localeCompare(b.id))) {
    lines.push(`| \`${s.id}\` | ${s.label} | ${s.fuxaName} | ${s.keywords.join('、')} |`);
  }
  lines.push('');
}

// 自建图元库（sk- 前缀）
if (skData.symbols && skData.symbols.length) {
  lines.push('## 本 skill 自建图元（`sk-` 前缀）');
  lines.push('');
  lines.push('填补 FUXA 库未覆盖的水务/热泵场景图元与 LOGO，用法与 FUXA 库完全一致（`currentColor` 着色，`<use href="#sk-xxx">`）。');
  lines.push('');
  lines.push('| id | 中文名 | 分类 | 关键词 |');
  lines.push('| --- | --- | --- | --- |');
  for (const s of skData.symbols.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    lines.push(`| \`${s.id}\` | ${s.label} | ${CAT_LABEL[s.category] || s.category} | ${s.keywords.join('、')} |`);
  }
  lines.push('');
}

lines.push('## 热泵站 / 水务常用组合（速查）');
lines.push('');
lines.push('| 场景部件 | 建议图元 |');
lines.push('| --- | --- |');
lines.push('| 螺杆热泵压缩机 | `fx-compscrew` |');
lines.push('| 离心/磁悬浮压缩机 | `fx-compturbo` |');
lines.push('| 板式换热器 | `fx-exchanger-heat` |');
lines.push('| 管壳换热器 | `fx-exchanger-tube` |');
lines.push('| 循环泵 / 加压泵 | `fx-pumpcentri1`、`fx-pumphorizo` |');
lines.push('| 鼓风机 | `fx-pumpblower` |');
lines.push('| 驱动电机 | `fx-motor-simb` |');
lines.push('| 调节 / 节流阀 | `fx-valve-ax`、`fx-valve-bx`、`fx-valve-cx` |');
lines.push('| 储罐 / 定压罐 / 水箱 | `fx-tank1` ~ `fx-tank9` |');
lines.push('| 管件 / 弯头 / 三通 | `fx-pipi1` ~ `fx-pipi7`、`fx-fitting1` ~ `fx-fitting13` |');
lines.push('| 搅拌器（加药/反应池） | `fx-agitator-prop`、`fx-agitator-paddle` |');
lines.push('| 过滤器 | `fx-filter2`、`fx-filter3` |');
lines.push('| 地源井 / 源侧埋管 | `sk-ground-well` |');
lines.push('| 高位水塔 | `sk-water-tower` |');
lines.push('| 分集水器 | `sk-manifold` |');
lines.push('| 仪表测点气泡 | `sk-instrument` |');
lines.push('| 俯视旋转叶轮（动画） | `sk-impeller` |');
lines.push('| 热泵站 / 水务 LOGO | `sk-logo-heatpump`、`sk-logo-water` |');
lines.push('');

fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
console.log('生成：' + path.relative(SKILL_ROOT, outPath));
