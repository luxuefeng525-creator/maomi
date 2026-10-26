# reveals.md — Text & Element Entrance / Exit Choreography

> How text and elements **enter and leave** is the readable surface of motion craft — the part a viewer actually watches beat to beat. The engine (`effect-catalog.md`) is the spectacle; **reveals are the choreography**. The #1 slop is everything entering the same way (fade + `translateY`, all at once). This file is the positive catalog: vary the vector, stagger the timing, mask the edge, and give the hero its own move.
>
> All reveals obey the craft floor (`motion-floor.md`): `f(sec)` timing, `clampOpts`, `transform`/`opacity` only, easing over `linear`.

---

## 1. The choreography principles (before any specific reveal)

1. **One hero move, many supporting moves.** The title/wordmark gets a distinct, richer reveal; the grid/list behind it gets a quieter, staggered one. Never give the hero the same entrance as its background.
2. **Stagger siblings.** Items in a set enter with a per-item delay of ~`f(0.04)–f(0.08)`, not all on one frame. `delay = base + i * step`.
3. **Vary the vector across a beat.** If three things enter at once, don't have all three rise — one rises, one wipes, one scales. Uniformity is the tell.
4. **Reveal in, resolve out.** Elements should *leave* with intent too (§6), not just vanish on a cut.
5. **Match attack to ENERGY.** High ENERGY → `backOut`/`expoOut`/`spring` (snappy, overshoot). Low ENERGY → `power3Out` (soft settle). Lock the vocabulary per clip.

---

## 2. Masked line rise — the editorial reveal (the workhorse)

Wrap the line in an `overflow: hidden` clip and slide it up from below its own baseline — the text appears to rise *out of nothing*. This is the single most useful text reveal.

```tsx
const RevealLine: React.FC<{ frame: number; delay: number; children: React.ReactNode }> = ({ frame, delay, children }) => {
  const local = frame - delay;
  const ty = interpolate(local, [0, f(0.53)], [110, 0], { ...clampOpts, easing: Easing.out(Easing.cubic) }); // % of own height
  const op = interpolate(local, [0, f(0.27)], [0, 1], clampOpts);
  return (
    <div style={{ overflow: "hidden" }}>
      <div style={{ transform: `translateY(${ty}%)`, opacity: op }}>{children}</div>
    </div>
  );
};
// stack lines with staggered delays: base, base + f(0.18), base + f(0.36) …
```

Use for: corner labels, headings, one-line statements, subtitle lines. The `overflow:hidden` mask is what makes it read as craft, not a plain fade.

---

## 3. Per-character / per-word / per-line — pick the granularity

**Granularity must match the text length** — this is a rule, not a taste call:

| Granularity | Use for | Never for |
|---|---|---|
| **per-character** | a short wordmark / title (≤ ~12 chars) | a sentence — it turns into a typewriter crawl |
| **per-word** | a short phrase / tagline | a paragraph |
| **per-line** | body copy, multi-line statements (use §2 masked rise) | a single word |

Per-character wordmark, with overshoot (lifted from the poster-cube overlay kit):

```tsx
{WORD.split("").map((ch, i) => {
  const delay = startDelay + i * f(0.05);
  const local = frame - delay;
  const ty = interpolate(local, [0, f(0.6)], [70, 0], { ...clampOpts, easing: Easing.out(Easing.back(1.5)) });
  const op = interpolate(local, [0, f(0.33)], [0, 1], clampOpts);
  return <span key={i} style={{ display: "inline-block", transform: `translateY(${ty}px)`, opacity: op }}>{ch}</span>;
})}
```
`Easing.out(Easing.back(1.5))` gives the letters a small overshoot as they land — alive, not sliding to a dead stop.

---

## 4. The reveal vocabulary — beyond the rise

Reach for a *different* one when everything is already rising:

- **Clip-path wipe** — reveal an image/card by uncovering it, not fading it:
  ```tsx
  const p = interpolate(frame, [H2, H2 + f(0.5)], [100, 0], { ...clampOpts, easing: Easing.out(Easing.cubic) });
  style={{ clipPath: `inset(0 ${p}% 0 0)` }}   // wipe left→right; center-out: inset(0 p% 0 p%)
  ```
- **Blur / focus-pull in** — a hero "coming into focus":
  ```tsx
  const b = interpolate(frame, [H1, H1 + f(0.5)], [12, 0], clampOpts);
  style={{ filter: `blur(${b}px)`, opacity: interpolate(frame,[H1,H1+f(0.3)],[0,1],clampOpts) }}
  ```
- **Scale-pop with overshoot** — for stamps, numbers, badges, logos:
  ```tsx
  const s = spring({ frame: frame - H3, fps: FPS, config: { damping: 11, stiffness: 170 } });
  style={{ transform: `scale(${0.8 + s * 0.2})`, opacity: Math.min(1, s * 2) }}   // pops from 0.8, settles at 1
  ```
- **Number roll** — counters interpolate the value, `Math.round` the display (full recipe in `effect-catalog.md` §3.2).
- **SVG stroke-writing** — a title that draws itself via `strokeDashoffset` (recipe in `effect-catalog.md` §4.1) — the most premium title reveal; reserve for the hero.
- **Directional slide + fade** — the plain one. Allowed as a *supporting* move, never as the *only* move on screen.

---

## 5. Stagger recipes for a set

```tsx
// a grid/list of cards, each entering on its own delay with a masked rise:
items.map((item, i) => {
  const delay = base + i * f(0.06);           // step: 0.04–0.08s
  const local = frame - delay;
  const ty = interpolate(local, [0, f(0.5)], [40, 0], { ...clampOpts, easing: Easing.out(Easing.cubic) });
  const op = interpolate(local, [0, f(0.3)], [0, 1], clampOpts);
  return <Card style={{ transform: `translateY(${ty}px)`, opacity: op }} />;
});
```
- Order the stagger to lead the eye (top→bottom, or outward from the hero) — not random.
- For a large set, cap the total stagger (~`f(0.6)` end-to-end) so the last item isn't left waiting; overlap delays instead of extending them.

---

## 6. Exit choreography — leave with intent

Between beats, elements that have done their job **resolve out** — they don't just disappear on a hard cut (unless a hard cut *is* the beat). The clean pattern is an enter/exit envelope so a reveal both arrives and departs:

```tsx
const enter = interpolate(frame, [H1, H1 + f(0.4)], [0, 1], clampOpts);
const exit  = interpolate(frame, [H2, H2 + f(0.4)], [0, 1], clampOpts);
const shown = enter * (1 - exit);            // 0 → 1 → 0
const ty    = (1 - enter) * 30 + exit * -30; // rise in from +30, lift out to −30
style={{ opacity: shown, transform: `translateY(${ty}px)` }}
```
- Exit vector usually **continues** the motion (rose in from below → lifts out the top), or a **clip-path wipe-out** for cards/images.
- Give the payoff element **no exit** — it's the terminal frame (`motion-floor.md` §7), it stays.

---

## 7. Timing & sync

- **Entrance duration:** 0.3–0.6s typical. Snappier (0.25–0.4s, `backOut`/`expoOut`) for high ENERGY; softer (0.5–0.7s, `power3Out`) for low.
- **Anchor reveals to beats.** A reveal's `delay`/`start` is a beat constant `Hn` plus its stagger offset — never a hand-typed frame (`motion-floor.md` §1).
- **Sound follows the reveal.** A stamp-pop gets a `click`, a hero title gets a soft `thud`/`shimmer` on its settle frame — same frame constant (`sound-design.md` §3/§5).

---

## 8. Reveal anti-slop (cross-ref `anti-cheap-motion.md`)

- Everything enters with the same fade + `translateY`, on the same frame. **The** tell.
- Per-character reveal on a whole sentence (typewriter crawl).
- Uniform 0.5s on every element, `linear` or one soft ease everywhere — no dynamics.
- Nothing overshoots; every element glides to a dead stop.
- Elements pop out of existence on cuts with no exit choreography.
- The hero title entering exactly like the background grid — no hierarchy.
