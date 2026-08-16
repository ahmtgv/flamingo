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

# 🔴 §2.6. Владелец 16.08: «я могу открывать через раз проблемную сборку» — в Launchpad было
# ДВА Flamingo. `open -a Flamingo` выбирает копию по своему усмотрению, и человек не знает,
# какую запустил. Это отравляет любую проверку: половина наблюдений может относиться к старой
# сборке — именно так снимок 15.08 показал давно исправленный дефект.
#
# Ищем все копии, кроме той, что ставим, и убираем, называя пути вслух.
echo "  ищу другие копии на машине…"
STRAYS=0
while IFS= read -r stray; do
  [ -z "$stray" ] && continue
  case "$stray" in
    "$INSTALLED"|"$APP_BUILT") continue ;;
    /Volumes/*) continue ;;
  esac
  echo "    убираю: $stray"
  rm -rf "$stray" && STRAYS=$((STRAYS+1))
done <<< "$(mdfind "kMDItemFSName == 'Flamingo.app'" 2>/dev/null)"
[ "$STRAYS" -eq 0 ] && echo "    других копий не найдено"

cp -R "$APP_BUILT" "$INSTALLED" || { echo "✗ Не удалось скопировать в /Applications"; exit 1; }
# Снять карантин: установщик не подписан (§19.2), иначе система спросит про «неизвестного разработчика».
xattr -dr com.apple.quarantine "$INSTALLED" 2>/dev/null

# 🔴 УСТОЙЧИВАЯ ПОДПИСЬ — ИНАЧЕ СВЯЗКА КЛЮЧЕЙ СПРАШИВАЕТ ПАРОЛЬ ПОСЛЕ КАЖДОГО ОБНОВЛЕНИЯ.
#
# Найдено 16.08 живым проходом. Линкер подписывает бинарник ad-hoc и выводит идентификатор из
# его хеша: `flamingo_desktop-828418966991f38c`, а после пересборки — `...5d90bb4cb886e82b`.
# Для macOS это РАЗНЫЕ программы, и доступ к ключу, положенному прошлой, у новой не спрашивают
# — его требуют паролем от связки. Владелец видит окно «Flamingo хочет использовать
# конфиденциальную информацию» и приложение, стоящее на пустом экране, пока он не ответит.
#
# `-i plus.flamingo.desktop` закрепляет идентификатор: он перестаёт зависеть от содержимого.
# Настоящий сертификат это не заменяет (§19.2 всё ещё в силе), но убирает пароль на каждом
# обновлении — а это то, с чем владелец сталкивается каждый раз, а не один.
codesign -f -s - -i plus.flamingo.desktop --deep "$INSTALLED" 2>/dev/null \
  && echo "  подпись: устойчивый идентификатор plus.flamingo.desktop" \
  || echo "  ⚠️ подписать не удалось — связка будет спрашивать пароль после обновлений"

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
# Сколько копий осталось — числом, а не на веру. Кэш Spotlight отстаёт от `rm`, поэтому
# считаем только те пути, которые существуют прямо сейчас.
REMAIN=0
while IFS= read -r found; do
  [ -n "$found" ] && [ -d "$found" ] && case "$found" in /Volumes/*) ;; *) REMAIN=$((REMAIN+1));; esac
done <<< "$(mdfind "kMDItemFSName == 'Flamingo.app'" 2>/dev/null | grep -v "^$APP_BUILT$")"
if [ "$REMAIN" -le 1 ]; then
  echo "  копий на машине: 1 — /Applications/Flamingo.app"
else
  echo "  ⚠️ КОПИЙ НА МАШИНЕ: $REMAIN. Запуск через Launchpad неоднозначен."
  mdfind "kMDItemFSName == 'Flamingo.app'" 2>/dev/null | grep -v "^$APP_BUILT$" | sed 's/^/     /'
fi

echo
echo "Готово. Запускай через Launchpad или: open -a Flamingo"
echo "⚠️  .dmg из папки загрузок после установки убери — запуск из него даёт вторую копию."
