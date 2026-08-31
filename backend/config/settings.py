"""Настройки бэкенда первого куска.

Здесь ровно столько Django, сколько нужно, чтобы подписать один токен. Базы нет,
пользователей нет, сессий нет — потому что в первом куске нет ни аккаунтов, ни
хранения (docs/ГРАНИЦА.md §3). Всё это придёт своим куском и своей строкой.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _list(name: str, default: str = "") -> list[str]:
    return [x.strip() for x in os.getenv(name, default).split(",") if x.strip()]


# Пустой ключ — не «поставим потом»: без него токен подписывается ничем.
SECRET_KEY = os.getenv("SECRET_KEY", "") or "небоевой-ключ-только-для-разработки"
DEBUG = os.getenv("DEBUG", "1") == "1"
ALLOWED_HOSTS = _list("ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "corsheaders",
    "room",
    "people",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

# 🔴 Кука едет с сайта на api. flamingo.plus и api.flamingo.plus — РАЗНЫЕ источники,
# но ОДИН сайт: SameSite считает по домену второго уровня, поэтому Lax её пропускает,
# а браузер чужого сайта — нет. Чтобы её видели оба, домен куки общий: .flamingo.plus.
# Пусто (разработка) — кука остаётся на том хосте, который её выдал.
SESSION_COOKIE_DOMAIN = os.getenv("SESSION_COOKIE_DOMAIN", "")

# Без этого браузер не пошлёт куку на чужой источник и не примет Set-Cookie в ответ.
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = _list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# 🔴 База появилась вместе с учётными записями. SQLite, и это не времянка:
# запись здесь — регистрация и смена пароля, то есть единицы в день. Читает один
# процесс. Postgres добавит службу, которую надо обновлять и бэкапить отдельно,
# и ничего не даст взамен на этих числах. День, когда даст, наступит с очередями
# на запись, и тогда меняется одна эта строка.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.getenv("DB_PATH", str(BASE_DIR / "flamingo.sqlite3")),
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "UTC"
USE_TZ = True

# common/livekit.py читает именно этот словарь.
LIVEKIT = {
    "url": os.getenv("LIVEKIT_URL", ""),
    "api_key": os.getenv("LIVEKIT_API_KEY", ""),
    "api_secret": os.getenv("LIVEKIT_API_SECRET", ""),
}
