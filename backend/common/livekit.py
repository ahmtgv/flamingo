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


def room_token(*, identity: str, room: str, can_publish: bool = True, ttl_hours: int = 6) -> str:
    cfg = getattr(settings, "LIVEKIT", {})
    api_key = cfg.get("api_key") or "devkey"
    secret = cfg.get("api_secret") or settings.SECRET_KEY
    now = dt.datetime.now(dt.UTC)
    claims = {
        "iss": api_key,
        "sub": identity,
        "name": identity,
        "nbf": now,
        "iat": now,
        "exp": now + dt.timedelta(hours=ttl_hours),
        "video": {
            "room": room,
            "roomJoin": True,
            "canPublish": can_publish,
            "canSubscribe": True,
        },
    }
    return jwt.encode(claims, secret, algorithm="HS256")
