# 引擎契约（vizlab）

## 引擎来源与位置

| 项 | 默认值 | 覆盖方式 |
| --- | --- | --- |
| 本地引擎 | `../vizlab`（与本 skill 同处 big-screen 工作区） | **优先使用**，无需联网 |
| 远端仓库 | `https://github.com/alinkiot/screen-picture-demo.git` | 本地引擎缺失时回退 `--remote <url>` |
| 缓存工作副本 | `~/.bigscreen-ai/cache/bigscreen-engine` | 远端克隆落点，`--engine <dir>` 或 `VIZLAB_ENGINE` |
| 交付目录 | `./out`（当前工作目录） | `--out <dir>` |

引擎解析优先级：`--engine` / `VIZLAB_ENGINE` > 工作区本地 `vizlab`（存在即用）> `~/.bigscreen-ai/cache/bigscreen-engine`（不存在则 clone 远端）。

首次调用 `scaffold.mjs` / `verify.mjs` 时，若使用本地引擎则无需联网；若回退到远端克隆会 `git clone --depth 1 --single-branch` 并安装依赖
（`.venv` + Pillow、`npm ci` + Playwright）。也可手动预热：

```bash
node scripts/prepare.mjs                 # 克隆 + 装依赖（约 1–2 分钟，仅首次）
node scripts/prepare.mjs --update        # 拉最新代码（git fetch --depth 1 + reset --hard）
node scripts/prepare.mjs --engine ./eng  # 换工作副本位置（例如放进当前项目）
```

`prepare.mjs` 输出 JSON：`{ok, dir, remote, cloned, updated, python, screenshot}`。
`python` 为 null 说明缺 Python 3.10+/Pillow，构建会失败；`screenshot` 为 false 说明 Playwright 没装上，
此时仍能产出单文件，只是没有截图和自检。

## 交付契约

`out/` 只有三个文件，构建中间产物（`.build/`）跑完即删（`--keep-build` 可保留）：

```text
out/<id>/<id>.html          单文件大屏，依赖全内联，离线可双击打开
out/<id>/<id>-1920.png      1920×1080 截图
out/<id>/<id>-report.json   自检结论（ok / errors / warnings / audit / generatedAt）
```

## 目录

```text
config/screens.json        大屏注册表（数组，构建入口）
src/screens/<id>/          每个大屏：template.html + styles.css + app.js（+ model.js）
src/shared/                共享运行时：runtime.js / observatory*.js / astra-geometry.js / observatory.css
assets/vendor/             d3.min.js、three.min.js（本地，构建时内联）
assets/previews/           Home 卡片预览图（webp/png/svg）
scripts/build.py           确定性构建（web / standalone）
scripts/server.mjs         本地静态预览（默认 5173）
```

## 命令

```bash
npm run dev                                   # 5173 预览 + 文件监听
.venv/bin/python scripts/build.py --target <id> --mode web          # 只构建某个大屏（同时刷新 home）
.venv/bin/python scripts/build.py --target <id> --mode standalone   # 单文件离线版 → dist/standalone/<id>.html
.venv/bin/python scripts/build.py --target all --mode all           # 全量
npm run check                                 # JS 语法 + 注册表校验
```

`--out <dir>` 可把产物写到任意目录（`--out ~/Desktop/bigscreen`）。

> 日常生成用 `--mode standalone`（单文件、无 `_assets`）；要更新展厅就 `--mode web` 或 `npm run build`。若换回未打补丁的引擎（`scripts/buildlib.py` 里 `folder.mkdir(exist_ok=True)` 没有 `is_dir()` 守卫），受限沙箱下 web 模式会报 `PermissionError: EEXIST dist/_assets`，此时改用 standalone 或在普通终端构建。

## 把大屏回灌到仓库（可选）

工作副本就是个普通 git 仓库，想把这批大屏提交回远端：

```bash
cd ~/.bigscreen-ai/cache/bigscreen-engine
git checkout -b feat/<id>
git add src/screens/<id> config/screens.json assets/previews/<id>.*
git commit -m "feat: add <id> dashboard"
git push -u origin feat/<id>
```

`--update` 会 `reset --hard`，**未提交的改动会被丢弃**，先提交再更新。

## 注册表字段（全部必填，多一个少一个都会构建失败）

```json
{
  "id": "port-ops",            // ^[a-z][a-z0-9-]{1,39}$
  "title": "智慧港口运营中心",
  "description": "一句话说明",
  "category": "operations",    // 3d | geo | operations
  "label": "PORT NEXUS",       // 卡片英文小标，大写
  "width": 1920,               // 320–7680
  "height": 1080,              // 240–4320
  "preview": "assets/previews/port-ops.png",  // 必须以 assets/previews/ 开头且文件存在
  "tags": ["港口", "调度"],     // 1–5 个
  "renderer": "generic"        // wind | factory | population | inspection | generic
}
```

`renderer: "generic"` 就是"用我自己的 template + app.js"，绝大多数新大屏都用它。

## 构建标记（模板里的占位注释）

| 标记 | 注入内容 | 何时需要 |
| --- | --- | --- |
| `/*__SCREEN_CSS__*/` | `src/screens/<id>/styles.css` | 必有 |
| `/*__SCREEN_JS__*/` | `src/screens/<id>/app.js` | 必有 |
| `/*__RUNTIME__*/` | `src/shared/runtime.js`（`VizLabRuntime.mountStage`） | 必有 |
| `/*__D3__*/` | `assets/vendor/d3.min.js` | 要画图 |
| `/*__THREE__*/` | `assets/vendor/three.min.js` | 3D |
| `/*__MODEL__*/` 或 `/*__MODEL_JS__*/` | `model.js` | 3D |
| `/*__OBSERVATORY_CSS__*/` | `src/shared/observatory.css` | 用 observatory 框架 |
| `/*__OBSERVATORY_JS__*/` | `observatory.js`（`ObservatoryDashboard`） | 同上 |
| `/*__OBSERVATORY_SCENE__*/` | `observatory-scene.js`（`ObservatoryScenes`） | 同上 |
| `/*__OBSERVATORY_HEADER__*/` | `observatory-header.js` | 同上 |
| `/*__ASTRA_GEOMETRY__*/` | `astra-geometry.js`（建模型工具） | 同上 |
| `/*__OBSERVATORY_HEADER_ART__*/` | `assets/art/astra/<id>-header.png` 转 webp | **新大屏不要用**（没有这张图会构建失败），把属性留空字符串 |
| `/*__GLOBE_JS__*/` / `/*__MAP_DEPTH__*/` / `/*__SCREEN_DATA__*/` | `globe.js` / `map-depth.js` / `data.js` | 只有地球/地理类大屏用得到，普通大屏不用管 |

构建结束会扫描残留标记，有残留直接抛 `Unresolved build markers`。

## 构建产物

- `dist/<id>.html` + `dist/_assets/*.js|css|webp`（内容哈希，可长缓存）
- `dist/standalone/<id>.html`（全部内联，单文件，可离线双击）
- `dist/home.html` / `index.html`（展厅，按注册表自动生成卡片）

## 排错

| 报错 | 处理 |
| --- | --- |
| `Each screen must match config/screens.schema.json` | 注册项字段少了或多了 |
| `Missing local preview for <id>` | 补 `assets/previews/<id>.*` |
| `Missing source template for <id>` | 缺 `src/screens/<id>/template.html` |
| `Unsupported screen category/renderer` | `category` 只能 3d/geo/operations，`renderer` 见上表 |
| `Unresolved build markers` | 模板里还剩 `/*__XXX__*/` |
| Python 依赖缺失 | 用引擎自带 `.venv/bin/python`（已装 Pillow） |
