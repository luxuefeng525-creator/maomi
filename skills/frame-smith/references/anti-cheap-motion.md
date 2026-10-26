# anti-cheap-motion.md — The Motion Cheapness Blacklist

Merged from the motion tells that make an AI-generated clip instantly readable as a template export. Static pages have their own slop list; **this one is about the extra dimension — time.** A page can only look cheap; a video can look cheap *and* move cheap, and moving cheap is louder. Scan against this before you register the composition. Each entry: **the symptom → why it reads cheap → the fix.**

> Philosophy: most of these are *the default the model reaches for when it stops directing and starts filling frames*. The fix is almost never "add more motion" — it's "name the reflex, reject it, author one intentional move." A clip with three deliberate beats beats a clip with fifteen fade-ups. Motion is expensive to *earn*, cheap to *sprinkle*.

---

## 0. The One-Look Tell (run before everything)

Freeze the clip on any single frame mid-motion. Then ask: **could someone guess the whole animation from that one frame?** If the frame shows three cards stacked with slightly different opacities all drifting up, the answer is yes — it's the fade-up-stagger every template gallery ships, and the viewer has seen it ten thousand times. Rework until the *motion itself* is non-obvious, not just the layout.

Second-order trap: once you dodge fade-up, the next reflex is waiting — *everything springs in with the same bouncy `back` ease*. You rejected the flat default and landed on the bouncy default. Both are reflexes. The direction is: **each element's entrance answers "why does it move like that"** in one sentence (it's the hero, so it leads; it's supporting, so it follows late and small; it's data, so it counts up). No sentence → cut the move.

---

## 1. Everyone-enters-the-same-way — the #1 motion tell

**Symptom:** every element — headline, subhead, three cards, logo — does `opacity 0→1` + `translateY(20→0)`, all starting on the same frame, same duration, same ease. The whole frame blooms up at once like a slide builder's "Fade In (All)".

**Why cheap:** it's the single most-trained entrance in existence. It says nobody decided anything — the model applied one transition to a `.map()`. There's no hierarchy, no lead, no story; the eye has nowhere to land because everything arrives together.

**Fix — three moves:**
- **Stagger, don't bloom.** Offset each element's start by `f(0.08…0.15)`. The hero leads; support follows on a delay.
- **Vary the entrance vector.** Not everything rises. Hero scales from `0.92` with a `backOut` pop; labels wipe in from the side; a rule draws left-to-right; the data panel fades with no translate at all.
- **Give the hero its own move.** The load-bearing element gets a distinct gesture (a `spring` overshoot, a mask reveal, a stroke-write) that nothing else in the frame shares. If the hero enters identically to a footnote, there is no hero.

```
坏: cards.map(c => <div style={{opacity: fade, transform: `translateY(${20*(1-fade)}px)`}}/>)  // 全体同款
好: hero → spring(damping:11) scale-pop @ f(0);  cards → power3Out rise, start f(0.4)+i*f(0.12)  // 错峰+分向量
```

---

## 2. `linear` easing + a uniform 0.5s everywhere = a slideshow

**Symptom:** every move is `linear` (or one soft ease), and every transition is `0.5s`. Nothing accelerates, nothing decelerates, nothing holds. The clip ticks between poses like a PowerPoint auto-advance.

**Why cheap:** motion with no dynamics has no weight. Real objects attack fast and settle slow; `linear` gives them the physics of a cursor being dragged. Uniform duration means nothing is more important than anything else — the eye reads it as a machine, not a hand.

**Fix — a locked tempo vocabulary (see `motion-floor.md` §3):**
- **Entrances** → `power3Out` (cubic) or `expoOut`: fast attack, long decel into place.
- **Pops / reveals** → `backOut` or `spring`: overshoot then settle.
- **Holds** → a *real* flat segment in a piecewise `interpolate` (`[…, 1, 1, …]`), not a slow `linear` crawl faking a pause.
- **Vary duration by role:** a hero reveal can take `1.2s`; a supporting label `0.4s`; a counter `2s`. Same duration on everything is the tell.

```
坏: interpolate(frame, [f(1), f(1.5)], [0,1])               // linear, 0.5s, 到处都是
好: interpolate(frame, [f(1), f(2.2)], [0,1], clampOpts), Easing.out(Easing.cubic))  // 有 attack/settle
```

---

## 3. No overshoot, no anticipation — everything glides to a dead stop

**Symptom:** elements slide to their mark and stop. Exactly. No pass-past-and-settle, no tiny wind-up before the move. Every arrival is a hard halt at the target coordinate.

**Why cheap:** a dead stop is what an `interpolate` does when nobody added physics. Anything with mass overshoots slightly and recoils, or coils back a hair before it leaps. Without it, motion feels like values being assigned, not objects moving.

**Fix:** `spring` past the target and converge — lower `damping` = more overshoot. For a punchy reveal, `backOut(1.5…2)` carries the pose ~5–10% past its mark and settles. Reserve real overshoot for the beats that *should* feel alive (a pop, a card explode, a capsule burst); don't bounce the whole frame or you're back at the §0 second-order trap. One or two elements overshoot; the rest settle clean.

```
好: spring({ frame: frame-f(3), fps: FPS, config: { damping: 11, stiffness: 130, mass: 0.9 } })  // 过冲后收敛
```

---

## 4. An engine that janks or cuts off mid-motion — worse than not attempting it

**Symptom:** the 3D tumble stutters below 60fps; the particle burst pops out of existence in one frame instead of decaying; the mask sweep tears at the seam; the counter drops frames mid-count. The ambition is visible; the execution isn't.

**Why cheap:** an interrupted spectacle reads *cheaper than no spectacle*. A janky 3D cube tells the viewer "someone tried something hard and couldn't land it." A clean 2D clip that never overreached looks intentional. Broken ambition is the worst trade in motion.

**Fix:**
- **`transform`/`opacity` only** (see §6). This is the single biggest jank fix.
- **Cut count/resolution until it's smooth.** Too many faces, too high an FBO/particle count, too big a blur — halve them. Studio preview drops frames → the render will too. Profile, don't hope.
- **Never leave a move interrupted.** Every burst *decays* (ramp particles to 0 over `f(0.4)`, don't clip them); every sweep *completes*; every tumble *lands* a clean pose. If you can't finish the engine in scope, drop `SPECTACLE` to 4–5 and ship an impeccably-timed simpler clip (SKILL §1.A).

---

## 5. Dead-air beats & a terminal frame that just freezes with no payoff

**Symptom (dead air):** a stretch where nothing moves and nothing is deliberately held — the engine finished its move at `f(6)` and the next beat doesn't start until `f(9)`, so three seconds of stasis sit there. **Symptom (no payoff):** the clip stops on whatever frame the engine happened to be on — a mid-drift cube, a half-lit panel — instead of arriving somewhere.

**Why cheap:** dead air is a cut you owe the viewer that you didn't make. A frozen non-ending says the clip ran out of tape, not that it concluded. And that terminal frame is what `XCover` freezes and what a reduced-motion / thumbnail viewer sees — a mid-transition smear is a broken poster.

**Fix:**
- **Every beat moves or holds-with-intent.** If a beat isn't doing a job (`beat-structure.md`), delete it and pull the payoff earlier. No stasis by accident.
- **Design the payoff beat.** The last ~0.5–1s *arrives*: the wordmark settles, the logo resolves, the matrix collapses to a title, an accent line flashes. It's its own authored beat, not the tail of the previous one.
- **The terminal frame is composed on purpose** — it's your `XCover` still. Freeze the clip at the end: if that frame wouldn't work as a poster, the ending isn't done (`motion-floor.md` §7).

---

## 6. Animating `top/left/width/height` instead of `transform/opacity`

**Symptom:** movement authored via `left`, `top`, `width`, `height`, or `margin` in the interpolated style.

**Why cheap:** those properties trigger layout/paint every frame — the direct mechanical cause of the jank in §4. It's the difference between compositor-thread motion and main-thread stutter. Even when Remotion renders offline, Studio preview thrashes and *you* can't judge the timing through the stutter.

**Fix:** move with `translate`/`scale`/`rotate`, fade with `opacity`. Never size or position via layout properties in an animated value. This is not a preference — it's the floor (`motion-floor.md` §8).

```
坏: style={{ left: interpolate(frame, […], [0, 200]) }}          // layout thrash
好: style={{ transform: `translateX(${interpolate(frame, […], [0,200], clampOpts)}px)` }}
```

---

## 7. Short-register copy sins — safe zones & subtitle dumping

**Symptom (safe zone):** subtitles, CTA, or a caption sit at the true bottom edge or hard against the right rail — and the platform's own UI (progress bar, like/comment/share column, username) covers them. **Symptom (dumping):** the entire narration script appears as one paragraph block that just sits there, instead of one clause switching in on its beat.

**Why cheap:** clipped copy is the mark of someone who authored on a bare `1080×1920` canvas and never checked it against 抖音/小红书 chrome. A wall-of-text subtitle is the mark of someone who pasted the script into a `<div>` — it doesn't track the voice, so it isn't subtitling, it's a caption someone forgot to time.

**Fix (see `motion-floor.md` §5):**
- **Respect the safe zones** — content inside top ≥160 / bottom ≥220 / left ≥44 / **right ≥120** (1080p). The right column is the trap; every caption clears it.
- **Split by punctuation, switch on the beat.** `text.split(/[，。！？、；]/)` → one clause visible at a time, entering with a small `power2Out` rise, timed to its narration `[start, end]`. Never dump the paragraph.

---

## 8. Template-gallery motion — the ScrollReveal export & the junk transition

**Symptom:** the exact fade-up-on-scroll-with-stagger every free template ships (AOS/ScrollReveal's default). Or the transition kit reflexes: a starburst/sparkle wipe, a lens-flare sweep, a cheesy light-streak, or a **default crossfade used as the universal transition** between every beat.

**Why cheap:** these are *recognized presets*. The crossfade-everything habit is the motion equivalent of `border-left: 3px` — it's what you reach for when you haven't decided how two beats should actually connect. Starbursts and lens flares are the "WordArt" of motion: they signal decoration bought off a shelf, not authored.

**Fix:**
- **No preset fade-up-stagger.** If you stagger, author the offsets and vary the vectors (§1) so it doesn't read as the library default.
- **Every transition is motivated.** A beat connects to the next by a *reason* — a mask sweep carries a theme flip, a card sucks into the stack to bring the next photo, a wordmark wipes to reveal the payoff. A crossfade is allowed only when a soft dissolve is genuinely the right cut, not as the default glue.
- **Ban the junk kit outright:** starburst/sparkle wipes, lens-flare sweeps, generic light-streaks. → a clean mask, a `spring` hand-off, or a hard cut on the beat.

---

## 9. Audio-visual desync (short with narration)

**Symptom:** the clip carries a voiceover, but the subtitle clause, the cut, and the on-screen emphasis don't land on the words. The narrator says "three times faster" while the counter is still mid-count, or the beat cut falls between phrases.

**Why cheap:** the whole point of a口播 short is that picture *serves* voice. When they drift, the viewer feels the seam — it reads as two files stapled together, which is exactly what it is. Sync is what makes it feel produced.

**Fix:** cut and switch to the narration, not to a fixed grid. Pull each subtitle clause's `[startSec, endSec]` from the audio and switch on it; land beat boundaries and number-reveals on the stressed word. If you don't have per-clause timing, get it before finishing — a short cut to guessed timing is unfinished (`beat-structure.md`, short skeleton).

---

## 10. Counters that jump & loops that don't close

**Symptom (counter):** a big number reveals by snapping through random values, or ticks in ugly non-round jumps, or overshoots past the target and settles back to it visibly. **Symptom (loop):** a clip meant to loop has a last frame that doesn't match its first — a visible pop at the wrap.

**Why cheap:** a number that jitters looks like a slot machine, not a metric. A loop seam is the clearest possible "this was not authored to loop" — the eye catches the discontinuity every cycle.

**Fix:**
- **Counters ramp smoothly to the target and stop clean** — `interpolate` the value with a decelerating ease over ~`f(1.5…2)`, `Math.round` the display, and land exactly on the real number (no overshoot on *numbers* — overshoot is for objects, §3). Format thousands so the width doesn't jitter.
- **Loops close.** If it loops, the terminal frame's pose = the opening frame's pose. Author the last beat to return home, or don't claim it loops.

---

## 11. Reflex-reject list (name it, then reject it)

The motion clichés the model reaches for without deciding. Using one is fine *if the brief genuinely calls for it and you can say why* — reaching for it because it's the default is slop.

- **Purple/blue "tech" glow that pulses** — the mesh-gradient background breathing behind everything. → a real engine, or a still, deliberate ground.
- **Cheap particle snow / floating dust / bokeh** sprinkled as ambient "premium." → particles that *do* something (burst on a beat, form a shape, carry a transition) or none.
- **Lens flare / light-streak overuse** — the anamorphic streak sweeping every reveal. → at most once, motivated; usually never.
- **Default `easeInOut` on everything** — the "safe" ease that makes every move feel identical and soft. → the role-matched vocabulary (§2).
- **Every element `pulse`/`breathe`ing** — a global `Math.sin` scale on all the things so the frame "feels alive." → one deliberate drift on one element (`motion-floor.md` §4), the rest hold still. A frame where everything pulses feels nervous, not alive.
- **Auto-rotating 3D for no reason** — the object spinning forever because 3D is on. → a pose timeline that arrives and holds (`effect-catalog.md`).
- **Neon glow / drop-shadow bloom** as the "spectacle." → real depth (transform, parallax, DOF), not a CSS glow.

---

## The 30-Second Pre-Delivery Scan

Freeze-frame the clip at a few points, then run it once at speed. Answer honestly — any "no" is unshipped work.

- [ ] **Not everyone enters the same way?** Staggered starts, varied vectors, hero has its own move (§1)?
- [ ] **Easing vocabulary locked, no bare `linear`?** Durations vary by role, holds are real flat segments (§2)?
- [ ] **Something overshoots or anticipates?** At least the hero settles with physics, not a dead stop (§3)?
- [ ] **Engine holds 60fps and finishes every move?** No jank, no popped particles, no torn sweep — or `SPECTACLE` dropped honestly (§4)?
- [ ] **No dead-air beat?** Every beat moves or holds-with-intent (§5)?
- [ ] **Terminal frame is a designed payoff?** Works as the `XCover` poster and the reduced-motion still (§5)?
- [ ] **`transform`/`opacity` only?** No `top/left/width/height` in any animated value (§6)?
- [ ] **(short) Copy inside safe zones?** Right rail cleared; subtitles split by clause, switched on beat (§7)?
- [ ] **No preset fade-up-stagger, no junk transition?** Every transition motivated (§8)?
- [ ] **(short + VO) Picture cut to the voice?** Clauses and beats land on the words (§9)?
- [ ] **Counters land clean, loop seam closed** (§10)?
- [ ] **Reflex list swept** — no unmotivated purple pulse, particle snow, flare, global breathe (§11)?

If the frozen last frame wouldn't ship as a poster, the clip isn't done.
