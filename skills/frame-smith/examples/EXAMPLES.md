# EXAMPLES — the engine-archetype reference

> Four engine archetypes stand behind `effect-catalog.md` — each a *validated combination* of techniques, not a single file to copy. This page describes what to study in each so you can build a clip of that archetype from scratch. **If the detected runtime ships its own reference frames** (`environment.md`), open the one closest to the archetype you're building and **lift patterns, not whole files** (they run long) — but drive them with *your* subject, palette, and beats.

All four archetypes are `cinematic` register: `1920×1080 · 30fps`, pure visual, no voiceover, ending on a designed payoff.

---

| Archetype | Duration feel | What to study |
|-----------|---------------|---------------|
| **Poster-cube tumble** | ~15s | CSS-3D solid done right: `perspective` + `transformStyle: preserve-3d` + per-face `FACE_TRANSFORM`; the **piecewise-pose timeline** (`poseT` shared ascending array, repeated values = holds); the post-settle **drift phase** (`Math.sin` gated by a ramp); the **editorial overlay kit** — ruler grid, corner labels, crosshair cursor, accent-line outro; `staggered char reveal` on the wordmark |
| **Capsule theme-flip** | ~18s | The **stadium/pill mask** expanding from center to sweep the whole frame and flip **light→dark theme**; `spring` entrances with consistent config; spec-table transitions; a candy-palette locked across the clip; a light hero → transform → dark hero reflow arc |
| **Architecture data-pulse** | ~18s | The cleanest **beat architecture** — explicit `H0…H6` (7 beats) in the header; the **`trapezoid` in/out envelope** helper; **big-number counters** (`interpolate` + rounding); **network lines** building; **gallery wipe** transitions; multiple named easings locked as a vocabulary; real photography with `objectFit` discipline |
| **Particle-burst album** | ~22.5s | The richest engine stack: **SVG stroke-writing** title (`strokeDasharray`/`strokeDashoffset`) + particle burst; **3D ring carousel** with depth-of-field + camera sway; card-stack **suck-in with motion blur**; `spring` **overshoot explode** into a floating matrix with card-flip + shockwave; collapse-to-film-strip payoff; `injectFontFaces` for a handwritten font |

---

## How to use them

- **Match the archetype first.** Design brand with many small visuals → poster-cube tumble. Light↔dark reveal / playful transform → capsule theme-flip. Metrics + real photos → architecture data-pulse. Photos / memories / emotional → particle-burst album.
- **Lift the technique, not the content.** Reuse the pose-timeline shape, the mask math, the trapezoid helper, the SVG-writing recipe — then drive it with *your* subject, palette, and beats. Copying a whole frame verbatim is the slop `anti-cheap-motion.md` bans.
- **One engine per clip.** Each archetype commits to one load-bearing engine. Don't splice the cube into the album.
- **If the runtime ships reference frames, read the header comment first.** A shipped frame's top block usually documents its beats and intent — the fastest way to understand its arc before reading render code. Open the one closest to your archetype; there's no fixed filename to look for — take whatever the runtime exposes.
