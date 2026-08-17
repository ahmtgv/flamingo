#!/bin/bash
# Собрать серверную половину приложения — упакованный Django.
#
# 🔴 ЗАЧЕМ ЭТОТ ФАЙЛ ВООБЩЕ ПОЯВИЛСЯ (промпт 30 §1).
#
# Сборка пересобирала фронт и НЕ пересобирала сервер: `beforeBuildCommand` звал только
# `npm run build:desktop`, а PyInstaller запускали руками по рецепту из README — и не
# запускали. Файл `sidecar/flamingo-sidecar` был датирован 15 августа, а образы сдавались
# 16, 17 и 18-го. Три ночи подряд владелец получал свежие экраны и трёхдневный сервер:
# ни блокировки, ни ключа встречи, ни зеркала группового ученика внутри приложения не было.
#
# Рецепт в документации — это не шаг сборки. Шаг сборки — то, что нельзя забыть.
#
# Отдельно кладёт `BUILD_STAMP.json`: коммит, время, отпечаток. Он уезжает внутрь
# приложения и отвечает на вопрос «что за сервер лежит в этом образе» — датой файла на
# такое отвечать нельзя, дату меняет любое копирование.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$REPO/backend"
SIDECAR="$REPO/desktop/src-tauri/sidecar"
BUILD_DIR="$REPO/desktop/src-tauri/sidecar-build"
VENV="${FLAMINGO_BUILD_VENV:-/tmp/desk-venv}"

if [ ! -x "$VENV/bin/pyinstaller" ]; then
  echo "→ сборочный venv отсутствует, создаю: $VENV"
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q -r "$BACKEND/requirements-desktop.txt" pyinstaller psycopg
fi

echo "── Серверная половина ───────────────────────────"
cd "$BACKEND"

# `psycopg` стоит в сборочном venv и ИСКЛЮЧАЕТСЯ из бандла: хук PyInstaller для Django
# импортирует все бэкенды баз, без него падает, а в приложении база — SQLite.
"$VENV/bin/pyinstaller" --noconfirm --clean --log-level WARN \
  --distpath "$BUILD_DIR" --name flamingo-sidecar \
  --collect-submodules config --collect-submodules api \
  --collect-submodules apps --collect-submodules common \
  --collect-all strawberry --collect-all strawberry_django --collect-all channels \
  --collect-submodules django --collect-data django \
  --hidden-import config.settings --hidden-import config.settings_desktop \
  --hidden-import config.asgi \
  --exclude-module psycopg --exclude-module psycopg2 --exclude-module psycopg_binary \
  --exclude-module boto3 --exclude-module botocore --exclude-module tkinter \
  --hidden-import uvicorn.loops.auto --hidden-import uvicorn.protocols.http.auto \
  --hidden-import uvicorn.protocols.websockets.auto --hidden-import uvicorn.lifespan.on \
  sidecar_entry.py

rm -rf "$SIDECAR"
mv "$BUILD_DIR/flamingo-sidecar" "$SIDECAR"
rm -rf "$BUILD_DIR"

# --- отпечаток, который уедет внутрь приложения ------------------------------------------
cd "$REPO"
BACKEND_COMMIT="$(git log -1 --format=%H -- backend/)"
BACKEND_WHEN="$(git log -1 --format=%cI -- backend/)"
HEAD_COMMIT="$(git rev-parse HEAD)"
BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
SHA="$(shasum -a 256 "$SIDECAR/flamingo-sidecar" | cut -d' ' -f1)"

cat > "$SIDECAR/BUILD_STAMP.json" <<JSON
{
  "backendCommit": "$BACKEND_COMMIT",
  "backendCommittedAt": "$BACKEND_WHEN",
  "headCommit": "$HEAD_COMMIT",
  "builtAt": "$BUILT_AT",
  "sha256": "$SHA"
}
JSON

echo "  сервер собран из $(echo "$BACKEND_COMMIT" | cut -c1-7), отпечаток $(echo "$SHA" | cut -c1-16)"
