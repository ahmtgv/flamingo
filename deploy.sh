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
WHAT="${1:-all}"
cd "$REPO" || exit 1

step() { echo; echo "━━━ $1"; }
ok()   { echo "  ✓ $1"; }
bad()  { echo "  ✗ $1"; }

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
if [ "$WHAT" = "all" ] || [ "$WHAT" = "server" ]; then
  step "СЕРВЕР · rsync + пересборка api"
  echo "  (спросит пароль root дважды: на копирование и на сборку)"
  rsync -az --delete \
    --exclude node_modules --exclude .venv --exclude .git \
    --exclude target --exclude dist --exclude .env.production \
    ./ "$SRV":/opt/flamingo/ && ok "код скопирован" || { bad "rsync не прошёл"; exit 1; }

  ssh "$SRV" "cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml \
      --env-file .env.production up -d --build api" \
    && ok "контейнер api пересобран" || { bad "сборка на сервере не прошла"; exit 1; }

  # ── 2а. МИГРАЦИИ ────────────────────────────────────────────────────────
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
  PENDING=$(ssh "$SRV" "cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml \
      --env-file .env.production exec -T api python manage.py showmigrations --plan 2>/dev/null \
      | grep -c '^\[ \]'" | tr -d ' \r')
  # Пустой ответ — это НЕ «ноль»: значит команда не выполнилась, и мы ничего не знаем.
  if [ -z "$PENDING" ]; then
    bad "не удалось спросить сервер о миграциях — считаем выкат несостоявшимся"
    exit 1
  elif [ "$PENDING" != "0" ]; then
    bad "непринятых миграций: $PENDING — новый код на старой таблице"
    echo "      применить:  ssh $SRV \"cd /opt/flamingo && docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production exec -T api python manage.py migrate\""
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
    echo "    Живой ли контейнер: ssh root@82.147.71.204 'cd /opt/flamingo && \\"
    echo "      docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production ps'"
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
