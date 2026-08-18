"""Subscriptions of a lesson session: the second screen, and the session's own state.

The teacher points the projector at one participant; the projector follows. The payload is a
participant id and nothing else — no metric, no name, no media rides this channel. It is the
narrowest thing that makes the second screen follow the lesson.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

import strawberry
from asgiref.sync import sync_to_async

from common.ws_auth import token_from_info

from .types import LessonSession as LessonSessionType
from .types import ProjectorFocus


@sync_to_async
def _session_for_viewer(token: str, session_id):
    """Занятие, если предъявитель токена вправе на нём быть. Иначе None."""
    from apps.accounts.models import User
    from apps.courses.access import can_access_course
    from apps.scheduling.models import LessonSession
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
    session = (
        LessonSession.objects.filter(id=session_id)
        .select_related("lesson__section__course__owner")
        .first()
    )
    if session is None:
        return None
    course = session.lesson.section.course
    if course.owner.user_id == user.id or can_access_course(user, course):
        return session
    return None


@sync_to_async
def _session_by_id(session_id):
    from apps.scheduling.models import LessonSession

    return LessonSession.objects.filter(id=session_id).first()


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

    @strawberry.subscription
    async def session_status_changed(
        self, info: strawberry.Info, session_id: strawberry.ID
    ) -> AsyncGenerator[LessonSessionType, None]:
        """Занятие началось или закончилось — узнают все, кто в нём.

        🔴 ТРИ МЕСЯЦА ЭТО БЫЛА СТРОКА В КОНТРАКТЕ И БОЛЬШЕ НИЧЕГО (наряд 35 §4). SDL объявлял
        подписку, резолвера не существовало, публикации тоже. На живом уроке это значило:
        преподаватель нажимает «Завершить занятие», у него всё меняется, а класс остаётся
        сидеть в комнате, которая уже не идёт. Ни строки, ни подсказки.

        ⚠️ ПРАВО НА ЧТЕНИЕ ПРОВЕРЯЕТСЯ, как и везде: подписаться может тот, кто вправе быть на
        этом занятии. Иначе по идентификатору занятия посторонний узнавал бы расписание чужого
        класса — мелочь, из которой собирается картина.
        """
        token = token_from_info(info)
        session = await _session_for_viewer(token, session_id)
        if session is None:
            return
        ws = info.context["ws"]
        async with ws.listen_to_channel(
            "session.status", groups=[f"session_{session_id}"]
        ) as messages:
            async for message in messages:
                fresh = await _session_by_id(message["session_id"])
                if fresh is not None:
                    yield fresh
