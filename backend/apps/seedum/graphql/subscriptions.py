"""SEduM subscriptions over WebSocket (graphql-ws via Channels).

``attentionUpdates`` is **teacher-only**: the resolver authenticates from the
graphql-ws ``connection_params`` (the access token) and verifies the caller owns
the session before streaming. Payload is an aggregate ``AttentionMetric`` — never
video. The channel infra is generic so ``sessionStatusChanged`` /
``chatMessageReceived`` / ``notificationReceived`` can drop in later.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import AsyncGenerator

import strawberry
from asgiref.sync import sync_to_async

from apps.seedum import services

from .types import AttentionMetric


@sync_to_async
def _authorize_teacher(token: str, session_id) -> bool:
    from apps.accounts.models import User
    from common.auth import decode_token
    from common.exceptions import AuthError, NotFound

    if not token:
        return False
    try:
        payload = decode_token(token, expected_type="access")
    except AuthError:
        return False
    user = User.objects.filter(id=payload["sub"], is_active=True).first()
    if user is None:
        return False
    try:
        session = services._get_session(session_id)
    except NotFound:
        return False
    return services.is_session_teacher(user, session)


async def stream_attention(ws, session_id) -> AsyncGenerator[AttentionMetric, None]:
    """Yield aggregate ``AttentionMetric``s from the session's channel group.

    ``listen_to_channel`` is an async *context manager* that yields the message
    iterator (Strawberry Channels) — it MUST be entered with ``async with`` (a plain
    ``async for`` over it raises ``TypeError``). Payloads are aggregates, never video.
    """
    async with ws.listen_to_channel(
        "attention.update", groups=[f"attention_{session_id}"]
    ) as messages:
        async for message in messages:
            yield AttentionMetric(
                id=message["id"],
                session_id=message["session_id"],
                student_id=message["student_id"],
                bucket_start=dt.datetime.fromisoformat(message["bucket_start"]),
                avg_attention=message["avg_attention"],
                gaze_on_screen=message.get("gaze_on_screen"),
                eye_openness=message.get("eye_openness"),
                head_yaw=message.get("head_yaw"),
                head_pitch=message.get("head_pitch"),
                alertness=message.get("alertness"),
            )


@strawberry.type
class SeedumSubscription:
    @strawberry.subscription
    async def attention_updates(
        self, info: strawberry.Info, session_id: strawberry.ID
    ) -> AsyncGenerator[AttentionMetric, None]:
        params = info.context.get("connection_params") or {}
        token = params.get("authToken") or params.get("Authorization") or ""
        token = token.removeprefix("Bearer ").strip()
        if not await _authorize_teacher(token, session_id):
            return  # unauthorized → no stream
        async for metric in stream_attention(info.context["ws"], session_id):
            yield metric
