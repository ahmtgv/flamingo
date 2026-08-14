"""The handshake stream (Р5.1).

Each participant listens on a channel of their own — `signal_<session>_<user>` — so a
handshake reaches the one person it is addressed to. Broadcasting to the room instead would
hand every pupil's network addresses to every other pupil, which is a worse leak than it
first sounds: an ICE candidate is a home IP address.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

import strawberry
from asgiref.sync import sync_to_async

from common.enums import SignalKind

from .types import Signal


@sync_to_async
def _peer_id(token: str, session_id) -> str | None:
    from apps.accounts.models import User
    from apps.signalling import services
    from common.auth import decode_token
    from common.exceptions import AuthError, NotFound

    if not token:
        return None
    try:
        payload = decode_token(token, expected_type="access")
    except AuthError:
        return None
    user = User.objects.filter(id=payload["sub"], is_active=True).first()
    if user is None:
        return None
    try:
        services.session_or_deny(user, session_id)  # the lesson's own access rule
    except NotFound:
        return None
    return str(user.id)


@strawberry.type
class SignallingSubscription:
    @strawberry.subscription
    async def signals(
        self, info: strawberry.Info, session_id: strawberry.ID
    ) -> AsyncGenerator[Signal, None]:
        ws = info.context["ws"]
        token = (ws.connection_params or {}).get("token", "") if ws.connection_params else ""
        peer = await _peer_id(token, session_id)
        if peer is None:
            return
        async with ws.listen_to_channel(
            "signal.message", groups=[f"signal_{session_id}_{peer}"]
        ) as messages:
            async for message in messages:
                yield Signal(
                    session_id=strawberry.ID(message["session_id"]),
                    from_peer=strawberry.ID(message["from_peer"]),
                    to_peer=strawberry.ID(message["to_peer"]),
                    kind=SignalKind(message["kind"]),
                    payload=message["payload"],
                )
