"""Business logic for scheduling: session lifecycle, attendance, LiveKit tokens."""

from __future__ import annotations

import datetime as dt

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import StudentProfile
from apps.courses.access import can_access_course
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


# A-C3: session participation IS course-content access — one chokepoint, no drift.
# can_access_course = owner / institutional group / ACTIVE enrollment; pending_payment,
# unenrolled and anonymous are denied. (The old local _enrollment helper ignored
# access_status and group delivery — the two divergences this fix closes.)


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
    if not can_access_course(user, course):
        raise PermissionDenied("Not a participant of this session")
    if session.status != SessionStatus.LIVE.value:
        raise ValidationError("Session is not live")
    # Attendance for ANY participating student — group-delivered students have no personal
    # enrollment but still attend (A-C3); teachers/owners are not attendance rows.
    if getattr(user, "role", None) == Role.STUDENT.value:
        profile = StudentProfile.objects.filter(user=user).first()
        if profile is not None:
            Attendance.objects.update_or_create(
                session=session,
                student=profile,
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
    # select_related down to owner__user so LessonSession.teacherName (owner.user full name)
    # resolves without an extra query per row (A-H1).
    qs = LessonSession.objects.filter(start_at__gte=start, start_at__lte=end).select_related(
        "lesson__section__course__owner__user"
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
        .select_related("lesson__section__course__owner__user")
        .first()
    )
    if session is None:
        return None
    return session if can_access_course(user, session.lesson.section.course) else None


def attendance_for(user, session: LessonSession) -> list[Attendance]:
    """Roster is teacher-only: only the course owner may read who attended. A session is
    readable by any enrolled participant, and student names are PII (CLAUDE.md §2/§5), so the
    attendance list MUST NOT be exposed to non-owners — any other viewer gets an empty list."""
    course = session.lesson.section.course
    if user is not None and course.owner_id == getattr(user, "id", None):
        # select_related student__user so each Attendance.student.user (name) is one query,
        # not one per attendee (A-H1).
        return list(session.attendances.select_related("student__user"))
    return []


def room_token_for(user, session: LessonSession) -> str | None:
    """Per-viewer roomToken: only a participant of a LIVE session gets one."""
    if user is None or session.status != SessionStatus.LIVE.value:
        return None
    if can_access_course(user, session.lesson.section.course):
        return room_token(identity=str(user.id), room=str(session.id))
    return None


def teacher_name_for(session: LessonSession) -> str | None:
    """Display name of the session's teacher (the course owner) — so a student sees a real
    name on the teacher tile instead of an id-slice. This is a SINGLE public-facing name, NOT
    the attendance roster; the resolver is reachable only via a session the viewer may read
    (get_session is already access-gated), so no extra check is needed here."""
    owner = session.lesson.section.course.owner
    user = owner.user
    return f"{user.first_name} {user.last_name}".strip() or None
