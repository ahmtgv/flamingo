"""Live board changes over the room's existing Channels path.

Optimistic by design: a change is broadcast as it lands, and a client applies whatever it
receives. There is no lock and no ordering guarantee beyond last-write-wins, because a canvas
that freezes while somebody thinks is a worse failure than a rare overwrite.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

import strawberry
from asgiref.sync import sync_to_async

from common.ws_auth import token_from_connection_params

from .types import BoardChange, BoardElement, resolved_data


@sync_to_async
def _may_watch(token: str, lesson_id) -> bool:
    from apps.accounts.models import User
    from apps.board import services
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
        services.get_board(user, lesson_id)  # runs the lesson's own access rule
    except NotFound:
        return False
    return True


@strawberry.type
class BoardSubscription:
    @strawberry.subscription
    async def board_changed(
        self, info: strawberry.Info, lesson_id: strawberry.ID
    ) -> AsyncGenerator[BoardChange, None]:
        ws = info.context["ws"]
        token = token_from_connection_params(ws.connection_params if ws else None)
        if not await _may_watch(token, lesson_id):
            return
        async with ws.listen_to_channel("board.change", groups=[f"board_{lesson_id}"]) as messages:
            async for message in messages:
                raw = message.get("element")
                yield BoardChange(
                    lesson_id=strawberry.ID(message["lesson_id"]),
                    kind=message["kind"],
                    element=(
                        BoardElement(
                            id=strawberry.ID(raw["id"]),
                            kind=raw["kind"],
                            author_id=strawberry.ID(raw["author_id"]),
                            author_name=raw["author_name"],
                            x=raw["x"],
                            y=raw["y"],
                            width=raw["width"],
                            height=raw["height"],
                            # По каналу приезжает ключ (см. resolved_data): подписчик
                            # получает ссылку, а не пять мегабайт base64 на каждого в классе.
                            data=resolved_data(raw["data"]),
                            revision=raw["revision"],
                        )
                        if raw
                        else None
                    ),
                    element_id=(
                        strawberry.ID(message["element_id"]) if message.get("element_id") else None
                    ),
                    open_for_students=message.get("open"),
                )
