"""GraphQL types for scheduling. Names mirror the SDL (LessonSession, Attendance)."""

from __future__ import annotations

import datetime as dt

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
    def attendance(self, info: strawberry.Info) -> list[Attendance]:
        # Teacher-only: the roster (student names = PII) is scoped to the course owner.
        return services.attendance_for(get_current_user(info), self)

    @strawberry_django.field
    def room_token(self, info: strawberry.Info) -> str | None:
        return services.room_token_for(get_current_user(info), self)

    @strawberry_django.field
    def teacher_name(self) -> str | None:
        # Course owner's display name (not the roster) — labels the teacher tile for students.
        # Reachable only via an access-gated session (get_session), so no per-field check needed.
        return services.teacher_name_for(self)

    @strawberry_django.field
    def teacher_id(self) -> strawberry.ID | None:
        """Which participant in the room IS the teacher (owner decision Р5.1, 2026-08-13).

        A student's strip shows the teacher and their own preview and nothing else, so the
        client has to be able to tell one remote from another. The teacher's own id is the
        only thing that makes that possible — and it is the ONE id here: the roster stays
        teacher-only, exactly as before. A public name without an id was already forcing the
        client to guess «the teacher is the only remote», which stops being true the moment a
        second person joins.
        """
        owner_id = self.lesson.section.course.owner.user_id
        return strawberry.ID(str(owner_id)) if owner_id else None


@strawberry.type
class ProjectorCast:
    """What the teacher reads off their screen to put the lesson on a second one.

    No token here: the code is what travels (out loud, or typed on a tablet), and the token
    is minted only when it is redeemed.
    """

    code: str
    expires_at: dt.datetime
    session_id: strawberry.ID


@strawberry.type
class ProjectorJoin:
    """What the second screen gets: a watch-only, hidden connection and enough to caption it.

    Deliberately thin — a projector is a screen, not an account, so it learns the lesson's
    title and nothing about the people in the room.
    """

    session_id: strawberry.ID
    lesson_title: str
    room_token: str


@strawberry.type
class ProjectorFocus:
    """F3.1: which participant the second screen should enlarge. An id, nothing else."""

    session_id: strawberry.ID
    student_id: strawberry.ID | None


@strawberry.type
class SessionJoin:
    session: LessonSession
    room_token: str
