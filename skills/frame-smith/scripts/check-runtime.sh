#!/usr/bin/env bash
# check-runtime.sh — frame-smith §0 environment gate, as a script.
# Detects whether a video runtime is available: the `hyperframe` or `remotion`
# skill, or a raw Remotion project on disk (fallback). Prints what it found and
# exits 0 if a runtime is usable, 1 if none is (→ STOP, guide install).
#
# Usage:  bash check-runtime.sh [extra-search-root ...]
# See references/environment.md for the full gate.

set -u
found=0

say() { printf '%s\n' "$*"; }
hr()  { printf -- '----------------------------------------\n'; }

# ── 1. Skills on disk (project-local, user-global, plugins) ────────────────
say "▸ Looking for hyperframe / remotion skills…"
skill_hit=""
for base in "$PWD/.claude/skills" "$HOME/.claude/skills" "$HOME/.claude/plugins"; do
  [ -d "$base" ] || continue
  while IFS= read -r sk; do
    if grep -ilqE '^name: *(hyperframe|remotion)' "$sk" 2>/dev/null; then
      name=$(grep -iE '^name:' "$sk" | head -1 | sed 's/^[Nn]ame: *//')
      say "  ✔ skill '$name' → $sk"
      skill_hit="$sk"; found=1
    fi
  done < <(find "$base" -maxdepth 3 -iname 'SKILL.md' 2>/dev/null)
done
[ -n "$skill_hit" ] || say "  · no hyperframe/remotion skill found on disk"

# ── 2. Raw Remotion projects on disk (fallback runtime) ────────────────────
# Searches the current working tree by default. Pass extra roots as args if your
# project lives elsewhere — no personal paths are hardcoded here.
hr
say "▸ Looking for Remotion projects (package.json depends on remotion)…"
roots=("$PWD" "$@")
seen=""
for r in "${roots[@]}"; do
  [ -e "$r" ] || continue
  while IFS= read -r pj; do
    case "$seen" in *"|$pj|"*) continue;; esac
    seen="$seen|$pj|"
    proj=$(dirname "$pj")
    if [ -f "$proj/src/Root.tsx" ]; then
      hf=""; [ -d "$proj/src/compositions/HyperFrames" ] && hf=" (has HyperFrames)"
      nm=""; [ -d "$proj/node_modules" ] || nm=" [needs npm install]"
      say "  ✔ project → $proj$hf$nm"
      found=1
    fi
  done < <(grep -rl '"remotion"' --include=package.json "$r" 2>/dev/null | head -20)
done

# ── verdict ────────────────────────────────────────────────────────────────
hr
if [ "$found" -eq 1 ]; then
  say "RESULT: runtime available → proceed (prefer hyperframe skill; else a project)."
  exit 0
else
  say "RESULT: NO runtime found → STOP. Do not write a composition."
  say "        Guide install: hyperframe (recommended) or remotion. See environment.md §4."
  exit 1
fi
