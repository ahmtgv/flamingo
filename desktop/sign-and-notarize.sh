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

# 🔴 Если на машине ровно ОДИН сертификат Developer ID — берём его сами (наряд 34).
#
# Скрипт останавливался с «не задан FLAMINGO_SIGN_IDENTITY» на машине, где нужный сертификат
# стоит и он единственный. Спрашивать человека о том, что можно узнать за одну команду, —
# это лишний шаг в цепочке, которую и так проходят перед каждой сдачей.
#
# ⚠️ Ослабления здесь нет: берётся только «Developer ID Application» (сертификаты
# «Apple Development» игнорируются — с ними нотаризацию не пройти), и только когда он ОДИН.
# Два и больше — выбор за человеком, угадывать чужую команду скрипт не станет.
if [ -z "$IDENTITY" ]; then
  FOUND="$(security find-identity -v -p codesigning 2>/dev/null \
    | sed -n 's/.*"\(Developer ID Application: [^"]*\)".*/\1/p')"
  if [ "$(printf '%s\n' "$FOUND" | grep -c .)" = "1" ]; then
    IDENTITY="$FOUND"
    echo "  сертификат найден на машине (он единственный): $IDENTITY"
  fi
fi

if [ -z "$IDENTITY" ]; then
  echo "✗ Не задан FLAMINGO_SIGN_IDENTITY, и на машине нет ровно одного Developer ID."
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
  # 🔴 ПОДПИСЫВАЕМ ПО СОДЕРЖИМОМУ, А НЕ ПО РАСШИРЕНИЮ.
  #
  # Первая версия брала `*.dylib` и `*.so` — 65 файлов — и нотаризация вернула Invalid:
  #   _internal/Python                                  не подписан
  #   _internal/Python.framework/Python                 подпись недействительна
  #   _internal/Python.framework/Versions/3.12/Python   то же
  # У интерпретатора и его фреймворка расширения нет вовсе, и список по маске их не видел.
  # Гипотеза «библиотеки — это .dylib и .so» была правдоподобной и неполной.
  #
  # `file` смотрит внутрь файла, а не на имя, поэтому новый безымянный бинарник в сайдкаре
  # попадёт под подпись сам, без правки этого скрипта.
  # 🔴 ПОЧИНИТЬ КАРКАС ФРЕЙМВОРКА ПЕРЕД ПОДПИСЬЮ.
  #
  # PyInstaller кладёт `Python.framework` плоско: `Versions/Current` — настоящий КАТАЛОГ,
  # а не ссылка, и `Python` наверху — настоящий файл, а не ссылка на `Versions/Current/Python`.
  # Для `codesign` это ни бинарник, ни бундл: «bundle format is ambiguous (could be app or
  # framework)», и подпись отказывает. Нотаризация при этом требует, чтобы каждый бинарник
  # внутри был подписан Developer ID.
  #
  # Восстанавливаем канонический вид: одна настоящая версия, остальное — ссылки. Так фреймворк
  # и должен выглядеть, и так его умеет подписывать `codesign`.
  for FW in $(find "$SIDECAR" -type d -name "*.framework"); do
    NAME=$(basename "$FW" .framework)
    VER=$(ls "$FW/Versions" 2>/dev/null | grep -v Current | head -1)
    [ -z "$VER" ] && continue
    if [ -d "$FW/Versions/Current" ] && [ ! -L "$FW/Versions/Current" ]; then
      rm -rf "$FW/Versions/Current"
      ln -s "$VER" "$FW/Versions/Current"
    fi
    if [ -f "$FW/$NAME" ] && [ ! -L "$FW/$NAME" ]; then
      rm -f "$FW/$NAME"
      ln -s "Versions/Current/$NAME" "$FW/$NAME"
    fi
    if [ -d "$FW/Resources" ] && [ ! -L "$FW/Resources" ]; then
      rm -rf "$FW/Versions/Current/Resources" 2>/dev/null || true
      mv "$FW/Resources" "$FW/Versions/$VER/Resources" 2>/dev/null || true
      ln -s "Versions/Current/Resources" "$FW/Resources" 2>/dev/null || true
    fi
    echo "  каркас $NAME.framework приведён к каноническому виду"
  done

  MACHO=$(mktemp)
  find "$SIDECAR" -type f -perm -u+r ! -name "flamingo-sidecar" -print0 \
    | xargs -0 file --mime-type 2>/dev/null \
    | grep -E ':\s*application/x-mach-binary$' | sed 's/:[^:]*$//' > "$MACHO"
  echo "  бинарников в сайдкаре: $(wc -l < "$MACHO" | tr -d ' ')"

  # Фреймворки подписываются как БУНДЛЫ и после своего содержимого: подпись бундла фиксирует
  # хеши того, что внутри, поэтому сначала внутренности, потом сам фреймворк.
  # 🔴 ОШИБКИ ЗДЕСЬ ГЛУШИЛИСЬ, И СКРИПТ УМИРАЛ МОЛЧА (наряд 35, найдено 18.08).
  #
  # `2>/dev/null` вместе с `set -e` давало худшее сочетание: один отказ `codesign` из
  # шестидесяти семи — и скрипт обрывался на середине, не дойдя ни до подписи приложения, ни
  # до собственной проверки в конце. На диске оставался ПОЛУПОДПИСАННЫЙ образ, и `codesign
  # --verify` на нём отвечал «code has no resources but signature indicates they must be
  # present». Ровно тот случай, ради которого заведено правило про молчаливый отказ.
  #
  # Теперь отказ называется вслух вместе с файлом, а цикл доводится до конца: остальные
  # шестьдесят шесть подписать надо в любом случае.
  failed=0
  while IFS= read -r f; do
    if ! codesign --force --timestamp --options runtime --sign "$IDENTITY" "$f" 2>/tmp/flamingo-sign-err; then
      failed=$((failed + 1))
      echo "  ✗ не подписался: ${f#"$APP"/} — $(head -1 /tmp/flamingo-sign-err)"
    fi
  done < "$MACHO"
  rm -f "$MACHO" /tmp/flamingo-sign-err
  if [ "$failed" -gt 0 ]; then
    echo
    echo "  ✗ не подписалось файлов: $failed. Образ раздавать нельзя."
    exit 1
  fi

  # ⚠️ Фреймворки как БУНДЛЫ здесь не подписываются, и это не упущение.
  # `Python.framework` от PyInstaller — неполный каркас: `codesign` на нём отвечает
  # «bundle format is ambiguous (could be app or framework)» и падает. Нотаризацию
  # интересуют бинарники ВНУТРИ него — их и подписал проход выше, по содержимому файла
  # (именно те четыре, которых не хватило в первой попытке).

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
# 🔴 ТРИ РАЗНЫЕ НОВОСТИ, А НЕ ДВЕ (наряд 44 §4; было — наряд 34).
#
# «Профиль не найден», «до связки ключей не достучаться» и «не смог спросить Apple» лечатся
# по-разному, а скрипт сваливал первые две в одну. Владелец получил совет заводить профиль,
# который ЖИВ: `notarytool history` из обычного терминала отвечает «Successfully received
# submission history». Не достучались до связки — это не отсутствие профиля.
#
# Порядок проверок — от самого дешёвого и самого частого к редкому.

# 1. Связка вообще доступна этой оболочке? Из неинтерактивной (ssh, запуск из редактора,
#    агент) она может быть заперта, и любой поиск в ней вернёт «item not found» — то есть
#    соврёт ровно про отсутствие.
if ! security show-keychain-info login.keychain-db >/dev/null 2>&1; then
  echo
  echo "  ⚠️ Нотаризация пропущена: до связки ключей не достучаться из этой оболочки."
  echo "     Это НЕ значит, что профиля нет. Связка заперта или недоступна неинтерактивному"
  echo "     запуску — так бывает при вызове из редактора, по ssh или из агента."
  echo
  echo "  Что делать: повторить из обычного Терминала:  bash desktop/sign-and-notarize.sh"
  echo "  Приложение при этом подписано и на своей машине работает."
  exit 0
fi

NOTARY_CHECK="$(xcrun notarytool history --keychain-profile "$PROFILE" 2>&1 >/dev/null || true)"

# 2. Связка доступна, а профиля в ней действительно нет — тогда его заводят.
if printf '%s' "$NOTARY_CHECK" | grep -qi "no keychain password item"; then
  echo "  ⚠️ Профиль «$PROFILE» в связке не найден — нотаризация пропущена."
  echo "     Связка при этом доступна, дело именно в профиле."
  echo "     Создать (владелец, один раз, у себя):"
  echo "       xcrun notarytool store-credentials \"$PROFILE\" \\"
  echo "         --key <AuthKey_XXXX.p8> --key-id <KEY_ID> --issuer <ISSUER_ID>"
  echo
  echo "  Приложение подписано, но НЕ нотаризовано: у чужого человека система всё ещё"
  echo "  будет ругаться. Для своей машины этого достаточно, для раздачи — нет."
  exit 0
fi

# 3. Профиль на месте, связка открыта — значит не ответила служба Apple.
if [ -n "$NOTARY_CHECK" ]; then
  echo
  echo "  ⚠️ Нотаризация пропущена: не удалось спросить службу Apple."
  echo "     Профиль «$PROFILE» при этом на месте, связка открыта — дело не в них."
  echo "     Ответ: $(printf '%s' "$NOTARY_CHECK" | head -1)"
  echo
  echo "  Приложение подписано. Повторите позже: bash desktop/sign-and-notarize.sh"
  exit 0
fi

# 🔴 Найдено прогоном 22.08: `$ZIP` использовался, но НИГДЕ НЕ СОЗДАВАЛСЯ — скрипт падал
# на `unbound variable` ровно в точке отправки. До неё всё выглядело успешным: подпись,
# «valid on disk», «satisfies its Designated Requirement», — а нотаризация не начиналась
# ни разу. Приложение при этом раздавать нельзя: у постороннего система его не откроет.
#
# Служба Apple принимает архив, а не каталог. `ditto -c -k --keepParent` — единственный
# верный способ упаковать `.app`: обычный `zip` теряет симлинки внутри `Python.framework`,
# и подпись после распаковки на стороне Apple перестаёт сходиться.
ZIP="$(mktemp -d)/Flamingo.zip"
/usr/bin/ditto -c -k --keepParent "$APP" "$ZIP"
echo "  отправляю на проверку Apple ($(du -h "$ZIP" | cut -f1)) — это занимает минуты"

xcrun notarytool submit "$ZIP" --keychain-profile "$PROFILE" --wait
rm -f "$ZIP"

# Талон крепится к .app: без него Gatekeeper на машине без интернета проверить не сможет.
xcrun stapler staple "$APP"

# 🔴 ОБРАЗ ПЕРЕСОБИРАЕТСЯ ЗАНОВО, ИЗ ПОДПИСАННОГО ПРИЛОЖЕНИЯ.
#
# `cargo tauri build` делает `.dmg` РАНЬШЕ, чем этот скрипт подписывает содержимое, поэтому
# в образе лежит приложение до подписи. Первая попытка это и показала: `.app` — Accepted,
# `.dmg` — Invalid, 144 замечания, и первым в списке сам `flamingo-desktop`.
# Отправлять образ, собранный до подписи, бессмысленно: нотаризуется то, что внутри.
if [ -f "$DMG" ]; then
  echo "  пересобираю образ из подписанного приложения"
  STAGE=$(mktemp -d)
  /usr/bin/ditto "$APP" "$STAGE/Flamingo.app"
  ln -s /Applications "$STAGE/Applications"
  rm -f "$DMG"
  hdiutil create -volname "Flamingo" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null
  rm -rf "$STAGE"
  codesign --force --timestamp --sign "$IDENTITY" "$DMG"
  xcrun notarytool submit "$DMG" --keychain-profile "$PROFILE" --wait
  xcrun stapler staple "$DMG"
fi

echo
echo "── Проверка ─────────────────────────────────"
codesign -dv --verbose=4 "$APP" 2>&1 | grep -E "Authority|flags"
spctl -a -vvv -t install "$APP" 2>&1
xcrun stapler validate "$APP" 2>&1

# 🔴 ОДНА ВЕРСИЯ — ЖЁСТКО (§39.1, наряд 37 §2). Копию из каталога сборки убираем ПОСЛЕ
# проверки: пока она там лежит, Launchpad показывает два одинаковых значка и система выбирает
# наугад — так владелец дважды открывал вчерашнюю версию. Артефакт для раздачи — образ `.dmg`.
#
# ⚠️ ПОРЯДОК ЗДЕСЬ — ЧАСТЬ ПРАВКИ, А НЕ ОФОРМЛЕНИЕ. Сначала я поставил удаление ПЕРЕД
# проверкой, и она молча проверяла путь, которого уже нет: три строки `codesign`/`spctl`/
# `stapler` не сказали ничего. Проверять надо то, что есть.
bash "$REPO/desktop/one-version.sh" --fix

# ⛳ Ворота сборки: копий на машине ровно одна. Если больше — сборка падает, и владелец
# узнаёт об этом здесь, а не посреди урока, открыв вчерашнюю версию.
if ! bash "$REPO/desktop/one-version.sh"; then
  echo
  echo "  ✗ Сборка не считается сданной, пока копий больше одной."
  exit 1
fi

echo
echo "  Поставить свежую версию:  bash desktop/install.sh"
