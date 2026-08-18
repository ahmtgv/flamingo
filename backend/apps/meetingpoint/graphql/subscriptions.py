"""The «преподаватель не в сети» screen, told the moment it stops being true (Р5.0).

What travels is a slug and a boolean. A pupil waiting at a link learns that the host came up
— not where the machine is, not what it is doing, and nothing about anyone else waiting.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

import strawberry
from asgiref.sync import sync_to_async

from common.ws_auth import token_from_info

from .types import HostPresence


@sync_to_async
def _may_watch(token: str, slug: str) -> bool:
    from apps.accounts.models import User
    from apps.meetingpoint import services
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
        services.view_by_slug(user, slug)  # the link's own rule decides
    except NotFound:
        return False
    return True


@strawberry.type
class MeetingPointSubscription:
    @strawberry.subscription
    async def host_presence_changed(
        self, info: strawberry.Info, slug: str
    ) -> AsyncGenerator[HostPresence, None]:
        ws = info.context["ws"]
        token = token_from_info(info)
        if not await _may_watch(token, slug):
            return
        async with ws.listen_to_channel("host.presence", groups=[f"host_{slug}"]) as messages:
            async for message in messages:
                yield HostPresence(slug=message["slug"], online=bool(message["online"]))
