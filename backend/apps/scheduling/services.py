"""Business logic for scheduling: session lifecycle, attendance, LiveKit tokens."""

from __future__ import annotations

import datetime as dt

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import StudentProfile
from apps.courses.models import Enrollment, Lesson
from common.enums import AttendanceStatus, Role, SessionStatus
from common.exceptions import NotFound, PermissionDenied, ValidationError
from common.livekit import room_token

from .models import Attendance, LessonSession


def _val(x):
    return x.value if hasattr(x, "value") else x


def _lesson_owned_by(user, lesson_id) -> Lesson:
    lesson = Lesson.objects.filter(id=lesson_id).select_related("section__course").first()
    if lesson is None:
        raise NotFound("Lesson not found")
    if lesson.section.course.owner_id != getattr(user, "id", None):
        raise PermissionDenied("Not your lesson")
    return lesson


def _owned_session(user, session_id) -> LessonSession:
    session = (
        LessonSession.objects.filter(id=session_id)
        .select_related("lesson__section__course")
        .first()
    )
    if session is None:
        raise NotFound("Session not found")
    if session.lesson.section.course.owner_id != getattr(user, "id", None):
        raise PermissionDenied("Not your session")
    return session


def _enrollment(user, course) -> Enrollment | None:
    if getattr(user, "role", None) != Role.STUDENT.value:
        return None
    profile = StudentProfile.objects.filter(user=user).first()
    if profile is None:
        return None
    return Enrollment.objects.filter(student=profile, course=course).first()


def _is_participant(user, course) -> bool:
    return course.owner_id == getattr(user, "id", None) or _enrollment(user, course) is not None


# --- lifecycle --------------------------------------------------------------
def schedule_session(user, *, lesson_id, start_at: dt.datetime, group_id=None) -> LessonSession:
    _lesson_owned_by(user, lesson_id)
    return LessonSession.objects.create(lesson_id=lesson_id, start_at=start_at)


def start_session(user, session_id) -> LessonSession:
    session = _owned_session(user, session_id)
    session.status = SessionStatus.LIVE.value
    session.save(update_fields=["status", "updated_at"])
    return session


def end_session(user, session_id) -> LessonSession:
    session = _owned_session(user, session_id)
    session.status = SessionStatus.ENDED.value
    session.end_at = timezone.now()
    session.save(update_fields=["status", "end_at", "updated_at"])
    return session


@transaction.atomic
def join_session(user, session_id) -> tuple[LessonSession, str]:
    session = (
        LessonSession.objects.filter(id=session_id)
        .select_related("lesson__section__course")
        .first()
    )
    if session is None:
        raise NotFound("Session not found")
    course = session.lesson.section.course
    enrollment = _enrollment(user, course)
    is_owner = course.owner_id == getattr(user, "id", None)
    if enrollment is None and not is_owner:
        raise PermissionDenied("Not a participant of this session")
    if session.status != SessionStatus.LIVE.value:
        raise ValidationError("Session is not live")
    if enrollment is not None:
        Attendance.objects.update_or_create(
            session=session,
            student=enrollment.student,
            defaults={"status": AttendanceStatus.PRESENT.value, "joined_at": timezone.now()},
        )
    token = room_token(identity=str(user.id), room=str(session.id))
    return session, token


def set_attendance(user, session_id, student_id, status) -> Attendance:
    session = _owned_session(user, session_id)
    student = StudentProfile.objects.filter(user_id=student_id).first()
    if student is None:
        raise NotFound("Student not found")
    attendance, _ = Attendance.objects.update_or_create(
        session=session, student=student, defaults={"status": _val(status)}
    )
    return attendance


# --- reads ------------------------------------------------------------------
def my_schedule(user, start: dt.datetime, end: dt.datetime) -> list[LessonSession]:
    role = getattr(user, "role", None)
    qs = LessonSession.objects.filter(start_at__gte=start, start_at__lte=end).select_related(
        "lesson__section__course"
    )
    if role == Role.TEACHER.value:
        return list(qs.filter(lesson__section__course__owner_id=user.id))
    if role == Role.STUDENT.value:
        profile = StudentProfile.objects.filter(user=user).first()
        if profile is None:
            return []
        course_ids = Enrollment.objects.filter(student=profile).values_list("course_id", flat=True)
        return list(qs.filter(lesson__section__course_id__in=course_ids))
    return []


def get_session(user, session_id) -> LessonSession | None:
    session = (
        LessonSession.objects.filter(id=session_id)
        .select_related("lesson__section__course")
        .first()
    )
    if session is None:
        return None
    return session if _is_participant(user, session.lesson.section.course) else None


def room_token_for(user, session: LessonSession) -> str | None:
    """Per-viewer roomToken: only a participant of a LIVE session gets one."""
    if user is None or session.status != SessionStatus.LIVE.value:
        return None
    if _is_participant(user, session.lesson.section.course):
        return room_token(identity=str(user.id), room=str(session.id))
    return None
