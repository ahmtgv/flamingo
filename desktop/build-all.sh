#!/bin/bash
# Одна команда собирает ОБЕ половины приложения (промпт 30 §1.2).
#
# 🔴 Вызывается из `beforeBuildCommand` в `tauri.conf.json` — то есть забыть её нельзя, она
# часть сборки. До этой правки там стояла только сборка фронта, и серверная половина
# оставалась той, что лежала в папке: три ночи подряд трёхдневной давности.
#
# Сервер пересобирается ТОЛЬКО когда `backend/` изменился с прошлой сборки — PyInstaller
# небыстрый, и платить им за каждую правку кнопки незачем. Но если он устарел, сборка либо
# пересоберёт его, либо (при `--check-only`) громко откажется. Молча отдать несвежее —
# ровно то, что уже случилось трижды.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$REPO/desktop/src-tauri/sidecar/BUILD_STAMP.json"
CHECK_ONLY="${1:-}"

backend_commit() { git -C "$REPO" log -1 --format=%H -- backend/; }

stamped_commit() {
  [ -f "$STAMP" ] || return 1
  python3 -c "import json,sys; print(json.load(open('$STAMP'))['backendCommit'])" 2>/dev/null
}

WANT="$(backend_commit)"
HAVE="$(stamped_commit || echo '')"

if [ "$WANT" = "$HAVE" ]; then
  echo "✓ сервер внутри приложения свежий ($(echo "$WANT" | cut -c1-7))"
else
  if [ -z "$HAVE" ]; then
    echo "✗ у серверной половины нет отпечатка — она собрана до того, как появилась эта проверка"
  else
    echo "✗ сервер собран из $(echo "$HAVE" | cut -c1-7), а backend/ ушёл вперёд до $(echo "$WANT" | cut -c1-7)"
  fi
  if [ "$CHECK_ONLY" = "--check-only" ]; then
    echo
    echo "  Пересобрать:  bash desktop/build-sidecar.sh"
    exit 1
  fi
  bash "$REPO/desktop/build-sidecar.sh"
fi

if [ "$CHECK_ONLY" = "--check-only" ]; then
  exit 0
fi

echo "── Фронт ────────────────────────────────────────"
npm --prefix "$REPO/frontend" run build:desktop
