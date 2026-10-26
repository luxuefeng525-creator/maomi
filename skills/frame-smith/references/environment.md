# environment.md — The Runtime Gate (§0)

> **frame-smith writes Remotion compositions; it does not render them.** Rendering needs a video runtime. This file is the gate that runs **before any `.tsx` is written**. The rule is simple: **at least one of the `hyperframe` or `remotion` skills must be available.** One is enough. If neither is, STOP and guide install — do not write a composition into a project that can't run it.

---

## 1. What each runtime provides

| Runtime skill | Provides | frame-smith writes into | You lift patterns from |
|---|---|---|---|
| **`hyperframe`** (preferred) | The **effect-template library** — the shipped HyperFrames (poster-cube tumbles, capsule theme-flips, architecture data-pulses, particle-burst albums, …) — **plus** a working Remotion project (deps installed, `studio`/`render` wired, a Root registry). | its `src/compositions/HyperFrames/` | the source frames directly — `effect-catalog.md` is a map *of* them |
| **`remotion`** | The **bare runtime** — project scaffolding, `remotion studio`, `remotion render`, the `<Composition>` registry — **without** the effect library. | its `src/compositions/` | `effect-catalog.md`'s written recipes only (no source frames on disk) |

**Prefer `hyperframe` when both are present** — it carries the effects you'll lift from, so the build is faster and closer to the validated frames. Use `remotion` when it's the only one there; you'll implement the catalog recipes from the descriptions rather than by lifting.

---

## 2. The check — run this first, every `craft`/edit

Do these in order and stop as soon as one runtime is confirmed.

### 2.1 Is either skill available to this session?
Check the **available-skills listing** in the system context for a skill named `hyperframe` or `remotion` (or plugin-scoped `*:hyperframe` / `*:remotion`). If one is listed, it's available — record which and skip to §3.

### 2.2 Is either installed on disk?
Look in the standard skill locations:
```bash
# project-local and user-global skill dirs + installed plugins
for base in "$PWD/.claude/skills" "$HOME/.claude/skills" "$HOME/.claude/plugins"; do
  [ -d "$base" ] && find "$base" -maxdepth 3 -iname "SKILL.md" 2>/dev/null \
    | xargs -I{} sh -c 'grep -ilqE "^name: *(hyperframe|remotion)" "{}" && echo "FOUND: {}"'
done
```
Any hit → that runtime is present. Record its path and the Remotion project root under it.

### 2.3 Is there a Remotion project on disk even without a skill? (fallback)
A skill is the clean path, but a raw Remotion project is a valid runtime too. Search the current working tree (and any extra roots the user names — **ask, don't guess** their directory layout):
```bash
# a package.json that depends on remotion, with a Root registry — searched from where you are
grep -rl '"remotion"' --include=package.json . 2>/dev/null | head
# if the user points you elsewhere, add that path explicitly:
#   grep -rl '"remotion"' --include=package.json . /path/the/user/gave 2>/dev/null | head
```
A qualifying project has a `package.json` depending on `remotion` **and** a `src/Root.tsx` registry (bonus: reference frames under `src/compositions/HyperFrames/`). If no skill is installed but such a project is on disk, you may **point frame-smith at it directly as a fallback** — treat it exactly like the `hyperframe` runtime (§3), but tell the user you're using an on-disk project rather than an installed skill, and that installing the skill is the durable fix. **Never hardcode a user's absolute path** — resolve it fresh each run from `$PWD` or what the user tells you.

### 2.4 Neither skill nor project? → STOP.
Go to §4. Write nothing.

### 2.5 Shortcut — run the gate as a script
`scripts/check-runtime.sh` does §2.1–§2.4 in one shot (skills on disk → Remotion projects → verdict), printing what it found and exiting `0` if a runtime is usable, `1` if none is:
```bash
bash skills/frame-smith/scripts/check-runtime.sh   # add extra search roots as args
```
Exit `1` means **STOP → §4**. The script is a convenience; the checks above are the source of truth (it can't see the session's available-skills listing from §2.1).

---

## 3. When a runtime IS present

Record and carry these three facts forward — every later step depends on them:

1. **Runtime kind** — `hyperframe` (lift from source frames) vs. `remotion` (recipes only).
2. **Project root** — the dir with `package.json` + `src/Root.tsx`.
3. **Target dir + Root file** — where the composition file lands and where you register it:
   - `hyperframe` → `<root>/src/compositions/HyperFrames/<Name>.tsx`, register in `<root>/src/Root.tsx`.
   - `remotion` → `<root>/src/compositions/<Name>.tsx`, register in `<root>/src/Root.tsx` (or the file that calls `registerRoot`).

**Sanity-check the runtime can actually run** (don't render yet — just confirm the toolchain):
```bash
cd "<project-root>" && ls package.json src/Root.tsx 2>/dev/null && \
  grep -q '"remotion"' package.json && echo "runtime OK" || echo "runtime INCOMPLETE — deps may be missing"
```
If `node_modules` is missing, note it: the user will need `npm install` in the project root before `studio`/`render` works. That's a one-liner to surface, not a blocker to writing the composition.

Then continue to **SKILL.md §0.A** (register) and proceed with the build.

---

## 4. When NEITHER is present — STOP and guide install

**Do not write any `.tsx`.** A composition with no runtime is a file the user cannot run — worse than stopping. Report plainly and offer the path:

> 没有检测到可用的视频运行时。frame-smith 只负责"导演"（决定动效、节拍、写 Remotion 合成），渲染需要 `hyperframe` 或 `remotion` 其中**一个** Skill（装一个就够）。请选择：
>
> **A. 装 `hyperframe`（推荐）** — 自带效果模板库 + Remotion 工程，装完就能直接产出并预览 HyperFrame 片子。
> **B. 装 `remotion`（更轻）** — 只要运行时，效果按 frame-smith 的配方现写。
> **C. 我本地已有 Remotion 工程** — 告诉我它的路径，我直接指过去（临时方案，长期建议装 Skill）。

Install guidance to give (adapt to how the user installs skills — plugin marketplace, git clone into a skills dir, or a project `.claude/skills/` drop):

- **Plugin/marketplace path:** install the `hyperframe` (or `remotion`) plugin, then re-run frame-smith — the §2.1 listing check will pick it up.
- **Manual path:** clone the skill repo into `~/.claude/skills/<name>/` (so `~/.claude/skills/hyperframe/SKILL.md` exists), or drop it under the project's `.claude/skills/`. Re-run the §2.2 disk check to confirm.
- **Bare-project bootstrap (no skill, wants one now):** a minimal Remotion project is `npx create-video@latest --template blank` in a new dir; after `npm install`, `npx remotion studio` runs. frame-smith can then target it via the §2.3 fallback. (Full template menu: the runtime project's `TEMPLATES.md`.)

After the user installs or points at a project, **re-run the §2 check** and only then proceed. Never fake a render, never claim a file will "work once you set up Remotion" as a way to skip the gate.

---

## 5. Notes

- **This gate is the whole reason frame-smith is a separate skill from its runtime.** The director and the stage are decoupled on purpose: the same motion-craft brain can drive an installed `hyperframe`, a lean `remotion`, or a raw on-disk project. Keep them decoupled — don't hardcode a single project path into a composition; resolve it fresh through this check each run.
- **`env` command** runs *only* this file: report which runtime is present (or the install path), change nothing.
- If **both** skills are present, pick `hyperframe` and say so in one line ("both runtimes available; using hyperframe for its effect library").
