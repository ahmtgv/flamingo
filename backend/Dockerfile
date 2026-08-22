# Flamingo backend — Python 3.12 / Django 5 / Strawberry на ASGI (uvicorn).
#
# Двухэтапная сборка (PROMPT_16 §А6). Раньше образ был dev-only: тянул pytest, moto, ruff и
# black в прод и оставлял в себе `build-essential` — сотню мегабайт компилятора, который
# нужен ровно на время `pip install` и после него превращается в лишнюю поверхность атаки.

# ── этап 1: колёса ────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements-prod.txt ./
RUN pip wheel --wheel-dir /wheels -r requirements-prod.txt

# ── этап 2: то, что поедет ────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# libpq5 — рантайм-часть psycopg. Компилятор во втором этапе не нужен.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /wheels /wheels
COPY requirements-prod.txt ./
RUN pip install --no-index --find-links=/wheels -r requirements-prod.txt \
    && rm -rf /wheels

# 🔴 ВМЕСТЕ С КОДОМ ЕДЕТ ЕГО ОТПЕЧАТОК — `backend/BUILD_COMMIT`, который пишет `deploy.sh`
# перед rsync-ом. После выката ворота спрашивают работающий контейнер, что у него внутри,
# и сравнивают с локальным HEAD: до 22.08 «выкачено» означало «команда не упала», и выкат
# успел дважды солгать молча (контейнер остался на старом образе; rsync не доехал).
#
# ⚠️ НЕ ЗАМЕНЯТЬ НА `ARG GIT_COMMIT`. Аргумент обесценивает только свой слой — `COPY . .`
# при этом остаётся кэшированным, и в образе окажется СТАРЫЙ КОД С НОВОЙ ПЕЧАТЬЮ. Файл
# внутри копируемого дерева физически не может быть свежее кода, рядом с которым лежит.
COPY . .

# Не root. Процесс, который умеет писать в собственный код, — процесс, который умеет
# записать в него чужой.
RUN useradd --system --uid 10001 flamingo \
    && mkdir -p /app/media /app/staticfiles \
    && chown -R flamingo:flamingo /app
USER flamingo

EXPOSE 8000

# `--proxy-headers` обязателен: приложение стоит за Caddy, и без этого uvicorn не передаст
# Django `X-Forwarded-Proto`, а тот сочтёт https-соединение небезопасным (см. settings §А3).
CMD ["uvicorn", "config.asgi:application", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--forwarded-allow-ips", "*"]
