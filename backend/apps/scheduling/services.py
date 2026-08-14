"""Business logic for scheduling: session lifecycle, attendance, LiveKit tokens."""

from __future__ import annotations

import datetime as dt
import secrets

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import StudentProfile
from apps.courses.access import can_access_course
from apps.courses.models import Enrollment, Lesson
from common.enums import AttendanceStatus, Role, SessionStatus
from common.exceptions import NotFound, PermissionDenied, ValidationError
from common.livekit import room_token

from .models import Attendance, LessonSession, ProjectorCode


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
    lesson = _lesson_owned_by(user, lesson_id)
    group = None
    if group_id is not None:
        # Institutional (Option A) session: the target group must belong to the course's
        # institution (which was itself validated at course-creation). B2C sessions leave it null.
        from apps.institutions.models import Group

        group = Group.objects.filter(id=group_id).first()
        if group is None:
            raise NotFound("Group not found")
        course = lesson.section.course
        if course.institution_id is None or str(group.institution_id) != str(course.institution_id):
            raise ValidationError("Group must belong to the course's institution")
    return LessonSession.objects.create(lesson_id=lesson_id, start_at=start_at, group=group)


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
    # A second screen must not outlive the lesson it was showing.
    revoke_projector_codes(session)
    _mirror_the_diary(session)
    return session


def _mirror_the_diary(session) -> None:
    """Занятие закончилось — строка появилась в дневнике каждого (Р5.4-Б, §20.5.1 п.1).

    Дневник сводит в один вид то, что уже лежало по разным таблицам: когда было занятие, был
    ли на нём ученик, сколько курса пройдено. Пишется по событию, как и всё остальное в
    зеркале, — «занятие закончилось» и есть событие.

    Лучшее усилие: копия не должна уметь отменить окончание урока.
    """
    from apps.courses.models import Enrollment
    from apps.meetingpoint import mirror

    attended = {str(a.student_id): a.status for a in Attendance.objects.filter(session=session)}
    rows = Enrollment.objects.filter(course=session.lesson.section.course).select_related("student")
    for enrollment in rows:
        try:
            mirror.mirror_diary(
                session,
                enrollment.student,
                attendance=attended.get(str(enrollment.student_id), AttendanceStatus.ABSENT.value),
                progress_pct=getattr(enrollment, "progress_pct", None),
            )
        except Exception:  # noqa: BLE001
            continue


# --- second screen (masterplan F3: cast, not a second login) --------------------------------
#: Long enough to walk to the tablet and type it, short enough that a photographed screen is
#: not a lasting key.
PROJECTOR_CODE_TTL = dt.timedelta(minutes=15)
#: How long the tablet may keep watching once connected — capped by the lesson anyway.
PROJECTOR_TOKEN_TTL_HOURS = 4
#: No 0/O/1/I: this is read off a screen and typed by hand, in a hurry, from across a room.
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _new_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))


def revoke_projector_codes(session: LessonSession) -> int:
    return ProjectorCode.objects.filter(session=session, revoked_at__isnull=True).update(
        revoked_at=timezone.now()
    )


@transaction.atomic
def create_projector_code(user, session_id) -> ProjectorCode:
    """The teacher casts the lesson to a second screen.

    Only the session's own teacher may do this, and only one code is live at a time: issuing
    a new one revokes the previous, so a code read aloud last week cannot come back.
    """
    session = _owned_session(user, session_id)
    revoke_projector_codes(session)
    for _ in range(10):  # collision retry; the alphabet makes this practically never happen
        code = _new_code()
        if not ProjectorCode.objects.filter(code=code).exists():
            return ProjectorCode.objects.create(
                session=session,
                code=code,
                created_by=user,
                expires_at=timezone.now() + PROJECTOR_CODE_TTL,
            )
    raise ValidationError("Could not allocate a projector code")


def redeem_projector_code(code: str) -> tuple[LessonSession, str]:
    """Exchange a code for a watch-only token. Deliberately unauthenticated — that is the
    whole point of casting — so what it grants is the narrowest thing that works:

    * subscriber-only and HIDDEN, so the screen can never publish and never appears in the
      room as a participant (it is also therefore not a person in the ≤N cap);
    * bound to this one session, and dead the moment the lesson ends or the code expires;
    * it carries no identity, so it can read nothing else in the product.
    """
    row = (
        ProjectorCode.objects.filter(code=(code or "").strip().upper(), revoked_at__isnull=True)
        .select_related("session__lesson__section__course")
        .first()
    )
    if row is None or row.expires_at < timezone.now():
        raise NotFound("Projector code not found")
    session = row.session
    if session.status != SessionStatus.LIVE.value:
        raise ValidationError("Session is not live")

    row.last_used_at = timezone.now()
    row.save(update_fields=["last_used_at", "updated_at"])
    token = room_token(
        identity=f"projector-{row.id}",
        room=str(session.id),
        can_publish=False,
        hidden=True,
        ttl_hours=PROJECTOR_TOKEN_TTL_HOURS,
    )
    return session, token


def set_projector_focus(user, session_id, student_id) -> str | None:
    """F3.1: the teacher points the second screen at one pupil.

    The payload is a participant id and nothing else — no metric rides along. Teacher-only,
    because the second screen shows the room to a whole class.
    """
    session = _owned_session(user, session_id)
    focus = str(student_id) if student_id else None
    layer = get_channel_layer()
    if layer is not None:
        async_to_sync(layer.group_send)(
            f"projector_{session.id}",
            {"type": "projector.focus", "session_id": str(session.id), "student_id": focus},
        )
    return focus


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
