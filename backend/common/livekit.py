"""Mint LiveKit room access tokens (JWT).

The API only issues tokens; media flows client <-> self-hosted LiveKit server.
This needs no LiveKit SDK — a LiveKit access token is just a signed JWT with a
`video` grant. In dev (no LIVEKIT_API_SECRET) it falls back to SECRET_KEY so the
flow is exercisable before a LiveKit server exists.
"""

from __future__ import annotations

import datetime as dt

import jwt
from django.conf import settings


def room_token(
    *,
    identity: str,
    room: str,
    display_name: str | None = None,
    can_publish: bool = True,
    hidden: bool = False,
    ttl_hours: int = 6,
) -> str:
    """Mint a room token.

    ``display_name`` отделяет ИМЯ НА ЭКРАНЕ от ОПОЗНАВАТЕЛЯ. Опознаватель обязан быть
    уникальным в комнате (иначе LiveKit выкинет первого участника, когда войдёт второй
    с тем же), а имя — нет: двух Ань в комнате никто не запрещал. Без этого различия
    вход без регистрации показывал бы людям «Аня#a3f2» вместо «Аня».
    Перенесено из ~/Downloads/flamingo 28.08.2026; добавлен только этот необязательный
    параметр — все прежние вызовы работают как работали.

    ``hidden`` is what makes a second screen a second SCREEN rather than a seventh person:
    LiveKit keeps a hidden participant out of everyone else's participant list, so a
    projector shows the lesson without appearing in it. Paired with ``can_publish=False`` it
    can only ever watch.
    """
    cfg = getattr(settings, "LIVEKIT", {})
    api_key = cfg.get("api_key") or "devkey"
    secret = cfg.get("api_secret") or settings.SECRET_KEY
    # `dt.UTC` — псевдоним `dt.timezone.utc`, появившийся в Python 3.11. На 3.10 файл
    # падал `AttributeError` в момент подписи токена, то есть ровно тогда, когда человек
    # нажимает «Войти». Значение то же — работает на любой версии (замер 28.08.2026).
    now = dt.datetime.now(dt.timezone.utc)
    claims = {
        "iss": api_key,
        "sub": identity,
        "name": display_name or identity,
        "nbf": now,
        "iat": now,
        "exp": now + dt.timedelta(hours=ttl_hours),
        "video": {
            "room": room,
            "roomJoin": True,
            "canPublish": can_publish,
            "canSubscribe": True,
            "hidden": hidden,
        },
    }
    return jwt.encode(claims, secret, algorithm="HS256")
