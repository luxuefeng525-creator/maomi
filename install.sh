#!/usr/bin/env bash
# ai-workflow 安装器（POSIX）。优先用 node install.mjs，否则回退到 cp。
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
GLOBAL=0; NODEPS=0; HOST=""; TARGET=""
for a in "$@"; do
  case "$a" in
    --global) GLOBAL=1;;
    --no-deps) NODEPS=1;;
    --host) ;; # 下一参数
    --target) ;;
    *) if [ "$prev" = "--host" ]; then HOST="$a"; fi
       if [ "$prev" = "--target" ]; then TARGET="$a"; fi;;
  esac
  prev="$a"
done

if command -v node >/dev/null 2>&1; then
  exec node "$DIR/install.mjs" "$@"
fi

# 回退：无 node
BASE="$DIR"
if [ -n "$TARGET" ]; then TARGETS="$TARGET";
elif [ "$GLOBAL" = "1" ]; then BASE="$HOME"; TARGETS=".agents/skills .claude/skills .trae/skills .trae-cn/skills .workbuddy/skills .cursor/skills .codex/skills .windsurf/skills .opencode/skills";
else TARGETS=".agents/skills .claude/skills .trae/skills .trae-cn/skills .workbuddy/skills .cursor/skills .codex/skills .windsurf/skills .opencode/skills"; fi

ITEMS="SKILL.md README.md MANUAL.md CHANGELOG.md references scripts evals examples"
[ "$NODEPS" = "0" ] && ITEMS="$ITEMS skills"
for t in $TARGETS; do
  case "$t" in /*) d="$t";; *) d="$BASE/$t";; esac
  [ -d "$d" ] || { echo "SKIP $d (不存在)"; continue; }
  mkdir -p "$d/ai-workflow"
  # 用 $DIR/ 绝对前缀：旧版 cp 相对路径依赖调用者 cwd，换目录即失效。
  for item in $ITEMS; do
    [ -e "$DIR/$item" ] || continue
    cp -r "$DIR/$item" "$d/ai-workflow/"
  done
  [ -f "$d/ai-workflow/SKILL.md" ] || { echo "FAIL $d/ai-workflow (缺少 SKILL.md)"; exit 1; }
  echo "OK   $d/ai-workflow"
done
echo "完成。重载 IDE / 开新会话后输入 ai-workflow 即可使用。"
