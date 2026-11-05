# Pre-Flight & Post-Delivery Iteration

> 摘自 SKILL.md，按需阅读（渐进披露）。

## 8. PRE-FLIGHT CHECK

Run the full checklist in `references/preflight.md` before saying "done." It merges the substrate check, the cheapness scan, the spectacle-claimed verification, the mobile floor, and the a11y gates. If any hard rule fails, it is shipping broken work — fix before delivery.

**Gate 1 runs first and takes ten seconds: does the page actually render?** Every local `href` / `src` / `url()` must resolve to a file that exists, and the detector must have been found and run. This is not pedantry — a `<link>` to a stylesheet that was never written renders as unstyled serif text, and *every other check in the file passes on it*, because there is no grain to be missing and no `#fff` to be banned in a file that doesn't exist. It is also how a truncated build ships: HTML written, run ended before the CSS, `.finesse/log.json` dutifully recording a page that isn't on screen. `preflight.md` Gate 1 has the detector-resolution snippet — **the detector lives with the skill, not in the user's project**, so a hard-coded `skills/finesse-ui/…` path silently fails everywhere except a vendored copy.

### 8.0 Record the build (after Pre-Flight passes, before you say "done")

Two writes. They cost about thirty seconds and they are the only reason the next run can rotate off this one.

1. **Stamp the CSS.** The first non-empty line of the page's stylesheet (or the top of the inline `<style>`) carries the five-axis coordinates:
   ```css
   /* finesse · register=brand · A=mono+acid-lime · B=900/300 · C=pinned-h-track
    * D=GSAP-scrub · E=machined-metal · SOUL=8 SPECTACLE=7 DENSITY=4 */
   ```
   **h5 builds add the morphology** — `register=h5 · morph=A-app-shell · …` (`h5-mobile.md` §11). Rotation applies to the soul axes and the morphology, **never to the furniture**: every app's TabBar should look like every other app's TabBar, the same carve-out `divergence.md` §0 makes for dashboard navigation.
2. **Append to `.finesse/log.json`** — prepend the entry to the array, trim to the last 20. Schema in `divergence.md` §4.1. Create the directory and file if they don't exist.

**Component-scope builds do neither of these** — they use the component stamp and are never logged (`component-scope.md` §5). Components don't rotate; a project's buttons should look like siblings.

---

## 8.A POST-DELIVERY ITERATION GUIDE

After the user receives the initial output, map their feedback to the correct targeted fix. **Never rebuild from scratch for a single complaint** — identify the dial or module responsible and adjust only that. The **Command** column is the verb to route through (see `## Commands`); if the user typed the command, you're already there.

| User says | Command | Action |
|-----------|---------|--------|
| "too plain / boring" | `bolder` | Raise SPECTACLE +2; consider upgrading the engine type (e.g. Canvas → Three.js) |
| "too flashy / overwhelming" | `quieter` | Lower SPECTACLE −2; simplify or swap to Engine D (GSAP) or E (CSS-only) |
| "wrong vibe / feels off" | `soul` | Re-run §2 with a different persona from `references/style-personas.md` |
| "too much whitespace" | `densify` | Raise DENSITY +2; add one content section |
| "too cluttered" | `densify` | Lower DENSITY −2; cut a section, increase section padding |
| "more personality / bolder" | `bolder` | Raise SOUL +2; push color commitment level up one step in `references/design-dna.md` |
| "feels generic / like every other AI site" | `diverge` | **Systemic, not per-page.** Recompose the soul from the five axes (`divergence.md` §3), run the two-altitude anti-default check (§2), roll against the argmax (§6), check the used-list (§4). Reaching for `soul` here just picks a *different* row from the same ten-row table — which is the problem, not the fix |
| "every page you make looks the same" | `diverge` | Same as above. Then **write the used-list** (`divergence.md` §4) — without it, "don't repeat" is a rule with no memory behind it and it will never fire |
| "change the colors" | `soul` | Re-run color strategy in `references/design-dna.md`; maintain the accent lock rule |
| "different animation" | `animate` | Swap engine type in §4; re-run `references/hero-engines.md` for that engine's skeleton |
| "add depth / make it 3D / tilt / parallax" | `depth` | Add **one** 3D moment from `references/3d-effects.md` — default to the CSS tier (tilt/flip/coverflow/depth-parallax); Three.js only for a real rendered object |
| "remove a section" | `redesign` | Remove it, then re-audit §5 layout families (ensure ≥4 families remain) |
| "feels slow / heavy" | `quieter` | Lower SPECTACLE; switch to Engine E (CSS-only) or reduce particle count/FBO resolution |
| "needs to work on mobile" | `redesign` | Declare mobile layout per multi-column section; `min-h-dvh`, touch targets ≥44px |
| "不知道它在干嘛 / 一直转圈 / 停不下来 / 花了多少钱看不到" *(AI 工作台)* | `redesign` | Not a styling complaint — the register's four questions are unanswered. `ai-console.md`: a run stream with per-step duration (§2) instead of one spinner, all nine run states (§3), a resident stop (§4), a receipt line and budget meter (§6) |
| "像个聊天窗口，不像工作台" *(AI 工作台)* | `redesign` | Bubbles-only is the failure. `ai-console.md` §1 — the queue and the history are missing, so only the present tense is on screen; add the rail (or the phone's pinned strip, §9) before touching anything visual |
| "刘海挡住了 / 底部栏遮住内容 / 按不动" *(h5)* | `redesign` | Not a layout opinion — a mechanical defect. Run `h5-mobile.md` §10's gates in order: missing `env()` (§2.A), missing `#app` bottom padding (§2.C), sub-44px hit areas or absent `:active` (§3) |
| "不像 app / 像个网页" *(h5)* | `redesign` | The furniture is missing or wrong, not the palette. `h5-mobile.md` §5 — status bar, TabBar active state, home indicator, sheet grab handle, push transition — plus §9's tell list |
| "is this any good? / review it" | `audit` | Read-only: run the blacklist + spectacle-shown + pre-flight, report findings |

---
