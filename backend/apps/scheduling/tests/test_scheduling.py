"""Service-level tests for scheduling (lifecycle, attendance, permissions)."""

from datetime import date, timedelta

import jwt
import pytest
from django.conf import settings
from django.utils import timezone

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.scheduling import services as scheduling
from apps.scheduling.models import Attendance
from common.enums import Role, SessionStatus
from common.exceptions import PermissionDenied, ValidationError
from common.livekit import room_token

pytestmark = pytest.mark.django_db


def _student(email):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="С",
        last_name="Т",
        role=Role.STUDENT,
        birth_date=date(2008, 1, 1),
    )


def _setup():
    teacher = accounts.register_user(
        email="t@e.com",
        password="strongpass1!",
        first_name="Т",
        last_name="П",
        role=Role.TEACHER,
        specialty="Математика",
    )
    student = _student("s@e.com")
    course = courses.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    section = courses.create_section(teacher, course.id, title="Раздел")
    lesson = courses.create_lesson(teacher, section.id, title="Урок", duration_min=30)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    courses.enroll(student, course.id)
    return teacher, student, course, lesson


def test_schedule_requires_owner():
    teacher, student, course, lesson = _setup()
    with pytest.raises(PermissionDenied):
        scheduling.schedule_session(student, lesson_id=lesson.id, start_at=timezone.now())


def test_session_lifecycle_and_join():
    teacher, student, course, lesson = _setup()
    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())
    assert session.status == SessionStatus.SCHEDULED.value

    with pytest.raises(ValidationError):  # cannot join before it is live
        scheduling.join_session(student, session.id)

    scheduling.start_session(teacher, session.id)
    joined, token = scheduling.join_session(student, session.id)
    assert token
    assert Attendance.objects.filter(session=joined).count() == 1

    ended = scheduling.end_session(teacher, session.id)
    assert ended.status == SessionStatus.ENDED.value


def test_non_enrolled_cannot_join():
    teacher, _student_, course, lesson = _setup()
    outsider = _student("outsider@e.com")
    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())
    scheduling.start_session(teacher, session.id)
    with pytest.raises(PermissionDenied):
        scheduling.join_session(outsider, session.id)


def test_my_schedule_is_role_aware():
    teacher, student, course, lesson = _setup()
    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())
    frm = timezone.now() - timedelta(days=1)
    to = timezone.now() + timedelta(days=1)
    assert session in scheduling.my_schedule(teacher, frm, to)
    assert session in scheduling.my_schedule(student, frm, to)
    outsider = _student("out2@e.com")
    assert session not in scheduling.my_schedule(outsider, frm, to)


def test_room_token_only_when_live_for_participant():
    teacher, student, course, lesson = _setup()
    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())
    assert scheduling.room_token_for(student, session) is None  # scheduled, not live
    scheduling.start_session(teacher, session.id)
    session.refresh_from_db()
    assert scheduling.room_token_for(student, session)
    outsider = _student("out3@e.com")
    assert scheduling.room_token_for(outsider, session) is None


def test_room_token_is_a_valid_livekit_grant():
    """The minted JWT must carry a real LiveKit VideoGrant (so LiveKit Cloud accepts it).
    Decode with the same secret room_token signs with: the configured LIVEKIT_API_SECRET
    if present (real cloud project), else the SECRET_KEY dev fallback."""
    secret = settings.LIVEKIT.get("api_secret") or settings.SECRET_KEY
    token = room_token(identity="user-1", room="room-1")
    claims = jwt.decode(token, secret, algorithms=["HS256"])
    assert claims["sub"] == "user-1"  # participant identity
    assert claims["iss"]  # API key (project key in prod, 'devkey' in dev)
    grant = claims["video"]
    assert grant["room"] == "room-1"
    assert grant["roomJoin"] is True
    assert grant["canPublish"] is True
    assert grant["canSubscribe"] is True
