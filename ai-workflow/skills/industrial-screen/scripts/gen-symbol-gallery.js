'use strict';
/*
 * gen-symbol-gallery.js
 * 把 assets/symbol-library/ 下的全部图元生成为一个总览大屏：
 *   out/symbol-gallery/index.html —— 1920×1080，按分类展示 154 个图元，
 *   点击状态色切换，可直观查看/选用。sprite 内联，单文件离线。
 *
 * 在 build-symbol-library.js 之后运行。
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const sprite = fs.readFileSync(path.join(ROOT, 'assets/symbol-library/process-symbols.svg'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/symbol-library/process-symbols.json'), 'utf8'));

// 自建图元库（原创，sk- 前缀）
const skSprite = fs.readFileSync(path.join(ROOT, 'assets/symbol-library/skill-symbols.svg'), 'utf8');
const skData = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/symbol-library/skill-symbols.json'), 'utf8'));

// iotview 位图图标库（PNG，<img> 引用）
const rasterData = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/iotview-icons/raster-icons.json'), 'utf8'));
const PER_CAT = 24; // 每类展示上限（避免 1500+ 张同屏卡顿）

// 取 sprite 里 <svg ...> 内部的全部 <symbol>，内联到页面 defs
const grabInner = (s) => (s.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/i) || [, ''])[1].trim();
const inner = grabInner(sprite);
const skInner = grabInner(skSprite);

const CAT_LABEL = {
  compressor:'压缩机 Compressor', pump:'泵 Pump', exchanger:'换热器 Exchanger',
  valve:'阀门 Valve', tank:'罐 / 容器 Tank', motor:'电机 Motor',
  pipe:'管件 Pipe & Fitting', mixer:'搅拌器 Mixer', separator:'分离 / 过滤 Separator',
  process:'其他工艺设备 Process', anim:'动画元件 Animated', shape:'基础形状 Shape', misc:'杂项 Misc',
  logo:'品牌 LOGO', instrument:'仪表 Instrument',
};
const CAT_ORDER = ['compressor','pump','exchanger','valve','tank','motor','pipe','mixer','separator','process','anim','shape','misc'];
const SK_CAT_ORDER = ['logo','tank','pump','pipe','instrument'];

function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function buildSection(symbols, catOrder) {
  const byCat = {};
  for (const s of symbols) (byCat[s.category] ||= []).push(s);
  let cards = '';
  for (const cat of catOrder) {
    const arr = byCat[cat];
    if (!arr || !arr.length) continue;
    cards += `\n        <section class="cat">\n`;
    cards += `          <h2>${escapeHtml(CAT_LABEL[cat]||cat)} <em>· ${arr.length}</em></h2>\n`;
    cards += `          <div class="grid">\n`;
    for (const s of arr.slice().sort((a,b)=>a.id.localeCompare(b.id))) {
      cards += `            <figure class="cell" title="${escapeHtml(s.id)} · ${escapeHtml(s.label)}">`;
      cards += `<svg class="ic" viewBox="0 0 24 24"><use href="#${s.id}"/></svg>`;
      cards += `<figcaption><b>${escapeHtml(s.label)}</b><code>${escapeHtml(s.id)}</code></figcaption></figure>\n`;
    }
    cards += `          </div>\n        </section>\n`;
  }
  return { cards, catCount: Object.keys(byCat).filter(c=>byCat[c].length).length };
}

const fx = buildSection(data.symbols, CAT_ORDER);
const sk = buildSection(skData.symbols, SK_CAT_ORDER);

// 位图区段：按分类分组，每类限量 PER_CAT 张，懒加载
function buildRasterSection(icons, perCat) {
  const byCat = {};
  for (const ic of icons) (byCat[ic.category] ||= []).push(ic);
  const cats = Object.entries(byCat).sort((a, b) => b[1].length - a[1].length);
  let out = '';
  for (const [cat, arr] of cats) {
    const shown = arr.slice(0, perCat);
    out += `\n        <section class="cat">\n`;
    out += `          <h2>${escapeHtml(cat)} <em>· ${arr.length}${arr.length > perCat ? `（展示前 ${perCat}）` : ''}</em></h2>\n`;
    out += `          <div class="grid">\n`;
    for (const ic of shown) {
      const src = '../../' + ic.path; // out/symbol-gallery/ → 根
      out += `            <figure class="cell" title="${escapeHtml(ic.label)} · ${escapeHtml(ic.path)}">`;
      out += `<img class="png" loading="lazy" src="${escapeHtml(src)}" alt="${escapeHtml(ic.label)}">`;
      out += `<figcaption><b>${escapeHtml(ic.label)}</b><code>${escapeHtml(ic.path.replace('assets/iotview-icons/', ''))}</code></figcaption></figure>\n`;
    }
    out += `          </div>\n        </section>\n`;
  }
  return out;
}
const rasterShown = Math.min(rasterData.count, rasterData.categories.length * PER_CAT);
const rasterCards = buildRasterSection(rasterData.icons, PER_CAT);

const cards =
  `\n      <div class="lib-head"><span class="badge">FUXA · MIT</span> 工艺图元库（矢量·可着色） <em>${data.count} 个</em></div>`
  + fx.cards
  + `\n      <div class="lib-head sk"><span class="badge sk">本 skill · 原创</span> 自建图元 / LOGO（矢量） <em>${skData.symbols.length} 个</em></div>`
  + sk.cards
  + `\n      <div class="lib-head rs"><span class="badge rs">iotview · 位图</span> 写实设备图标（PNG·不可改色） <em>${rasterData.count} 个 · ${rasterData.categories.length} 分类</em></div>`
  + rasterCards;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>工业工艺图元库总览</title>
<style>
*{box-sizing:border-box}
html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#03080c;color:#f2f7fa;font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif}
body{display:flex;align-items:center;justify-content:center}
:root{--bg:#071019;--s1:#0b1622;--s2:#0f1d2a;--line:#20394a;--line-strong:#31566d;--accent:#36c2ff;--accent-soft:rgba(54,194,255,.14);--success:#35d07f;--warning:#ffb547;--danger:#ff5d5d;--offline:#708594;--t1:#f2f7fa;--t2:#a8bac8;--t3:#708594}
#screen{width:1920px;height:1080px;position:absolute;left:50%;top:50%;transform-origin:center;display:grid;grid-template-rows:78px 1fr 40px;overflow:hidden;
  background:radial-gradient(circle at 50% 24%,rgba(54,194,255,.06),transparent 42%),repeating-linear-gradient(90deg,rgba(255,255,255,.012) 0,rgba(255,255,255,.012) 1px,transparent 1px,transparent 4px),var(--bg)}
.topbar{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:20px;padding:0 24px;border-bottom:1px solid var(--line);background:#050d15}
.topbar h1{margin:0;font-size:28px;letter-spacing:3px}
.topbar h1 small{display:block;font-size:11px;letter-spacing:5px;color:var(--accent);margin-top:4px}
.sub{font-size:12px;color:var(--t3)}
.colorbar{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--t2)}
.colorbar button{cursor:pointer;background:var(--s2);border:1px solid var(--line);color:var(--t2);font-size:12px;padding:6px 11px;border-radius:6px;font-family:inherit}
.colorbar button.active{border-color:var(--line-strong)}
.swatch{display:flex;gap:6px}
.swatch i{width:22px;height:22px;border-radius:5px;cursor:pointer;border:2px solid transparent}
.swatch i.active{border-color:#fff}
.content{min-height:0;overflow:auto;padding:16px 24px 10px}
.cat{margin-bottom:18px}
.cat h2{margin:0 0 10px;font-size:16px;font-weight:650;color:var(--t1);border-left:3px solid var(--accent);padding-left:10px}
.cat h2 em{font-style:normal;color:var(--t3);font-size:13px;font-weight:400}
.lib-head{margin:6px 0 14px;font-size:18px;font-weight:700;color:var(--t1);display:flex;align-items:center;gap:10px}
.lib-head em{font-style:normal;font-size:13px;font-weight:400;color:var(--t3)}
.lib-head.sk{margin-top:26px;padding-top:18px;border-top:1px dashed var(--line)}
.lib-head.rs{margin-top:26px;padding-top:18px;border-top:1px dashed var(--line)}
.badge{font-size:11px;font-weight:600;letter-spacing:1px;padding:3px 9px;border-radius:5px;background:var(--accent-soft);color:var(--accent);border:1px solid var(--line-strong)}
.badge.sk{background:rgba(53,208,127,.12);color:var(--success);border-color:#2a6b4a}
.badge.rs{background:rgba(255,181,71,.12);color:var(--warning);border-color:#6b5324}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px}
.cell{margin:0;display:flex;flex-direction:column;align-items:center;gap:7px;padding:12px 8px 10px;border:1px solid var(--line);border-radius:8px;background:linear-gradient(145deg,rgba(15,29,42,.95),rgba(8,18,28,.96));transition:border-color .15s}
.cell:hover{border-color:var(--line-strong)}
.ic{width:46px;height:46px;color:var(--symcolor,var(--accent))}
.png{width:52px;height:52px;object-fit:contain;background:#fff;border-radius:4px;padding:3px}
.cell figcaption{text-align:center;width:100%}
.cell b{display:block;font-size:12px;color:var(--t2);line-height:1.3;height:2.6em;overflow:hidden}
.cell code{display:block;margin-top:3px;font-size:10px;color:var(--t3);font-family:Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.footer{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 20px;border-top:1px solid var(--line);background:#050d15;font-size:12px;color:var(--t2)}
.footer div:last-child{text-align:right;color:var(--t3)}
.footer .mid{color:var(--t3)}
::-webkit-scrollbar{width:10px}::-webkit-scrollbar-thumb{background:#1c3345;border-radius:5px}::-webkit-scrollbar-track{background:transparent}
</style>
</head>
<body>
<div id="screen">
  <!-- 内联图元 sprite（FUXA 库 + 自建库） -->
  <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>
${inner}
${skInner}
  </defs></svg>

  <header class="topbar">
    <h1>工业图标 / 图元库总览<small>SYMBOL &amp; ICON LIBRARY · FUXA + 自建 + iotview</small></h1>
    <div class="sub">矢量 <b>${data.count + skData.symbols.length}</b>（FUXA ${data.count} + 自建 ${skData.symbols.length}）· 位图 <b>${rasterData.count}</b></div>
    <div class="colorbar">
      <span>着色</span>
      <div class="swatch">
        <i data-c="var(--accent)" style="background:#36c2ff" class="active" title="主数据"></i>
        <i data-c="var(--success)" style="background:#35d07f" title="运行"></i>
        <i data-c="var(--warning)" style="background:#ffb547" title="关注"></i>
        <i data-c="var(--danger)" style="background:#ff5d5d" title="报警"></i>
        <i data-c="var(--offline)" style="background:#708594" title="离线"></i>
      </div>
    </div>
  </header>

  <main class="content">${cards}
  </main>

  <footer class="footer">
    <div>● 矢量图元 currentColor 可着色 · 位图 PNG 用 <code style="color:var(--t3)">&lt;img&gt;</code> 引用不可改色</div>
    <div class="mid">FUXA（MIT）· 本 skill 自建 · iotview 位图（每类展示前 ${PER_CAT} 张，全量见 raster-icons.json）</div>
    <div>演示 · 色块仅切换矢量图元着色</div>
  </footer>
</div>
<script>
(function(){
  'use strict';
  try{
    var root=document.getElementById('screen');
    // 全局着色切换
    document.querySelectorAll('.swatch i').forEach(function(sw){
      sw.addEventListener('click',function(){
        try{
          document.querySelectorAll('.swatch i').forEach(function(x){x.classList.remove('active');});
          sw.classList.add('active');
          root.style.setProperty('--symcolor',sw.getAttribute('data-c'));
        }catch(e){console.error(e);}
      });
    });
    root.style.setProperty('--symcolor','var(--accent)');
    // 等比缩放
    function fit(){try{var scale=Math.min(innerWidth/1920,innerHeight/1080);root.style.transform='translate(-50%,-50%) scale('+scale+')';}catch(e){}}
    fit();addEventListener('resize',fit);
  }catch(e){console.error(e);}
})();
</script>
</body>
</html>
`;

const outDir = path.join(ROOT, 'out', 'symbol-gallery');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
console.log('生成：out/symbol-gallery/index.html （矢量 ' + (data.count + skData.symbols.length) + ' + 位图 ' + rasterData.count + '，位图每类展示前 ' + PER_CAT + ' 张）');
