#!/bin/bash
# Поставить свежесобранное приложение преподавателя — и убедиться, что ставится именно оно.
#
# 🔴 Заведено 15.08 после потерянного дня. Владелец установил .dmg от прогона ДО починки
# и час ловил уже исправленный дефект. Отчёт исполнителя был правдивым — он описывал файл,
# которого у владельца не было. Поэтому здесь не «поставить», а «сверить и поставить».
#
# Сверяется ОТПЕЧАТОК АССЕТА: Vite считает имя вида index-XXXXXXXX.js из содержимого, значит
# имя и есть отпечаток сборки. Искать в двоичном файле сам адрес API бесполезно — Tauri хранит
# ассеты сжатыми, и grep не найдёт ни абсолютного адреса, ни относительного (проверено).
#
# Запуск:  bash ~/Downloads/flamingo/desktop/install.sh

set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_BUILT="$REPO/desktop/src-tauri/target/release/bundle/macos/Flamingo.app"
DMG="$REPO/desktop/src-tauri/target/release/bundle/dmg/Flamingo_0.1.0_aarch64.dmg"
DIST="$REPO/frontend/dist/assets"
INSTALLED="/Applications/Flamingo.app"
BIN="Contents/MacOS/flamingo-desktop"

fingerprint() { grep -ao "index-[A-Za-z0-9_-]\{8\}\.js" "$1" 2>/dev/null | sort -u | head -1; }

echo "── Что собрано ──────────────────────────────"
[ -d "$APP_BUILT" ] || { echo "✗ Сборки нет: $APP_BUILT"; echo "  Сначала пересборка — это задача исполнителя."; exit 1; }

BUILT_FP="$(fingerprint "$APP_BUILT/$BIN")"
DIST_FP="$(ls "$DIST" 2>/dev/null | grep -o 'index-[A-Za-z0-9_-]\{8\}\.js' | head -1)"

echo "  собрано:    $(date -r "$APP_BUILT" '+%d.%m %H:%M')"
echo "  отпечаток:  ${BUILT_FP:-НЕ НАЙДЕН}"
echo "  в dist:     ${DIST_FP:-нет}"

if [ -n "$BUILT_FP" ] && [ -n "$DIST_FP" ] && [ "$BUILT_FP" != "$DIST_FP" ]; then
  echo
  echo "⚠️  ОТПЕЧАТКИ НЕ СОВПАДАЮТ."
  echo "   В приложение упакована не та сборка фронта, что лежит в dist."
  echo "   Ставить не стоит: это ровно тот случай, ради которого написан этот скрипт."
  echo "   Отдай исполнителю: PROMPT_18 §Б3-бис."
  exit 1
fi
echo "  ✓ совпадает"

echo
echo "── Установка ────────────────────────────────"
osascript -e 'quit app "Flamingo"' 2>/dev/null && echo "  приложение закрыто"
sleep 1

for v in /Volumes/dmg.*; do
  [ -d "$v/Flamingo.app" ] && hdiutil detach "$v" -quiet 2>/dev/null && echo "  отмонтирован старый образ: $v"
done

if [ -d "$INSTALLED" ]; then
  rm -rf "$INSTALLED" && echo "  старая копия удалена"
fi

cp -R "$APP_BUILT" "$INSTALLED" || { echo "✗ Не удалось скопировать в /Applications"; exit 1; }
# Снять карантин: установщик не подписан (§19.2), иначе система спросит про «неизвестного разработчика».
xattr -dr com.apple.quarantine "$INSTALLED" 2>/dev/null

# 🔴 Иконка — ресурс, а не код: пересборка ради неё не нужна, но и не происходит сама.
# 15.08 владелец получил приложение со старым знаком, потому что иконку перерисовали
# в репозитории уже ПОСЛЕ сборки. Синхронизируем принудительно и сверяем.
ICNS_SRC="$REPO/desktop/src-tauri/icons/icon.icns"
ICNS_DST="$INSTALLED/Contents/Resources/icon.icns"
if [ -f "$ICNS_SRC" ]; then
  cp "$ICNS_SRC" "$ICNS_DST"
  cmp -s "$ICNS_SRC" "$ICNS_DST" && echo "  иконка синхронизирована с репозиторием"
fi

# macOS держит иконки в кэше и показывает старую, пока его не тронуть.
touch "$INSTALLED"
killall Dock 2>/dev/null && echo "  Dock перезапущен — кэш иконок сброшен"

echo
echo "── Что установлено ──────────────────────────"
echo "  отпечаток:  $(fingerprint "$INSTALLED/$BIN")"
echo "  ожидался:   $BUILT_FP"
echo "  иконка:     $(cmp -s "$ICNS_SRC" "$ICNS_DST" && echo "актуальная" || echo "⚠️ РАСХОДИТСЯ")"
echo
echo "Готово. Запускай: open -a Flamingo"
