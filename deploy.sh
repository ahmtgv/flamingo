#!/bin/bash
# Выкатить всё: сайт, сервер, приложение. И проверить, что доехало.
#
# 🔴 Заведено 15.08 после дня, в котором мы трижды чинили уже починенное — потому что выкат
# живёт в ТРЁХ местах, и каждое едет отдельно:
#
#   сайт        flamingo.plus       ← git push → Cloudflare Pages собирает сама
#   сервер      api.flamingo.plus   ← rsync + пересборка контейнера api
#   приложение  Flamingo.app        ← desktop/install.sh
#
# Симптом рассинхрона всегда один и тот же: отказ на шаге, который вчера работал.
#
# Запуск:  bash ~/Downloads/flamingo/deploy.sh          # всё
#          bash ~/Downloads/flamingo/deploy.sh site     # только сайт
#          bash ~/Downloads/flamingo/deploy.sh server   # только сервер
#          bash ~/Downloads/flamingo/deploy.sh app      # только приложение

set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRV="root@82.147.71.204"
# Одна строка compose на весь файл: пока их было три, они разошлись подсказками.
COMPOSE="docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production"
WHAT="${1:-all}"
cd "$REPO" || exit 1

step() { echo; echo "━━━ $1"; }
ok()   { echo "  ✓ $1"; }
bad()  { echo "  ✗ $1"; }

# Разбор трёх отпечатков — ОТДЕЛЬНО от того, как их добыли.
#
# Так его можно проверить без сервера, чем и занят `tests/test_deploy_gate.py`: караул,
# который нельзя нарочно сломать, однажды тихо перестаёт ловить, а этот сработает от силы
# раз в месяц — и именно в тот день, когда всё горит.
#
# Отвечает не «плохо/хорошо», а ЧТО ИМЕННО случилось: два отказа лечатся по-разному, и
# один общий ответ отправил бы человека чинить не то.
freshness_verdict() {
  local want="$1" disk="$2" in_container="$3"
  echo "  ждём:             $want"
  echo "  на диске сервера: ${disk:-—}"
  echo "  в контейнере:     ${in_container:-—}"

  if [ -z "$in_container" ]; then
    bad "контейнер не назвал свой отпечаток — выкат считаем несостоявшимся"
    echo "      Либо контейнер не поднялся, либо в образе нет /app/BUILD_COMMIT: второе"
    echo "      бывает ровно один раз — у образа, собранного до появления этих ворот."
    echo "      Посмотреть:  ssh $SRV \"cd /opt/flamingo && $COMPOSE ps\""
    return 1
  fi
  if [ "$disk" != "$want" ]; then
    bad "на сервере лежит НЕ ТО, что мы отправили — rsync не доехал"
    echo "      Это второй из двух случаев 22.08: сборка при этом честно печатает"
    echo "      COPY . . CACHED, потому что файлы и правда не менялись."
    return 1
  fi
  if [ "$in_container" != "$want" ]; then
    bad "код на сервере свежий, а КОНТЕЙНЕР работает на старом образе"
    echo "      Это первый из двух случаев 22.08: compose написал Running вместо Recreated."
    echo "      Пересоздать принудительно:"
    echo "      ssh $SRV \"cd /opt/flamingo && $COMPOSE up -d --build --force-recreate api\""
    return 1
  fi
  ok "в работающем контейнере ровно то, что отправлено ($(printf '%s' "$want" | cut -c1-12))"
  return 0
}

# Четвёртый исход: контейнер свежий, а домен обслуживает КТО-ТО ДРУГОЙ — старый контейнер,
# забытый стек, чужой апстрим в Caddy. Три проверки выше этого не видят вовсе: они смотрят
# на контейнер, который сами же и выбрали, а не на то, что отвечает по адресу.
#
# 🔒 Сравниваются HMAC-и, а не коммиты: домен отдаёт отпечаток под `SECRET_KEY`, и
# постороннему это бессмысленная строка (см. backend/common/health.py). Нам нужно
# только равенство.
domain_verdict() {
  local served="$1" expected="$2"
  echo "  домен отдаёт:     ${served:-—}"
  echo "  ждём от домена:   ${expected:-—}"

  if [ -z "$expected" ]; then
    bad "не удалось вычислить ожидаемый отпечаток — сверять не с чем"
    echo "      Молчание за согласие не считаем: проверка не состоялась."
    return 1
  fi
  if [ -z "$served" ] || [ "$served" = "null" ]; then
    bad "домен не назвал отпечаток"
    echo "      Либо по адресу отвечает образ старше этих ворот (в нём нет /healthz),"
    echo "      либо запрос до api вообще не доходит. Проверить: curl -s https://api.flamingo.plus/healthz"
    return 1
  fi
  if [ "$served" != "$expected" ]; then
    bad "домен отвечает НЕ ТЕМ контейнером"
    echo "      Код на сервере свежий и в контейнере свежий — но по адресу отвечает другой:"
    echo "      старый контейнер, второй стек или чужой апстрим в Caddy."
    echo "      Смотреть: ssh $SRV \"cd /opt/flamingo && $COMPOSE ps --all\" и infra/prod/Caddyfile"
    return 1
  fi
  ok "домен обслуживается тем самым контейнером"
  return 0
}

# Разбор без сервера — им пользуется проверка, и им же можно спросить руками:
#   bash deploy.sh verdict        <ждём> <на диске> <в контейнере>
#   bash deploy.sh verdict-domain <домен отдал> <ждём от домена>
if [ "$WHAT" = "verdict" ]; then
  freshness_verdict "${2:-}" "${3:-}" "${4:-}"
  exit $?
fi
if [ "$WHAT" = "verdict-domain" ]; then
  domain_verdict "${2:-}" "${3:-}"
  exit $?
fi

# ── 1. САЙТ ────────────────────────────────────────────────────────────────
if [ "$WHAT" = "all" ] || [ "$WHAT" = "site" ]; then
  step "САЙТ · git push → Cloudflare Pages"
  AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "?")
  DIRTY=$(git status --porcelain | wc -l | tr -d ' ')
  echo "  неотправленных коммитов: $AHEAD · незакоммиченных файлов: $DIRTY"
  [ "$DIRTY" != "0" ] && echo "  ⚠️  есть незакоммиченное — оно НЕ уедет"
  if [ "$AHEAD" = "0" ]; then
    ok "уже отправлено"
  else
    git push && ok "отправлено" || bad "push не прошёл"
  fi
  echo "  Pages соберётся сама, 2–3 минуты: dash.cloudflare.com → flamingo → Deployments"
fi

# ── 2. СЕРВЕР ──────────────────────────────────────────────────────────────
#
# 🔴 ВЫКАТ СОЛГАЛ ДВАЖДЫ ПОДРЯД, И ОБА РАЗА МОЛЧА (владелец, 22.08).
#
#   1. Образ собрался, `up -d --build` отработал — а compose написал `Running` вместо
#      `Recreated`, и контейнер остался на СТАРОМ образе. Команда не упала.
#   2. `COPY . . CACHED` честно сообщил, что файлы не менялись, — то есть rsync не доехал.
#      Тоже прошло мимо: код возврата ноль, строка кэша утонула в выводе сборки.
#
# Это тот же класс, что «сборка старше правок» в приложении, — там лечится отпечатком
# внутри образа (`desktop/install.sh`). На сервере такой проверки не было вовсе, и «выкачено»
# означало ровно одно: «команда не упала».
#
# 🔴 ПОЧЕМУ ОТПЕЧАТОК ЕДЕТ ФАЙЛОМ, А НЕ `--build-arg`.
#
# Аргумент сборки — это НЕ отпечаток кода: `ARG` обесценивает только свой слой, поэтому
# `COPY . .` остаётся кэшированным, а метка внутри образа получается свежей. Ровно второй
# случай выше — старый код с новой печатью, то есть караул, который врёт увереннее прежнего.
#
# Файл же лежит ВНУТРИ дерева, которое едет rsync-ом и копируется тем же `COPY . .`:
# он физически не может оказаться свежее кода, рядом с которым лежит.
STAMP_FILE="$REPO/backend/BUILD_COMMIT"

# Что именно мы отправляем. Незакоммиченное rsync тоже увозит, поэтому один лишь коммит
# дерево не описывает: к нему добавляется отпечаток правок, иначе повторный выкат правленого
# дерева выглядел бы «тем же самым».
sent_stamp() {
  local head dirt
  head="$(git -C "$REPO" rev-parse HEAD 2>/dev/null || echo "no-git")"
  dirt="$( { git -C "$REPO" diff HEAD; git -C "$REPO" status --porcelain; } 2>/dev/null \
           | shasum -a 256 | cut -c1-8)"
  if [ -n "$(git -C "$REPO" status --porcelain 2>/dev/null)" ]; then
    echo "$head+dirty-$dirt"
  else
    echo "$head"
  fi
}

# Спросить сервер и работающий контейнер, что у них лежит. Пустая строка — это НЕ «старое»,
# это «не смогли спросить», и говорить об этом надо отдельно.
ask_disk()      { ssh "$SRV" "cat /opt/flamingo/backend/BUILD_COMMIT 2>/dev/null" | tr -d " \r\n"; }
ask_container() { ssh "$SRV" "cd /opt/flamingo && $COMPOSE exec -T api cat /app/BUILD_COMMIT 2>/dev/null" | tr -d " \r\n"; }

# Что отдаёт домен. Ответ — JSON вида {"ok": true, "build": "…"}; разбираем питоном, потому
# что `grep` по JSON врёт ровно в тот день, когда порядок полей поменяется.
ask_domain() {
  curl -s -m 15 -H 'Cache-Control: no-cache' https://api.flamingo.plus/healthz 2>/dev/null \
    | python3 -c "import json,sys; print((json.load(sys.stdin).get('build') or ''))" 2>/dev/null
}

# Чего мы от домена ждём.
#
# 🔒 БОЕВОЙ КЛЮЧ ОСТАЁТСЯ НА СЕРВЕРЕ. Владелец описал местный расчёт — но `SECRET_KEY` живёт
# в `.env.production`, который rsync намеренно не возит, и локально его нет (файл пуст).
# Тащить боевой ключ на машину исполнителя ради буквы указания — понижение безопасности
# ради удобства проверки, поэтому по умолчанию отпечаток считает САМ КОНТЕЙНЕР, уже
# сверенный по коду шагом выше. Если ключ на машине всё-таки есть (переменная окружения),
# считаем на месте — тогда сверка не зависит от контейнера вовсе.
expected_domain_fingerprint() {
  local want="$1"
  if [ -n "${SECRET_KEY:-}" ]; then
    STAMP="$want" python3 -c "import hashlib,hmac,os; print(hmac.new(os.environ['SECRET_KEY'].encode(), os.environ['STAMP'].encode(), hashlib.sha256).hexdigest())"
    return
  fi
  # Питон едет в контейнер через stdin: так не нужно продираться сквозь три уровня кавычек,
  # и код виден целиком, а не размазан по экранированию.
  ssh "$SRV" "cd /opt/flamingo && $COMPOSE exec -T api python -" <<'PYCODE' 2>/dev/null | tr -d " \r\n"
import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from common.health import build_fingerprint  # noqa: E402

print(build_fingerprint() or "")
PYCODE
}

# Спросить сам расчёт, без сервера и без выката:
#   SECRET_KEY=… bash deploy.sh fingerprint <отпечаток сборки>
# Этим пользуется `tests/test_deploy_gate.py`: он сверяет расчёт выката с тем, что считает
# сам продукт (`common/health.py`). Разойдись эти двое — ворота сравнивали бы несравнимое
# и ругались на здоровый домен каждым выкатом.
if [ "$WHAT" = "fingerprint" ]; then
  expected_domain_fingerprint "${2:-}"
  exit $?
fi



if [ "$WHAT" = "all" ] || [ "$WHAT" = "server" ]; then
  step "СЕРВЕР · rsync + пересборка api"
  echo "  (спросит пароль root дважды: на копирование и на сборку)"

  WANT="$(sent_stamp)"
  printf '%s\n' "$WANT" > "$STAMP_FILE"
  echo "  отправляем: $WANT"

  rsync -az --delete \
    --exclude node_modules --exclude .venv --exclude .git \
    --exclude target --exclude dist --exclude .env.production \
    ./ "$SRV":/opt/flamingo/ && ok "код скопирован" || { bad "rsync не прошёл"; exit 1; }

  ssh "$SRV" "cd /opt/flamingo && $COMPOSE up -d --build api" \
    && ok "команда сборки отработала" || { bad "сборка на сервере не прошла"; exit 1; }

  # ── 2а. ВОРОТА СВЕЖЕСТИ ─────────────────────────────────────────────────
  #
  # Стоят ПЕРЕД проверкой миграций намеренно: у старого контейнера непринятых миграций
  # может не быть вовсе, и тогда следующий шаг радостно подтвердит выкат, которого не было.
  # Проверять свежесть после «миграций нет» — значит один караул успокаивать другим.
  step "СЕРВЕР · то ли это, что мы отправили"
  DISK="$(ask_disk)"
  IN_CONTAINER="$(ask_container)"
  freshness_verdict "$WANT" "$DISK" "$IN_CONTAINER" || exit 1
  ssh "$SRV" "cd /opt/flamingo && $COMPOSE ps api" || bad "не удалось показать состояние контейнера"

  # ── 2б. ТОТ ЛИ КОНТЕЙНЕР ОТВЕЧАЕТ ДОМЕНУ ────────────────────────────────
  #
  # Три проверки выше смотрят на контейнер, который мы сами и выбрали. Домен при этом может
  # обслуживаться другим — и сегодня этого не увидел бы никто.
  step "СЕРВЕР · тот ли контейнер отвечает домену"
  EXPECTED="$(expected_domain_fingerprint "$WANT")"
  SERVED="$(ask_domain)"
  domain_verdict "$SERVED" "$EXPECTED" || exit 1

  # ── 2в. МИГРАЦИИ ────────────────────────────────────────────────────────
  #
  # 🔴 ДВАЖДЫ ЛОЖИЛИСЬ В БОЮ ИЗ-ЗА ЭТОГО, И ОБА РАЗА ОДИНАКОВО.
  #
  # Контейнер пересобран, код новый, а таблица старая — и продукт падает на первом же
  # запросе к новому полю: «null value in column "timezone" violates not-null constraint»
  # (18.08), и раньше того же вида отказ с `markless`. Симптом всегда выглядит как ошибка
  # приложения, а причина — в том, что миграцию никто не применил.
  #
  # Проверяем ПОСЛЕ сборки и ДО того, как сказать «выкачено»: `showmigrations --plan`
  # печатает `[ ]` у каждой непринятой. Одна такая — выкат считается несостоявшимся.
  step "СЕРВЕР · миграции"
  PENDING=$(ssh "$SRV" "cd /opt/flamingo && $COMPOSE exec -T api python manage.py showmigrations --plan 2>/dev/null \
      | grep -c '^\[ \]'" | tr -d ' \r')
  # Пустой ответ — это НЕ «ноль»: значит команда не выполнилась, и мы ничего не знаем.
  if [ -z "$PENDING" ]; then
    bad "не удалось спросить сервер о миграциях — считаем выкат несостоявшимся"
    exit 1
  elif [ "$PENDING" != "0" ]; then
    bad "непринятых миграций: $PENDING — новый код на старой таблице"
    echo "      применить:  ssh $SRV \"cd /opt/flamingo && $COMPOSE exec -T api python manage.py migrate\""
    exit 1
  else
    ok "непринятых миграций нет"
  fi
fi

# ── 3. ПРИЛОЖЕНИЕ ──────────────────────────────────────────────────────────
if [ "$WHAT" = "all" ] || [ "$WHAT" = "app" ]; then
  step "ПРИЛОЖЕНИЕ · установка с проверкой отпечатка"
  bash "$REPO/desktop/install.sh"
fi

# ── 4. ПРОВЕРКА ────────────────────────────────────────────────────────────
if [ "$WHAT" = "all" ] || [ "$WHAT" = "server" ] || [ "$WHAT" = "site" ]; then
  step "ПРОВЕРКА"
  sleep 3

  # API отвечает и пускает приложение — это ловил дефект CORS 15.08 утром.
  # Три захода, а не один: 17.08 проверка сказала «НЕ пускает», а тот же запрос руками
  # через минуту вернул заголовок. Одиночный запрос с таймаутом ловит не только поломку,
  # но и любую помеху связи — и врёт про сервер, который жив.
  API=""
  for _ in 1 2 3; do
    if curl -s -m 15 -X OPTIONS https://api.flamingo.plus/graphql/ \
         -H 'Origin: tauri://localhost' -H 'Access-Control-Request-Method: POST' -D - -o /dev/null \
       | grep -qi 'access-control-allow-origin: tauri://localhost'; then
      API=1; break
    fi
    sleep 5
  done
  if [ -n "$API" ]; then
    ok "API пускает приложение"
  else
    bad "API НЕ пускает приложение (три попытки) — проверь выкат сервера"
    echo "    Живой ли контейнер: ssh $SRV \"cd /opt/flamingo && $COMPOSE ps\""
  fi

  # Сайт отдаёт приложение, а /graphql/ — заглушку. Это ловило дефект 404.html.
  curl -s -m 10 -o /dev/null -w '' https://flamingo.plus/link \
    && ok "сайт отвечает" || bad "сайт не отвечает"
  # Ждём, а не спрашиваем один раз: Cloudflare Pages собирает сайт 1-5 минут после push,
  # а прежняя проверка ждала три секунды и ругалась на то, чего ещё не случилось (17.08).
  # Смотрим на ТЕЛО страницы, не на статус: 404 в _redirects Cloudflare не поддерживает,
  # заглушка отдаётся со статусом 200 — см. docs/handoff/DEPLOY_NOTES_redirects.md.
  echo "  жду сборку сайта (до 6 минут)…"
  SEEN=""
  for _ in $(seq 1 24); do
    # -L обязателен: Cloudflare Pages приводит /no-api.html к «красивому» /no-api и отвечает
    # 308 с пустым телом. Без -L проверка искала текст там, где его нет, и объявляла живое
    # правило потерянным (17.08, второй ложный тревожный сигнал за вечер).
    if curl -sL -m 10 https://flamingo.plus/graphql/ | grep -q 'API живёт на другом адресе'; then
      SEEN=1; break
    fi
    sleep 15
  done
  if [ -n "$SEEN" ]; then
    ok "исключение /graphql/ на месте"
  else
    bad "/graphql/ отдаёт НЕ заглушку — правило потеряно"
    echo "    Сборка ли это — видно тут: Cloudflare → Workers & Pages → flamingo → Deployments."
    echo "    Отпечаток index-*.js сравнивать с локальным dist БЕСПОЛЕЗНО: локально собирается"
    echo "    версия для приложения, у неё другой хэш при том же коммите."
  fi
fi

echo
echo "Готово."
