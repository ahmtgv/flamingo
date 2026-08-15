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
  H=$(curl -s -m 10 -X OPTIONS https://api.flamingo.plus/graphql/ \
        -H 'Origin: tauri://localhost' -H 'Access-Control-Request-Method: POST' -D - -o /dev/null)
  echo "$H" | grep -qi 'access-control-allow-origin: tauri://localhost' \
    && ok "API пускает приложение" || bad "API НЕ пускает приложение — проверь выкат сервера"

  # Сайт отдаёт приложение, а /graphql/ — заглушку. Это ловило дефект 404.html.
  curl -s -m 10 -o /dev/null -w '' https://flamingo.plus/link \
    && ok "сайт отвечает" || bad "сайт не отвечает"
  if curl -s -m 10 https://flamingo.plus/graphql/ | grep -q 'API живёт на другом адресе'; then
    ok "исключение /graphql/ на месте"
  else
    bad "/graphql/ отдаёт НЕ заглушку — сборка сайта отстала или правило потеряно"
  fi
fi

echo
echo "Готово."
