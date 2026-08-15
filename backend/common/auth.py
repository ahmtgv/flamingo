"""JWT issuing/decoding and request authentication helpers."""

from __future__ import annotations

import datetime as dt
import uuid
from typing import Any

import jwt
from django.conf import settings

from .exceptions import AuthError

ALGORITHM = "HS256"


def _ttl_access() -> dt.timedelta:
    return dt.timedelta(minutes=getattr(settings, "ACCESS_TOKEN_LIFETIME_MIN", 15))


def _ttl_refresh() -> dt.timedelta:
    return dt.timedelta(days=getattr(settings, "REFRESH_TOKEN_LIFETIME_DAYS", 14))


def _encode(user_id: Any, token_type: str, ttl: dt.timedelta, extra: dict | None = None) -> str:
    now = dt.datetime.now(dt.UTC)
    payload = {"sub": str(user_id), "type": token_type, "iat": now, "exp": now + ttl}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def issue_tokens(user) -> dict[str, str]:
    """Mint an access+refresh pair. Both carry the user's ``token_version`` (A-authz-3): a
    logout/password-reset bumps it and instantly invalidates every outstanding token. The
    refresh token additionally carries a unique ``jti`` so a rotated/revoked refresh token can
    be denylisted individually (see accounts.services.refresh)."""
    tv = getattr(user, "token_version", 0)
    return {
        "token": _encode(user.id, "access", _ttl_access(), {"tv": tv}),
        "refresh_token": _encode(
            user.id, "refresh", _ttl_refresh(), {"tv": tv, "jti": str(uuid.uuid4())}
        ),
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
        user = User.objects.get(id=payload["sub"], is_active=True)
    except (User.DoesNotExist, ValueError):
        return None
    # A-authz-3: a token is valid only while its token_version matches the user's current one;
    # logout / password-reset bump token_version, so stale access tokens are rejected here.
    if payload.get("tv") != user.token_version:
        return None
    return user


def authenticate_device_request(request):
    """The `Device` behind an `Authorization: Device <key>` header, else None (Р5.2).

    Р5.1 shipped the machine key as a mutation argument, accepted at the time as temporary
    because the sidecar did not exist and its shape was unknown. It does now, so there is one
    path: the app sends its key in the same header everything else uses.

    A machine key is not a session — it resolves to a `Device`, not to a `User`. Keeping the
    two apart matters: a device may report that it is alive and how fast its channel is, and
    it must never thereby be able to read a child's homework.
    """
    header = request.META.get("HTTP_AUTHORIZATION", "") if request is not None else ""
    if not header.startswith("Device "):
        return None
    from apps.devices import services as devices

    return devices.authenticate_device(header[7:].strip())


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


def get_current_device(info):
    """The paired machine behind this request, or None."""
    request = getattr(info.context, "request", None)
    return authenticate_device_request(request)


def consenting_user(info):
    """Чьё согласие записывается: вошедший человек — или преподаватель связанной машины.

    🔴 Решение владельца 15.08 (OWNER_SCOPE §26, промпт 18 §Б0-кватер). Шаг 3 мастера отказывал:
    обе мутации согласий требуют `require_user`, а пользовательской сессии в приложении нет и
    не будет (§19.4). Связывание уже доказало, что машина принадлежит этому преподавателю —
    гонять его в браузер посреди мастера незачем.

    ⚠️ Граница из §Б0-тер этим НЕ отменяется. Расширяется ровно один случай: **собственные
    согласия связанного преподавателя**. Работы, оценки, чаты и зеркало ключом машины
    по-прежнему не открываются — там стоит `require_user`, и десять проверок на это остаются.

    Возвращает `(user, device)`: второе — та машина, с которой пришло согласие, или None, если
    его дал сам человек. Это факт учёта, а не право: «кто записал» имеет право быть известным.
    """
    user = get_current_user(info)
    if user is not None:
        return user, None

    device = get_current_device(info)
    if device is None:
        raise AuthError("Authentication required")
    # У машины владелец называется `owner` — это тот преподаватель, который подтвердил
    # связывание в браузере. Он и есть автор согласия.
    if device.owner is None or not device.owner.is_active:
        raise AuthError("Authentication required")
    return device.owner, device


def require_device(info):
    """The paired machine, or a refusal.

    Deliberately NOT interchangeable with `require_user`: this returns a `Device`, so a
    resolver written for a machine cannot be handed a person's session by accident, and a
    machine key opens nothing a person's session opens.
    """
    device = get_current_device(info)
    if device is None:
        raise AuthError("Device authentication required")
    return device
