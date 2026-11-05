---
name: bigscreen-studio
description: 对话式生成通用/商业可视化大屏（数据看板 / 3D 数字孪生展示）。适用于销售、运营、物流、政务、园区、港口等通用场景——以"看数据"为主，无设备控制、无操作防误。当用户说"做个数据大屏/运营中心/指挥中心/把这批数据做成大屏/智慧XX大屏(园区/港口/政务)""复刻一个类似某某的大屏"时使用。以工作区内的 vizlab（screen-picture-demo）作为本地渲染引擎（缺失时回退到 GitHub 克隆），脚手架 → 写数据与场景 → 构建 → 截图自检，最终把单文件大屏 HTML 输出到 skill 自己的 out/ 目录（skills/bigscreen-studio/out/）。
---

# 大屏工坊 bigscreen-studio

一句话：**用户描述业务 → 这里出大屏**。产出是能直接双击打开、能点、能切周期的 1920×1080 单文件 HTML，落在 skill 自己的 `out/` 目录下（`skills/bigscreen-studio/out/`）。

## 引擎与产物

下面命令里的脚本路径都指这里。

| 项 | 位置 | 说明 |
| --- | --- | --- |
| 本地引擎 | `../vizlab`（与本 skill 同处 big-screen 工作区） | **优先使用**，无需联网克隆；即 screen-picture-demo 全量副本 |
| 远端引擎 | `https://github.com/alinkiot/screen-picture-demo.git` | 本地引擎缺失时回退，自动 `git clone --depth 1` 到 `~/.bigscreen-ai/cache/bigscreen-engine` |
| 引擎工作副本 | `~/.bigscreen-ai/cache/bigscreen-engine` | 大屏源码写在这里（`src/screens/<id>/`）；可用 `--engine` / `VIZLAB_ENGINE` 改 |
| 交付目录 | skill 的 `out/`（`skills/bigscreen-studio/out/`） | 每次构建自动写入，可用 `--out <dir>` 改 |

`out/` 里固定三个文件：

```text
out/<id>/index.html          单文件大屏（依赖全内联，离线可打开，直接发给客户）
out/<id>/<id>-1920.png      1920×1080 截图（验收/贴文档用）
out/<id>/<id>-report.json   自检结论（ok / errors / warnings / 面板溢出明细，路径如果有用户信息，注意用xxx代替）
```

产物字段、`--out` / `--no-build` / `--keep-build` / `--bake-preview` 等开关，见 `../../bigscreen-studio.README.md` 的「产物（`out/`）」一节。

---

## 0. 先判断：这次要做哪种大屏

| 预设 | 形态 | 适用 |
| --- | --- | --- |
| `flat` | 纯数据看板：KPI + 主趋势 + 排行/占比/事件 + 三小图，无 WebGL | 销售、运营、物流、金融、政务、客服、能耗统计……**默认选它** |
| `observatory` | 3D 数字孪生：Three.js 场景 + 运营面板 + 场景点选 | 园区、工厂、港口、机场、电站、矿山、场馆等有"物理空间"的题材 |

判断口径：**用户提到了具体物理场地并希望"看到场景"→ observatory；其余一律 flat**。拿不准就用 flat，做出来再问要不要加 3D。

## 1. 需求收敛（最多问 2 个问题，其余自己定）

必须自己定的（不要问）：
- 尺寸 1920×1080、深色科技风、中文界面
- 指标行：flat 5 个 / observatory 4 个；1 条主趋势（2–3 个周期切换）；左右各 3 个面板；flat 另有底部 3 个小图
- 数据全部为**演示数据**（页脚必须标注"演示数据 · 本地模拟"）

值得问的（只在这两件事上问）：
1. 业务主题 + 给谁看（决定指标口径与文案语气）
2. 有没有真实数据/字段（有就照抄，没有就按行业常识造合理量级）

用户没答就按行业常识推进，**不要空转**。

## 2. 五步工作流

### Step 1 定方案（先想清楚再动手）
写出 4 行方案，直接放在回复里让用户能看见：
```
主题：智慧港口运营中心（port-ops）
预设：observatory
指标：吞吐量 / 在港船舶 / 泊位利用率 / 平均在港时长 / 告警数
面板：左=泊位效率、货种结构、设备状态；右=船期动态、作业进度、安全事件
```

### Step 2 脚手架（会自动准备引擎）
```bash
node ./scripts/scaffold.mjs \
  --id port-ops --preset observatory \
  --title "智慧港口运营中心" --label "PORT NEXUS" \
  --desc "连接泊位、船舶与作业设备，让港口吞吐一目了然。" \
  --category operations --tags "港口,泊位调度,数字孪生"
```
脚本会：检查/克隆引擎仓库 → 建 `src/screens/<id>/` → 写占位预览图 → 往 `config/screens.json` 追加注册项 → 打印要改的文件清单和引擎路径。

> 想拉引擎最新代码：任意命令加 `--update`。想预热引擎（只克隆装依赖）：`node ./scripts/prepare.mjs`。

### Step 3 写内容
- `flat`：**只改 `app.js` 里的 `DATA`**（指标/趋势/面板/小图/ticker）和 `template.html` 的标题文案；不够用时再加 `styles.css`。
- `observatory`：改 `model.js`（三维场景）+ `app.js`（`ObservatoryDashboard.mount({...})` 配置）+ `styles.css`（主题色）。

> **照抄范例**：引擎仓库里现成的大屏就是参考——`src/screens/park/`（园区，3D，observatory 骨架来源）、`wind/`（风机，透明材质）、`factory/`（厂区，日夜切换）、`wind-power/`；flat 预设的范例就是脚手架生成物本身。
> 先 `ls ~/.bigscreen-ai/cache/bigscreen-engine/src/screens/` 看有哪些，别照抄一个不存在的大屏。

### Step 4 构建 + 自检 + 出包（必做，不许跳）
```bash
node ./scripts/verify.mjs --id port-ops
```
它做五件事：确保引擎可用 → 构建单文件 → 起本地服务 → 1920×1080 截图 → 检查 JS 报错/面板溢出/空白面板 → 写入 `out/`。
输出 JSON：`ok`、`errors`、`warnings`、`audit.overflow`、`html`、`screenshots`、`report`。
**然后必须用 Read 工具看 `out/<id>/<id>-1920.png`**，按视觉清单逐条过。有问题就改，再跑一次，直到 `ok: true` 且截图合格。

### Step 5 交付
把 `out/` 三个文件一起给用户，说一句"数据为演示数据，替换 `app.js` 的 DATA 即可接真实接口"。
最后用 `present_files` 把截图和 HTML 一起呈现。

## 3. 视觉验收清单（截图逐条对照）

- [ ] 首屏不滚动、不裁切，四边留白均匀（30px 栅格）
- [ ] 主标题一行放得下，英文小标不换行
- [ ] 每个面板标题 ≤ 8 字，右上角编号存在
- [ ] 数字有千分位、单位小一号、趋势色合理
- [ ] 面板内容撑满但**不溢出**（`report.json` 的 `audit.overflow` 必须为空）
- [ ] 主趋势图有网格、坐标轴、hover 提示
- [ ] 没有空白面板、没有 `undefined` / `NaN` / `[object Object]`
- [ ] 3D 场景：模型居中、不穿地、不贴边，pin 不重叠

## 4. 硬规矩

1. **舞台固定 1920×1080**，靠 `VizLabRuntime.mountStage()` 缩放；所有内部尺寸用 px，别用 `vw/vh`。
2. **构建标记不能删**：`/*__SCREEN_CSS__*/`、`/*__SCREEN_JS__*/`、`/*__RUNTIME__*/`、`/*__D3__*/`（flat）；observatory 另有 `/*__THREE__*/`、`/*__OBSERVATORY_*__*/`、`/*__MODEL__*/`。删了构建会报 Unresolved build markers。
3. **不引外链**：字体、图片、图表库一律本地。图表用引擎自带的 `assets/vendor/d3.min.js`（通过 `/*__D3__*/` 注入）。
4. **数据必须像真的**：量级合理、同比合理、单位齐全；页脚写明演示数据。
5. **只用 CSS 变量上色**（`--accent` 等），一个屏幕最多 3 个强调色。
6. **可访问性**：按钮有 `aria-label`，动效遵守 `prefers-reduced-motion`，清理逻辑挂在 `VizLabRuntime.onDispose`。
7. **不要动 `config/screens.json` 里别人的条目**，不要提交 `dist/`、`out/.build/`。

## 5. 常见坑

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `git clone` 失败（`Authentication failed` / 403） | 默认走 HTTPS，私有仓库需要凭据 | 配好 git credential / token，或换 SSH：`--remote git@github.com:alinkiot/screen-picture-demo.git` |
| `git clone` 失败（Host key verification） | 只有 SSH 地址才需要 known_hosts | 用默认的 HTTPS 地址即可；确实要走 SSH 就 `ssh-keyscan github.com >> ~/.ssh/known_hosts` |
| `npm ci` 失败 | 网络受限 | 单文件仍会产出，只是截图自检不可用；网络恢复后进引擎目录补跑 `npm ci` |
| 构建报 `Missing local preview` | `assets/previews/<id>.*` 不存在 | 重跑 scaffold，或先放占位 svg |
| `Unresolved build markers` | 模板里留了未替换标记 | 检查是否删了 `/*__XXX__*/` 注释 |
| 图表空白 | D3 在 `innerHTML` 后按 0 宽高绘制 | 用 `node.clientWidth/clientHeight` 取布局尺寸，不要用 `getBoundingClientRect`（舞台被 transform 缩放过） |
| 文字溢出面板 | 条目过多 / 字号过大 | 条目砍到 4–6 条，或降字号 1px，跑 verify 看 overflow |
| 3D 黑屏 | WebGL 不可用或场景构建抛错 | 检查 `model.js` 是否注册了 `ObservatoryScenes.builders['<id>']`（带连字符要用方括号），verify 的 `audit.renderer` 应为 `webgl` |
| observatory 报缺 header 图 | 模板里留了 `/*__OBSERVATORY_HEADER_ART__*/` | scaffold 已置空；不要手工加回 |
| observatory 面板内容被裁 | 共享面板高度固定 1fr，内容超了 | 精简条目，或在 `styles.css` 追加压缩样式（见 `references/observatory-api.md` 末节） |

## 6. 参考文件

- `references/engine.md` — 引擎仓库、目录、构建命令、注册表字段、构建标记表
- `references/flat-api.md` — flat 预设的数据契约与组件函数
- `references/observatory-api.md` — `ObservatoryDashboard.mount` 全字段、helpers、AstraGeometry、model.js 契约
- `references/design-system.md` — 配色/字号/间距/组件规范
- `references/playbook.md` — 行业→指标→图表选型 + 验收清单
