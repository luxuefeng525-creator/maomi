# 工业位图图标库（iotview，AI 可复用）

共 **1530** 个 PNG 位图图标，源自 iotview / mxGraph 图形库，带中文命名，覆盖 35 个设备/工艺分类。

## 与 FUXA 矢量库的区别（选用前先读）

| 维度 | FUXA `process-symbols`（矢量） | 本库 iotview（位图） |
| --- | --- | --- |
| 格式 | SVG `<symbol>`/`<use>` | PNG `<img>` |
| 状态色 | `currentColor` 可随状态变色 | 固定像素，**不可改色** |
| 缩放 | 无损 | 放大失真 |
| 适用 | 需动态变色的工艺图元（P&ID） | 写实设备示意 / 装饰 / 图例缩略 |

> 需要“运行绿 / 故障红 / 离线灰”动态着色的设备，用 FUXA 矢量库；只需一张好看的设备图、不随状态变色，用本库。

## 文件

| 文件 | 用途 |
| --- | --- |
| `assets/iotview-icons/<分组>/<n>.png` | 图标位图本体（已随 skill 一同存放） |
| `assets/iotview-icons/raster-icons.json` | 机器可读清单（id / 中文名 / 分类 / 相对路径），供 AI 检索 |
| `assets/iotview-icons/mxGraph.json` | 原始 mxGraph 清单（保留备查） |
| `scripts/build-raster-icons.js` | 重建本索引 |

## 怎么用（AI 复用步骤）

1. 按设备名在下表分类里检索，或在 `raster-icons.json` 里按 `label`/`category` 过滤，拿到 `path`。
2. 用 `<img>` 引用（路径相对于交付 HTML 所在位置；本 skill 的 `out/<场景>/index.html` 到 assets 的相对前缀为 `../../assets/iotview-icons/...`）：

```html
<img src="../../assets/iotview-icons/38/31.png" alt="鼓风机"
     width="64" height="64" style="object-fit:contain">
```

3. 位图无法改色；如需状态指示，用外层边框/角标/文字表达状态，不要指望改图本身颜色。放大不超过原始像素以免失真。

## 分类索引

| 分类 | 数量 | id 前缀示例 | 路径目录 |
| --- | --- | --- | --- |
| 废水处理 | 126 | `iv-15-125` | `assets/iotview-icons/15` |
| 水槽 | 107 | `iv-24-106` | `assets/iotview-icons/24` |
| 物料运输 | 101 | `iv-28-100` | `assets/iotview-icons/28` |
| 化学 | 98 | `iv-8-97` | `assets/iotview-icons/8` |
| 机器 | 90 | `iv-21-89` | `assets/iotview-icons/21` |
| 泵 | 81 | `iv-25-80` | `assets/iotview-icons/25` |
| HAVC | 68 | `iv-2-67` | `assets/iotview-icons/2` |
| 物流 | 65 | `iv-29-64` | `assets/iotview-icons/29` |
| 制程加热 | 60 | `iv-5-59` | `assets/iotview-icons/5` |
| 流量计 | 58 | `iv-26-57` | `assets/iotview-icons/26` |
| 电源 | 56 | `iv-30-55` | `assets/iotview-icons/30` |
| 植物 | 54 | `iv-23-53` | `assets/iotview-icons/23` |
| 按钮 | 52 | `iv-18-51` | `assets/iotview-icons/18` |
| 食品加工 | 46 | `iv-37-45` | `assets/iotview-icons/37` |
| 灯 | 37 | `iv-27-36` | `assets/iotview-icons/27` |
| 工厂设施 | 37 | `iv-14-36` | `assets/iotview-icons/14` |
| 鼓风机 | 32 | `iv-38-31` | `assets/iotview-icons/38` |
| 锅炉 | 32 | `iv-34-31` | `assets/iotview-icons/34` |
| 阀门符号 | 31 | `iv-36-30` | `assets/iotview-icons/36` |
| 安全 | 28 | `iv-12-27` | `assets/iotview-icons/12` |
| 工业 | 27 | `iv-13-26` | `assets/iotview-icons/13` |
| 标注 | 25 | `iv-22-24` | `assets/iotview-icons/22` |
| 阀门 | 23 | `iv-35-22` | `assets/iotview-icons/35` |
| 建筑 | 22 | `iv-16-21` | `assets/iotview-icons/16` |
| 天气 | 21 | `iv-11-20` | `assets/iotview-icons/11` |
| 制程冷却 | 21 | `iv-4-20` | `assets/iotview-icons/4` |
| 3D按钮 | 21 | `iv-1-20` | `assets/iotview-icons/1` |
| 搅拌器 | 20 | `iv-19-19` | `assets/iotview-icons/19` |
| 发动机 | 18 | `iv-10-17` | `assets/iotview-icons/10` |
| 仪表 | 18 | `iv-3-17` | `assets/iotview-icons/3` |
| 管道 | 16 | `iv-32-15` | `assets/iotview-icons/32` |
| 加热器 | 16 | `iv-6-15` | `assets/iotview-icons/6` |
| 电线 | 10 | `iv-31-9` | `assets/iotview-icons/31` |
| 动态图标 | 7 | `iv-7-6` | `assets/iotview-icons/7` |
| 开关 | 6 | `iv-17-5` | `assets/iotview-icons/17` |

> 完整逐条清单（1500+ 项）见 `assets/iotview-icons/raster-icons.json`，Markdown 不逐条铺开以保持可读。按分类定位目录后，该目录下所有 PNG 均属同类。

## 换热站 / 水务常用分类速查

| 场景部件 | 分类 |
| --- | --- |
| 鼓风机 | 鼓风机 |
| 水泵 / 加压泵 | 泵 |
| 阀门 | 阀门、阀门符号 |
| 锅炉 / 换热 | 锅炉、制程加热、制程冷却、加热器 |
| 流量计 / 仪表 | 流量计、仪表 |
| 管道 | 管道、电线 |
| 水处理 | 废水处理、水槽 |
| 暖通 | HAVC |
| 搅拌 | 搅拌器 |

