# registration.md — Write & Register (Step 6)

> Writing the `.tsx` is not the finish line. A composition that isn't registered in the runtime's Root **does not appear in Studio and cannot be rendered**. This file is the contract between frame-smith's output and the runtime it detected in `environment.md`.

---

## 1. The export三件套 — what every composition file must export

```ts
// 1) the duration constant — equals the last beat boundary
export const X_FRAMES = HEND;                 // e.g. const HEND = f(15); export const X_FRAMES = HEND;

// 2) the animated composition — reads the live frame
export const X: React.FC = () => {
  const frame = useCurrentFrame();
  return <Scene frame={frame} />;
};

// 3) the cover still — a fixed peak frame, for the poster/thumbnail
export const XCover: React.FC = () => <Scene frame={f(peakSecond)} />;
```

Rules:
- **Factor a `Scene` that takes `frame` as a prop.** `X` passes `useCurrentFrame()`; `XCover` passes a fixed number. Every reference frame does this — it's what makes the cover a real still of the same render, not a separate mock.
- **`X_FRAMES` = the last beat boundary** (`HEND`). It becomes `durationInFrames`. A mismatch either clips the payoff or leaves a dead tail.
- **`XCover` freezes the most composed frame** — usually the payoff or a mid-peak, never frame 0. Pick the frame you'd want as the video thumbnail.
- **Naming:** `PascalCase` component (`PosterCubeTumble`), `SCREAMING_SNAKE` frames const (`POSTER_CUBE_TUMBLE_FRAMES`), `…Cover` suffix for the still. Match the runtime's existing convention exactly.

---

## 2. Where the file lands (from `environment.md` §3)

| Runtime | Composition file | Root registry file |
|---|---|---|
| `hyperframe` (or on-disk fallback project) | `<root>/src/compositions/HyperFrames/<Name>.tsx` | `<root>/src/Root.tsx` |
| `remotion` | `<root>/src/compositions/<Name>.tsx` | `<root>/src/Root.tsx` (or wherever `registerRoot` is) |

---

## 3. Register the pair in Root

Two things: an **import** at the top, and a **`<Composition>` pair** inside the right `<Folder>`.

```tsx
// top of Root.tsx — import the三件套
import { PosterCubeTumble, PosterCubeTumbleCover, POSTER_CUBE_TUMBLE_FRAMES } from "./compositions/HyperFrames/PosterCubeTumble";

// inside <RemotionRoot>, in the matching <Folder>:
<Composition
  id="PosterCubeTumble"
  component={PosterCubeTumble as React.ComponentType<any>}
  durationInFrames={POSTER_CUBE_TUMBLE_FRAMES}
  fps={30}
  width={1920}   height={1080}          // cinematic. short → width={1080} height={1920}
  defaultProps={{}}
/>
<Composition
  id="PosterCubeTumbleCover"
  component={PosterCubeTumbleCover as React.ComponentType<any>}
  durationInFrames={1}
  fps={30}
  width={1920}   height={1440}          // cover: a TALLER crop (see §4)
  defaultProps={{}}
/>
```

- **Register the cover too**, at `durationInFrames={1}`. It's the poster still.
- **Put it in the right `<Folder>`.** In the local project the frames live under a `HyperFrames` folder; match whatever grouping the Root uses so it's findable in Studio.
- Preserve the file's existing formatting when editing Root — these files can be thousands of lines; make a surgical `Edit`, don't reflow.

---

## 4. Composition dimensions

| Register | Main `<Composition>` | Cover `<Composition>` |
|---|---|---|
| **cinematic** | `1920 × 1080` | `1920 × 1440` |
| **short** | `1080 × 1920` | `1080 × 1920` (or a taller poster crop if the runtime uses one) |

The cinematic **cover is `1920×1440`** — a taller 4:3-ish crop that gives a poster more vertical room than the 16:9 clip. This is the shipped convention; the cover `Scene` still renders the same frame, just onto a taller canvas. Keep the main clip strictly at the register's aspect.

`fps` is **always 30**.

---

## 5. Prove it moves — never skip

A composition you never previewed is a composition you haven't finished. Do one of:

```bash
cd "<project-root>"

# open Studio and eyeball the timeline (best)
npx remotion studio          # then select the composition by its id

# or render a still at the peak frame to a scratch path
npx remotion still  <CompId>  <out.png> --frame=<peakFrame>

# or render a short range to check motion
npx remotion render <CompId>  <out.mp4>
```

If `node_modules` is missing, the user runs `npm install` in the project root first (surface this from `environment.md` §3). Confirm at least a still renders and looks like the payoff — that closes the loop between "wrote a file" and "made a video." Report the composition `id` and how to preview it so the user can open it themselves.

---

## 6. Common registration bugs

- **Composition invisible in Studio** → forgot the `<Composition>` entry, or it's outside `<RemotionRoot>`, or a typo'd import path.
- **Clip ends early / has dead tail** → `durationInFrames` ≠ `X_FRAMES`.
- **Cover is blank/frame-0** → `XCover` passed `frame={0}` instead of the peak second.
- **Wrong aspect** → `width`/`height` don't match the register (see §4).
- **Type error on `component`** → cast `as React.ComponentType<any>` like the existing entries.
