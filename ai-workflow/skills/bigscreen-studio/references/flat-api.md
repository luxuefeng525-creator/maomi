# flat 预设：数据看板

文件：`src/screens/<id>/{template.html,styles.css,app.js}`，`renderer: "generic"`。
`app.js` 已内置渲染框架，**90% 的改动只是替换 `DATA`**。

## 舞台结构

```text
#screen (1920×1080)
├─ .ds-header     品牌 / 主标题 / 演示标识 + 时钟 + 全屏
├─ #ds-kpis       5 个 KPI 卡片（自动渲染）
├─ .ds-body
│  ├─ #ds-left    左栏 3 个面板
│  ├─ .ds-center  主趋势图 + 3 个小图
│  └─ #ds-right   右栏 3 个面板
└─ .ds-footer     滚动播报 + 数据来源说明
```

栅格：左右栏各 432px，中间 964px；行高 80 / 120 / 1fr / 40，间距 16px，左右留白 30px。**改动布局要同步改 `styles.css` 里的 grid 值。**

## DATA 契约

```js
const DATA = {
  kpis: [{ label, code, value, unit, delta, dir: 'up'|'down'|'flat', spark: number[10] }], // 5 个
  main: {
    title, code, unit,
    periods: [{ id: 'day', name: '今日' }, ...],       // 2–3 个
    labels: string[],                                   // x 轴 7–9 个
    series: [{ name, color, data: { day: number[], week: number[], month: number[] } }], // 1–2 条
    notes: { day: '一句话结论', ... },                  // 与 periods 对应
  },
  left:  [panel...],   // 3 个
  right: [panel...],   // 3 个
  mini:  [panel...],   // 3 个
  ticker: [[时间, 文本], ...],
  footer: '演示数据 · 所有指标与操作均为本地模拟',
};
```

### panel 类型

| type | 字段 | 视觉 |
| --- | --- | --- |
| `rank` | `title, code, unit, items:[{name,value}]` | 排行榜，前 3 名高亮徽章（4–6 条） |
| `bars` | `title, code, items:[{name,value(0-100),display,color}], note` | 横向进度条（3–5 条） |
| `facts` | `title, code, items:[[标签,值,单位]], note` | 2×2 指标块 |
| `donut` | `title, code, center:[值,单位], items:[{name,value,color}]` | 环形占比 + 图例（3–5 项） |
| `timeline` | `title, code, items:[{time,level:'ok'|'warn'|'bad'|'',text,note}]` | 事件流（3–4 条） |
| `list` | `title, code, rows:[{name,a,b}]` | 三列明细，`b` 为 正常/繁忙/异常 时自动上色 |
| `bar`（mini） | `title, code, labels, values, color` | 小柱状图 |
| `line`（mini） | `title, code, labels, values, color` | 小折线图 |
| `progress`（mini） | `title, code, items:[[名称, 0-100]]` | 资源水位条 |

`note` 支持 HTML（用 `<b>` 强调），其余字段都会被转义。

数量约定：左右两栏各 3 个面板（共 6 个），`mini` 固定 3 个。**同类型可以重复**——左右栏各放一个 `donut`、`mini` 里放两个 `line` 都没问题，渲染按数组下标分配 id，不会互相覆盖。

## 内置函数（想自定义面板时直接调用）

```js
icon(name)                       // 线框图标，可用：layers chart users box clock alert energy shield car target fullscreen close
panel(title, code, bodyHTML, { icon, flush, cls })   // 生成一个标准面板
sparkline(values, color)         // 92×26 迷你折线
num(v) / esc(v)                  // 千分位 / 转义
notify(text)                     // 底部轻提示
openDialog(title, bodyHTML)      // 模态详情
```

D3 图表函数：`drawMain(period)`、`drawMini(m)`、`drawDonut()`。新增图表就在这些函数里加，注意：
- 尺寸用 `svg.node().clientWidth / clientHeight`（舞台被 transform 缩放过，**不要用 `getBoundingClientRect`**）；
- 重绘前先 `svg.selectAll('*').remove()`；
- 颜色从 `DATA` 里取，或写 CSS 变量。

## 常见改造

- **换成 4 个 KPI**：`DATA.kpis` 删一条，同时改 `styles.css` 的 `.ds-kpis{grid-template-columns:repeat(5,1fr)}` 为 `repeat(4,1fr)`。
- **加一栏面板**：`DATA.left.push({...})`，`.ds-col` 是 `grid-auto-rows:1fr`，会自动等分高度；超过 3 个要注意字号线。
- **主图换柱状**：把 `drawMain` 里的 `d3.area/line` 换成 `d3.scaleBand + rect`。
- **换成地图**：flat 预设不带地图；需要中国地图就用 `observatory` 预设，或自己用 `assets/geo/china.json` 画（构建时不注入，需自行内联）。
