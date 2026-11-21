#!/bin/zsh
# usage: scripts/codex/review.sh <worktree> <base> <brief-file> <name> [out-dir]
W=$1; BASE=$2; BRIEF=$3; NAME=$4; OUT=${5:-${TMPDIR:-/tmp}}
codex exec -C "$W" -s workspace-write -o "$OUT/review-$NAME.md" < /dev/null \
  "Eres el revisor independiente de Nodomics. Sigue al pie de la letra .claude/agents/reviewer.md (lee CLAUDE.md y docs/engineering/*.md). NO edites ningún archivo; solo lee y ejecuta verificaciones (pnpm check; uv run pytest/ruff/pyright si hay Python). Revisa los cambios de la rama actual contra la base $BASE (git diff $BASE, incluye cambios sin commitear; git log $BASE..HEAD). Encargo:
$(cat "$BRIEF")
Entrega el informe en el formato de reviewer.md, en español, conciso." > "$OUT/review-$NAME.log" 2>&1
echo "exit $?"; cat "$OUT/review-$NAME.md"; grep -A1 "tokens used" "$OUT/review-$NAME.log" | tail -1
