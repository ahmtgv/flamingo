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
    "channels",
    "strawberry_django",
    "apps.accounts",
    "apps.courses",
    "apps.scheduling",
    "apps.homework",
    "apps.institutions",
    "apps.seedum",
    "apps.files",
    "apps.compliance",
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

# How long an identical refusal is suppressed before it is written to PolicyDecisionLog
# again (per process). Refusals are evidence of unavailability; the four-hundredth identical
# one within the hour adds no evidence and is a write-amplification vector.
POLICY_AUDIT_THROTTLE_SECONDS = int(os.environ.get("POLICY_AUDIT_THROTTLE_SECONDS", "3600"))

# Realtime (GraphQL subscriptions over WebSocket / graphql-ws). In-memory channel
# layer for native dev (single process); env-switch to Redis for prod/multi-worker.
_CHANNELS_REDIS_URL = os.environ.get("CHANNELS_REDIS_URL")
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

# LiveKit (self-hosted video). The API only mints room tokens.
LIVEKIT = {
    "url": os.environ.get("LIVEKIT_URL", ""),
    "api_key": os.environ.get("LIVEKIT_API_KEY", ""),
    "api_secret": os.environ.get("LIVEKIT_API_SECRET", ""),
}
