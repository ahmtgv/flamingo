"""Chat over WebSocket (graphql-ws via Channels), mirroring the SEduM subscription.

The socket is authorised the same way `attentionUpdates` is: the access token arrives in the
graphql-ws ``connection_params`` and is checked against MEMBERSHIP before a single message is
streamed. A subscription is a read, and reads in this module are membership-gated everywhere
else too — a socket must not be the one place that forgets.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import AsyncGenerator

import strawberry
from asgiref.sync import sync_to_async

from common.ws_auth import token_from_connection_params

from .types import ChannelMessage


@sync_to_async
def _authorize_member(token: str, channel_id) -> str | None:
    """Return the viewer's id if they may listen to this channel, else None."""
    from apps.accounts.models import User
    from apps.chat import services
    from apps.chat.models import ChatChannel
    from common.auth import decode_token
    from common.exceptions import AuthError

    if not token:
        return None
    try:
        payload = decode_token(token, expected_type="access")
    except AuthError:
        return None
    user = User.objects.filter(id=payload["sub"], is_active=True).first()
    if user is None:
        return None
    channel = ChatChannel.objects.filter(id=channel_id).first()
    if channel is None:
        return None
    if not (
        services.is_member(user, channel) or services.can_read_without_membership(user, channel)
    ):
        return None
    return str(user.id)


async def stream_messages(ws, channel_id) -> AsyncGenerator[ChannelMessage, None]:
    """Yield messages posted to this channel.

    ``listen_to_channel`` is an async CONTEXT MANAGER that yields the iterator — it must be
    entered with ``async with`` (a bare ``async for`` over it raises TypeError).
    """
    async with ws.listen_to_channel("chat.message", groups=[f"chat_{channel_id}"]) as messages:
        async for message in messages:
            yield ChannelMessage(
                id=strawberry.ID(message["id"]),
                channel_id=strawberry.ID(message["channel_id"]),
                sender_id=strawberry.ID(message["sender_id"]),
                sender_name=message["sender_name"],
                text=message["text"],
                sent_at=dt.datetime.fromisoformat(message["sent_at"]),
                mine=False,
            )


@strawberry.type
class ChatSubscription:
    @strawberry.subscription
    async def channel_message_received(
        self, info: strawberry.Info, channel_id: strawberry.ID
    ) -> AsyncGenerator[ChannelMessage, None]:
        ws = info.context["ws"]
        token = token_from_connection_params(ws.connection_params if ws else None)
        viewer_id = await _authorize_member(token, channel_id)
        if viewer_id is None:
            return
        async for message in stream_messages(ws, channel_id):
            yield ChannelMessage(**{**message.__dict__, "mine": message.sender_id == viewer_id})
