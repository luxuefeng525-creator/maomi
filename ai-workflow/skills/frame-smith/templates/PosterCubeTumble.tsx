import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";

// ─────────────────────────────────────────────────────────────────────────
// PosterCubeTumble — 骨架模板
//   一个贴满色块海报的 CSS-3D 立方体入场 → 翻滚 → settle 后微 drift，
//   叠加瑞士编辑风标尺网格 + 底部逐字大字 wordmark。零素材独立可跑。
//   register: cinematic · 1920×1080 · 30fps · ~15s (450f) · 纯视觉无旁白。
//   beats: S0 网格入场 | S1 立方体入场 | S2 翻滚(piecewise pose) | S3 settle+drift | S4 accent 收尾
//
//   HOW TO USE ─────────────────────────────────────────────────────────────
//   1. 替换占位: PLACEHOLDER_COLORS 色块 → <img src={staticFile(...)}/>(见
//      references/assets.md); TITLE / WORDMARK / CORNER_* 文案常量; 顶部调色 tokens。
//   2. 节拍: 调 H0..H8(秒) 重定时; poseT 必须严格升序, 重复值=hold。
//   3. 注册: import { PosterCubeTumble, PosterCubeTumbleCover,
//      POSTER_CUBE_TUMBLE_FRAMES } 后在 Root 注册 <Composition/>(见
//      references/registration.md); Cover 用作缩略图静帧。
// ─────────────────────────────────────────────────────────────────────────

const FPS = 30;
const f = (sec: number) => Math.round(sec * FPS);
export const POSTER_CUBE_TUMBLE_FRAMES = f(15); // ~15s

// ── 节拍常量 (每拍 job) ───────────────────────────────────────────────────
const H0 = f(0.1);  // 标尺网格淡入
const H1 = f(2.9);  // 立方体入场(scale 0.3→1)
const H2 = f(3.0);  // 翻滚开始 (pose 时间线起点)
const H3 = f(6.6);  // 翻滚中段第一次落面
const H4 = f(8.5);  // 翻滚中段第二次落面
const H5 = f(10.0); // settle — drift 相位开始
const H6 = f(1.2);  // wordmark 逐字起点
const H7 = f(12.6); // accent 线闪
const H8 = f(13.8); // 收尾压暗

// ── 调色 tokens ───────────────────────────────────────────────────────────
const BG = "#070304";
const GREY = "#767676";
const GREY2 = "#858585";
const ACCENT = "#FF4401";
const RULE = "rgba(255,255,255,0.16)";
const SANS = '"Helvetica Neue",Helvetica,Arial,sans-serif';

// ── 占位文案 (替换为真实项目文案) ─────────────────────────────────────────
const TITLE = "STUDIO";
const WORDMARK = "CREATIVE";
const CORNER_LEFT = ["Creative Studio", "Design & Direction"];
const CORNER_RIGHT = ["Issue N°000 / Coll. 2026", "Ref. XXX-000000-R00"];

// 替换: 把色块换成 <img src={staticFile(...)}/>, 见 references/assets.md
const PLACEHOLDER_COLORS = ["#1c1c1c", "#2a2320", "#20262a", "#2b2130", "#25281f", "#2e2222"];

const clampOpts = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ── 立方体几何 ─────────────────────────────────────────────────────────────
const FACES = ["front", "back", "right", "left", "top", "bottom"] as const;
const COLS = 3, ROWS = 3, PER_FACE = COLS * ROWS;
const CUBE_SIZE = 660;
const HALF = CUBE_SIZE / 2;
const GRID_GAP = 42;
const FACE_PADDING = 32;

// 六面: 每面 rotateX/Y 就位 + translateZ(HALF) 推到立方体表面。
const FACE_TRANSFORM: Record<(typeof FACES)[number], string> = {
  front: `translateZ(${HALF}px)`,
  back: `rotateY(180deg) translateZ(${HALF}px)`,
  right: `rotateY(90deg) translateZ(${HALF}px)`,
  left: `rotateY(-90deg) translateZ(${HALF}px)`,
  top: `rotateX(90deg) translateZ(${HALF}px)`,
  bottom: `rotateX(-90deg) translateZ(${HALF}px)`,
};

const tileColor = (faceIndex: number, i: number) =>
  PLACEHOLDER_COLORS[(faceIndex * PER_FACE + i) % PLACEHOLDER_COLORS.length];

// ── 标尺网格 overlay (精简版编辑风叠层) ────────────────────────────────────
const RulerGrid: React.FC<{ opacity: number }> = ({ opacity }) => {
  const W = 1920, H = 1080, TICK = 16;
  const ticks = (n: number, horiz: boolean) =>
    Array.from({ length: Math.floor(n / TICK) + 1 }, (_, k) => {
      const p = k * TICK, major = p % 96 === 0, len = major ? 14 : 7;
      return horiz ? (
        <line key={p} x1={p} y1={0} x2={p} y2={len} stroke={RULE} strokeWidth={1} />
      ) : (
        <line key={p} x1={0} y1={p} x2={len} y2={p} stroke={RULE} strokeWidth={1} />
      );
    });
  return (
    <div style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none", zIndex: 90 }}>
      <svg width="100%" height={22} viewBox={`0 0 ${W} 22`} preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>{ticks(W, true)}</svg>
      <svg width={22} height="100%" viewBox={`0 0 22 ${H}`} preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>{ticks(H, false)}</svg>
    </div>
  );
};

// ── 角标信息 (逐行上移显现) ────────────────────────────────────────────────
const CornerLabels: React.FC<{ frame: number }> = ({ frame }) => {
  const line = (txt: string, delay: number, color: string) => {
    const local = frame - delay;
    const ty = interpolate(local, [0, 16], [110, 0], { ...clampOpts, easing: Easing.out(Easing.cubic) });
    const op = interpolate(local, [0, 8], [0, 1], clampOpts);
    return (
      <div style={{ overflow: "hidden" }}>
        <div style={{ transform: `translateY(${ty}%)`, opacity: op, color }}>{txt}</div>
      </div>
    );
  };
  const base = f(0.3), step = f(0.18);
  return (
    <div style={{ position: "absolute", top: 56, left: 60, display: "flex", gap: 64, fontFamily: SANS, fontSize: 14, fontWeight: 600, zIndex: 95 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {CORNER_LEFT.map((t, i) => <React.Fragment key={i}>{line(t, base + step * i, i ? GREY2 : GREY)}</React.Fragment>)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {CORNER_RIGHT.map((t, i) => <React.Fragment key={i}>{line(t, base + step * (i + 2), i ? GREY2 : GREY)}</React.Fragment>)}
      </div>
    </div>
  );
};

// ── 底部大字 wordmark (逐字上弹显现) ───────────────────────────────────────
const Wordmark: React.FC<{ frame: number }> = ({ frame }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 2 }}>
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 40px", lineHeight: 1 }}>
      {WORDMARK.split("").map((ch, i) => {
        const local = frame - (H6 + i * f(0.05));
        const ty = interpolate(local, [0, 18], [70, 0], { ...clampOpts, easing: Easing.out(Easing.back(1.5)) });
        const op = interpolate(local, [0, 10], [0, 1], clampOpts);
        return (
          <span key={i} style={{ fontSize: 196, fontWeight: 800, color: GREY, letterSpacing: -6, fontFamily: SANS, opacity: op, transform: `translateY(${ty}px)` }}>{ch}</span>
        );
      })}
    </div>
  </div>
);

// ── 立方体 (真实 CSS-3D: perspective + preserve-3d + piecewise pose + drift) ─
const Cube: React.FC<{ frame: number }> = ({ frame }) => {
  const entranceOp = interpolate(frame, [H1, H1 + f(0.7)], [0, 1], clampOpts);

  // piecewise-pose 时间线: 共享严格升序 poseT + 每轴一个 interpolate; 重复值=hold。
  const poseT = [H2, f(3.8), f(4.6), H3, f(7.4), H4, f(9.2), H5];
  const rotateY = interpolate(frame, poseT, [0, 0, 0, 180, 360, 360, 540, 720], clampOpts);
  const rotateX = interpolate(frame, poseT, [-25, -25, -25, -20, -20, -20, -25, -25], clampOpts);
  const rotateZBase = interpolate(frame, poseT, [-5, -5, -5, 0, 0, 0, -5, -5], clampOpts);
  const scale = interpolate(frame, poseT, [0.3, 1, 1, 1, 0.8, 0.8, 1, 1], clampOpts);

  // settle 后 Math.sin drift, 用 ramp(driftAmp) 门控, 避免翻滚期抖动。
  const driftAmp = interpolate(frame, [H5, H5 + f(0.8)], [0, 1], clampOpts);
  const driftPhase = (Math.max(0, frame - H5) / FPS / 6) * Math.PI * 2;
  const driftY = Math.sin(driftPhase) * 16 * driftAmp;
  const rotateZ = rotateZBase + Math.sin(driftPhase) * 3 * driftAmp;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", perspective: 2400, perspectiveOrigin: "50% 46%", opacity: entranceOp, zIndex: 1 }}>
      <div style={{ width: CUBE_SIZE, height: CUBE_SIZE, position: "relative", transformStyle: "preserve-3d", transform: `translateY(${driftY}px) scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)` }}>
        {FACES.map((face, fi) => (
          <div key={face} style={{ position: "absolute", inset: 0, boxSizing: "border-box", padding: FACE_PADDING, transformStyle: "preserve-3d", transform: FACE_TRANSFORM[face] }}>
            <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: `repeat(${COLS},1fr)`, gridTemplateRows: `repeat(${ROWS},1fr)`, gap: GRID_GAP }}>
              {Array.from({ length: PER_FACE }, (_, i) => (
                // 替换: 把色块换成 <img src={staticFile(...)}/>, 见 references/assets.md
                <div key={i} style={{ overflow: "hidden", background: tileColor(fi, i) }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── accent 收尾 (线闪 + 压暗) ──────────────────────────────────────────────
const OutroAccent: React.FC<{ frame: number }> = ({ frame }) => {
  const lineOp = interpolate(frame, [H7, H7 + f(0.3), H7 + f(0.9)], [0, 1, 0], clampOpts);
  const dim = interpolate(frame, [H8, f(15.0)], [0, 0.35], clampOpts);
  return (
    <>
      <div style={{ position: "absolute", left: 56, right: 56, bottom: 130, height: 2, background: ACCENT, opacity: lineOp, zIndex: 97 }} />
      <div style={{ position: "absolute", inset: 0, background: "#000", opacity: dim, zIndex: 98, pointerEvents: "none" }} />
    </>
  );
};

// ── Scene (主组件 + Cover 静帧共用) ─────────────────────────────────────────
const Scene: React.FC<{ frame: number }> = ({ frame }) => {
  const rulerOp = interpolate(frame, [H0, f(0.8)], [0, 1], clampOpts);
  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden", fontFamily: SANS }}>
      {/* TITLE 占位: 项目可用作水印/角标, 此处仅演示常量 */}
      <span style={{ position: "absolute", top: 56, right: 60, color: GREY, fontSize: 14, fontWeight: 700, letterSpacing: 2, zIndex: 95 }}>{TITLE}</span>
      <Wordmark frame={frame} />
      <Cube frame={frame} />
      <RulerGrid opacity={rulerOp} />
      <CornerLabels frame={frame} />
      <OutroAccent frame={frame} />
    </AbsoluteFill>
  );
};

export const PosterCubeTumble: React.FC = () => <Scene frame={useCurrentFrame()} />;

// Cover: 取 peak 帧静帧 (翻滚展开最饱满处), 用作缩略图。
export const PosterCubeTumbleCover: React.FC = () => <Scene frame={f(7.6)} />;
