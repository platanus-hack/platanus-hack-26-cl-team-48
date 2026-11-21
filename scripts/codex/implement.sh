#!/bin/zsh
# usage: scripts/codex/implement.sh <worktree> <brief-file> <name> [out-dir]
W=$1; BRIEF=$2; NAME=$3; OUT=${4:-${TMPDIR:-/tmp}}
HERE=${0:A:h}
codex exec -C "$W" -s workspace-write -o "$OUT/impl-$NAME.md" < /dev/null \
  "$(cat "$HERE/preamble.md")

---

$(cat "$BRIEF")" > "$OUT/impl-$NAME.log" 2>&1
echo "exit $?"; cat "$OUT/impl-$NAME.md"; grep -A1 "tokens used" "$OUT/impl-$NAME.log" | tail -1
