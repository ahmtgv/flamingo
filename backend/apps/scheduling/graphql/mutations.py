"""Scheduling mutations: schedule / start / end / join session, set attendance."""

from __future__ import annotations

import datetime as dt

import strawberry

from apps.scheduling import services
from common.auth import require_user
from common.enums import AttendanceStatus

from .types import (
    Attendance,
    LessonSession,
    ProjectorCast,
    ProjectorFocus,
    ProjectorJoin,
    SessionJoin,
)


@strawberry.input
class ScheduleSessionInput:
    lesson_id: strawberry.ID
    start_at: dt.datetime
    group_id: strawberry.ID | None = None


@strawberry.type
class SchedulingMutation:
    @strawberry.mutation
    def schedule_session(self, info: strawberry.Info, input: ScheduleSessionInput) -> LessonSession:
        return services.schedule_session(
            require_user(info),
            lesson_id=input.lesson_id,
            start_at=input.start_at,
            group_id=input.group_id,
        )

    @strawberry.mutation
    def start_session(self, info: strawberry.Info, session_id: strawberry.ID) -> LessonSession:
        return services.start_session(require_user(info), session_id)

    @strawberry.mutation
    def end_session(self, info: strawberry.Info, session_id: strawberry.ID) -> LessonSession:
        return services.end_session(require_user(info), session_id)

    @strawberry.mutation
    def join_session(self, info: strawberry.Info, session_id: strawberry.ID) -> SessionJoin:
        session, token = services.join_session(require_user(info), session_id)
        return SessionJoin(session=session, room_token=token)

    # --- second screen (F3) ---------------------------------------------------------------
    @strawberry.mutation
    def create_projector_code(
        self, info: strawberry.Info, session_id: strawberry.ID
    ) -> ProjectorCast:
        """Cast this lesson to a second screen. Teacher of the session only; issuing a new
        code revokes the previous one."""
        row = services.create_projector_code(require_user(info), session_id)
        return ProjectorCast(
            code=row.code,
            expires_at=row.expires_at,
            session_id=strawberry.ID(str(row.session_id)),
        )

    @strawberry.mutation
    def redeem_projector_code(self, code: str) -> ProjectorJoin:
        """Exchange a code for a watch-only connection.

        Unauthenticated by design — that is what casting means — so it grants the narrowest
        thing that works: subscriber-only, hidden, this session, briefly.
        """
        session, token = services.redeem_projector_code(code)
        return ProjectorJoin(
            session_id=strawberry.ID(str(session.id)),
            lesson_title=session.lesson.title,
            room_token=token,
        )

    @strawberry.mutation
    def set_projector_focus(
        self,
        info: strawberry.Info,
        session_id: strawberry.ID,
        student_id: strawberry.ID | None = None,
    ) -> ProjectorFocus:
        """F3.1: point the second screen at one participant (or back at the whole room)."""
        focus = services.set_projector_focus(require_user(info), session_id, student_id)
        return ProjectorFocus(
            session_id=session_id,
            student_id=strawberry.ID(focus) if focus else None,
        )

    @strawberry.mutation
    def set_attendance(
        self,
        info: strawberry.Info,
        session_id: strawberry.ID,
        student_id: strawberry.ID,
        status: AttendanceStatus,
    ) -> Attendance:
        return services.set_attendance(require_user(info), session_id, student_id, status)
