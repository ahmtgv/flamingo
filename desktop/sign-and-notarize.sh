#!/bin/bash
# Подписать Developer ID, нотаризовать, прикрепить талон.
#
# 🔴 ЗАЧЕМ. Пока подпись ad-hoc, macOS считает каждую пересборку НОВОЙ программой: у ad-hoc
# требование строится на `cdhash`, а он меняется от любого изменения байтов. Отсюда окно
# «Flamingo хочет использовать конфиденциальную информацию» с полем пароля — оно выскакивало
# владельцу дважды за один наряд, а на этапе 2 пересборок будут десятки. Настоящий сертификат
# даёт требование вида «идентификатор + удостоверяющий центр», и оно переживает пересборку.
# Плюс с установки уходит «неизвестный разработчик» — первое, что видит учитель.
#
# 🔒 СЕКРЕТЫ СЮДА НЕ ПОПАДАЮТ. Ни пароля приложения, ни ключа API, ни `.p12` в этом файле нет
# и быть не может. `notarytool` читает их из ПРОФИЛЯ В СВЯЗКЕ КЛЮЧЕЙ, который владелец
# создаёт у себя один раз:
#
#   xcrun notarytool store-credentials "flamingo-notary" \
#       --key /путь/к/AuthKey_XXXX.p8 --key-id <KEY_ID> --issuer <ISSUER_ID>
#
# После этого файл ключа можно убрать с машины: он уже в связке. В CI вместо профиля —
# секреты раннера, те же три значения.
#
# Запуск:  bash desktop/sign-and-notarize.sh

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$REPO/desktop/src-tauri/target/release/bundle/macos/Flamingo.app"
DMG="$REPO/desktop/src-tauri/target/release/bundle/dmg/Flamingo_0.1.0_aarch64.dmg"
ENTITLEMENTS="$REPO/desktop/src-tauri/entitlements.plist"
PROFILE="${NOTARY_PROFILE:-flamingo-notary}"

# Имя сертификата берём из окружения, чтобы скрипт не знал ни про чью команду.
# Значение — публичное (это имя сертификата, не секрет), но место ему в настройках машины.
IDENTITY="${FLAMINGO_SIGN_IDENTITY:-}"

if [ -z "$IDENTITY" ]; then
  echo "✗ Не задан FLAMINGO_SIGN_IDENTITY."
  echo
  echo "  Посмотреть, что есть на машине:"
  echo "    security find-identity -v -p codesigning"
  echo
  echo "  Нужен сертификат вида:"
  echo "    Developer ID Application: ERTC Platform LLC (<TEAM_ID>)"
  echo
  echo "  «Apple Development: …» НЕ ПОДХОДИТ для раздачи: он для запуска на своих машинах,"
  echo "  нотаризацию с ним не пройти."
  exit 1
fi

[ -d "$APP" ] || { echo "✗ Сборки нет: $APP"; exit 1; }

echo "── Подпись ──────────────────────────────────"
echo "  сертификат: $IDENTITY"

# 🔴 ПОРЯДОК ВАЖЕН: изнутри наружу. Подпись внешнего слоя фиксирует хеши внутренних, поэтому
# подписанное после него ломает его же подпись. Сначала библиотеки, потом сайдкар, потом .app.
SIDECAR="$APP/Contents/Resources/sidecar"
if [ -d "$SIDECAR" ]; then
  COUNT=$(find "$SIDECAR" -type f \( -name "*.dylib" -o -name "*.so" \) | wc -l | tr -d ' ')
  echo "  библиотек сайдкара: $COUNT"
  find "$SIDECAR" -type f \( -name "*.dylib" -o -name "*.so" \) -print0 \
    | xargs -0 -n1 codesign --force --timestamp --options runtime --sign "$IDENTITY"
  [ -f "$SIDECAR/flamingo-sidecar" ] && codesign --force --timestamp --options runtime \
    --entitlements "$ENTITLEMENTS" --sign "$IDENTITY" "$SIDECAR/flamingo-sidecar"
  echo "  сайдкар подписан"
fi

codesign --force --timestamp --options runtime --entitlements "$ENTITLEMENTS" \
  --sign "$IDENTITY" "$APP"
echo "  приложение подписано"

echo
echo "── Что получилось ───────────────────────────"
codesign -dv --verbose=4 "$APP" 2>&1 | grep -E "Identifier|Authority|TeamIdentifier|flags|Timestamp" || true
codesign --verify --deep --strict --verbose=2 "$APP" 2>&1 | tail -2

echo
echo "── Нотаризация ──────────────────────────────"
if ! xcrun notarytool history --keychain-profile "$PROFILE" >/dev/null 2>&1; then
  echo "  ⚠️ Профиль «$PROFILE» в связке не найден — нотаризация пропущена."
  echo "     Создать (владелец, один раз, у себя):"
  echo "       xcrun notarytool store-credentials \"$PROFILE\" \\"
  echo "         --key <AuthKey_XXXX.p8> --key-id <KEY_ID> --issuer <ISSUER_ID>"
  echo
  echo "  Приложение подписано, но НЕ нотаризовано: у чужого человека система всё ещё"
  echo "  будет ругаться. Для своей машины этого достаточно, для раздачи — нет."
  exit 0
fi

# Нотаризуют архив или образ, а не .app: notarytool принимает zip/dmg/pkg.
ZIP="${APP%.app}.zip"
/usr/bin/ditto -c -k --keepParent "$APP" "$ZIP"
xcrun notarytool submit "$ZIP" --keychain-profile "$PROFILE" --wait
rm -f "$ZIP"

# Талон крепится к .app и отдельно к образу: скачавший .dmg проверяется офлайн.
xcrun stapler staple "$APP"
[ -f "$DMG" ] && xcrun notarytool submit "$DMG" --keychain-profile "$PROFILE" --wait \
  && xcrun stapler staple "$DMG"

echo
echo "── Проверка ─────────────────────────────────"
codesign -dv --verbose=4 "$APP" 2>&1 | grep -E "Authority|flags"
spctl -a -vvv -t install "$APP" 2>&1
xcrun stapler validate "$APP" 2>&1
