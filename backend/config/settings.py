"""Django settings (MVP). Split into base/dev/prod when deployment is set up."""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load secrets/config from backend/.env (git-ignored) before reading os.environ
# below. `override=False` (the default) means real process env vars (shell `export`
# in dev, CI secrets) still win — this only fills what is unset.
load_dotenv(BASE_DIR / ".env")

_INSECURE_SECRET = "dev-insecure-change-me"
SECRET_KEY = os.environ.get("SECRET_KEY", _INSECURE_SECRET)
DEBUG = os.environ.get("DEBUG", "1") == "1"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")


# A-settings hardening: dev-friendly defaults above stay permissive for local work, but a
# production boot (DEBUG=0) must never run with a placeholder/weak SECRET_KEY or a wildcard
# ALLOWED_HOSTS — fail fast rather than start insecurely.
def _check_prod_security(debug: bool, secret_key: str, allowed_hosts: list[str]) -> None:
    if debug:
        return
    from django.core.exceptions import ImproperlyConfigured

    if secret_key == _INSECURE_SECRET or len(secret_key) < 32:
        raise ImproperlyConfigured(
            "SECRET_KEY must be set to a strong value (>= 32 chars) when DEBUG is off."
        )
    if "*" in allowed_hosts:
        raise ImproperlyConfigured("ALLOWED_HOSTS must be an explicit host list when DEBUG is off.")


_check_prod_security(DEBUG, SECRET_KEY, ALLOWED_HOSTS)

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "corsheaders",
    "channels",
    "strawberry_django",
    "common",
    "apps.accounts",
    "apps.courses",
    "apps.scheduling",
    "apps.homework",
    "apps.institutions",
    "apps.seedum",
    "apps.files",
    "apps.compliance",
    "apps.chat",
    "apps.board",
    "apps.exercises",
    "apps.summaries",
    "apps.devices",
    "apps.meetingpoint",
    "apps.signalling",
    "apps.oversight",
]

# --- Jurisdiction gate (docs/rnd/RND_01_JURISDICTION.md §6.1-6.2) ------------------------
# The legal regime of THIS deployment's data circuit. RU and EU are separate circuits, not
# replicas (§5(v)), so the circuit a request is served from is itself a jurisdictional fact
# — and the deployment region is the strongest technical criterion available (§6.1).
#
# This repository is the RF circuit: personal data of RF citizens is stored in RF (152-FZ
# art. 18(5)), and the owner's decision is that the RF profile runs with everything on.
# An EU deployment MUST set FLAMINGO_JURISDICTION=eu, which turns the camera-derived
# features off at the API. Any unrecognised value resolves to UNKNOWN → strictest profile,
# so a misconfigured deployment fails closed rather than open.
DEPLOYMENT_JURISDICTION = os.environ.get("FLAMINGO_JURISDICTION", "ru")

# --- Cabinet portability (owner decisions Р5.2 / OWNER_SCOPE §18, 2026-08-13) --------------
# Where an encrypted copy of a personal cabinet may be synced to. Empty = sync is off, which
# is the pilot's state: the desktop app holds the data and the server only signals.
#
# It is a SETTING and not a constant on purpose — the owner asked for no «данные только
# локально» hardcodes, so turning synchronisation on later is a deployment change and not a
# rewrite. Whatever this points at receives an opaque client-encrypted blob (common/
# portability.py), the same contract UbpBackup already honours.
CABINET_SYNC_TARGET = os.environ.get("FLAMINGO_CABINET_SYNC_TARGET", "")

# How long an identical refusal is suppressed before it is written to PolicyDecisionLog
# again (per process). Refusals are evidence of unavailability; the four-hundredth identical
# one within the hour adds no evidence and is a write-amplification vector.
POLICY_AUDIT_THROTTLE_SECONDS = int(os.environ.get("POLICY_AUDIT_THROTTLE_SECONDS", "3600"))

# Realtime (GraphQL subscriptions over WebSocket / graphql-ws). In-memory channel
# layer for native dev (single process); env-switch to Redis for prod/multi-worker.
# compose передаёт REDIS_URL — принимаем оба имени, чтобы не разойтись с конфигурацией.
_CHANNELS_REDIS_URL = os.environ.get("CHANNELS_REDIS_URL") or os.environ.get("REDIS_URL")
if _CHANNELS_REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [_CHANNELS_REDIS_URL]},
        }
    }
else:
    CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}

# JWT bearer auth only (no cookies/sessions) -> no Session/CSRF/Auth middleware.
#
# А1 (PROMPT_16): CorsMiddleware стоит ПЕРВЫМ и это не стилистика — предполётный OPTIONS
# должен получить ответ раньше, чем до него доберётся что-нибудь, что его отвергнет.
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "common.middleware.JWTAuthMiddleware",
]


def _origins(name: str) -> list[str]:
    """Список origin из окружения. Пусто — значит пусто, а не «всем можно».

    🔒 Ни домена, ни IP в коде (PROMPT_16 §9). Значения приходят из `.env.production`, и
    отсутствие переменной означает, что никому не разрешено, — умолчание, которое ошибается
    в безопасную сторону.
    """
    raw = os.environ.get(name, "")
    return [o.strip() for o in raw.split(",") if o.strip()]


# 🔴 Origin приложения преподавателя. НАЙДЕНО ЖИВОЙ ПРОВЕРКОЙ 15.08 и объясняет находку №1
# владельца целиком: «код связывания не появляется».
#
# Страница внутри Tauri отдаётся собственным протоколом, и её origin — `tauri://localhost`
# (на Windows `http://tauri.localhost`). Для WKWebView запрос к адресу API — обычный
# кросс-доменный, и без разрешения он не уходит ВООБЩЕ. Предполётный запрос отвечал 200 без
# заголовка `access-control-allow-origin`, браузер молча его отбрасывал, мутация падала, а
# экран показывал заглушку «код истёк». Ни одной строки в логах сервера при этом не появлялось —
# именно поэтому дефект и дожил до живой сборки.
#
# Почему в коде, а не в `.env.production`: это не домен развёртывания, а КОНСТАНТА ПЛАТФОРМЫ —
# origin нашего же приложения, одинаковый у всех установок и на всех стендах. Запрет §9 —
# про адреса развёртывания (их и нет здесь), а не про то, чем является сам продукт. Забыть его
# в переменной окружения — значит получить ту же поломку на следующем сервере.
DESKTOP_APP_ORIGINS = ["tauri://localhost", "http://tauri.localhost"]

CORS_ALLOWED_ORIGINS = _origins("CORS_ALLOWED_ORIGINS") + DESKTOP_APP_ORIGINS
CSRF_TRUSTED_ORIGINS = _origins("CSRF_TRUSTED_ORIGINS")
# Заголовок Authorization несёт JWT; куки не используются вовсе, поэтому credentials не нужны
# и не разрешаются — это на одну дыру меньше без единой потери.
CORS_ALLOW_CREDENTIALS = False

# В разработке фронт живёт на случайном порту vite, и перечислять их бессмысленно.
# ⚠️ Только при DEBUG: в проде это открыло бы API любому сайту.
if DEBUG and not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGIN_REGEXES = [r"^http://localhost:\d+$", r"^http://127\.0\.0\.1:\d+$"]

ROOT_URLCONF = "config.urls"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,  # serves the GraphiQL template
        "OPTIONS": {"context_processors": []},
    }
]


def _database_from_url(url: str) -> dict | None:
    """`postgres://user:pass@host:port/name` → настройки Django.

    🔴 Найдено при сверке с `infra/prod/docker-compose.prod.yml`: compose передаёт контейнеру
    `DATABASE_URL`, а настройки его не читали и шли на `localhost:5432` — то есть в пустоту
    внутри контейнера. Прод не поднялся бы вовсе, и это выяснилось бы на сервере.

    Разбираем стандартной библиотекой: тащить `dj-database-url` ради восьми строк не стоит.
    """
    from urllib.parse import unquote, urlparse

    parsed = urlparse(url)
    if parsed.scheme not in ("postgres", "postgresql"):
        return None
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": (parsed.path or "/").lstrip("/"),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "",
        "PORT": str(parsed.port or ""),
    }


_DATABASE_URL = os.environ.get("DATABASE_URL", "")
DATABASES = {
    "default": _database_from_url(_DATABASE_URL)
    or {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "flamingo"),
        "USER": os.environ.get("POSTGRES_USER", "flamingo"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "flamingo"),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "ru"
# 🔴 СУТКИ СЧИТАЮТСЯ ПО МОСКВЕ, А НЕ ПО UTC (найдено RnD-заходом 18.08, промпт 30 §3.4).
#
# Стояло `UTC`, и «день» на сервере не совпадал с днём человека. Продукт российский, рынок
# РФ и СНГ; Москва — UTC+3, и расхождение видно на живых числах:
#
#   ученик занимался в пн 23:00 и во вт 01:00 по Москве → сервер видел ОДИН день,
#     и серия «дней подряд» не росла, хотя ребёнок занимался два дня;
#   занимался во вт 02:00 и во вт 22:00 по Москве      → сервер видел ДВА дня,
#     и серия росла дважды за один день.
#
# Тем же промахом «Сегодня» на стартовой у преподавателя в час ночи показывало вчерашние
# занятия, а урок в 02:00 попадал в полосе недели на предыдущий день.
#
# 🔴 ЭТО УМОЛЧАНИЕ, А НЕ ПРАВИЛО (решение владельца §37 от 18.08 — «все по Москве» ОТМЕНЕНО).
#
# Дословно: «часовые пояса — время должно быть локальное». Каждый видит время в СВОЁМ поясе:
# преподаватель в Москве и ученик во Владивостоке смотрят на одно занятие и видят разное время
# на часах, и оба правильные.
#
# Здесь остаётся только то, чем пользуются, когда человек ещё не сказал свой пояс. Границы
# суток («сегодня», серия занятий, «требует внимания», недельная полоса) считает
# `common/whenfor.py` по полю `User.timezone`, а не по этой строке. Не возвращать сюда
# «все по Москве» — это отменённое решение.
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# JWT lifetimes
ACCESS_TOKEN_LIFETIME_MIN = int(os.environ.get("ACCESS_TOKEN_LIFETIME_MIN", "15"))
REFRESH_TOKEN_LIFETIME_DAYS = int(os.environ.get("REFRESH_TOKEN_LIFETIME_DAYS", "14"))

# Object storage (presigned uploads) — S3-compatible, endpoint-configurable: native MinIO in
# dev (defaults below), Yandex Object Storage (RF region) in prod via env (152-FZ). Same
# env-switch shape as CHANNEL_LAYERS / LIVEKIT: env overrides, dev-friendly fallbacks.
S3 = {
    "endpoint": os.environ.get("S3_ENDPOINT", "http://localhost:9000"),
    "bucket": os.environ.get("S3_BUCKET", "flamingo"),
    "access_key": os.environ.get("S3_ACCESS_KEY", "flamingo"),
    "secret_key": os.environ.get("S3_SECRET_KEY", "flamingo-secret"),
    # SigV4 region — MinIO accepts any; Yandex uses ru-central1 (set via env in prod).
    "region": os.environ.get("S3_REGION", "us-east-1"),
}

# TURN relay (Р5.1). The desktop host sends media peer-to-peer; TURN carries it only for the
# 20-40% of real networks that refuse a direct path (R5_DESKTOP_HOST_BUDGET.md §1). The API
# mints short-lived coturn REST credentials (common/turn.py) and never sees a packet.
#
# `secret` is the coturn `static-auth-secret`. Empty = no relay configured: the API then hands
# out an unusable credential and says so, rather than one signed with a stand-in.
TURN = {
    "urls": os.environ.get("TURN_URLS", ""),  # comma-separated turn:/turns: URLs
    "secret": os.environ.get("TURN_SECRET", ""),
    "ttl_seconds": int(os.environ.get("TURN_TTL_SECONDS", "3600")),
}

# LiveKit (self-hosted video). The API only mints room tokens.
# --- почта ------------------------------------------------------------------------------
#
# 🔴 ПОЧТЫ В ПРОДУКТЕ НЕ БЫЛО ВОВСЕ (наряд 37 §3, найдено 18.08). `_send_password_reset_email`
# писал ссылку в лог сервера и ничего не отправлял. Человек, забывший пароль, был заперт
# навсегда: кнопка «Забыли пароль?» делала вид, что письмо ушло. Владельца спасал только
# доступ к серверу.
#
# ⚠️ ПУСТОЙ `EMAIL_HOST` — ЭТО НЕ «ПОЧТА СЛОМАЛАСЬ», А «ПОЧТА НЕ НАСТРОЕНА», и продукт обязан
# говорить об этом человеку словами, а не изображать отправку. Различает эти два состояния
# `email_is_configured()` в `common/mailer.py`.
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "1") == "1"
# ⚠️ БЕЗ УМОЛЧАНИЯ С НАШИМ ДОМЕНОМ — так велит сторож `test_the_turn_config_comes_from_the_
# environment_and_nothing_is_baked_in`, и он прав: адрес продукта — свойство окружения, а не
# кода. Он поймал меня на этой же строке 18.08, когда я вписал домен «для удобства».
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "")
#: Куда писать человеку, если восстановление недоступно. Публичный адрес, не секрет.
SUPPORT_EMAIL = os.environ.get("SUPPORT_EMAIL", "")
EMAIL_BACKEND = (
    "django.core.mail.backends.smtp.EmailBackend"
    if EMAIL_HOST
    else "django.core.mail.backends.dummy.EmailBackend"
)

LIVEKIT = {
    "url": os.environ.get("LIVEKIT_URL", ""),
    "api_key": os.environ.get("LIVEKIT_API_KEY", ""),
    "api_secret": os.environ.get("LIVEKIT_API_SECRET", ""),
}


# --- Прод-контур (PROMPT_16 §А3) --------------------------------------------------------
# 🔴 SECURE_PROXY_SSL_HEADER. Приложение стоит за Caddy, который терминирует TLS и ходит к
# нам по http. Без этой строки Django считает КАЖДОЕ соединение небезопасным: `is_secure()`
# врёт, редиректы уводят на http, а `secure`-cookie не ставится вовсе. Caddy передаёт
# `X-Forwarded-Proto` (см. infra/prod/Caddyfile), uvicorn запущен с `--proxy-headers`.
#
# ⚠️ Заголовку можно верить ТОЛЬКО потому, что снаружи к приложению не подойти: порт 8000
# не опубликован, единственный путь внутрь — через Caddy. Опубликовать порт наружу = разрешить
# любому объявить своё соединение защищённым.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

if not DEBUG:
    # Caddy уже присылает HSTS; повторять его из Django незачем, а вот эти две вещи —
    # его дело и наше одновременно, и стоят они ноль.
    SECURE_CONTENT_TYPE_NOSNIFF = True
    # Редирект на https делает Caddy, до Django небезопасный запрос просто не доходит.
    SECURE_SSL_REDIRECT = False

# Логи в stdout: их собирает docker, и файла на диске быть не должно — ротацию всё равно
# никто не настроит, а диск на VPS кончится в самый неудобный момент.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "plain"},
    },
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
    "loggers": {
        # Django и так шумит на INFO; ошибки запросов нужны, остальное — нет.
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
    },
}

# Статика: в проде админки Django нет (INSTALLED_APPS её не содержит), отдавать нечего.
# STATIC_URL нужен самому Django, чтобы не спотыкаться на reverse().
STATIC_URL = "/static/"
STATIC_ROOT = os.environ.get("STATIC_ROOT", str(BASE_DIR / "staticfiles"))
