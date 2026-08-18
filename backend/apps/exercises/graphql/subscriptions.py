"""«Показать всем» over the room's existing Channels path (R4.3).

Nothing is stored and nothing but an id travels: the teacher points at a word, and each
client turns to the card it can already read for itself.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

import strawberry
from asgiref.sync import sync_to_async

from common.ws_auth import token_from_info

from .types import WordShown


@sync_to_async
def _may_watch(token: str, session_id) -> bool:
    from apps.accounts.models import User
    from apps.courses.access import can_access_course
    from apps.scheduling.models import LessonSession
    from common.auth import decode_token
    from common.exceptions import AuthError

    if not token:
        return False
    try:
        payload = decode_token(token, expected_type="access")
    except AuthError:
        return False
    user = User.objects.filter(id=payload["sub"], is_active=True).first()
    if user is None:
        return False
    session = (
        LessonSession.objects.filter(id=session_id)
        .select_related("lesson__section__course__owner")
        .first()
    )
    if session is None:
        return False
    return can_access_course(user, session.lesson.section.course)


@strawberry.type
class DictionarySubscription:
    @strawberry.subscription
    async def word_shown(
        self, info: strawberry.Info, session_id: strawberry.ID
    ) -> AsyncGenerator[WordShown, None]:
        ws = info.context["ws"]
        token = token_from_info(info)
        if not await _may_watch(token, session_id):
            return
        async with ws.listen_to_channel("dict.shown", groups=[f"dict_{session_id}"]) as messages:
            async for message in messages:
                yield WordShown(
                    session_id=strawberry.ID(message["session_id"]),
                    item_id=strawberry.ID(message["item_id"]),
                    lemma=message["lemma"],
                )
