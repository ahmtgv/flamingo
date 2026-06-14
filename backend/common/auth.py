"""JWT issuing/decoding and request authentication helpers."""

from __future__ import annotations

import datetime as dt
from typing import Any

import jwt
from django.conf import settings

from .exceptions import AuthError

ALGORITHM = "HS256"


def _ttl_access() -> dt.timedelta:
    return dt.timedelta(minutes=getattr(settings, "ACCESS_TOKEN_LIFETIME_MIN", 15))


def _ttl_refresh() -> dt.timedelta:
    return dt.timedelta(days=getattr(settings, "REFRESH_TOKEN_LIFETIME_DAYS", 14))


def _encode(user_id: Any, token_type: str, ttl: dt.timedelta) -> str:
    now = dt.datetime.now(dt.UTC)
    payload = {"sub": str(user_id), "type": token_type, "iat": now, "exp": now + ttl}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(user_id: Any) -> str:
    return _encode(user_id, "access", _ttl_access())


def create_refresh_token(user_id: Any) -> str:
    return _encode(user_id, "refresh", _ttl_refresh())


def issue_tokens(user) -> dict[str, str]:
    return {
        "token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
    }


def decode_token(token: str, expected_type: str | None = None) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("Invalid token") from exc
    if expected_type and payload.get("type") != expected_type:
        raise AuthError("Wrong token type")
    return payload


def authenticate_request(request):
    """Return the User for a valid access token, else None (never raises)."""
    header = request.META.get("HTTP_AUTHORIZATION", "")
    if not header.startswith("Bearer "):
        return None
    try:
        payload = decode_token(header[7:], expected_type="access")
    except AuthError:
        return None
    from apps.accounts.models import User

    try:
        return User.objects.get(id=payload["sub"], is_active=True)
    except (User.DoesNotExist, ValueError):
        return None


# --- resolver helpers -------------------------------------------------------
def get_current_user(info):
    """The authenticated user from GraphQL ``info``, or None."""
    user = getattr(info.context.request, "user", None)
    if user is None or not getattr(user, "is_authenticated", False):
        return None
    return user


def require_user(info):
    user = get_current_user(info)
    if user is None:
        raise AuthError("Authentication required")
    return user
