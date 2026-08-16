#!/bin/bash
# Полный сброс приложения преподавателя: стереть всё и поставить заново, начисто.
#
# 🔴 Заведён 16.08 после дня, в котором владельца трижды просили «удалить ключ и перезапустить»
# отдельными командами. Состояний у приложения четыре, и они живут в РАЗНЫХ местах:
#
#   1. само приложение        /Applications/Flamingo.app (и случайные копии)
#   2. ключ машины            связка ключей, plus.flamingo.desktop / machine-key
#   3. кабинет и настройки    ~/Library/Application Support/plus.flamingo.desktop
#   4. запись машины          на сервере — её отзывает кабинет, отсюда не достать
#
# Стереть три из четырёх по одной команде — верный способ получить полусброшенное состояние:
# ключа нет, а мастер помнит пройденный шаг. Скрипт стирает всё сразу.
#
# Запуск:  bash ~/Downloads/flamingo/desktop/reset.sh

set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_BUILT="$REPO/desktop/src-tauri/target/release/bundle/macos/Flamingo.app"
INSTALLED="/Applications/Flamingo.app"
CABINET="$HOME/Library/Application Support/plus.flamingo.desktop"
BIN="Contents/MacOS/flamingo-desktop"

fingerprint() { grep -ao "index-[A-Za-z0-9_-]\{8\}\.js" "$1" 2>/dev/null | sort -u | head -1; }

echo "━━━ 1 · ОСТАНОВИТЬ"
pkill -f flamingo-desktop 2>/dev/null && echo "  приложение остановлено" || echo "  приложение не запущено"
pkill -f flamingo-sidecar 2>/dev/null && echo "  sidecar остановлен"
sleep 1

echo
echo "━━━ 2 · УБРАТЬ ВСЕ КОПИИ"
COPIES=$(mdfind "kMDItemFSName == 'Flamingo.app'" 2>/dev/null | grep -v "^/Volumes/")
if [ -n "$COPIES" ]; then
  echo "$COPIES" | while read -r p; do
    [ "$p" = "$APP_BUILT" ] && { echo "  оставляю сборку: $p"; continue; }
    rm -rf "$p" && echo "  удалено: $p"
  done
fi
for v in /Volumes/dmg.*; do
  [ -d "$v" ] && hdiutil detach "$v" -quiet 2>/dev/null && echo "  отмонтирован образ: $v"
done

echo
echo "━━━ 3 · СТЕРЕТЬ СОСТОЯНИЕ МАШИНЫ"
if security find-generic-password -s plus.flamingo.desktop -a machine-key >/dev/null 2>&1; then
  security delete-generic-password -s plus.flamingo.desktop -a machine-key >/dev/null 2>&1 \
    && echo "  ключ машины удалён из связки"
else
  echo "  ключа в связке не было"
fi
if [ -d "$CABINET" ]; then
  rm -rf "$CABINET" && echo "  кабинет и настройки удалены"
else
  echo "  кабинета не было"
fi

echo
echo "━━━ 4 · ПОСТАВИТЬ ЗАНОВО"
if [ ! -d "$APP_BUILT" ]; then
  echo "  ✗ сборки нет: $APP_BUILT"
  echo "    Её делает исполнитель. Без неё ставить нечего."
  exit 1
fi
cp -R "$APP_BUILT" "$INSTALLED" || { echo "  ✗ не удалось скопировать"; exit 1; }
xattr -dr com.apple.quarantine "$INSTALLED" 2>/dev/null
touch "$INSTALLED"
killall Dock 2>/dev/null

echo
echo "━━━ ИТОГ"
echo "  копий на диске:  $(mdfind "kMDItemFSName == 'Flamingo.app'" 2>/dev/null | grep -vc "^/Volumes/") (сборка + установленная)"
echo "  отпечаток:       $(fingerprint "$INSTALLED/$BIN")"
echo "  подпись:         $(codesign -dv --verbose=2 "$INSTALLED" 2>&1 | grep -m1 '^Authority=' | cut -d= -f2- || echo 'нет')"
echo "  ключ машины:     нет (это правильно — свяжем заново)"
echo "  кабинет:         пуст"
echo
echo "⚠️  На сервере остаётся СТАРАЯ запись этой машины. Если связывание снова упрётся —"
echo "    зайди на flamingo.plus, кабинет → мои машины, и отзови её. Отсюда это не достать."
echo
echo "Запускай: open -a Flamingo"
