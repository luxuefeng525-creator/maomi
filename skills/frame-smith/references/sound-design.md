# sound-design.md — Music, SFX & Audio-Visual Sync

> **Sound is half the craft.** A motion clip with no audio reads as a *mockup*, not a finished video. The four reference engine archetypes are silent by design — that is a gap to fill, not a template to copy. Even a **cinematic** clip that carries *no voiceover* should still carry **background music + transition SFX**: "no voiceover" ≠ "no sound".
>
> The single biggest "feels professional" lever in this whole skill is **音画同步** — a sound event landing on the exact frame its visual event fires. Get that and a modest clip feels directed; miss it and a spectacular clip feels like a slideshow with a song stapled on.

---

## 0. The one rule: sound enhances, never load-bearing

Most feeds **autoplay muted**. The clip must read completely with the audio off — the engine and reveals carry the meaning; sound is the layer that makes it *feel* expensive. This mirrors the engine's progressive-enhancement rule (`effect-catalog.md`): design silent-complete first, then score it.

---

## 1. Remotion audio API — the mechanics

```tsx
import { Audio, Sequence, staticFile, interpolate, useCurrentFrame } from "remotion";

// Background music bed — whole clip, with head/tail fades:
const frame = useCurrentFrame();
const bgmVol = interpolate(
  frame,
  [0, f(0.6), X_FRAMES - f(1.0), X_FRAMES],
  [0, 0.7, 0.7, 0],            // fade in 0.6s → bed at 0.7 → fade out last 1.0s
  clampOpts
);
<Audio src={staticFile("audio/bgm.mp3")} volume={bgmVol} />

// A one-shot SFX placed EXACTLY on a beat — wrap in a Sequence starting at the beat frame:
<Sequence from={H4} durationInFrames={f(1.2)}>
  <Audio src={staticFile("audio/impact.mp3")} volume={0.9} />
</Sequence>
```

- `volume` accepts a **number or a function of frame** — use the function form for fades/ducking.
- Place each SFX with `<Sequence from={Hn}>` so it fires on the same beat constant its visual uses. **The SFX and the visual share the frame constant** — that is sync, done structurally.
- `startFrom` / `endAt` trim a source clip; `playbackRate` re-times it (use sparingly — pitch shifts).
- Trim BGM to the clip length or fade it; never let a track hard-cut at `X_FRAMES`.

---

## 2. 背景音乐 (BGM) — the bed

- **One track, matched to ENERGY + register.** High ENERGY → driving percussion / kinetic electronic; low ENERGY → ambient pad / minimal piano. Match the *genre* to the subject (a fintech data-pulse ≠ a warm particle album). Mismatched genre is the #1 audio tell.
- **Align the drop to the peak.** Pick a track whose musical downbeat / drop can sit on the **peak beat** (the engine's main move, the theme-flip, the matrix burst). Re-time the clip's beats to the music, or trim the music to the beats — either way they meet at the peak.
- **Head/tail fades are mandatory.** Fade in over ~0.4–0.6s, fade out over ~0.8–1.2s (see §1). An abrupt start or a hard stop at the last frame is amateur.
- **Loopable clips need a seamless BGM loop** — pick a track that returns to its start cleanly, or crossfade the seam (mirror the visual loop rule in `beat-structure.md`).
- **Bed level.** BGM sits *under* everything — roughly `volume ≈ 0.5–0.7` when there's no VO, ducked lower when there is (§4). It should never fight the SFX accents or the voice.

---

## 3. 转场音效 (transition SFX) — accent the beats, don't carpet them

Map SFX to the *kind* of visual event. Fire them on beats, not on every element.

| Visual event | SFX family | Fires on |
|---|---|---|
| Wipe / gallery cut / clip-path reveal | **whoosh / swish** | the frame the wipe starts |
| Mask theme-flip, matrix burst, big impact | **boom / impact / sub-hit** | the burst frame (peak) |
| Counter tick, UI stamp, badge pop | **click / tick / blip** | each stamp frame (can stagger) |
| Camera push / 3D tumble | **airy whoosh / riser** | the move's start |
| Approach to the payoff | **riser / build** | ~0.5–1s *before* the payoff beat, resolving on it |
| Wordmark / logo lands | **soft thud / shimmer** | the settle frame |

Rules:
- **Sync to the frame, not "around" it.** A whoosh 3 frames late reads as broken. Use the beat constant.
- **Accent, don't carpet.** SFX on *every* element entrance turns into noise. Pick the 3–6 events that matter (the engine's big moves + the payoff) and score those.
- **Layer for weight:** a peak impact can be `sub-hit + a short reverse-riser tail` — but keep it one perceived event.
- **The riser is the secret.** A 0.5–1s build resolving exactly on the payoff is what makes an ending feel *earned*.

---

## 4. 混音 (mix) — the levels hierarchy

When voiceover exists (short register), the stack top→bottom is: **VO → SFX accents → BGM bed.**

- **Duck the BGM under VO.** Drop BGM ~6–10 dB (e.g. `0.6 → 0.25`) whenever the voice is speaking; restore it in the gaps. Do it with a frame-driven `volume` function keyed to the VO's active ranges.
- **SFX sit above BGM, below VO** — audible as accents but never masking a word.
- **Leave headroom / no clipping.** Don't stack three loud sources at full; the peak impact is loud *because* everything else ducked for it.
- **Master tail fade** on the whole mix at the end so nothing clips off.

---

## 5. Audio ↔ beat sync — the discipline that sells it

The beat map (`beat-structure.md`) is the shared clock for *both* picture and sound:

```ts
const H0 = f(0);     // cold open        → BGM fade-in starts
const H2 = f(5);     // engine main move → whoosh
const H3 = f(9);     // peak / burst     → BGM drop + impact  (picture & sound meet here)
const HEND = f(15);  // payoff lands     → riser resolves + soft thud, BGM tail-fade
```

- **Every SFX `<Sequence from>` is a beat constant `Hn`** — never a hand-typed frame.
- **The BGM drop = the peak beat.** If they don't line up, move the beat or trim the track until they do.
- **Subtitles/cuts also hang on this clock** (`motion-floor.md` §5.C) — so voice, subtitle, cut, and SFX all land together.

---

## 6. Assets, licensing & authorization

- Audio lives under the runtime's **`public/audio/`**, loaded via `staticFile("audio/…")` (same discipline as images — `assets.md`). No bare paths.
- **Never embed copyrighted music without rights.** Default to royalty-free / licensed libraries, or a placeholder track clearly marked. Downloading or generating audio needs the **user's explicit go-ahead first** (mirror `assets.md` §7). When unsure, ship silent-complete and ask which track.

---

## 7. Audio anti-slop

- **Generic corporate ukulele / stock "uplifting" bed** with no relation to the subject.
- **Genre mismatch** — calm piano under a frantic kinetic cut, or vice versa.
- **SFX on every element** → a clicky mess. Accent the beats only.
- **BGM louder than the voice**, or no ducking under VO.
- **Hard start / hard stop** — no fades; the track pops in at frame 0 and guillotines at the end.
- **SFX out of sync** — whooshes landing near, not on, the cut.
- **A single sound doing all the work** (one whoosh, looped) — sound design is a *set* keyed to events, not a garnish.
- **Load-bearing audio** — a clip that only makes sense with sound on. It'll play muted; the picture must carry it.
