'use strict';
/*
 * build-symbol-library.js
 * 从 FUXA 仓库（MIT, frangoteam/FUXA）的工艺图元 SVG 批量生成一个
 * 可复用、AI 友好的工业图元库，产出到 assets/symbol-library/：
 *   - process-symbols.svg   : 全部图元的 <symbol> sprite（内联到 HTML 的 <defs> 即可）
 *   - process-symbols.json  : 机器可读清单（id / 中文名 / 分类 / 关键词 / viewBox）
 *   - 另由本仓库 references/process-symbol-library.md 做人类/AI 检索索引
 *
 * 清洗规则：
 *   - 去除 <?xml>、<metadata>、<sodipodi:*>、<inkscape:*>、<defs>（原图元几乎不含有效 defs）
 *   - 提取 <svg> 内部几何，包装成 <symbol id="fx-<name>" viewBox="0 0 24 24">
 *   - 描边/填充中的 #fff/#ffffff/#000/#000000 规范为 currentColor，
 *     使图元颜色可由外层 <use> 的 color 驱动，接入状态色系统
 *
 * 用法：
 *   node scripts/build-symbol-library.js [FUXA图元目录]
 * 默认目录：/Users/weixingzheng/my_pro/skills/FUXA/client/src/assets/lib/svgeditor/shapes/img
 */

const fs = require('node:fs');
const path = require('node:path');

const SRC = process.argv[2]
  || '/Users/weixingzheng/my_pro/skills/FUXA/client/src/assets/lib/svgeditor/shapes/img';
const SKILL_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(SKILL_ROOT, 'assets', 'symbol-library');

if (!fs.existsSync(SRC)) {
  console.error('找不到 FUXA 图元目录：' + SRC);
  process.exit(2);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

// 分类 + 中文名 + 关键词映射（前缀/精确名匹配）。未命中归入 misc。
const META = [
  // 压缩机
  [/^compscrew$/, '螺杆压缩机', 'compressor', ['压缩机', '螺杆', 'screw']],
  [/^compturbo$/, '涡轮/离心压缩机', 'compressor', ['压缩机', '涡轮', '离心', 'turbo']],
  [/^comprotary/, '旋转式压缩机', 'compressor', ['压缩机', '旋转', 'rotary']],
  [/^compreci/, '往复式压缩机', 'compressor', ['压缩机', '往复', 'reciprocating']],
  [/^compdiaph$/, '隔膜压缩机', 'compressor', ['压缩机', '隔膜']],
  [/^compejector$/, '喷射压缩机', 'compressor', ['压缩机', '喷射', 'ejector']],
  [/^compair$/, '空气压缩机', 'compressor', ['压缩机', '空气', 'air']],
  [/^compring/, '液环压缩机', 'compressor', ['压缩机', '液环']],
  [/^compsilence$/, '静音压缩机', 'compressor', ['压缩机', '静音']],
  [/^compressor-/, '压缩机', 'compressor', ['压缩机', 'compressor']],
  // 泵
  [/^pumpcentri/, '离心泵', 'pump', ['泵', '离心泵', 'centrifugal']],
  [/^pumpturbi$/, '涡轮泵', 'pump', ['泵', '涡轮泵']],
  [/^pumphorizo$/, '卧式泵', 'pump', ['泵', '卧式']],
  [/^pumphidra$/, '液压泵', 'pump', ['泵', '液压']],
  [/^pumpblower$/, '鼓风机/泵', 'pump', ['泵', '鼓风机', 'blower']],
  [/^pumpgear/, '齿轮泵', 'pump', ['泵', '齿轮', 'gear']],
  [/^pumpscreew/, '螺杆泵', 'pump', ['泵', '螺杆泵', 'screw']],
  [/^pumpjet$/, '射流泵', 'pump', ['泵', '射流', 'jet']],
  [/^pumpperis$/, '蠕动泵', 'pump', ['泵', '蠕动', 'peristaltic']],
  [/^pumpvacuum$/, '真空泵', 'pump', ['泵', '真空', 'vacuum']],
  [/^pumpfeed$/, '给料泵', 'pump', ['泵', '给料']],
  [/^pump/, '泵', 'pump', ['泵', 'pump']],
  // 换热器
  [/^exchanger-heat$/, '板式换热器', 'exchanger', ['换热器', '板式', 'heat']],
  [/^exchanger-tube$/, '管壳换热器', 'exchanger', ['换热器', '管壳', 'tube']],
  [/^exchanger-filter$/, '过滤换热器', 'exchanger', ['换热器', '过滤']],
  [/^exchanger/, '换热器', 'exchanger', ['换热器', 'exchanger']],
  // 阀门
  [/^valve-/, '阀门', 'valve', ['阀', '阀门', 'valve']],
  // 罐/容器
  [/^tank/, '储罐/容器', 'tank', ['罐', '储罐', '容器', 'tank']],
  // 电机
  [/^motor/, '电机', 'motor', ['电机', '马达', 'motor']],
  // 管件
  [/^pipi/, '管件/弯头', 'pipe', ['管', '管件', '弯头', 'pipe']],
  [/^fitting/, '管路配件', 'pipe', ['管件', '配件', 'fitting']],
  [/^nozzle/, '喷嘴', 'pipe', ['喷嘴', 'nozzle']],
  // 搅拌/反应
  [/^agitator/, '搅拌器', 'mixer', ['搅拌', '搅拌器', 'agitator']],
  // 离心/分离
  [/^centrifug/, '离心机/离心设备', 'separator', ['离心机', '分离', 'centrifuge']],
  [/^filter/, '过滤器', 'separator', ['过滤器', 'filter']],
  [/^crusher/, '破碎机', 'process', ['破碎机', 'crusher']],
  [/^drier/, '干燥器', 'process', ['干燥器', '烘干', 'drier']],
  [/^feeder/, '给料机', 'process', ['给料机', 'feeder']],
  [/^diaph$/, '隔膜', 'process', ['隔膜', 'diaphragm']],
  // 动画元件
  [/^anim-/, '动画元件', 'anim', ['动画', 'anim']],
  // 基础形状
  [/^shape-/, '基础形状', 'shape', ['形状', 'shape']],
  // 杂项
  [/^misc/, '杂项设备', 'misc', ['杂项', 'misc']],
  [/^webcam$/, '摄像头', 'misc', ['摄像头', 'webcam']],
];

function classify(name) {
  for (const [re, label, cat, kw] of META) {
    if (re.test(name)) return { label, cat, keywords: kw };
  }
  return { label: name, cat: 'misc', keywords: [name] };
}

// 规范颜色：把常见白/黑描边与填充映射到 currentColor
function normalizeColors(s) {
  return s
    .replace(/stroke:\s*#(fff(fff)?|000(000)?)/gi, 'stroke:currentColor')
    .replace(/stroke="#(fff(fff)?|000(000)?)"/gi, 'stroke="currentColor"')
    .replace(/fill="#(fff(fff)?)"/gi, 'fill="currentColor"')
    .replace(/fill:\s*#(fff(fff)?)/gi, 'fill:currentColor')
    // 黑色填充在线框图元里一般是占位，统一透明以免糊成一团
    .replace(/fill="#000(000)?"/gi, 'fill="none"')
    .replace(/fill:\s*#000(000)?/gi, 'fill:none');
}

// 从一个 SVG 文件抽取内部几何
function extractInner(raw) {
  let s = raw;
  // 去 XML 声明、注释
  s = s.replace(/<\?xml[\s\S]*?\?>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  // 取 <svg ...> ... </svg> 内部
  const m = s.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/i);
  let inner = m ? m[1] : s;
  // 去 metadata / sodipodi:namedview / defs（原图元 defs 基本为空）
  inner = inner.replace(/<metadata\b[\s\S]*?<\/metadata>/gi, '');
  inner = inner.replace(/<sodipodi:namedview\b[\s\S]*?<\/sodipodi:namedview>/gi, '');
  inner = inner.replace(/<sodipodi:namedview\b[^>]*\/>/gi, '');
  inner = inner.replace(/<defs\b[\s\S]*?<\/defs>/gi, '');
  inner = inner.replace(/<defs\b[^>]*\/>/gi, '');
  // 去 inkscape/sodipodi 命名空间属性
  inner = inner.replace(/\s(?:inkscape|sodipodi):[\w-]+="[^"]*"/gi, '');
  // 去 id 属性（避免 sprite 内 id 冲突）
  inner = inner.replace(/\sid="[^"]*"/gi, '');
  // 去 pointer-events（sprite 里统一由外层控制）
  inner = inner.replace(/\spointer-events="[^"]*"/gi, '');
  inner = normalizeColors(inner);
  // 压缩空白
  inner = inner.replace(/\n\s*\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  return inner;
}

const files = fs.readdirSync(SRC).filter(f => f.toLowerCase().endsWith('.svg')).sort();
const manifest = [];
const symbols = [];

for (const file of files) {
  const name = file.replace(/\.svg$/i, '');
  const raw = fs.readFileSync(path.join(SRC, file), 'utf8');
  const inner = extractInner(raw);
  if (!inner) continue;
  const id = 'fx-' + name;
  const { label, cat, keywords } = classify(name);
  symbols.push(`  <symbol id="${id}" viewBox="0 0 24 24">\n    ${inner}\n  </symbol>`);
  manifest.push({ id, fuxaName: name, label, category: cat, keywords, viewBox: '0 0 24 24' });
}

// 写 sprite
const sprite = `<?xml version="1.0" encoding="UTF-8"?>
<!-- 工业工艺图元库 · 源自 FUXA (MIT License, frangoteam/FUXA) -->
<!-- 用法：把需要的 <symbol> 复制进目标 SVG 的 <defs>，再 <use href="#fx-xxx" width=".." height=".." style="color:var(--success)"/> -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
${symbols.join('\n')}
</svg>
`;
fs.writeFileSync(path.join(OUT_DIR, 'process-symbols.svg'), sprite, 'utf8');

// 写 JSON 清单
const byCat = {};
for (const m of manifest) (byCat[m.category] ||= []).push(m.id);
const json = {
  source: 'FUXA (frangoteam/FUXA)',
  license: 'MIT',
  count: manifest.length,
  viewBox: '0 0 24 24',
  usage: 'Copy needed <symbol> from process-symbols.svg into target SVG <defs>, then <use href="#<id>" width height style="color:var(--state)"/>. Colors are driven by currentColor.',
  categories: Object.keys(byCat).sort(),
  symbols: manifest,
};
fs.writeFileSync(path.join(OUT_DIR, 'process-symbols.json'), JSON.stringify(json, null, 2), 'utf8');

console.log(`生成完成：${manifest.length} 个图元`);
console.log(`  sprite : ${path.relative(SKILL_ROOT, path.join(OUT_DIR, 'process-symbols.svg'))}`);
console.log(`  json   : ${path.relative(SKILL_ROOT, path.join(OUT_DIR, 'process-symbols.json'))}`);
const catCount = Object.entries(byCat).map(([k, v]) => `${k}:${v.length}`).sort().join('  ');
console.log('  分类   : ' + catCount);
