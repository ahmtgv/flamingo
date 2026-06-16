"""GraphQL types for scheduling. Names mirror the SDL (LessonSession, Attendance)."""

from __future__ import annotations

import strawberry
import strawberry_django
from strawberry import auto

from apps.accounts.graphql.types import StudentProfileType
from apps.courses.graphql.types import Lesson
from apps.institutions.graphql.types import Group as GroupType
from apps.scheduling import models, services
from common.auth import get_current_user
from common.enums import AttendanceStatus, SessionStatus


@strawberry_django.type(models.Attendance)
class Attendance:
    id: auto
    joined_at: auto

    @strawberry_django.field
    def student(self) -> StudentProfileType:
        return self.student

    @strawberry_django.field
    def status(self) -> AttendanceStatus:
        return AttendanceStatus(self.status)

    @strawberry_django.field
    def session(self) -> LessonSession:
        return self.session


@strawberry_django.type(models.LessonSession)
class LessonSession:
    id: auto
    start_at: auto
    end_at: auto

    @strawberry_django.field
    def lesson(self) -> Lesson:
        return self.lesson

    @strawberry_django.field
    def group(self) -> GroupType | None:
        return self.group

    @strawberry_django.field
    def status(self) -> SessionStatus:
        return SessionStatus(self.status)

    @strawberry_django.field
    def recording_url(self) -> str | None:
        # Set by the recording egress webhook/worker later.
        return None

    @strawberry_django.field
    def attendance(self, info: strawberry.Info) -> list[Attendance]:
        # Teacher-only: the roster (student names = PII) is scoped to the course owner.
        return services.attendance_for(get_current_user(info), self)

    @strawberry_django.field
    def room_token(self, info: strawberry.Info) -> str | None:
        return services.room_token_for(get_current_user(info), self)


@strawberry.type
class SessionJoin:
    session: LessonSession
    room_token: str
