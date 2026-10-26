# effect-catalog.md — The Effect-Engine Vocabulary

> **One clip carries exactly ONE load-bearing engine, built to 100%.** The engine is the video's soul — the reason it's *this* clip and not any other. Pick one of the four below by intent, do it fully, and **do not blend two engines** (a cube that also does a data-pulse reads as neither). Reusable sub-effects (counters, wipes, editorial overlays) are **garnish** — layer them on top of the one engine, never as the engine. Every rule assumes the motion craft floor is already laid: `FPS = 30`, `f(s)`, `clampOpts`, `trapezoid`, the export三件套 (`references/motion-floor.md`).

The four engines, matched to intent:

| Engine | Reach for it when the brief is… | Do NOT reach for it when… |
|--------|-------------------------------|--------------------------|
| **Poster-cube tumble** | a **portfolio / gallery wall** — many equal images, one bold wordmark, editorial swagger | you have 1–3 hero images (a cube needs 6×9=54 tiles to not look empty), or the content is data/story |
| **Capsule theme-flip** | a **brand / product system** with a light→dark reveal, playful candy-editorial tone, spec payoff | the tone is serious/technical, or there's no "reveal" moment to spend the flip on |
| **Architecture data-pulse** | a **report / index / dashboard** — numbers, rankings, maps, "live" figures, credibility | there's nothing to count or rank (a data engine with no data is empty chrome) |
| **Particle-burst album** | a **personal / emotional photo story** — memories, travel, a year-in-review, handwritten warmth | the brand is corporate/precise, or you have <8 photos (the 3D ring & burst matrix need volume) |

**Default-breaker:** the cube is *not* the safe pick. It is the **portfolio-wall** pick. If the brief is a product, a report, or a memory, the cube is the wrong engine — route by the table.

---

## 1. Poster-cube tumble

A single CSS-3D cube, six faces each a 3×3 poster grid, tumbling through a scripted pose timeline over an editorial ruler-grid substrate. The spectacle is **real 3D depth** — `perspective` + `preserve-3d`, never a fake 2D rotate.

### 1.1 The 3D scaffold — perspective + preserve-3d + six FACE_TRANSFORM

The parent holds the `perspective`; the cube holds `transformStyle: preserve-3d`; each face is absolutely stacked then rotated into place and pushed out by `translateZ(HALF)`.

```tsx
const CUBE = 660, HALF = CUBE / 2;
const FACES = ["front","back","right","left","top","bottom"] as const;
const FACE_TRANSFORM: Record<(typeof FACES)[number], string> = {
  front:  `translateZ(${HALF}px)`,
  back:   `rotateY(180deg) translateZ(${HALF}px)`,
  right:  `rotateY(90deg)  translateZ(${HALF}px)`,
  left:   `rotateY(-90deg) translateZ(${HALF}px)`,
  top:    `rotateX(90deg)  translateZ(${HALF}px)`,
  bottom: `rotateX(-90deg) translateZ(${HALF}px)`,
};

// stage: perspective lives on the PARENT, off-center for a hero look
<div style={{ perspective: 2400, perspectiveOrigin: "50% 46%" }}>
  <div style={{ width: CUBE, height: CUBE, position: "relative", transformStyle: "preserve-3d",
    transform: `scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)` }}>
    {FACES.map((face) => (
      <div key={face} style={{ position: "absolute", inset: 0, padding: 32,
        transformStyle: "preserve-3d", transform: FACE_TRANSFORM[face] }}>
        <div style={{ width: "100%", height: "100%", display: "grid",
          gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "repeat(3,1fr)", gap: 42 }}>
          {/* nine <img objectFit:"cover"> tiles */}
        </div>
      </div>
    ))}
  </div>
</div>
```

Face padding + grid `gap` are what make it read as an assembled object, not a texture. Tiles stay assembled — they don't scatter.

### 1.2 The pose timeline — one interpolate per channel, shared ascending time array

The tumble is authored as **piecewise pose channels** (motion-floor §4): one shared, strictly-ascending `poseT`, one `interpolate` per rotation axis + scale. Repeated output values are the **holds**.

```tsx
const poseT = [f(3), f(4), f(5), f(6.5), f(7.5), f(8.5), f(9.5), f(11)];
const rotateY = interpolate(frame, poseT, [0,  0,  0,  180, 360, 360, 540, 720], clampOpts);
const rotateX = interpolate(frame, poseT, [-25,-25,-25,-20,-20,-20,-25,-25], clampOpts);
const rotZBase= interpolate(frame, poseT, [-5, -5, -5, 0,  0,  0,  -5, -5 ], clampOpts);
const scale   = interpolate(frame, poseT, [0.3, 1, 1, 1,  0.8,0.8,1,  1  ], clampOpts);
```

720° on Y = two full turns showing every face. The `0.8` scale dip mid-timeline is a breath before the final settle. **Never** drive the cube from `Math.sin(frame)` alone — a scripted pose beats a hypnotic spin.

### 1.3 Drift — the after-settle life, gated to start only once posed

After the tumble lands at `f(11)`, a slow sine drift keeps it alive so the hold isn't dead. Gate the amplitude so it ramps in *at* the settle, never during the tumble.

```tsx
const driftAmp   = interpolate(frame, [f(11.0), f(11.8)], [0, 1], clampOpts);
const driftPhase = (Math.max(0, frame - f(11.0)) / FPS / 6) * Math.PI * 2; // 6s period
const driftY     = Math.sin(driftPhase) * 16 * driftAmp;
const rotateZ    = rotZBase + Math.sin(driftPhase) * 3 * driftAmp;
// apply translateY(driftY) on the cube transform
```

**何时用**: portfolio walls, design studios, "selected work", magazine/issue openers — lots of equal-weight imagery that wants to feel like one crafted object. **何时不用**: 1–3 hero images (faces go empty and it looks cheap), or anything narrative/data-driven — a cube can't tell a story or count.

---

## 2. Capsule theme-flip

Pill-editorial poster (Bodoni serif, candy-nine palette, cream paper) that **flips light→dark by scaling a stadium mask out from the center** until it swallows the frame. The spectacle is the flip; spring entrances and a spec-table transition carry the beats around it.

### 2.1 The stadium mask flip — one dark pill, scaled from center to swallow the frame

A single rounded-999 rectangle in the dark bg color, `scale(0.1 → 3.4)` from center on `inOut(cubic)`, with a coral glow ring during the sweep. When it fills, the underlying theme has already crossfaded to dark, so the mask fades out and reveals the dark hero.

```tsx
const SWITCH_START = f(9.8), SWITCH_MID = f(10.7), SWITCH_END = f(11.4);
// the theme phase the whole scene reads: 0 = light, 1 = dark
const darkAt = (frame:number) => interpolate(frame, [SWITCH_START+6, SWITCH_MID], [0,1], clampOpts);

const CapsuleWipe:React.FC<{frame:number}> = ({frame}) => {
  if (frame < SWITCH_START || frame > SWITCH_END + 4) return null;
  const scale  = interpolate(frame,[SWITCH_START,SWITCH_MID],[0.1,3.4],{...clampOpts,easing:Easing.inOut(Easing.cubic)});
  const fillOp = interpolate(frame,[SWITCH_MID,SWITCH_END],[1,0],clampOpts);
  const ringOp = interpolate(frame,[SWITCH_START,SWITCH_START+8,SWITCH_MID-4,SWITCH_MID],[0,1,1,0],clampOpts);
  return (
    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:80}}>
      <div style={{ width:760, height:340, borderRadius:999, background:"#141414",
        transform:`scale(${scale})`, opacity:fillOp,
        border:`${interpolate(ringOp,[0,1],[0,6])}px solid #e85d4e`,
        boxShadow:`0 0 ${ringOp*60}px #e85d4e` }} />
    </div>
  );
};
```

Every themed element then reads `dark = darkAt(frame)` and interpolates its own color / glow off it — ink text `dark>0.5 ? cream : ink`, candy chips gain `boxShadow: 0 0 ${dark*12}px ${c}`. **One phase value drives the whole flip**, so it's coherent.

### 2.2 Spring entrances — the candy-pop grammar

Every chip, pill, and badge enters on a shared `spring`, mapped into scale + a settle-in float. Keep `stiffness`/`damping` consistent so the whole set feels like one bounce.

```tsx
const useEnter = (frame:number, delay:number, cfg?:Partial<{stiffness:number;damping:number;mass:number}>) => {
  const {fps} = useVideoConfig();
  return spring({ frame: frame-delay, fps, config:{ stiffness:180, damping:13, mass:0.9, ...cfg }});
};
// in a chip: s = useEnter(frame, f(1.35));
const scale  = interpolate(s,[0,1],[0.4,1]);          // pop from 40%
const appear = interpolate(s,[0,1],[0,1]);            // opacity
const t = Math.max(0, frame-delay-20)/FPS;            // idle float AFTER it lands
const floatY = Math.sin(t*1.6 + phase)*7*appear;
// transform: translateY(floatY) rotate(rot+floatR) scale(scale)
```

### 2.3 Spec-table / card transition — the mid-beats

Between hero-out and hero-return, cards fly in on spring (with a `-7°/+7° → -2.5°/+2.5°` de-rotate), hold, then exit up-scaling out; a spec table slides up with per-row staggered `translateX` reveals. Mount-gate each so it isn't rendered outside its window:

```tsx
if (frame < CARD_IN - f(0.2) || frame > CARD_OUT + f(0.6)) return null;      // don't render off-beat
const s = spring({frame:frame-inDelay,fps,config:{stiffness:170,damping:15,mass:1}});
const enter = interpolate(s,[0,1],[0,1]);
const ty    = interpolate(s,[0,1],[220,0]);
const exit  = interpolate(frame,[CARD_OUT,CARD_OUT+f(0.45)],[0,1],clampOpts);
const op    = enter * (1 - exit);                                            // enter × (1−exit) = clean in/out
// spec rows: rEnter = interpolate(frame,[d, d+f(0.4)],[0,1],{easing:Easing.out(Easing.cubic)}); translateX(-34 → 0)
```

**何时用**: brand systems, product launches, design-token / style-guide reveals, anything with a satisfying light→dark (or before→after) moment to spend the flip on, playful/editorial tone. **何时不用**: no reveal beat to justify the flip (then it's a gimmick), serious/technical subject matter, or monochrome brands where the candy palette fights the identity.

---

## 3. Architecture data-pulse

A 7-beat, 18s data broadcast over a blueprint grid: dashboard → network map → big numbers → photo gallery → recap → outro. Each beat crossfades via a **trapezoid envelope**; the credibility comes from numbers that count up and then keep *ticking live*.

### 3.1 Trapezoid beat envelopes — how beats hand off

Each beat is a full-frame layer whose opacity is a `trapezoid` (fade-in / hold / fade-out) with a ~12-frame crossfade at every cut. Adjacent envelopes overlap so there's never a black gap.

```tsx
const trapezoid = (frame:number, inA:number, inB:number, outA:number, outB:number) =>
  interpolate(frame, [inA,inB,outA,outB], [0,1,1,0], clampOpts);

const networkOpacity  = trapezoid(frame, 138, 150, 258, 270);   // beat 2
const bigStatsOpacity = trapezoid(frame, 258, 270, 324, 336);   // beat 3 — its inA = beat 2's outB
const galleryOpacity  = trapezoid(frame, 324, 336, 450, 462);   // beat 4
// each layer: <div style={{position:"absolute",inset:0,opacity:beatOpacity}}>…</div>
```

### 3.2 Big-number counters — interpolate the value, `Math.round` for the display, then jitter live

The signature "data feels alive" move: a figure grows to target on `power3Out`, then a **mean-zero sine jitter** rides on top so it never freezes — the underlying number holds while a ▲▼ delta ticks around it.

```tsx
const liveJitter = (frame:number, seed:number, amp=1) => {   // mean-zero, two octaves
  const t = frame/FPS;
  return amp * (Math.sin(t*1.7+seed)*0.62 + Math.sin(t*3.13+seed*2.3)*0.38);
};
const countStart = 270, countEnd = countStart + f(0.9);
const grown   = interpolate(frame,[countStart,countEnd],[0,TARGET],{...clampOpts,easing:Easing.out(Easing.cubic)});
const jitterOn= interpolate(frame,[countEnd,countEnd+f(0.4)],[0,1],clampOpts); // jitter only AFTER it lands
const delta   = jitterOn * liveJitter(frame, seed, Math.max(1, TARGET*0.012));
const display = Math.round(grown + delta);
const scale   = spring({frame:frame-countStart,fps:FPS,from:1.3,to:1,config:{stiffness:260,damping:16}}); // land big→settle
// render {display}{suffix} + a <DeltaTag delta={delta}/> that is green ▲ when ≥0, red ▼ when <0
```

Same jitter drives bar widths, the progress ring number, and gallery metrics — one live-feed idiom everywhere.

### 3.3 Network lines & progress rings — SVG stroke-draw

Lines and rings *draw on* via `strokeDasharray = length` + `strokeDashoffset: length → 0`. For a curved edge, precompute its length with `Math.hypot`; for a ring, `2πr`.

```tsx
// self-drawing polyline / edge
<path d={edge.d} strokeDasharray={edge.len} strokeDashoffset={interpolate(frame,[start,start+f(0.4)],[edge.len,0],{...clampOpts,easing:Easing.inOut(Easing.sin)})} />
// progress ring
const RING_CIRC = 2*Math.PI*54;
const prog = interpolate(frame,[f(1.7),f(2.9)],[0,68],{...clampOpts,easing:Easing.out(Easing.circle)});
<circle r={54} transform="rotate(-90 64 64)" strokeDasharray={RING_CIRC} strokeDashoffset={RING_CIRC*(1-prog/100)} strokeLinecap="round" />
// travelling data pulse on a hero edge: quadPoint(a,ctrl,b, ((frame-start)%period)/period) → a dot that loops the curve
```

### 3.4 Gallery clipPath wipe — the photo-carousel transition

Slides cut with a `clipPath: inset(...)` wipe + slow Ken-Burns zoom; captions ride a trapezoid so they arrive after the wipe and clear before the next.

```tsx
const reveal   = i===0 ? 100 : interpolate(frame,[start,start+11],[0,100],{...clampOpts,easing:Easing.out(Easing.exp)});
const kenBurns = interpolate(frame,[start,H5],[1,1.06],{...clampOpts,easing:Easing.inOut(Easing.sin)});
// frame: clipPath:`inset(0 0 0 ${100-reveal}%)`; inner img: transform:`scale(${kenBurns})`
const capOpacity = trapezoid(frame, capStart, capStart+f(0.3), capFadeOut, capFadeOut+f(0.25));
```

**何时用**: reports, indexes, rankings, "state of X 2026", credibility pieces — anything with real numbers, maps, or a dashboard to broadcast. **何时不用**: nothing to count or rank (empty chrome), or a warm/emotional brief — the blueprint-grid clinical tone will fight it.

---

## 4. Particle-burst album

Handwritten SVG title that writes itself and bursts into particles, then a 3D photo engine that flies cards onto a spinning ring, gathers them into a deck, spring-explodes them into a floating matrix, and collapses to a film strip. The spectacle is **volume in real 3D space** with depth-of-field and a swinging camera.

### 4.1 SVG stroke-writing — the title draws itself

A handwriting font as SVG `<text>` with `stroke`, animated by growing the **dash length** with an over-long gap so the stroke appears to be written; then flip `fill` on. Snap the dash huge at the end so no seam shows.

```tsx
const drawLen = frame < f(1.2)
  ? interp(frame, 0, 1.2, 0, 1150, {easing: Easing.inOut(Easing.quad)})   // pen writes
  : interp(frame, 1.2, 1.32, 1150, 5000);                                 // snap gap open, seamless
const fillOpacity = interp(frame, 1.25, 1.5, 0, 1, {easing: Easing.out(Easing.quad)}); // ink floods in
<text fontFamily="'Caveat',cursive" fontSize={340} stroke={ACCENT} strokeWidth={3}
  fill="#fff" fillOpacity={fillOpacity} strokeDasharray={`${drawLen} 6000`}>Memories</text>
```

### 4.2 Particle burst — deterministic golden-angle scatter, no RNG

30 particles fired radially on the golden angle (137.508°) so they spread evenly without random overlap; a single `raw` progress drives position (eased) and alpha (linear fade). Deterministic = identical every render.

```tsx
const raw = (frame - f(1.25)) / f(0.7);          // 0→1 over the burst window
if (raw >= 0 && raw <= 1) {
  const eased = 1 - Math.pow(1 - raw, 3);
  for (let k = 0; k < 30; k++) {
    const angle = (k * 137.508 * DEG) % (2*Math.PI);
    const speed = 150 + ((k*13 + 7) % 110);
    const x = 960 + Math.cos(angle)*speed*eased;
    const y = 500 + Math.sin(angle)*speed*eased*0.62;  // squashed vertically
    // <circle cx={x} cy={y} r={2 + ((k*7+3)%5)*0.6} fill={`rgba(255,138,107,${1-raw})`}/>
  }
}
```

### 4.3 3D ring carousel — sin/cos placement + camera swing + depth-of-field

Cards live on a `preserve-3d` stage. Each card's ring position is `sin/cos(angle)` for x/z; the card's own `rotateY = angDeg` faces it outward. A slow camera swing (`rotateX/rotateY` from `Math.sin(t)`) plus **z-based blur & darken** gives real depth-of-field.

```tsx
const ang = (i*(360/N) + spinAngle(t)) * DEG;
const x = Math.sin(ang)*RING_R, z = Math.cos(ang)*RING_R, ry = i*(360/N)+spin; // face outward
// camera on the stage wrapper:
const camRX = camIn*(7 + Math.sin(t*0.52)*2.4);
const camRY = camIn* Math.sin(t*0.38+0.6)*8;
// stage: transform:`scale(${camZoom}) translateZ(${SCENE_Z}px) rotateX(${camRX}deg) rotateY(${camRY}deg)`
// each card: depth cues from z —
const blur = clamp01(-z/1000)*5;         // far cards soften
const dark = clamp01(-z/1100)*0.6;       // far cards dim (an INK overlay at this opacity)
// transform: translate3d(x,y,z) rotateY(ry) rotateZ(rz) scale(s)
```

### 4.4 Morph the ring — gather (velocity blur) → spring-burst matrix → strip

The whole show is **one `cardState(frame,t,i)` that lerps between forms** by phase, so transitions are continuous. Gather adds motion blur; the burst uses a raw (overshooting) spring so cards fly out and snap back; strip collapses the survivors and disperses the rest.

```tsx
const gP = ips(t, T_GATHER_A, T_GATHER_B, 0, 1, easeInOutCubic);   // ring → deck
x = lerp(x, stackX, gP); blur += Math.sin(Math.PI*gP)*8;           // velocity blur peaks mid-move
const bRaw = spring({frame:frame-f(T_BURST),fps:FPS,config:{stiffness:95,damping:11,mass:1.1}}); // overshoots >1
x = lerp(x, rowX, bRaw);                                            // lerp with bRaw = fly out & settle back
ry = lerp(ry, rowAngDeg + (1-bP)*210*(i%2?1:-1), bP);              // flip face mid-flight
const sP = ips(t, T_STRIP_A, T_STRIP_B, 0, 1, easeInOutCubic);     // survivors → film strip, rest disperse+fade
```

**何时用**: personal photo stories, travel, year-in-review, wedding/family recaps, anything warm and memory-shaped with a real pile of photos. **何时不用**: <8 photos (ring/matrix look sparse), or a precise corporate brand — the handwriting + coral + overshoot reads as too casual.

---

## 5. Overlay kit — the editorial garnish (the poster-cube archetype's layer)

Reusable sub-effects. They **decorate** any engine; they are never the engine. Lifted from the poster-cube archetype's Swiss-editorial layer. All obey transform/opacity-only.

### 5.1 Ruler grid — the technical-drawing overlay
Tick marks along the top and left edges with major ticks every 96px and numeric labels, fading in early. Signals "measured / designed", not decorative.
```tsx
for (let x = 0; x <= 1920; x += 16) {
  const major = x % 96 === 0;
  ticks.push(<line x1={x} y1={0} x2={x} y2={major?14:7} stroke="rgba(255,255,255,0.16)" strokeWidth={1}/>);
}
// wrap in a pointerEvents:none, zIndex:90 layer; opacity = interpolate(frame,[f(0.1),f(0.8)],[0,1],clampOpts)
```

### 5.2 Corner labels + staggered char/line reveal
Editorial metadata clusters (studio, issue №, ref code) that rise into a `overflow:hidden` clip — each line delayed a step so they cascade. This is the **reveal-from-mask** primitive; reuse it for any text line.
```tsx
const RevealLine:React.FC<{frame:number;delay:number;children:React.ReactNode}> = ({frame,delay,children}) => {
  const local = frame - delay;
  const ty = interpolate(local,[0,16],[110,0],{...clampOpts,easing:Easing.out(Easing.cubic)}); // % of own height
  const op = interpolate(local,[0,8],[0,1],clampOpts);
  return <div style={{overflow:"hidden"}}><div style={{transform:`translateY(${ty}%)`,opacity:op}}>{children}</div></div>;
};
// cluster: base=f(0.3), step=f(0.18); delay each line base + step*i
```

### 5.3 Staggered char reveal — the wordmark payoff
Split the wordmark to chars, delay each `~1.5f`, rise each on `back(1.5)` for a spring-ish overshoot. This is the cinematic **payoff** grammar (motion-floor §7).
```tsx
WORD.split("").map((ch,i) => {
  const local = frame - (startDelay + i*f(0.05));
  const ty = interpolate(local,[0,18],[70,0],{...clampOpts,easing:Easing.out(Easing.back(1.5))});
  const op = interpolate(local,[0,10],[0,1],clampOpts);
  return <span style={{transform:`translateY(${ty}px)`,opacity:op}}>{ch}</span>;
});
```

### 5.4 Crosshair cursor — the drifting registration mark
A tiny `+` that drifts on lissajous sines, low opacity, appearing only for one beat. Adds "live interface" texture. `left/top` here are % of stage and it's cosmetic, but prefer transform for anything moving fast.
```tsx
const op = interpolate(frame,[f(10.2),f(10.8),f(12.6),f(12.9)],[0,0.5,0.5,0],clampOpts); // trapezoid appear
const t = (frame - f(10.2))/FPS;
const x = 50 + Math.sin(t*0.7)*16, y = 44 + Math.cos(t*0.5)*11;  // two-frequency drift
```

### 5.5 Accent-line outro — the closing flash + dim
A thin ACCENT line flashes across near the base, then a black dim settles — the "cut to black / hold the poster" close. Pairs with the terminal-frame discipline.
```tsx
const lineOp = interpolate(frame,[f(12.6),f(12.9),f(13.5)],[0,1,0],clampOpts); // flash in-out
const dim    = interpolate(frame,[f(13.8),f(15.0)],[0,0.35],clampOpts);         // settle a dim
// <div accent line, opacity:lineOp/> + <div inset:0 background:#000 opacity:dim pointerEvents:none/>
```

---

## 6. Engine discipline — the non-negotiables

1. **One engine per clip, at 100%.** Route by the §0 table. Never blend two load-bearing engines — a cube that also data-pulses reads as neither. If two ideas both feel essential, the brief is two clips.
2. **The cube is not the default.** It's the portfolio-wall pick. Products → capsule, reports → data-pulse, memories → particle album.
3. **`transform` and `opacity` only.** All four engines animate `translate3d/scale/rotate` + `opacity` (+ SVG `strokeDashoffset`/`clipPath`). Never animate `top/left/width/height` — layout thrash janks the render.
4. **60fps-clean or simplify.** These engines are heavy (54 cube tiles, 18 3D cards, particle fields). If Studio preview drops frames, cut count/resolution *before* shipping — a janky preview is a janky render.
5. **The terminal frame is designed.** Every engine resolves to a clean, composed last frame that `XCover` can freeze (cube settled + wordmark landed; dark hero glowing; dashboard breathing; film strip + title). A clip that stops on a mid-tumble smear has no payoff and no usable poster. Author the last ~0.5–1s as its own arriving beat.
6. **Garnish stays garnish.** Ruler grids, counters, crosshairs, wipes decorate the one engine — the moment a sub-effect is doing the heavy lifting, you picked the wrong engine.
