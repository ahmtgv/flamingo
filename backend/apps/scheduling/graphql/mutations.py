"""Scheduling mutations: schedule / start / end / join session, set attendance."""

from __future__ import annotations

import datetime as dt

import strawberry

from apps.scheduling import services
from common.auth import require_user
from common.enums import AttendanceStatus

from .types import Attendance, LessonSession, SessionJoin


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

    @strawberry.mutation
    def set_attendance(
        self,
        info: strawberry.Info,
        session_id: strawberry.ID,
        student_id: strawberry.ID,
        status: AttendanceStatus,
    ) -> Attendance:
        return services.set_attendance(require_user(info), session_id, student_id, status)
