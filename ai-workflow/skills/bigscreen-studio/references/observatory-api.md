# observatory 预设：3D 数字孪生大屏

文件：`src/screens/<id>/{template.html,styles.css,app.js,model.js}`，`renderer: "generic"`。
脚手架从 `src/screens/park/` 复制（园区案例），并把 `ObservatoryScenes.builders.park` 改成 `<id>`、清空头图占位。

## 两层职责

- `model.js` —— **三维场景**：用 `AstraGeometry` 拼几何体，注册 `ObservatoryScenes.builders.<id>`。
- `app.js` —— **运营面板**：调用 `ObservatoryDashboard.mount({...})`，传品牌文案、指标函数、左右面板 HTML、场景点选对象。

## model.js 契约

```js
ObservatoryScenes.builders.<id> = ({ T, root, pick, animations, state }) => {
  // root: THREE.Group，直接往里加模型
  // pick(assetId, mesh, [x,y,z], [sx,sy,sz], layerName)  → 生成透明拾取盒 + 地面高亮环
  // animations.push((t, state) => {...})                 → 每帧回调（t 秒）
  // state: 由 scene.simulate() 注入的共享状态
  return { setLayer(value) { /* 图层切换：all / 自定义 */ }, root };
};
```

相机：正交相机，半径 65，可视高度约 19–28 单位 → **场景整体控制在 ±20 单位内**，中心在原点，地面 y=0。

### AstraGeometry 工具（`window.AstraGeometry`）

| 函数 | 说明 |
| --- | --- |
| `box(group, x, y, z, w, h, d, material)` | 立方体，返回 mesh |
| `cylinder(group, x, y, z, r, h, material, topR?)` | 圆柱/圆台 |
| `line(group, points[[x,y,z]...], color, opacity?)` | 折线（轮廓、轨道） |
| `standard(color, {metalness, roughness, opacity, transparent})` | PBR 材质 |
| `glow(color, opacity?)` | 自发光材质（灯带、光点） |
| `label(name, [x,y,z], detail)` | 场景标签，返回对象（配合 pick 使用） |
| `halo(group, x, z, color, r?)` | 地面光环（Shader，加色混合） |
| `seed(i)` | 0–1 伪随机，做自然感分布 |
| `batchStatic(group, excluded?)` | 合并静态网格，**大幅降 draw call，务必在最后调用** |

性能经验：一个场景控制在 **150 draw call 以内**（verify 的 `audit.renderer` 为 `webgl` 即可，draw call 可在 canvas 的 `data-draw-calls` 上读）。大量重复小物件（窗格、路灯、货箱）先建后 `batchStatic`。

### 场景写作套路（照着 park 改）

```js
const base = standard('#151b37'), glass = standard('#697ab0', { metalness: .75, roughness: .22 });
const cyan = glow('#70eaff');
box(root, 0, -0.65, 0, 35, 1, 27, base);          // 地基
for (...) box(buildings, x, y, z, w, h, d, glass); // 主体
for (...) box(buildings, x, y, z, w, .045, .035, cyan); // 灯带
batchStatic(buildings); batchStatic(root, [动画物体...]);
```

## app.js：mount 配置

```js
ObservatoryDashboard.mount({
  id, glyph, accent,                     // glyph 见下方图标表；accent 是主色
  brand, brandEnglish, title, eyebrow,   // 品牌与标题文案
  site, season,                          // 导航条左侧：位置 · 天气
  scopeLabel, scopes: [{id, name}],      // 右上角范围下拉（1–3 个）
  topics: [{name, layer, note}],         // 业务主题 tab（3–5 个），layer 对应场景图层
  metricIcons: [icon, ...],              // 与 metrics() 返回的 4 条一一对应
  left, right,                           // 左右面板 HTML（用 helpers 生成）
  sceneTitle, sceneEnglish, coordinates, focusNote,
  layers: [{id, name, note}],            // 场景图层下拉
  metrics(state) { return [[label, value, unit, note], ...] }, // 必须返回 4 条
  insight: { title, label, metricUnit, metrics: [..], periods: [..], notes: [..], values: [[..]], labels: [..], unit, type: 'line'|'bar' },
  assets: [{ id, short, name, description, fields: [[k,v],...] }], // 场景点选对象，id 与 pick 一致
  actions: { 自定义action(state, ui) },   // data-action="xxx" 会走到这里
  update(state, ui) { ui.bind('key', value) },
  footer,
});
```

`insight.values` 是二维数组（每个周期一组），`labels` 是 x 轴，`notes` 每个周期一句话。

## helpers（`ObservatoryDashboard.helpers`，简写 `H`）

```js
H.panel(title, code, bodyHTML, glyph)  // 标准面板
H.bars([[label, 0-100, display, color, bindKey], ...])
H.facts([[label, value, unit], ...])
H.ring(percent, label)                 // 环形进度
H.matrix(count)                        // 设备状态点阵
H.icon(name) / H.escape(v) / H.number(v)
```

可用图标（`glyph` / `H.icon` / `metricIcons`）：
`leaf factory park home fullscreen export help sun water sensor wind layers check target calendar energy shield users chart box clock alert plus minus orbit top pause play close car arrow`

## ui 对象（update/actions 里用）

```js
ui.bind(key, value)      // 写所有 [data-bind="key"]
ui.setProgress(key, v)   // 写 [data-progress="key"] 的宽度
ui.notify(text)          // 轻提示
ui.dialog(title, html)   // 模态框
ui.asset(id)             // 打开某个场景对象的详情
ui.refresh()             // 重新渲染指标
ui.scene()               // 拿到 three 场景 api（zoom/reset/select/setMode/simulate）
```

## 状态约定

`state` 里已有：`topic, scope, period, running, orbit, top, resolved, irrigating, taskDone`。
需要新状态就自己加字段（在 `metrics/update` 里读写），**不要改 observatory.js**。

## 主题化

`styles.css` 只覆盖 CSS 变量与少量质感，模板已注入 `observatory.css`（2121 行，含全部布局）：

```css
:root { --bg:#0c1121; --panel:#171e35; --line:#abb6ed20; --accent:#b7a9ef;
        --secondary:#7fcacb; --text:#edf0ff; --muted:#9aabc5; --dim:#586888; }
.ob-app { background: radial-gradient(...); }   /* 底色氛围 */
.ob-panel { background: linear-gradient(125deg,#1d274080,#161d32); }
```

换色只改 `:root` 这几行 + `accent`（传进 mount 用于场景光照）。

## 头图（可选）

模板里 `data-header-art=""` 留空即可，流光线（rails）仍会动。若要做定制头图，需要放 `assets/art/astra/<id>-header.png`（带透明通道），再把属性改回 `/*__OBSERVATORY_HEADER_ART__*/`，否则构建会报缺文件。

## 面板内容溢出时（最常遇到）

共享面板高度是 `grid-template-rows: 1fr 1fr 1fr` 三等分，内容超了会被裁。按顺序处理：

1. 砍条目：事件流 3 条、facts 2 组、matrix ≤ 40；
2. 还是超，就在屏幕自己的 `styles.css` 追加压缩样式（已验证有效）：

```css
/* 4 指标 + 三栏布局下的整体压缩 */
.ob-metric { padding: 11px 16px; }
.ob-metric-value strong { font-size: 29px; letter-spacing: -0.6px; }
.ob-metric-value em { margin-right: 4px; font-size: 9.5px; }
.ob-metric .ob-icon { width: 20px; height: 20px; }
.ob-panel { padding: 14px 15px; }
.ob-task { padding: 8px 0; }
.ob-alert { padding: 9px 9px; }
.ob-facts { margin-top: 8px; }
```

`verify.mjs` 的 `audit.overflow` 会给出具体哪个面板超了多少 px，改完复跑即可。
