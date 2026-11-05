---
name: industrial-screen
description: '工业监控大屏与 SCADA/HMI，核心是控制与操作防误（SBO 两步确认、联锁闭锁、ISA-101 灰度）。用于 工业大屏、上位机、就地控制屏、水务/化工/能源监控。产出 1920x1080 单文件 HTML。'
---

# 工业大屏 · industrial-screen

构建能演示、投标并继续接入真实数据的工业监控界面。优先保证信息层级、状态辨识和长期可维护性，不以堆叠霓虹、装饰动画或图表数量为目标。所有模式共享同一技术栈（Vue 3 + ECharts 5 + Three.js 本地资源，离线、1920×1080）与状态色唯一语义。

## 0. 先判断：这次要做哪种工业界面

| 模式 | 形态 | 适用 | 必读参考 | 校验脚本 |
| --- | --- | --- | --- | --- |
| `dashboard` | 只读工业驾驶舱（工艺/资产/安全态势） | 水处理、设备健康、化工安全、能源和制造的综合态势展示 | design-system + scene-layouts + data-contract | `validate-dashboard.js` |
| `hmi-classic` | 西门子博途风格经典上位机 SCADA（ISA-101 灰度） | 水厂操作员/工艺工程师 8~12 小时值守的经典中控 | isa101-style-guide + water-treatment-pid-library + siemens-water-faceplate | `validate-hmi.js` |
| `scada` | 可写控制 Web SCADA / HMI 操作终端 | 过程控制、设备操作与中控监视（双向控制、SBO、Faceplate） | control-safety-contract + faceplate-specification + tag-point-table + alarm-lifecycle | `validate-scada.js` |
| `light-3d` | 浅色 3D 水务数字孪生 HMI | 污水厂/自来水厂/泵站/预处理工段的浅色监控页 | visual-system | `validate-light-3d-hmi.js` |
| `local-panel` | 单机就地控制屏（LCP / 现场触控 HMI） | 泵、风机、阀门等单台设备的现场就地柜 | chinese-industrial-terminology + lcp-visual-aesthetics-guide + safety-interlock-and-offline-contract | `validate-dashboard.js` |

> **判断口径**：用户要"综合态势、参观演示、领导看板" → `dashboard`；要"操作员值守、经典上位机、P&ID 工艺图" → `hmi-classic`；要"设备启停、频率调节、阀门控制、操作防误" → `scada`；要"浅色 3D 数字孪生、白模构筑物" → `light-3d`；要"单台设备、就地柜、现场触控屏" → `local-panel`。
> 需要把成品集成进边缘网关前端（Vue 3 + Vite）时，另读 `gateway-integration.md`。

## 1. 共享输出契约（所有模式必须遵守）

生成的工业大屏 HTML 输出到本 skill 自己的 `out/` 目录（`skills/industrial-screen/out/<场景名>/`），与 `bigscreen-studio` 对齐；交付时把单文件 HTML 直接放那里，可双击离线打开。

- 默认输出一个独立 HTML：引用随交付包提供的本地 Vue 3、ECharts 5 资源，加一个内联 IIFE，共三对 `script` 标签；需要三维设备时可追加本地 Three.js、控制器和模型脚本，总数不得超过六对。**不得将 CDN 作为现场运行前提。**
- 使用 1920×1080 固定画布和等比缩放，保留拼接屏安全边距。
- **颜色只能表达一种语义**：青蓝为主数据，绿色为正常，琥珀色为警告，红色为报警，灰色为离线或未知。同一元素不能同时使用主题色和状态色；红色不得用于普通按钮、标题和装饰边框；安全场景不得把整屏红色当主题色。
- 主视觉优先使用内联 SVG；图表只承担趋势、频谱、分布或对比任务。
- 动效必须对应流动、旋转、扫描、报警或数值变化；停机设备停止动画。竖轴搅拌器不得按屏幕平面做 360° 风扇旋转，用横向投影模拟绕竖轴旋转；只有俯视图叶轮才用平面旋转并设 `transform-box`/`transform-origin`。
- 模拟数据使用可重复的工况脚本，不使用每次刷新都改变业务结论的无约束随机数。页脚或状态栏写明"演示数据"。

## 2. 实现要求（所有模式）

- 所有 ECharts 容器有明确像素高度。
- 使用 `safeInit(id)` 初始化图表；DOM 查询后检查空值（`if (!el) return`）。
- `setInterval`、缩放回调和图表更新包含 `try/catch`。
- 页面明确展示 `quality`、`timestamp` 和通信状态；缺失数据不能伪装为正常的 `0`。
- 需要配置化或数据接入时，优先复用仓库的 `packages/runtime`、`packages/components` 和 `packages/data-adapters`，避免复制粘贴整页。
- 控制台零错误，文字无裁切，浅色文字不得叠在浅色面板上。
- 支持 `prefers-reduced-motion`，关闭循环位移和呼吸。
- 大屏默认只读。
- **工艺图元优先复用图元库**：绘制泵、压缩机、换热器、阀门、罐、管件等工艺设备时，先查 `references/process-symbol-library.md`（154 个 FUXA 矢量图元，`currentColor` 可随状态变色，优先用于需动态着色的 P&ID）；需要写实设备示意/装饰且不随状态变色时，查 `references/raster-icon-library.md`（1530 个 iotview 位图，`<img>` 引用）。缺图元或需精细化时再自绘。

## 3. 各模式专属契约

### 模式 · dashboard（只读工业驾驶舱）

按主任务选布局，读取 `references/scene-layouts.md`：
- 工艺流程、物料或水处理：`process-overview`
- 单机诊断、资产健康、预测维护：`asset-health`
- 反应风险、联锁、应急处置：`safety-interlock`

页面必须包含：顶部态势栏、唯一主视觉、关键 KPI、报警/事件区、数据质量与更新时间状态栏。可从 `assets/base-dashboard.html` 复制基础骨架。

### 模式 · hmi-classic（西门子博途风格经典上位机 SCADA）

遵循 ISA-101 灰度哲学：`#DDE2E8` 冷灰基底，正常低饱和静默，异常高对比激活，降低 8~12 小时值守视疲劳。
- 城镇水务管网标准色标（污水/回流污泥/清水/曝气/药液）与正交走线 + Jumper 跨线半圆弧。
- 水处理 P&ID 图元库：池体侧立面剖面带米标尺、潜水泵/鼓风机/隔膜泵、`AIT/FIT/LIT` 仪表气泡、立体下凹 I/O 域。
- 西门子 Faceplate：0~100% 量程、HH/H/L/LL 标尺、SP 黄金三角游标、`±0.1` 点动、手自动、PID 曲线、SBO 两步确认。
- 中控交互：工艺工段切换树、三级权限锁、S7-1500 看门狗、多笔同轴 Trend、常驻报警消音确认栏。

### 模式 · scada（可写控制 Web SCADA / HMI）

与只读驾驶舱不同，以闭环控制、操作防误、状态回读与安全联锁为核心。
- **双向数据流**：点位 `writable` 属性，写入与回读分离，禁止假更新。
- **SBO 两步确认**：点击设备 → Faceplate → 危险指令二级确认 → 看门狗计时 → ACK 更新。
- **Faceplate 体系**：泵/风机/电机（手自动/启停/复位/工时/联锁）、变频器（28.0~50.0 Hz 限幅）、PID 回路（PV/SP/OP + 趋势）。
- **告警条**：顶部常驻最高等级，未确认红色闪烁 + 蜂鸣，提供消音/确认（ISA-18.2 状态机）。
- **审计追踪**：底部流水日志记录时间/工号/对象/旧值/新值/结果。
- 安全要求：前端硬限幅、1.5s 看门狗超时回退、控制权指示（中控/就地/锁定）、控制台零错误。
- 写入交互必须遵守 `references/control-safety-contract.md` 的 SBO 与看门狗契约。

### 模式 · light-3d（浅色 3D 水务数字孪生 HMI）

浅灰蓝单主题、白模三维水工构筑物为主视觉。**不用于**深色驾驶舱或经典 P&ID。
- 双层顶栏，中部白模构筑物，右侧单一控制面板，底部连续状态模块。
- 混凝土/金属/水体/管道材质清晰区分，整体低饱和；蓝色只用于选中/主数据，绿色只表示正常。
- 3D 动效仅表达水流/阀位/泵组/格栅，停机关停；明确标注演示模式。
- 相机约 30°~38° 透视，左前上方轴测初始视角；池体有真实厚度/开口/水面/内壁。
- 不使用深色大面积背景、霓虹描边、超大圆角或营销式玻璃卡片。

### 模式 · local-panel（单机就地控制屏 / LCP）

面向单台设备或一个就地柜的简明触控 HMI。聚焦设备状态、就地/远方选择和必要就地操作，不扩展成综合驾驶舱。
- 纯正规范中文（GB/T 14048、DL/T 5136、HG/T 20507），杜绝"就地 LOCAL"等中英混杂；统一用"就地控制/远方受控""就地启动/就地停止/故障复位"。
- 深色冷轧钣金/防爆机柜质感、金属微拉丝、内六角沉头螺栓、激光蚀刻铭牌；拟物元器件（三位转换开关、3D 带灯按键、黄色底座红色急停蘑菇头、三色声光塔）。
- **就地/远方权限互锁**：远方模式下就地启停与微调按钮必须禁用并提示"远方受控中，就地操作闭锁"。
- **故障锁存**：故障跳闸后锁存，必须就地人工复位，复位后保持停机备妥，严禁自起。
- **安全边界**：实体急停与电气保护由现场硬件回路执行，页面不提供安全旁路；底部固定安全告示条。
- 没有设备身份、点表和通信协议依据时，设备名称标为示例，现场输入标记为未接入，明确"离线演示"。
- 基准 1920×1080，另适配 1024×768 工控触屏（紧凑重排，触控键区 ≥48px）。

## 4. 集成进边缘网关（可选）

将产出的独立场景集成到 Vue 3 + Vite 边缘网关前端时，读取 `references/gateway-integration.md`：大屏 vs SCADA 的用途分类、HTML→Vue SFC 平移骨架、网关数据采集与 SBO 反向控制闭环、验收清单。

## 5. 验证

完成后按所选模式运行校验脚本（脚本可接受文件或目录，对目录递归检查所有 `.html`）：

```bash
node skills/industrial-screen/scripts/validate-dashboard.js scenarios       # dashboard / local-panel
node skills/industrial-screen/scripts/validate-hmi.js <html-file>            # hmi-classic
node skills/industrial-screen/scripts/validate-scada.js <html-file>          # scada
node skills/industrial-screen/scripts/validate-light-3d-hmi.js <html-file>   # light-3d
```

再分别以 1920×1080、1366×768、3840×2160 截图检查。验证内容应包括主状态、最高级报警、主视觉、图表、工况切换和控制台错误。

## 6. 参考文件索引

| 文件 | 服务模式 |
| --- | --- |
| `references/design-system.md` | 共享（状态色/字号/动效边界/Token） |
| `references/scene-layouts.md` | dashboard |
| `references/data-contract.md` | dashboard |
| `references/isa101-style-guide.md` | hmi-classic |
| `references/water-treatment-pid-library.md` | hmi-classic |
| `references/siemens-water-faceplate.md` | hmi-classic |
| `references/control-safety-contract.md` | scada |
| `references/faceplate-specification.md` | scada |
| `references/tag-point-table.md` | scada |
| `references/alarm-lifecycle.md` | scada |
| `references/visual-system.md` | light-3d |
| `references/chinese-industrial-terminology.md` | local-panel |
| `references/lcp-visual-aesthetics-guide.md` | local-panel |
| `references/safety-interlock-and-offline-contract.md` | local-panel |
| `references/gateway-integration.md` | 集成进网关 |
| `references/process-symbol-library.md` | 共享（154 个 FUXA 工艺图元库 · 泵/压缩机/换热器/阀/罐/管件，`currentColor` 着色） |
| `references/raster-icon-library.md` | 共享（1530 个 iotview 位图图标 · 35 分类，`<img>` 引用，不可改色，适合写实设备示意/装饰） |
