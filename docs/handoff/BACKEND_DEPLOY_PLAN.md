# BACKEND DEPLOY PLAN — как поднять бэкенд и оживить flamingo.plus

**Дата:** 2026-07-23 · **Автор:** ревьюер (Cowork) · **Статус:** решение владельца (план + стоимость, перед выбором пути)

## 0. Зачем это

Сейчас flamingo.plus отдаёт **только фронтенд** (дизайн-оболочка FLAMINGO AIR на Cloudflare Pages). Мы убрали экран входа флагом `VITE_PREVIEW`, и подтвердилось эмпирически: без сервера приложение виснет на «Загрузка…» — каждому экрану нужны данные из GraphQL-API. Значит единственный правильный путь сделать сайт живым — **поднять бэкенд**.

Документ даёт две дороги (staging сейчас / production РФ к запуску), точные шаги, разделение «я / ты» и реальную стоимость. Выбор — за тобой.

---

## 1. Целевая архитектура

```
   Браузер
      │  https (flamingo.plus)          ┌───────────────────────────────┐
      ▼                                  │  БЭКЕНД (api.flamingo.plus)    │
┌──────────────┐   https/wss GraphQL     │                               │
│ Cloudflare   │────────────────────────▶│  Caddy/ALB (TLS) ──▶ Django   │
│ Pages        │   api.flamingo.plus     │        ASGI/uvicorn           │
│ (фронт, есть)│                         │   ┌─────────┬────────┬──────┐ │
└──────────────┘                         │   │Postgres │ Redis  │ S3   │ │
      │                                   │   │  16     │Channels│объект│ │
      │  wss (видео)                      │   └─────────┴────────┴──────┘ │
      ▼                                   └───────────────────────────────┘
┌──────────────┐
│ LiveKit      │  (Cloud на staging / self-host в РФ на проде)
└──────────────┘
```

**Компоненты бэкенда:**
- **Django (ASGI/uvicorn)** — GraphQL по HTTP (`/graphql/`) + WebSocket (подписки graphql-ws). `backend/Dockerfile` уже готов.
- **PostgreSQL 16** — основная БД. Персональные данные (152-ФЗ — на проде только РФ).
- **Redis** — channel layer для подписок (realtime «внимание», статусы, чат, уведомления).
- **Объектное хранилище (S3-совместимое)** — файлы ДЗ и материалы (в БД только ключи, байты — presigned URL). Staging: MinIO. Прод: Yandex Object Storage.
- **LiveKit** — видеокомната. Staging: LiveKit Cloud (тариф Build, бесплатно). Прод: self-host в РФ.
- **Reverse-proxy + TLS** — публикует бэкенд на `api.flamingo.plus` (https + wss).

**Что уже готово в репо:** `backend/Dockerfile`, `infra/docker-compose.yml` (postgres + redis + minio + backend, всё через env), настройки читают `DEBUG`, `ALLOWED_HOSTS`, `POSTGRES_*`, `REDIS_URL`, `S3_*` из окружения. То есть база деплой-готова.

**Чего НЕТ в коде (добавить перед деплоем):**
1. **CORS.** Фронт на `flamingo.plus`, API на `api.flamingo.plus` — это разные origin. В `settings.py` нет `django-cors-headers`. Нужно добавить пакет и `CORS_ALLOWED_ORIGINS=["https://flamingo.plus"]` (+ `CSRF_TRUSTED_ORIGINS`). Токены Bearer в памяти → куки не нужны, CORS простой.
2. **Сид-команда** (`manage.py seed_demo`) — создать синтетические учреждение/группы/учителей/учеников/курсы/расписание/ДЗ, чтобы экраны были наполнены. Для staging обязательна; для прода данные создаются реальной регистрацией.
3. **Prod-обвязка** — Caddyfile (авто-TLS Let's Encrypt) или ALB, `DEBUG=0`, `collectstatic` для админки, снятие флага `VITE_PREVIEW`.

---

## 2. Склейка фронт ↔ бэк (одинаково для обоих путей)

1. **DNS:** запись `api.flamingo.plus` → адрес бэкенда (в Cloudflare DNS).
2. **Env-переменные сборки фронта** (Cloudflare Pages → Variables, я выставлю):
   - `VITE_GRAPHQL_HTTP_URL=https://api.flamingo.plus/graphql/`
   - `VITE_GRAPHQL_WS_URL=wss://api.flamingo.plus/graphql/`
   - `VITE_LIVEKIT_URL=wss://<livekit-хост>`
   - удалить `VITE_PREVIEW` (вернуть настоящий вход).
3. **CORS на Django:** `CORS_ALLOWED_ORIGINS=https://flamingo.plus`.
4. Пересборка фронта (push или Retry) → flamingo.plus начинает ходить в реальный API.

---

## 3. ПУТЬ A — Staging (быстро, рабочее приложение, синтетические данные)

**Цель:** flamingo.plus полностью кликается end-to-end (вход, кабинеты, курсы, расписание, ДЗ, видеокомната) уже на этой неделе. Реальных ПД нет → **152-ФЗ не триггерится**, хостинг — любой (удобно и дёшево — российский VPS).

**Инфраструктура:** 1 VPS (2 vCPU / 4 ГБ) под `docker-compose`: Django + Postgres + Redis + MinIO + Caddy (TLS). LiveKit Cloud (Build, бесплатно). `api.flamingo.plus` → VPS.

**Шаги:**
1. **Ты:** заводишь VPS (напр. Timeweb/Selectel), даёшь мне IP; ставишь DNS `api.flamingo.plus` → IP (проведу через браузер).
2. **Я:** готовлю `infra/docker-compose.prod.yml` + `Caddyfile` + `.env.staging.example` + добавляю `django-cors-headers` + пишу `seed_demo`.
3. **Ты:** на VPS вписываешь секреты в `.env`, запускаешь `docker compose up -d`, `migrate`, `seed_demo` (дам точные команды; секреты вводишь ты).
4. **Я:** выставляю env-переменные фронта в Cloudflare, снимаю `VITE_PREVIEW`, пересобираю.
5. **Вместе:** проверяю вживую — вход сид-пользователем, все экраны, видеокомната.

**Стоимость:** VPS 2 vCPU/4 ГБ ≈ **1 500 ₽/мес** (Timeweb) + LiveKit **бесплатно** (Build) + домен (уже есть) ≈ **~1 500–2 000 ₽/мес** (~$18–25).
**Сроки:** **1–3 дня** (в основном мой prep + твой провижн).
**Оговорки:** это не прод по 152-ФЗ; email-верификацию для staging стаблю (console backend); всплывут 2 бага загрузки файлов (CORS хранилища) — починим.

---

## 4. ПУТЬ B — Production РФ (152-ФЗ, реальный запуск)

**Цель:** реальные пользователи, соответствие 152-ФЗ.

**Инфраструктура (Yandex Cloud, регион РФ):**
- Managed Service for PostgreSQL (РФ, бэкапы).
- Compute (VM или Serverless Containers) под Django.
- Managed Redis/Valkey (или Redis на той же VM для экономии).
- Object Storage (файлы) + настройка CORS бакета.
- Application Load Balancer + TLS-сертификат, `api.flamingo.plus`.
- **LiveKit self-host** на Compute VM в РФ (для строгого 152-ФЗ; LiveKit Cloud — вне РФ).
- SMTP-провайдер (email-верификация).
- Секреты в Yandex Lockbox; бэкапы; мониторинг; CI/CD.

**Пререквизиты запуска (из `FLAMINGO_HANDOVER.md` §5 — «правильно» = закрыть):**
- 2 бага браузерной загрузки файлов (CORS Object Storage);
- поток email-верификации (без него нельзя пускать посторонних);
- аудит field-резолверов на утечки PII;
- жёсткий серверный cap участников, orphan-GC записей.

**Стоимость (ориентир, Yandex Cloud, при цене на 07.2026):**
- Managed PostgreSQL — **от ~$40/мес** (малый кластер).
- Compute 2 vCPU / 4 ГБ — **~$22–25/мес** (1 vCPU ≈ $6,48; 1 ГБ ≈ $2,25 + диск).
- Managed Redis — **~$15–30/мес** (или $0, если Redis на VM).
- Object Storage — **~$1–5/мес** (малый объём).
- ALB + TLS — **~$10–15/мес**.
- LiveKit self-host VM — **~$22/мес** (или LiveKit Ship $50/мес, если РФ-резидентность не критична).
- **Итого ≈ $120–200/мес** (~10 000–17 000 ₽) в зависимости от сайзинга и HA. Плюс SMTP (обычно копейки) и разовый setup.

**Сроки:** **2–6 недель** с учётом хардненинга, пререквизитов, тестов и настройки соответствия.

---

## 5. Кто что делает

| Делаю я (ревьюер + Claude Code) | Делаешь ты (аккаунты/деньги/секреты) |
|---|---|
| Архитектура, prod-compose, Caddyfile, CORS, `seed_demo`, prod-settings | Завести VPS / Yandex Cloud, оплатить |
| Env-шаблоны, точные команды, деплой-доки | Вписать реальные секреты (я их не вижу и не ввожу) |
| Настроить Cloudflare (env, DNS, пересборка) в браузере | Подтвердить DNS/биллинг там, где нужен твой вход |
| Проверка end-to-end, фикс багов, снятие `VITE_PREVIEW` | Прогнать команды на сервере (`up`, `migrate`, `seed`) |

Я **не создаю аккаунты, не ввожу пароли/токены, не двигаю деньги** — это твоя часть по правилам безопасности. Всё остальное — на мне.

---

## 6. Рекомендация

**Сделать Путь A сейчас, Путь B — к запуску.** Причины: (1) приложение по honover-статусу ещё не launch-ready (баги загрузок, нет email-верификации, аудит прав) — гнать сразу в прод 152-ФЗ дорого и преждевременно; (2) Путь A за пару дней и ~1 500 ₽/мес даёт **полностью рабочий flamingo.plus** для реального теста всех флоу и дизайна; (3) наработки Пути A (compose, CORS, seed, env-склейка) на 80% переиспользуются в Пути B — ничего не выбрасываем.

Если решишь сразу B — тоже готов, просто дольше и дороже, и понадобятся твои аккаунты Yandex Cloud + биллинг с самого начала.

---

## 7. Источники цен (проверить на момент оплаты — Yandex менял цены 01.05.2026)

- Yandex Managed PostgreSQL — https://yandex.cloud/en/docs/managed-postgresql/pricing
- Yandex Compute — https://yandex.cloud/en/docs/compute/pricing
- Yandex цены/калькулятор — https://yandex.cloud/en/prices
- LiveKit Cloud — https://livekit.com/pricing
- Timeweb VPS — https://timeweb.cloud/
