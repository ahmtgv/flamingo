#!/bin/bash
# 🔴 ОДНА КОМАНДА ДЛЯ ВЛАДЕЛЬЦА (OWNER_SCOPE §53.2 п.1).
#
#   bash desktop/release.sh
#
# Собирает обе половины, подписывает, нотаризует, крепит талон и ставит свежую версию.
# До этого команд было три, и каждая со своими условиями: собрать, подписать, поставить.
# Забыть среднюю значит раздать сборку, которую у постороннего система не откроет, —
# а узнаётся это на чужом Маке, где чинить уже поздно.
#
# Ключи:
#   --no-install   не ставить в /Applications (только собрать и нотаризовать)
#   --skip-build   уже собрано, нужно только подписать и поставить
#
# 🔒 Секретов здесь нет: сертификат берётся из связки ключей, профиль нотаризации — тоже.

set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL=1
BUILD=1
for arg in "$@"; do
  case "$arg" in
    --no-install) INSTALL=0 ;;
    --skip-build) BUILD=0 ;;
    *) echo "Не знаю ключа «$arg». Есть: --no-install, --skip-build"; exit 2 ;;
  esac
done

# 🔴 Каждый шаг проверяется ОТДЕЛЬНО и по своему коду возврата. `a | tail` возвращает код
# `tail`, то есть ноль почти всегда: так уже прятался провал сборки, который выглядел
# успехом в отчёте.
step() {
  local title="$1"; shift
  echo
  echo "══ $title ══════════════════════════════════════"
  if ! "$@"; then
    echo
    echo "✗ Остановились на шаге «$title». Дальше идти нельзя: следующее звено взяло бы"
    echo "  несвежий или неподписанный образ, и это выяснилось бы на чужой машине."
    exit 1
  fi
}

if [ "$BUILD" = "1" ]; then
  step "Сборка" bash -c "cd '$REPO/desktop/src-tauri' && cargo tauri build"
else
  echo "── сборка пропущена (--skip-build) ──"
fi

step "Подпись и нотаризация" bash "$REPO/desktop/sign-and-notarize.sh"

if [ "$INSTALL" = "1" ]; then
  step "Установка" bash "$REPO/desktop/install.sh"
else
  echo
  echo "── установка пропущена (--no-install) ──"
  echo "   Образ: $REPO/desktop/src-tauri/target/release/bundle/dmg/Flamingo_0.1.0_aarch64.dmg"
fi

echo
echo "✓ Готово. Образ можно отдавать постороннему: подпись Developer ID и талон Apple на месте."
