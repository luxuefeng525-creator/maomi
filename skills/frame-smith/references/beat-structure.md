# beat-structure — 节拍时间线架构

> 视频是**节拍(beats)**，不是**页面(sections)**。一个页面被动地陈列内容；一个节拍主动地推进注意力。你在写导演的分镜表，不是在排 PPT。

---

## 1. 核心原则

**节拍不是章节。** 章节问"这一块放什么内容"，节拍问"这 1.5 秒里画面在替观众完成哪一个动作"——升起、翻转、吸拢、爆开、落定。

四条硬规则：

1. **每拍一个 job。** 一拍只干一件事：一次入场、一次转场、一个引擎主 move、一次收束。
2. **边界是命名常量。** 拍与拍的边界写成 `H0 … Hn`，全部 `= f(秒)`。不要在 JSX 里散落魔法帧号。
3. **`X_FRAMES = 最后一拍边界(HEND)`。** 总时长由拍表决定，不是拍脑袋填一个 540。
4. **导出三件套：** 主合成 `X` / 封面 `XCover` / 时长 `X_FRAMES`。封面取"payoff 已落定"的那一帧。

### 标准骨架

```tsx
const FPS = 30;
const f = (s: number) => Math.round(s * FPS);
const clampOpts = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ── Beat boundaries（拍表就是这段注释，先写表再写画面）─────────────
const H0 = f(0);     // 0     cold-open / hook
const H1 = f(2.5);   // 75    engine enters
const H2 = f(6.0);   // 180   main move（引擎发力，给足时间）
const H3 = f(12.0);  // 360   peak
const H4 = f(14.5);  // 435   wordmark payoff（= XCover 取帧）
const HEND = f(16.0); // 480
export const X_FRAMES = HEND;

export const X: React.FC = () => {
  const frame = useCurrentFrame();
  // 每个 beat 一个可见块，gate 用 H 常量对齐，不写裸帧号
  return (/* … */);
};

// 封面定格在 payoff 帧
export const XCover: React.FC = () => <Scene frame={f(14.8)} />;
```

写法要点：先把 `H0…HEND` 的注释拍表敲定，再往里填画面。拍表是提纲，画面是实现。改节奏时只动常量，画面代码不动。

---

## 2. 通用铁律（跨 register）

**① 第一拍必须"赚到"下一秒。** 开场那一拍要给观众留下继续看的理由。
- `cinematic`：引擎/预告要**快速上屏**——标尺 0.8s 铺满、wordmark 1.2s 起跳、cube 2.9s 已在场。别让画面前 2 秒是空背景配一行淡入的标题。
- `short`：hook 必须在 **~1.5s** 落地。第一句话、第一个视觉钩子都要在这之前砸下去。

**② 一拍一 job。** 反例：一拍里同时"介绍产品 + 翻主题色 + 跑数字计数器"——三件事互相抢注意力，观众一件都没看清。拆成三拍，或砍到一件。

**③ 最后一拍要"落地"(payoff)。** 结尾不是淡出，是收束到一个确定的终态：
- wordmark 逐字落定 / logo 收敛归位 / accent 线一闪 / 矩阵吸拢成标题条。
- **这一帧就是 `XCover`。** 如果你说不出封面取哪帧，说明 payoff 没做够。

**④ 不许 dead air。** 任意一帧，画面要么**在动**，要么**在有意图地 hold**（呼吸微缩放、live jitter、慢 drift）。静止 ≠ 留白；静止且无意图 = 观众划走。参考数据脉冲原型的 `liveJitter` / 传输脉冲、胶囊翻转原型的 `breathe` 微缩放——数据/元素落位后仍在"活着"。

---

## 3. 两个 register 的叙事骨架

### 3.1 cinematic：`cold-open → engine build → peak → wordmark payoff`

横屏、无旁白，节奏由**画面事件**驱动。四个引擎原型的示例拍表：

**Architecture data-pulse** — 数据脉冲 · 7 拍 / 18s（引擎原型头部即 `H0…H6`）

| 拍 | 边界 | 秒 | job |
|----|------|-----|-----|
| H0 | `f(0)` | 0 | cold-open：仪表盘标题 + 三张建筑卡扇入 |
| H1 | `f(2.0)` | 2.0 | 数据面板铺开（材质条 / 环形 / 折线，带 live jitter）|
| H2 | `f(5.0)` | 5.0 | 全球网络：节点+数据线描绘，传输脉冲常动 |
| H3 | `f(9.0)` | 9.0 | 大数字计数器爆出（peak 前的密度堆叠）|
| H4 | `f(11.0)` | 11.0 | 案例取景框 + clipPath 擦除转场轮播 |
| H5 | `f(15.0)` | 15.0 | 数据复盘面板 + 呼吸 hold |
| H6 | `f(17.0)` | 17.0 | outro：报表 wordmark + 分隔线收束 |
| END | `f(18.0)` | 18.0 | `DATA_PULSE_FRAMES = END` |

**Poster-cube tumble** — 3D 立方体 · 15s

| 拍 | ~秒 | job |
|----|-----|-----|
| H0 | 0.0 | 标尺网格铺入 + `CREATIVE` wordmark 逐字起跳 + 角标信息 |
| H1 | 2.9 | 立方体入场（scale 0.3→1）|
| H2 | 4.5 | 翻滚 tumble（`poseT` 连续位姿：rotateY 0→720）|
| H3 | 10.0 | drift 悬浮 + 十字光标游走，wordmark 稳住 |
| H4 | 12.6 | accent 线一闪 → dim 压暗收尾 |
| END | 15.0 | `POSTER_CUBE_TUMBLE_FRAMES = 450` |

**Capsule theme-flip** — 胶囊编辑风 · 18s（亮→暗主题翻转叙事）

| 拍 | ~秒 | job |
|----|-----|-----|
| H0 | 0.0 | 亮色 hero 出场：徽章弹入、Bodoni 大标题逐词落、糖果九色行 |
| H1 | 3.9 | hero 退场让位 → 糖果卡片三连飞入（`CARD_IN 4.4`）|
| H2 | 6.9 | 规格表格滑入（`TABLE_IN`，逐行 translateX 入）|
| H3 | 9.0 | hero 回到中间（`HERO_RETURN`）|
| H4 | 9.8 | 胶囊 stadium 遮罩从中心撑满 → 画面翻暗（`SWITCH_MID 10.7`）|
| H5 | 11.4 | 暗色 hero 发光重排收尾 |
| END | 18.0 | `CAPSULE_THEME_FLIP_FRAMES = 540`；`Cover` 取 `f(12.6)` 暗主题高光帧 |

**Particle-burst album** — 个人相册 3D · 22.5s（引擎原型头部即 5 个 Beat）

| 拍 | ~秒 | job |
|----|-----|-----|
| Beat 1 | 0.0 | 描线开场：SVG 手写 `Memories` + 填充 + 粒子爆破，2.5s 冲进 3D |
| Beat 2 | 3.0 | 3D 环形轮播：照片从深空飞入落到自转圆环，景深+相机摆动 |
| Beat 3 | 9.0 | 收：整圈照片吸拢成一摞卡牌（速度模糊，`T_GATHER_B 11.5`）|
| Beat 4 | 12.25 | 弹：spring 过冲爆开成悬浮矩阵，边飞边翻面+三排走马灯 |
| Beat 5 | 17.6 | 收尾：矩阵再吸拢成胶片条，多余卡片消散，wordmark 19.4 落定 |
| END | 22.5 | `PARTICLE_BURST_ALBUM_FRAMES = 675` |

**读法：** 四片都是 `cold-open`（0–3s 一个强开场动作）→ `engine build`（引擎主 move 占中段大头）→ `peak`（密度/冲击最高点）→ `payoff`（wordmark/标题落定）。引擎不同（数据可视化 / 3D 立方 / 胶囊编辑 / 3D 相册），骨架同构。

### 3.2 short：`hook → point → proof → payoff`

竖屏，可带字幕/口播，节奏由**叙事/口播**驱动。按讲述切拍，不是按视觉事件切拍。

| 拍 | 时机 | job |
|----|------|-----|
| hook | 0 – ~1.5s | 一句话 + 一个视觉钩子砸下去，制造"这跟我有关" |
| point | hook 之后 | 说清楚它是什么 / 主张是什么（一个论点）|
| proof | 中段主体 | 用 case / 截图 / 数字证明它（一拍一个证据，别堆）|
| payoff | 末 0.5–1s | 收口金句 + logo/数据落定 |

**字幕逐句跟着节拍切**（见 `RULES.md` 字幕规范）：

```ts
// 按标点拆句，一句一拍，不一次性堆整段
const parts = text.split(/(?<=[，。！？、；…])/g).map(s => s.trim()).filter(Boolean);

// 英文/数字发音快，权重低；按字重比例分帧
const tw = parts.reduce((a, s) => a + sentenceWeight(s), 0);
const durs = parts.map(s => Math.max(18, Math.round(totalFrames * sentenceWeight(s) / tw)));
```

铁律映射到 short：
- hook 在 ~1.5s 落地（铁律①）。
- 每句字幕 = 一拍 = 一个 job（铁律②），语音讲到哪、画面切到哪，`shotTimes` 用绝对秒锁死每个镜头到对应旁白起点，**不要等距轮播**。
- 句间只留 ~0.3s，链式排布（铁律④，不留长静默）：`第 n 句 from = 第 n-1 句 from + 第 n-1 句时长 + 0.3s`。
- `durationInFrames = 末句结束帧 + ~1s 余韵`，讲完即收（铁律③ payoff）。

---

## 4. 节拍时长直觉

拍时长不是均分，是按 job 的"份量"给：

| 拍类型 | 典型时长 | 说明 |
|--------|---------|------|
| hook / cold-open | 0 – 1.5s | 快，一击即中，别磨蹭 |
| establish | ~1–2s | 把场景/主角立住 |
| develop（引擎主 move）| **3–6s，给足** | 翻滚、飞入、吸拢——引擎的招式要看得清、看得爽，**别抢**。这是中段大头 |
| peak | ~2–3s | 密度/冲击最高点，短促有力 |
| resolve / payoff | 0.5 – 1s | 落定，干净收口 |

**dial 调节：**
- `ENERGY` 高 → **压缩 hold**，拍更密、转场更快、jitter 更活。
- `ENERGY` 低 → **拉长每拍**，多给呼吸/drift，move 走得更从容。
- `SPECTACLE` 高 → develop/peak 让位给引擎，别用文字挤占画面。
- `DENSITY` 高 → 一拍内可叠更多元素错峰入场（但仍是"一个 job"，如数据脉冲原型的面板群 stagger）。

判断法：说不清这一拍在干哪件事 → 拍太杂，拆。这一拍观众会走神 → 拍太长或没 job，砍或加动作。

---

## 5. 转场（拍与拍之间怎么接）

硬切是最廉价的接法，除非风格明确要"卡点硬切"，否则用有动机的过渡把两拍缝起来：

| 手法 | 用法 | 参考 |
|------|------|------|
| **遮罩扫过 / stadium 撑开** | 一个形状从中心撑满，盖住旧拍、揭出新拍（常用于主题翻转）| 胶囊翻转原型的胶囊遮罩翻暗 |
| **擦除 clipPath** | `clipPath: inset(0 0 0 {100-reveal}%)`，新画面从一侧擦入 | 数据脉冲原型的案例轮播 |
| **吸拢 / 聚合** | 上一拍的元素 lerp 收成一摞/一条，作为下一拍的起点 | 粒子相册原型的环→摞→矩阵→胶片条 |
| **交叉淡化 crossfade** | 相邻拍各 ~12f 梯形叠化（`trapezoid`），底层持续 | 数据脉冲原型各 beat opacity |
| **连续位姿插值** | 同一物体跨拍用一条 `interpolate` 位姿轨迹，拍界只是关键帧 | 立方体原型的 `poseT` |

原则：转场本身也占用节拍预算，别让它偷走 develop 的时间；同一片风格统一——要么都用吸拢，要么都用擦除，不要每拍换一种花活。

---

## 6. 循环与收尾

**要能循环（背景/氛围片）：** 首尾帧必须接得上。
- 让 `frame = HEND` 的画面状态 ≈ `frame = H0`，观众看不出接缝。
- 视频素材循环用 `<Sequence>` 拼接，**不使用 `loop` prop**（`OffthreadVideo` 不支持）：

```tsx
const loops = Math.ceil(TOTAL_FRAMES / vDur) + 1;
// Array.from({ length: loops }) → 多段 <Sequence from={i*vDur} …>
```

**不循环（叙事片 / short）：** 终帧**干净落地**。
- payoff 收束到确定终态并 hold 到最后一帧，别在 payoff 后还空放十几秒。
- `X_FRAMES` 卡在 payoff 落定 + 短余韵处；short 里 `durationInFrames = 末句结束 + ~1s`。
- 收尾可加轻 vignette / dim（如立方体原型 `f(13.8→15.0)` 压暗、数据脉冲原型终帧黑场），把观众的目光温柔地送出画面。
