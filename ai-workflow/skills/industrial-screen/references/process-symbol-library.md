# 工业工艺图元库（AI 可复用）

共 **154** 个与框架无关的工艺图元，源自 **FUXA**（`frangoteam/FUXA`，MIT License），已清洗元数据并把描边/填充统一改为 `currentColor`，颜色由外层 `color` 驱动，可直接接入本 skill 的状态色系统（绿=运行/橙=关注/红=报警/灰=离线/青=主数据）。

## 文件

| 文件 | 用途 |
| --- | --- |
| `assets/symbol-library/process-symbols.svg` | 全部图元的 `<symbol>` sprite，复制所需 symbol 到目标 SVG 的 `<defs>` |
| `assets/symbol-library/process-symbols.json` | 机器可读清单（id / 中文名 / 分类 / 关键词），供 AI 检索 |
| `assets/symbol-library/skill-symbols.svg` + `.json` | 本 skill 自建图元（`sk-` 前缀）：LOGO、地源井、分集水器、水塔、仪表气泡、俯视叶轮 |
| `scripts/build-symbol-library.js` | 从 FUXA 仓库重建本库（图元增删时重跑） |

## 怎么用（AI 复用步骤）

1. 按设备名在下表「关键词 / 中文名」里检索，拿到 `id`（形如 `fx-compscrew`）。
2. 从 `process-symbols.svg` 复制对应 `<symbol id="...">…</symbol>` 到目标 HTML 内联 SVG 的 `<defs>` 中（只复制用到的，保持单文件精简）。
3. 在工艺图里放置并着色：

```html
<svg viewBox="0 0 1120 540">
  <defs>
    <!-- 从 process-symbols.svg 复制需要的 symbol，例如： -->
    <symbol id="fx-compscrew" viewBox="0 0 24 24"> … </symbol>
  </defs>
  <!-- width/height 决定显示尺寸；style color 决定状态色 -->
  <use href="#fx-compscrew" x="430" y="222" width="60" height="60"
       style="color:var(--success)"/>
</svg>
```

动效（随工况启停旋转）直接复用 skill 既有约定：给 `<use>` 加 `.spin` 类（已含 `transform-box:fill-box;transform-origin:center`），停机时移除类即可。竖轴设备不要做屏幕平面 360° 旋转——遵循 `design-system.md` 的动效边界。

> 许可：FUXA 为 MIT，可自由使用/修改/商用，交付物中保留来源署名（本库文件头与界面注释已标注）。

## 图元索引

### 压缩机 Compressor · 15

| id | 中文名 | FUXA 原名 | 关键词 |
| --- | --- | --- | --- |
| `fx-compair` | 空气压缩机 | compair | 压缩机、空气、air |
| `fx-compdiaph` | 隔膜压缩机 | compdiaph | 压缩机、隔膜 |
| `fx-compejector` | 喷射压缩机 | compejector | 压缩机、喷射、ejector |
| `fx-compreci` | 往复式压缩机 | compreci | 压缩机、往复、reciprocating |
| `fx-compreci2` | 往复式压缩机 | compreci2 | 压缩机、往复、reciprocating |
| `fx-compressor-fan` | 压缩机 | compressor-fan | 压缩机、compressor |
| `fx-compressor-piston` | 压缩机 | compressor-piston | 压缩机、compressor |
| `fx-compressor-void` | 压缩机 | compressor-void | 压缩机、compressor |
| `fx-compring` | 液环压缩机 | compring | 压缩机、液环 |
| `fx-compring2` | 液环压缩机 | compring2 | 压缩机、液环 |
| `fx-comprotary` | 旋转式压缩机 | comprotary | 压缩机、旋转、rotary |
| `fx-comprotary2` | 旋转式压缩机 | comprotary2 | 压缩机、旋转、rotary |
| `fx-compscrew` | 螺杆压缩机 | compscrew | 压缩机、螺杆、screw |
| `fx-compsilence` | 静音压缩机 | compsilence | 压缩机、静音 |
| `fx-compturbo` | 涡轮/离心压缩机 | compturbo | 压缩机、涡轮、离心、turbo |

### 泵 Pump · 14

| id | 中文名 | FUXA 原名 | 关键词 |
| --- | --- | --- | --- |
| `fx-pumpblower` | 鼓风机/泵 | pumpblower | 泵、鼓风机、blower |
| `fx-pumpcentri1` | 离心泵 | pumpcentri1 | 泵、离心泵、centrifugal |
| `fx-pumpcentri2` | 离心泵 | pumpcentri2 | 泵、离心泵、centrifugal |
| `fx-pumpfeed` | 给料泵 | pumpfeed | 泵、给料 |
| `fx-pumpgear` | 齿轮泵 | pumpgear | 泵、齿轮、gear |
| `fx-pumpgear2` | 齿轮泵 | pumpgear2 | 泵、齿轮、gear |
| `fx-pumphidra` | 液压泵 | pumphidra | 泵、液压 |
| `fx-pumphorizo` | 卧式泵 | pumphorizo | 泵、卧式 |
| `fx-pumpjet` | 射流泵 | pumpjet | 泵、射流、jet |
| `fx-pumpperis` | 蠕动泵 | pumpperis | 泵、蠕动、peristaltic |
| `fx-pumpscreew` | 螺杆泵 | pumpscreew | 泵、螺杆泵、screw |
| `fx-pumpscreew2` | 螺杆泵 | pumpscreew2 | 泵、螺杆泵、screw |
| `fx-pumpturbi` | 涡轮泵 | pumpturbi | 泵、涡轮泵 |
| `fx-pumpvacuum` | 真空泵 | pumpvacuum | 泵、真空、vacuum |

### 换热器 Exchanger · 12

| id | 中文名 | FUXA 原名 | 关键词 |
| --- | --- | --- | --- |
| `fx-exchanger-filter` | 过滤换热器 | exchanger-filter | 换热器、过滤 |
| `fx-exchanger-heat` | 板式换热器 | exchanger-heat | 换热器、板式、heat |
| `fx-exchanger-tube` | 管壳换热器 | exchanger-tube | 换热器、管壳、tube |
| `fx-exchanger1` | 换热器 | exchanger1 | 换热器、exchanger |
| `fx-exchanger2` | 换热器 | exchanger2 | 换热器、exchanger |
| `fx-exchanger3` | 换热器 | exchanger3 | 换热器、exchanger |
| `fx-exchanger4` | 换热器 | exchanger4 | 换热器、exchanger |
| `fx-exchanger5` | 换热器 | exchanger5 | 换热器、exchanger |
| `fx-exchanger6` | 换热器 | exchanger6 | 换热器、exchanger |
| `fx-exchanger7` | 换热器 | exchanger7 | 换热器、exchanger |
| `fx-exchanger8` | 换热器 | exchanger8 | 换热器、exchanger |
| `fx-exchanger9` | 换热器 | exchanger9 | 换热器、exchanger |

### 阀门 Valve · 3

| id | 中文名 | FUXA 原名 | 关键词 |
| --- | --- | --- | --- |
| `fx-valve-ax` | 阀门 | valve-ax | 阀、阀门、valve |
| `fx-valve-bx` | 阀门 | valve-bx | 阀、阀门、valve |
| `fx-valve-cx` | 阀门 | valve-cx | 阀、阀门、valve |

### 罐 / 容器 Tank · 9

| id | 中文名 | FUXA 原名 | 关键词 |
| --- | --- | --- | --- |
| `fx-tank1` | 储罐/容器 | tank1 | 罐、储罐、容器、tank |
| `fx-tank2` | 储罐/容器 | tank2 | 罐、储罐、容器、tank |
| `fx-tank3` | 储罐/容器 | tank3 | 罐、储罐、容器、tank |
| `fx-tank4` | 储罐/容器 | tank4 | 罐、储罐、容器、tank |
| `fx-tank5` | 储罐/容器 | tank5 | 罐、储罐、容器、tank |
| `fx-tank6` | 储罐/容器 | tank6 | 罐、储罐、容器、tank |
| `fx-tank7` | 储罐/容器 | tank7 | 罐、储罐、容器、tank |
| `fx-tank8` | 储罐/容器 | tank8 | 罐、储罐、容器、tank |
| `fx-tank9` | 储罐/容器 | tank9 | 罐、储罐、容器、tank |

### 电机 Motor · 1

| id | 中文名 | FUXA 原名 | 关键词 |
| --- | --- | --- | --- |
| `fx-motor-simb` | 电机 | motor-simb | 电机、马达、motor |

### 管件 Pipe & Fitting · 22

| id | 中文名 | FUXA 原名 | 关键词 |
| --- | --- | --- | --- |
| `fx-fitting1` | 管路配件 | fitting1 | 管件、配件、fitting |
| `fx-fitting10` | 管路配件 | fitting10 | 管件、配件、fitting |
| `fx-fitting11` | 管路配件 | fitting11 | 管件、配件、fitting |
| `fx-fitting12` | 管路配件 | fitting12 | 管件、配件、fitting |
| `fx-fitting13` | 管路配件 | fitting13 | 管件、配件、fitting |
| `fx-fitting2` | 管路配件 | fitting2 | 管件、配件、fitting |
| `fx-fitting3` | 管路配件 | fitting3 | 管件、配件、fitting |
| `fx-fitting4` | 管路配件 | fitting4 | 管件、配件、fitting |
| `fx-fitting5` | 管路配件 | fitting5 | 管件、配件、fitting |
| `fx-fitting6` | 管路配件 | fitting6 | 管件、配件、fitting |
| `fx-fitting7` | 管路配件 | fitting7 | 管件、配件、fitting |
| `fx-fitting8` | 管路配件 | fitting8 | 管件、配件、fitting |
| `fx-fitting9` | 管路配件 | fitting9 | 管件、配件、fitting |
| `fx-nozzle` | 喷嘴 | nozzle | 喷嘴、nozzle |
| `fx-nozzle2` | 喷嘴 | nozzle2 | 喷嘴、nozzle |
| `fx-pipi1` | 管件/弯头 | pipi1 | 管、管件、弯头、pipe |
| `fx-pipi2` | 管件/弯头 | pipi2 | 管、管件、弯头、pipe |
| `fx-pipi3` | 管件/弯头 | pipi3 | 管、管件、弯头、pipe |
| `fx-pipi4` | 管件/弯头 | pipi4 | 管、管件、弯头、pipe |
| `fx-pipi5` | 管件/弯头 | pipi5 | 管、管件、弯头、pipe |
| `fx-pipi6` | 管件/弯头 | pipi6 | 管、管件、弯头、pipe |
| `fx-pipi7` | 管件/弯头 | pipi7 | 管、管件、弯头、pipe |

### 搅拌器 Mixer · 4

| id | 中文名 | FUXA 原名 | 关键词 |
| --- | --- | --- | --- |
| `fx-agitator-disc` | 搅拌器 | agitator-disc | 搅拌、搅拌器、agitator |
| `fx-agitator-paddle` | 搅拌器 | agitator-paddle | 搅拌、搅拌器、agitator |
| `fx-agitator-prop` | 搅拌器 | agitator-prop | 搅拌、搅拌器、agitator |
| `fx-agitator-turbo` | 搅拌器 | agitator-turbo | 搅拌、搅拌器、agitator |

### 分离 / 过滤 Separator · 8

| id | 中文名 | FUXA 原名 | 关键词 |
| --- | --- | --- | --- |
| `fx-centrifugal` | 离心机/离心设备 | centrifugal | 离心机、分离、centrifuge |
| `fx-centrifugal1` | 离心机/离心设备 | centrifugal1 | 离心机、分离、centrifuge |
| `fx-centrifuge1` | 离心机/离心设备 | centrifuge1 | 离心机、分离、centrifuge |
| `fx-centrifuge2` | 离心机/离心设备 | centrifuge2 | 离心机、分离、centrifuge |
| `fx-centrifuge3` | 离心机/离心设备 | centrifuge3 | 离心机、分离、centrifuge |
| `fx-centrifuge4` | 离心机/离心设备 | centrifuge4 | 离心机、分离、centrifuge |
| `fx-filter2` | 过滤器 | filter2 | 过滤器、filter |
| `fx-filter3` | 过滤器 | filter3 | 过滤器、filter |

### 其他工艺设备 Process · 16

| id | 中文名 | FUXA 原名 | 关键词 |
| --- | --- | --- | --- |
| `fx-crusher1` | 破碎机 | crusher1 | 破碎机、crusher |
| `fx-crusher2` | 破碎机 | crusher2 | 破碎机、crusher |
| `fx-crusher3` | 破碎机 | crusher3 | 破碎机、crusher |
| `fx-crusher4` | 破碎机 | crusher4 | 破碎机、crusher |
| `fx-crusher5` | 破碎机 | crusher5 | 破碎机、crusher |
| `fx-crusher6` | 破碎机 | crusher6 | 破碎机、crusher |
| `fx-crusher7` | 破碎机 | crusher7 | 破碎机、crusher |
| `fx-diaph` | 隔膜 | diaph | 隔膜、diaphragm |
| `fx-drier1` | 干燥器 | drier1 | 干燥器、烘干、drier |
| `fx-drier2` | 干燥器 | drier2 | 干燥器、烘干、drier |
| `fx-drier3` | 干燥器 | drier3 | 干燥器、烘干、drier |
| `fx-drier4` | 干燥器 | drier4 | 干燥器、烘干、drier |
| `fx-drier5` | 干燥器 | drier5 | 干燥器、烘干、drier |
| `fx-feeder` | 给料机 | feeder | 给料机、feeder |
| `fx-feeder2` | 给料机 | feeder2 | 给料机、feeder |
| `fx-feeder3` | 给料机 | feeder3 | 给料机、feeder |

### 动画元件 Animated · 2

| id | 中文名 | FUXA 原名 | 关键词 |
| --- | --- | --- | --- |
| `fx-anim-eli` | 动画元件 | anim-eli | 动画、anim |
| `fx-anim-piston` | 动画元件 | anim-piston | 动画、anim |

### 基础形状 Shape · 39

| id | 中文名 | FUXA 原名 | 关键词 |
| --- | --- | --- | --- |
| `fx-shape-arrow` | 基础形状 | shape-arrow | 形状、shape |
| `fx-shape-circle` | 基础形状 | shape-circle | 形状、shape |
| `fx-shape-circlehalf` | 基础形状 | shape-circlehalf | 形状、shape |
| `fx-shape-circleindi` | 基础形状 | shape-circleindi | 形状、shape |
| `fx-shape-cloud` | 基础形状 | shape-cloud | 形状、shape |
| `fx-shape-cone` | 基础形状 | shape-cone | 形状、shape |
| `fx-shape-corner` | 基础形状 | shape-corner | 形状、shape |
| `fx-shape-cross` | 基础形状 | shape-cross | 形状、shape |
| `fx-shape-cylinder` | 基础形状 | shape-cylinder | 形状、shape |
| `fx-shape-delay` | 基础形状 | shape-delay | 形状、shape |
| `fx-shape-diamond` | 基础形状 | shape-diamond | 形状、shape |
| `fx-shape-display` | 基础形状 | shape-display | 形状、shape |
| `fx-shape-docu` | 基础形状 | shape-docu | 形状、shape |
| `fx-shape-doublearrow` | 基础形状 | shape-doublearrow | 形状、shape |
| `fx-shape-drop` | 基础形状 | shape-drop | 形状、shape |
| `fx-shape-halfcircle` | 基础形状 | shape-halfcircle | 形状、shape |
| `fx-shape-heart` | 基础形状 | shape-heart | 形状、shape |
| `fx-shape-looplimit` | 基础形状 | shape-looplimit | 形状、shape |
| `fx-shape-maninput` | 基础形状 | shape-maninput | 形状、shape |
| `fx-shape-nosymbol` | 基础形状 | shape-nosymbol | 形状、shape |
| `fx-shape-octagon` | 基础形状 | shape-octagon | 形状、shape |
| `fx-shape-offpage` | 基础形状 | shape-offpage | 形状、shape |
| `fx-shape-or` | 基础形状 | shape-or | 形状、shape |
| `fx-shape-or2` | 基础形状 | shape-or2 | 形状、shape |
| `fx-shape-parallelogram` | 基础形状 | shape-parallelogram | 形状、shape |
| `fx-shape-pentagon` | 基础形状 | shape-pentagon | 形状、shape |
| `fx-shape-poval` | 基础形状 | shape-poval | 形状、shape |
| `fx-shape-prepara` | 基础形状 | shape-prepara | 形状、shape |
| `fx-shape-radiuskorner` | 基础形状 | shape-radiuskorner | 形状、shape |
| `fx-shape-rectangle` | 基础形状 | shape-rectangle | 形状、shape |
| `fx-shape-rectindi` | 基础形状 | shape-rectindi | 形状、shape |
| `fx-shape-star4` | 基础形状 | shape-star4 | 形状、shape |
| `fx-shape-switch` | 基础形状 | shape-switch | 形状、shape |
| `fx-shape-tape` | 基础形状 | shape-tape | 形状、shape |
| `fx-shape-tee` | 基础形状 | shape-tee | 形状、shape |
| `fx-shape-ticket` | 基础形状 | shape-ticket | 形状、shape |
| `fx-shape-trape` | 基础形状 | shape-trape | 形状、shape |
| `fx-shape-triangle` | 基础形状 | shape-triangle | 形状、shape |
| `fx-shape-vor` | 基础形状 | shape-vor | 形状、shape |

### 杂项 Misc · 9

| id | 中文名 | FUXA 原名 | 关键词 |
| --- | --- | --- | --- |
| `fx-misc1` | 杂项设备 | misc1 | 杂项、misc |
| `fx-misc2` | 杂项设备 | misc2 | 杂项、misc |
| `fx-misc3` | 杂项设备 | misc3 | 杂项、misc |
| `fx-misc4` | 杂项设备 | misc4 | 杂项、misc |
| `fx-misc5` | 杂项设备 | misc5 | 杂项、misc |
| `fx-misc6` | 杂项设备 | misc6 | 杂项、misc |
| `fx-misc7` | 杂项设备 | misc7 | 杂项、misc |
| `fx-misc8` | 杂项设备 | misc8 | 杂项、misc |
| `fx-webcam` | 摄像头 | webcam | 摄像头、webcam |

## 本 skill 自建图元（`sk-` 前缀）

填补 FUXA 库未覆盖的水务/热泵场景图元与 LOGO，用法与 FUXA 库完全一致（`currentColor` 着色，`<use href="#sk-xxx">`）。

| id | 中文名 | 分类 | 关键词 |
| --- | --- | --- | --- |
| `sk-ground-well` | 地源井群 | 罐 / 容器 Tank | 地源、井、埋管、源侧、地热 |
| `sk-impeller` | 旋转叶轮（俯视） | 泵 Pump | 叶轮、俯视、旋转、动画、泵、风机 |
| `sk-instrument` | 仪表气泡 ISA-5.1 | 仪表 Instrument | 仪表、测点、气泡、AIT、FIT、LIT、ISA |
| `sk-logo-heatpump` | 热泵站 LOGO | 品牌 LOGO | logo、品牌、热泵、机组 |
| `sk-logo-water` | 水务 LOGO | 品牌 LOGO | logo、品牌、水务、水滴 |
| `sk-manifold` | 分集水器 | 管件 Pipe & Fitting | 分集水器、集箱、分水器、集水器、分配 |
| `sk-water-tower` | 高位水塔 | 罐 / 容器 Tank | 水塔、高位、调节、水箱 |

## 热泵站 / 水务常用组合（速查）

| 场景部件 | 建议图元 |
| --- | --- |
| 螺杆热泵压缩机 | `fx-compscrew` |
| 离心/磁悬浮压缩机 | `fx-compturbo` |
| 板式换热器 | `fx-exchanger-heat` |
| 管壳换热器 | `fx-exchanger-tube` |
| 循环泵 / 加压泵 | `fx-pumpcentri1`、`fx-pumphorizo` |
| 鼓风机 | `fx-pumpblower` |
| 驱动电机 | `fx-motor-simb` |
| 调节 / 节流阀 | `fx-valve-ax`、`fx-valve-bx`、`fx-valve-cx` |
| 储罐 / 定压罐 / 水箱 | `fx-tank1` ~ `fx-tank9` |
| 管件 / 弯头 / 三通 | `fx-pipi1` ~ `fx-pipi7`、`fx-fitting1` ~ `fx-fitting13` |
| 搅拌器（加药/反应池） | `fx-agitator-prop`、`fx-agitator-paddle` |
| 过滤器 | `fx-filter2`、`fx-filter3` |
| 地源井 / 源侧埋管 | `sk-ground-well` |
| 高位水塔 | `sk-water-tower` |
| 分集水器 | `sk-manifold` |
| 仪表测点气泡 | `sk-instrument` |
| 俯视旋转叶轮（动画） | `sk-impeller` |
| 热泵站 / 水务 LOGO | `sk-logo-heatpump`、`sk-logo-water` |

