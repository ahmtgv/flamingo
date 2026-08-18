"""The live lesson chat, over the room's existing Channels path.

The socket re-checks access before streaming anything: a token is not a membership, and the
lesson's own access rule is the one that decides.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import AsyncGenerator

import strawberry
from asgiref.sync import sync_to_async

from common.ws_auth import token_from_info

from .types import ChatMessage


@sync_to_async
def _may_watch(token: str, session_id) -> bool:
    from apps.accounts.models import User
    from apps.summaries import services
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
        services.chat_messages(user, session_id)  # runs the lesson's own access rule
    except NotFound:
        return False
    return True


@strawberry.type
class SummariesSubscription:
    @strawberry.subscription
    async def chat_message_received(
        self, info: strawberry.Info, session_id: strawberry.ID
    ) -> AsyncGenerator[ChatMessage, None]:
        ws = info.context["ws"]
        token = token_from_info(info)
        if not await _may_watch(token, session_id):
            return
        async with ws.listen_to_channel(
            "lessonchat.message", groups=[f"lessonchat_{session_id}"]
        ) as messages:
            async for message in messages:
                yield ChatMessage(
                    id=strawberry.ID(message["id"]),
                    session_id=strawberry.ID(message["session_id"]),
                    sender_id=strawberry.ID(message["sender_id"]),
                    sender_name=message["sender_name"],
                    text=message["text"],
                    sent_at=dt.datetime.fromisoformat(message["sent_at"]),
                )
