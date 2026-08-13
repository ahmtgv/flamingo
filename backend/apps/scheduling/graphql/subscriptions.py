"""Second-screen subscription (masterplan F3.1).

The teacher points the projector at one participant; the projector follows. The payload is a
participant id and nothing else — no metric, no name, no media rides this channel. It is the
narrowest thing that makes the second screen follow the lesson.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

import strawberry
from asgiref.sync import sync_to_async

from .types import ProjectorFocus


@sync_to_async
def _session_exists(session_id) -> bool:
    from apps.scheduling.models import LessonSession

    return LessonSession.objects.filter(id=session_id).exists()


@strawberry.type
class SchedulingSubscription:
    @strawberry.subscription
    async def projector_focus_changed(
        self, info: strawberry.Info, session_id: strawberry.ID
    ) -> AsyncGenerator[ProjectorFocus, None]:
        """Follow the teacher's focus on a second screen.

        Not authenticated with a user token: the listener is a projector, which holds a
        redeemed cast code rather than an account. What it can learn here is one id of a
        participant already visible in the room it is showing — so the channel adds no
        reach beyond the screen it is already displaying.
        """
        if not await _session_exists(session_id):
            return
        ws = info.context["ws"]
        async with ws.listen_to_channel(
            "projector.focus", groups=[f"projector_{session_id}"]
        ) as messages:
            async for message in messages:
                yield ProjectorFocus(
                    session_id=strawberry.ID(message["session_id"]),
                    student_id=(
                        strawberry.ID(message["student_id"]) if message["student_id"] else None
                    ),
                )
