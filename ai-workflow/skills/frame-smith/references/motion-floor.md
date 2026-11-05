# motion-floor.md — The Universal Motion Craft Floor

> Applies to **both** registers (cinematic + short). This is the thin, consistent layer that separates an expensive-looking clip from a slideshow. Lay it first, every build. The forks (orientation, safe zones, subtitles) are marked.

---

## 1. Time is authored in seconds — never raw frames

```ts
const FPS = 30;                          // all HyperFrames are 30fps. Do not use 24 or 60.
const f = (s: number) => Math.round(s * FPS);   // second → frame. Every beat & delay goes through this.
```

Every beat boundary, every entrance delay, every hold is `f(seconds)`. A raw frame number hand-guessed in the code (`interpolate(frame, [87, 132], …)`) is unreadable and un-editable — write `interpolate(frame, [f(2.9), f(4.4)], …)`. When you re-time a clip (`slower`/`faster`), you edit seconds, not frame arithmetic.

The component reads the current frame from Remotion:
```ts
import { useCurrentFrame } from "remotion";
const frame = useCurrentFrame();
```

---

## 2. `interpolate` always clamps

```ts
const clampOpts = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
// e.g.
const op = interpolate(frame, [f(0), f(0.5)], [0, 1], clampOpts);
```

**Every `interpolate` that maps a time range takes `clampOpts`.** An unclamped ramp keeps extrapolating past its endpoints — opacity climbs past 1, a rotation overshoots forever — and is the #1 cause of "it drifts after its beat." No exceptions.

For a value that ramps **in then out** (appear, hold, disappear), use the trapezoid helper instead of two interpolates:
```ts
const trapezoid = (frame: number, inA: number, inB: number, outA: number, outB: number) =>
  interpolate(frame, [inA, inB, outA, outB], [0, 1, 1, 0], clampOpts);
// opacity that fades in over 0.3s, holds, fades out over 0.4s:
const op = trapezoid(frame, f(2.0), f(2.3), f(4.6), f(5.0));
```

---

## 3. Easing over `linear` — the tempo vocabulary

`linear` on a visible move is a tell. Pick from this vocabulary and lock it for the clip:

```ts
import { Easing, spring } from "remotion";

const power1Out  = Easing.out(Easing.ease);    // gentle settle
const power2Out  = Easing.out(Easing.quad);
const power3Out  = Easing.out(Easing.cubic);   // the default entrance ease
const expoOut    = Easing.out(Easing.exp);     // fast attack, long tail — kinetic
const backOut    = Easing.out(Easing.back(1.5)); // overshoot & settle — for pop/reveal
const sineInOut  = Easing.inOut(Easing.sin);   // drift / breathing loops
const circOut    = Easing.out(Easing.circle);
```

Usage:
- **Entrances** → `power3Out` (cubic) or `expoOut`. Elements arrive fast, decelerate into place.
- **Pops / reveals that should feel alive** → `backOut` (overshoot) or a `spring`.
- **Holds** → a real flat segment in a piecewise `interpolate` (see §4), not a slow `linear`.
- **Loops / drift / breathing** → `sineInOut` or raw `Math.sin(phase)`.

`spring` for physical overshoot (card explode, capsule pop, matrix burst):
```ts
const s = spring({ frame: frame - f(startSec), fps: FPS, config: { damping: 12, stiffness: 120, mass: 0.9 } });
// s ramps 0→~1 with overshoot; multiply into scale/translate.
```
Lower `damping` = more overshoot. Keep `mass`/`stiffness` consistent across a clip so its springs feel like one hand.

---

## 4. Piecewise pose channels — the HyperFrame move-timeline

A HyperFrame move (a cube tumbling through poses, a camera swinging) is one `interpolate` per channel over a **shared, monotonic** time array. This is how the poster-cube archetype poses the cube:

```ts
const poseT = [f(3), f(4), f(5), f(6.5), f(7.5), f(8.5), f(9.5), f(11)]; // MUST be ascending
const rotateY = interpolate(frame, poseT, [0,   0,   0,   180, 360, 360, 540, 720], clampOpts);
const rotateX = interpolate(frame, poseT, [-25, -25, -25, -20, -20, -20, -25, -25], clampOpts);
const scale   = interpolate(frame, poseT, [0.3, 1,   1,   1,   0.8, 0.8, 1,   1  ], clampOpts);
```
- The **input array is shared and strictly ascending**; repeated output values (`360, 360`) are the **holds**.
- Add a drift/breathing phase *after* the pose settles, gated so it only starts at the settle time:
```ts
const driftAmp   = interpolate(frame, [f(11.0), f(11.8)], [0, 1], clampOpts);
const driftPhase = (Math.max(0, frame - f(11.0)) / FPS / 6) * Math.PI * 2;  // 6s period
const driftY     = Math.sin(driftPhase) * 16 * driftAmp;
```

---

## 5. Orientation substrate — the fork

### 5.A cinematic (landscape) — `1920×1080`
Fixed canvas, no scale system needed, but keep values proportional to 1920 so a re-crop is clean. No safe-zone tax — you own the whole frame. Wordmark grammar (big bottom wordmark, corner labels, ruler overlay) is available; see `effect-catalog.md`'s overlay kit.

### 5.B short (vertical) — `1080×1920` — obeys the scale system
```ts
import { useVideoConfig } from "remotion";
const { width } = useVideoConfig();
const S = width / 720;   // 720p → 1.0, 1080p → 1.5
```
**Every absolute pixel is `× S`** — `fontSize`, `top/left/right/bottom`, `padding`, `borderRadius`, gaps, stroke widths. A value not multiplied by `S` is a bug that only shows at the wrong resolution.

**抖音 safe zones** (platform UI covers the edges) — keep all content inside (1080p values, i.e. `× S` from the 720 base):
```ts
const SAFE_TOP    = Math.round(107 * S);  // 1080p ≈ 160 — status bar + progress
const SAFE_BOTTOM = Math.round(147 * S);  // 1080p ≈ 220 — interaction bar
const SAFE_LEFT   = Math.round(30  * S);  // 1080p ≈ 44  — avatar / username
const SAFE_RIGHT  = Math.round(80  * S);  // 1080p ≈ 120 — like/comment/share column (the tight one)
```
The **right column is the trap** — the like/comment/share buttons are ~100px wide; every label, card, and caption must clear ≥ 80px (720) from the right edge.

### 5.C Subtitles (short, when there's narration)
Split copy by punctuation and switch each sub-line on its narration beat — **never dump a paragraph at once**:
```ts
const parts = text.split(/[，。！？、；]/).filter(Boolean); // one clause per beat
// assign each clause a [startSec, endSec] from the audio, show only the active clause.
```
Subtitles live inside the bottom safe zone, one clause at a time, entering with a small `power2Out` rise — not a full re-animation per word unless the brief is a TikTok word-pop style.

---

## 6. The export三件套 — the contract every composition ships

```ts
export const X_FRAMES = HEND;                 // the duration constant (frames). = last beat boundary.
export const X: React.FC = () => { … };       // the animated composition
export const XCover: React.FC = () => <Scene frame={f(peakSecond)} />;  // a STILL of the best frame
```
- Factor the render into a `Scene` that takes `frame` as a prop, so `X` passes `useCurrentFrame()` and `XCover` passes a fixed peak frame. This is why every reference frame has a `Scene`.
- `XCover` is the poster still — pick the most composed moment (often the payoff or a mid-peak), not frame 0.
- `X_FRAMES` **must** equal the last beat boundary and the registered `durationInFrames` (`registration.md`).

---

## 7. Terminal-frame discipline

A clip must **resolve to a clean, designed last frame** — the payoff (wordmark settled, logo resolved, matrix collapsed to a title). Reasons:
- It's what `XCover` freezes.
- It's the reduced-motion / thumbnail state — a still viewer must see a finished poster, not a mid-transition smear.
- A clip that stops on a random engine frame feels unfinished (`beat-structure.md` §payoff).

Design the last ~0.5–1s as its own beat that *arrives* somewhere and holds it clean.

---

## 8. Performance floor

- Animate **`transform` and `opacity` only**. Never `top/left/width/height` — they trigger layout and jank. Use `translate`/`scale`/`rotate`.
- `will-change` sparingly; Remotion renders offline so it matters less than in-browser, but Studio preview still stutters on layout thrash.
- Heavy engines (many faces, big particle counts): if Studio preview drops frames, cut count/resolution before shipping — a janky preview is a janky render.
- Images: `objectFit: "cover"`, fixed box, `draggable={false}`, `display: "block"` (`assets.md`).
