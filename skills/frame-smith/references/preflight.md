# preflight.md — Pre-Flight Check (Step 8)

> Run before saying "done." Merges the craft-floor check, the anti-slop scan, the safe-zone check (short), the registration check, the terminal-frame state, and the **prove-it-moves** step. Any hard-rule failure = shipping broken. `audit` runs this read-only and reports; `craft`/`restage` run it and fix.

---

## A. Environment (the gate held)
- [ ] A runtime was confirmed (`environment.md`) **before** the file was written — `hyperframe`, `remotion`, or an explicit on-disk fallback project. Not assumed.
- [ ] The composition landed in that runtime's correct dir, not a guessed path.

## B. Motion craft floor (`motion-floor.md`)
- [ ] `FPS = 30`. Time authored through `f(seconds)`, no hand-guessed raw frame numbers.
- [ ] **Every** `interpolate` over a time range has `clampOpts`. Piecewise pose input arrays are strictly ascending.
- [ ] No `linear` on a visible move. Entrances use `power3Out`/`expoOut`; pops use `back`/`spring`; holds are flat segments.
- [ ] Only `transform`/`opacity` animated. No `top/left/width/height`.
- [ ] **short only:** `S = width/720` multiplies **every** absolute pixel. Content inside the 抖音 safe zones (top 160 / bottom 220 / left 44 / right 120 @1080p) — check the right column especially. Subtitles split by punctuation, one clause per beat.

## C. Effect engine (`effect-catalog.md`)
- [ ] Exactly **one** load-bearing engine, executed fully. Sub-effects garnish, they don't compete.
- [ ] `SPECTACLE ≥ 7` claim is actually shown — a real 3D/particle/mask/counter engine that holds through its beat. No gradient-pulse standing in for spectacle.
- [ ] The engine does **not** jank or cut off mid-motion. If Studio preview drops frames, count/resolution was reduced.
- [ ] If frozen on any frame, the frame still reads (legibility doesn't depend on motion).

## D. Beat timeline (`beat-structure.md`)
- [ ] First beat earns the next second — cinematic engine/promise on screen fast; **short hook lands by ~1.5s**.
- [ ] One job per beat. No beat crushing three moves together.
- [ ] No dead air — every beat moves or holds-with-intent.
- [ ] **The last beat lands** a designed payoff (wordmark/logo/accent/collapse-to-title), not a random freeze.

## E. Anti-cheap-motion (`anti-cheap-motion.md`)
- [ ] Not everything enters the same way (fade+translateY, all at once). Staggered, varied vectors, hero has its own move.
- [ ] Overshoot/anticipation present where it should be — nothing only glides to a dead stop.
- [ ] No reused stock fade-up-stagger, no cheap default crossfade as universal transition, no purple-glow/lens-flare slop.
- [ ] **short:** subtitles/CTA inside safe zone; no whole-paragraph dump; motion synced to narration if there's audio.

## E2. Reveal choreography (`reveals.md`)
- [ ] The hero (title/wordmark) has a distinct, richer reveal than the background set.
- [ ] Sibling sets are staggered (~`f(0.04–0.08)` step), not all on one frame; stagger leads the eye.
- [ ] Reveal granularity matches text length — per-char only on short wordmarks, per-line for body.
- [ ] Elements that finished their beat **resolve out** with intent (enter × (1−exit)), not a hard pop — except the payoff, which stays.

## E3. Sound design (`sound-design.md`) — sound is half the craft
- [ ] BGM present, matched to ENERGY + genre, with head fade-in (~0.5s) and tail fade-out (~1s). Not silent, not a generic stapled-on bed.
- [ ] 3–6 SFX **accent the key beats** (engine moves, peak, payoff riser) — not carpeting every element.
- [ ] **Sync:** every SFX `<Sequence from>` is a beat constant `Hn`; the BGM drop sits on the peak beat; cuts/subtitles on the same clock.
- [ ] **short:** BGM ducks under voiceover; levels are VO > SFX > BGM; no clipping.
- [ ] **Reads silent** — muted autoplay still communicates; sound is enhancement, not load-bearing. Audio via `staticFile("audio/…")`, rights cleared.

## F. Registration & correctness (`registration.md`)
- [ ] Exports the三件套: `X`, `XCover`, `X_FRAMES`.
- [ ] `durationInFrames === X_FRAMES`. `fps={30}`. `width`/`height` match the register.
- [ ] Both `<Composition>` and `<Composition …Cover>` registered, in the right `<Folder>`, import added.
- [ ] `XCover` freezes the payoff/peak frame, not frame 0.
- [ ] Assets via `staticFile()` or a stable URL — no bare relative paths. Fonts ready before render.

## G. Terminal frame / reduced-motion
- [ ] The clip resolves to a clean, composed last frame — the payoff. A still viewer gets a finished poster, not a mid-transition smear. This is what `XCover` shows.

## H. Prove it moves (do not skip)
- [ ] Previewed in `remotion studio` **or** rendered a still at the peak frame **or** rendered a short range — and it looks like the Frame Read promised.
- [ ] Reported the composition `id` + how to preview, so the user can open it.

---

### 30-second final scan
Engine holds without jank · one job per beat · last frame lands · nothing enters all-the-same-way · hero reveal distinct · **BGM matched + SFX on beats + sync locked** · reads silent · clamped interpolates · registered pair · (short) inside safe zone · previewed. If all true → ship. If any false → it's the fix list, in that order.

> For the **quality** read (is it *good*, not just *not-broken*), score the 10-point rubric in `showcraft.md`. Pre-flight is pass/fail; the rubric tells you which of the four layers (engine · rhythm · reveals · sound) to lift.
