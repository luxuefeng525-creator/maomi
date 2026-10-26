# assets.md — Loading images, fonts & audio into a composition

> Applies to **both** registers (cinematic + short). Everything a composition draws — a poster, a logo, a subtitle typeface, a voiceover track — is an **asset**, and Remotion renders **offline in a headless browser**. There is no "it loaded on my machine." If the path is wrong, the frame renders blank. This file is the discipline that keeps assets on-screen at render time.

The one rule under all of it: **every asset resolves through `staticFile()` or a stable absolute URL. Never a bare relative path.**

---

## 1. Images — two roads, and one that is banned

### Road A — `staticFile()` from the runtime's `public/` (default, render-stable)

`staticFile("path")` resolves a file living under the Remotion project's `public/` directory to a URL the renderer can fetch offline. This is the recommended road: the asset ships with the project, works in Studio and in `render` identically, and never depends on a server being up.

Give every composition a tiny **asset helper** so the folder prefix is written once:

```tsx
import { staticFile } from "remotion";

// public/HyperFrames/<comp-slug>/assets/<name>
const asset = (name: string) => staticFile(`HyperFrames/<comp-slug>/assets/${name}`);
```

Then reference by short name:

```tsx
<img
  src={asset("poster-01.avif")}
  alt=""
  draggable={false}
  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
/>
```

### Road B — a stable absolute URL (local resource server)

When the asset lives on a running local resource server rather than in `public/`, load it by full absolute URL:

```tsx
const HOST = "https://your-asset-host.example/assets";  // a CDN or a running resource server
const CORNER_A_IMG = `${HOST}/corner-a.avif`;

<img src={CORNER_A_IMG} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
```

This only holds up if the URL is genuinely stable and the host is up during render. A source that can 404 mid-render is not an asset road — copy it into `public/` and use Road A. (A `localhost` dev server counts as stable **only** if it's guaranteed running for every render.)

### Mixing both in one list

A poster list can carry either kind of entry — resolve per-item by testing for a scheme:

```tsx
src={src.startsWith("http") ? src : asset(src)}
```

### ✗ Banned: bare relative paths

```tsx
<img src="./assets/poster.avif" />        // ✗ resolves against nothing at render — blank frame
<img src="../../public/poster.avif" />     // ✗ same, and leaks a build-time path
```

A bare relative path works in a dev preview by accident and **breaks in `render`**. There is no exception. If you typed `src="..."` and it does not start with `http` and is not wrapped in `staticFile()`, it is a bug.

---

## 2. Image display discipline

Every rendered image obeys the same four:

- **`objectFit: "cover"`** — fill the box, crop the overflow. Never let an image letterbox or squash to the aspect it happens to have.
- **Fixed box** — the image lives in a parent with an explicit size (or `width/height: "100%"` inside a sized, `overflow: "hidden"` cell). The frame is authored; the photo conforms to it.
- **`draggable={false}`** — kills the ghost-drag artifact.
- **`display: "block"`** — removes the inline baseline gap under the image.

```tsx
<div style={{ width: 420, height: 560, overflow: "hidden" }}>
  <img
    src={asset("poster-02.avif")}
    alt=""
    draggable={false}
    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
  />
</div>
```

Reach for a specific crop with `objectPosition` (e.g. `objectPosition: "center 30%"` to bias toward a subject's face) rather than resizing the box.

**Formats:** prefer **avif / webp** — smaller files, faster offline fetch, no visible quality cost at these sizes. Keep a composition's poster library in one format under its asset folder.

**No lazy-loading.** `loading="lazy"` and intersection-based tricks are meaningless here — Remotion renders every frame headless and needs the pixels *present*, not deferred. Everything is eager by definition.

---

## 3. Fonts — three roads

A typeface must be **ready before the frame that uses it paints**, or the first frames render in a fallback and then pop to the real font (the "first-frame font flash"). Pick the road that guarantees readiness.

### Road A — `@remotion/google-fonts`

For a common web font, load it declaratively and use the family it returns:

```tsx
import { loadFont } from "@remotion/google-fonts/Inter";
const { fontFamily } = loadFont();   // ready before render
// style={{ fontFamily }}
```

### Road B — project `localFonts.ts` constants (the house default)

`src/utils/localFonts.ts` declares one `@font-face` CSS block (backed by `staticFile("fonts/…woff2")`) and exports ready-to-drop family strings with full fallback stacks. **This is what the HyperFrames use** — import the constant, never re-type a family string:

```tsx
import { FONT_INTER, FONT_ARCHIVO_BLACK, FONT_NOTO_SANS_SC } from "../../utils/localFonts";

const FEN = FONT_INTER;          // "'LocalInter', 'Inter', system-ui, …"
const FNUM = FONT_ARCHIVO_BLACK; // heavy display numerals
const FCN = FONT_NOTO_SANS_SC;   // Chinese → 'PingFang SC' fallback stack

// style={{ fontFamily: FEN }}
```

Available English constants include `FONT_INTER`, `FONT_ARCHIVO_BLACK`, `FONT_RECURSIVE` (mono). Chinese constants (`FONT_NOTO_SANS_SC`, `FONT_NOTO_SERIF_SC`, `FONT_LXGW_WENKAI_TC`, …) already resolve to macOS system CJK families — see §4.

### Road C — `injectFontFaces()` for a local file Google doesn't have

For a font that isn't on Google Fonts (a handwriting face, a CJK display face), drop the file into `public/fonts/` and inject an `@font-face` at module scope:

```tsx
import { injectFontFaces } from "../../utils/injectFontFaces";

injectFontFaces([
  { family: "Caveat",        file: "fonts/Caveat.ttf" },          // public/fonts/Caveat.ttf
  { family: "MyHandwriteCN", file: "fonts/handwrite-cn.otf" },    // a CJK handwriting file you drop in
]);

const HAND = "'Caveat', 'Bradley Hand', cursive";
// style={{ fontFamily: HAND }}
```

`injectFontFaces` resolves the file via `staticFile`, dedupes by family, and appends a `<style>` with `font-display:swap`. The browser downloads the file **only when text actually uses that family** — so calling it at the top of every component costs nothing for components that don't use the font. Call it once, at module scope, above your family constants.

> **Readiness caveat:** `font-display:swap` means an injected font can still flash on the very first frames if the file is heavy. For a title that must be pixel-locked from frame 0, prefer Road A/B (which are ready before render) or keep the injected file small.

---

## 4. Chinese fonts — a CJK glyph set is mandatory

**An English typeface has no Chinese glyphs.** Set a Chinese title in `Caveat` (or Inter, or any Latin face) and every character renders as tofu (□) or silently falls through to the browser default — a jarring mismatch mid-frame.

Any Chinese title/subtitle **must** use a family whose stack contains a CJK face:

- **System fallback (safest):** the `localFonts.ts` CJK constants already end in macOS system faces — `FONT_NOTO_SANS_SC` → `'PingFang SC'`, `FONT_NOTO_SERIF_SC` → `'Songti SC'`, `FONT_LXGW_WENKAI_TC` → `'STKaiti'`. These are always present; no file to ship.
- **Injected CJK display face:** for a look the system fonts can't give (handwriting, brush), inject a real CJK font file (drop your own into `public/fonts/`, e.g. `handwrite-cn.otf`) and put a CJK fallback **behind** the display face:

```tsx
const HAND_CN = "'MyHandwriteCN', 'Caveat', 'PingFang SC', sans-serif";
//                ^ CJK handwriting   ^ Latin match   ^ CJK safety net
```

Pattern for a bilingual layout: one Latin family for the English line, one CJK family for the Chinese line — never one family for both unless it genuinely carries both glyph sets.

---

## 5. Audio (short-register voiceover)

Load a voiceover / SFX track with Remotion's `<Audio>` and `staticFile` — same asset discipline as images:

```tsx
import { Audio, staticFile } from "remotion";

<Audio src={staticFile("audio/vo-line-01.mp3")} />
```

The audio track is the **clock** for a short. Subtitle beats and cuts align to the *audio timeline*, not to arbitrary frame guesses — author each subtitle's in/out against the moment the word is spoken. Do the timing in seconds through the `f()` helper and the beat map from **beat-structure** and **motion-floor** (`f(seconds)` → frame); the audio waveform is the ground truth those beats hang on.

---

## 6. Where assets live — per runtime

Both runtimes serve static assets from the project's **`public/`** directory; `staticFile("x")` resolves to `public/x`.

| Runtime | Assets root | Image convention | Font convention |
|---|---|---|---|
| **hyperframe** | `public/` | `public/HyperFrames/<comp-slug>/assets/` | `public/fonts/` |
| **remotion runtime** | `public/` | `public/HyperFrames/<comp-slug>/assets/` (or a comp-scoped folder) | `public/fonts/` |

Rules that hold in both:

- One **asset folder per composition** — `public/HyperFrames/<slug>/assets/` — so a composition's posters travel together and the `asset()` helper needs one prefix.
- **All fonts** in `public/fonts/`, referenced as `staticFile("fonts/<file>")` (that's exactly what `localFonts.ts` and `injectFontFaces` do).
- Audio in `public/audio/` (or a comp-scoped folder), loaded via `staticFile`.

If a file isn't under `public/`, `staticFile` can't see it — move it in, or use a stable absolute URL (§1 Road B).

---

## 7. Generate vs. real asset vs. placeholder — decide, then get authorization

When a build needs a real image (a product shot, a specific photo, a logo) and **the user hasn't supplied it**, do not silently invent one. Stop and ask which road:

1. **Generate** — synthesize the image (AI image gen, a procedural/SVG mockup drawn in the composition itself).
2. **Real / stock** — pull from a real image library or a source the user names.
3. **Placeholder** — a neutral colored box, gradient, or labeled frame (`objectFit:"cover"` on a solid) that holds the layout until the real asset arrives.

**Authorization gate:** anything that generates a new file or downloads from the network — image generation, fetching stock — requires **explicit user go-ahead first**. Never generate or download an asset on your own initiative. Placeholder is the safe default for keeping a composition renderable while you wait for that go-ahead; ship it, mark it clearly, and swap it once the real asset lands.
