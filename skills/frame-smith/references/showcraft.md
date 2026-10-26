# showcraft.md — What Counts as Good Video (怎样才算好的视频表现效果)

> The question this skill exists to answer. A clip is not "good" because it has an impressive engine, or because it has music. It is good when **four layers work as one** — none optional, and the connective tissue between them (sync) present. This file is the rubric; it routes to the layer files for the how.

---

## The four layers of a good video

A high-craft clip is the product of these, in balance. Miss one and it reads amateur no matter how strong the others are.

| # | Layer | The good version | The cheap version | Detail file |
|---|-------|------------------|-------------------|-------------|
| 1 | **Engine** — one spectacle, committed | a single load-bearing effect, executed 100%, that would still read if frozen | a gradient that pulses; three half-built effects competing | `effect-catalog.md` |
| 2 | **Rhythm** — beats, not sections | hook fast, one job per beat, no dead air, the last beat *lands* | even pacing, a 3s empty runway, an ending that just stops | `beat-structure.md` |
| 3 | **Reveals** — entrance/exit choreography | varied vectors, staggered, masked, the hero has its own move | everything fades + slides up together, uniform 0.5s | `reveals.md` |
| 4 | **Sound** — music + SFX, matched | BGM matched to energy with head/tail fades; SFX accenting the key beats | silent, or a generic bed stapled on, SFX carpeting everything | `sound-design.md` |
| ✚ | **Sync** — the connective tissue | every SFX + BGM drop + cut lands on the same beat frame as its picture | sound "around" the visual, off by frames — the slideshow feel | `sound-design.md` §5 |

**The single highest-leverage move is layer ✚ (sync).** A modest engine with tight sync reads directed; a spectacular engine with loose sync reads like a mockup with a song.

---

## The craft floor is assumed, not counted

Below the four layers sits the non-negotiable floor (`motion-floor.md`): 30fps, `f(sec)` timing, clamped interpolates, `transform`/`opacity` only, easing over `linear`, a clean terminal frame. That's the price of entry, not a distinction. A clip that violates the floor isn't "less good" — it's broken (janks, drifts, smears). Fix the floor first; *then* the four layers decide whether it's good.

---

## The good-video rubric (score each 0–2)

Run this on any clip — during `audit`, before shipping, or when a clip "feels off" but you can't say why. `preflight.md` is the pass/fail gate; this is the *quality* read.

1. **One engine, shown.** Is there a single spectacular move, done fully, not a pulse standing in for it? (SPECTACLE claimed = SPECTACLE shown.)
2. **First beat earns the next.** Cinematic: engine/promise on screen fast. Short: hook lands by ~1.5s.
3. **Beat clarity.** One job per beat; no beat crushing three moves; no dead-air stretch.
4. **The ending lands.** A designed payoff (wordmark/logo/collapse-to-title), not a freeze on a random frame. It's also the `…Cover` still.
5. **Reveal variety.** Not everything enters the same way; siblings staggered; the hero has a distinct move; granularity matches text length.
6. **Motion dynamics.** Overshoot/anticipation where it should be; no `linear`, no uniform-0.5s slideshow.
7. **Sound present & matched.** BGM fits energy + genre, fades in/out; 3–6 SFX accent the key beats, not every element.
8. **Sync locked.** SFX `<Sequence from>` = beat constants; BGM drop = peak beat; cuts/subtitles on the same clock.
9. **Reads silent.** Muted autoplay still communicates — picture carries meaning, sound only elevates.
10. **Legible under safe zones** (short) / **clean framing** (cinematic).

**14–20 = ships as high-craft. 8–13 = competent but generic — find the 0-scores and fix those, don't rebuild. ≤7 = it's slop; re-read the Frame Read.** Fix by the *lowest-scoring layer*, not by piling on more of a layer that's already strong (more spectacle won't fix bad rhythm or absent sound).

---

## How the layers relate to the dials (`SKILL.md` §1)

- **SPECTACLE** governs layer 1 (engine ambition) and how rich the hero reveal is.
- **ENERGY** governs layer 2 tempo + layer 3 attack (snappy `back`/`spring` vs. soft `cubic`) + layer 4 music genre.
- **DENSITY** governs how many elements are on screen per beat — and therefore how much stagger discipline (layer 3) you need.

A good clip is *coherent across all three dials and all four layers* — the music's energy matches the reveal attack matches the beat tempo. Incoherence (frantic cuts under calm piano; a maximal engine with timid reveals) is the subtle tell that separates "fine" from "good."

---

## The one-line test

> **If you muted it, would it still read? If you closed your eyes, would the sound alone feel like *this* video? And do the two meet on the same frames?**

Yes to all three → it's good. That is the whole rubric compressed.
