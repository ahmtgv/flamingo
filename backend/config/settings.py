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
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

CORS_ALLOWED_ORIGINS = _list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# Базы нет. Django этого не требует, пока никто не просит модель.
DATABASES: dict = {}

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "UTC"
USE_TZ = True

# common/livekit.py читает именно этот словарь.
LIVEKIT = {
    "url": os.getenv("LIVEKIT_URL", ""),
    "api_key": os.getenv("LIVEKIT_API_KEY", ""),
    "api_secret": os.getenv("LIVEKIT_API_SECRET", ""),
}
