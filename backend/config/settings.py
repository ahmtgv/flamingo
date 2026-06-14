"""Django settings (MVP). Split into base/dev/prod when deployment is set up."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-change-me")
DEBUG = os.environ.get("DEBUG", "1") == "1"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "strawberry_django",
    "apps.accounts",
]

# JWT bearer auth only (no cookies/sessions) -> no Session/CSRF/Auth middleware.
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "common.middleware.JWTAuthMiddleware",
]

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

DATABASES = {
    "default": {
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
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# JWT lifetimes
ACCESS_TOKEN_LIFETIME_MIN = int(os.environ.get("ACCESS_TOKEN_LIFETIME_MIN", "15"))
REFRESH_TOKEN_LIFETIME_DAYS = int(os.environ.get("REFRESH_TOKEN_LIFETIME_DAYS", "14"))

# Object storage (presigned uploads); wired in the files module.
S3 = {
    "endpoint": os.environ.get("S3_ENDPOINT", ""),
    "bucket": os.environ.get("S3_BUCKET", "flamingo"),
    "access_key": os.environ.get("S3_ACCESS_KEY", ""),
    "secret_key": os.environ.get("S3_SECRET_KEY", ""),
}
