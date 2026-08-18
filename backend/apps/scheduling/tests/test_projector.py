"""Second screen — cast codes and hidden watch-only tokens (PROMPT_13 R3.1, masterplan F3).

What is worth pinning: a projector can only ever watch, it is not a person in the room, the
code dies with the lesson, and pointing it at a pupil moves an id and nothing else.
"""

from datetime import date, timedelta

import jwt
import pytest
from django.conf import settings
from django.utils import timezone

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.scheduling import services as scheduling
from apps.scheduling.models import ProjectorCode
from common.enums import Role, SessionStatus
from common.exceptions import NotFound, PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Ирина",
        last_name="Соколова",
        role=Role.TEACHER,
        specialty="English",
        consent_152fz=True,
    )


def make_pupil(email="p@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2010, 1, 1),
        consent_152fz=True,
    )


def live_session(teacher):
    course = courses.create_course(teacher, title="English A2", subject="Английский", level="adult")
    section = courses.create_section(teacher, course.id, title="Unit 4 · Travel")
    lesson = courses.create_lesson(
        teacher, section.id, title="Asking for directions", duration_min=45
    )
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    session = scheduling.schedule_session(
        teacher, lesson_id=lesson.id, start_at=timezone.now() + timedelta(minutes=5)
    )
    scheduling.start_session(teacher, session.id)
    session.refresh_from_db()
    return course, lesson, session


def claims_of(token: str) -> dict:
    secret = (getattr(settings, "LIVEKIT", {}) or {}).get("api_secret") or settings.SECRET_KEY
    return jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})


# --- casting ---------------------------------------------------------------------------------
def test_the_teacher_casts_and_gets_a_readable_code():
    teacher = make_teacher()
    _, _, session = live_session(teacher)

    cast = scheduling.create_projector_code(teacher, session.id)
    assert len(cast.code) == 6
    # Read off a screen and typed by hand: no characters that turn into each other.
    assert not set(cast.code) & set("O0I1")
    assert cast.expires_at > timezone.now()


def test_only_the_sessions_teacher_may_cast():
    teacher = make_teacher()
    _, _, session = live_session(teacher)
    intruder = make_teacher("other@example.com")
    pupil = make_pupil()
    courses.enroll(pupil, session.lesson.section.course.id)

    for actor in (intruder, pupil):
        with pytest.raises(PermissionDenied):
            scheduling.create_projector_code(actor, session.id)


def test_a_new_code_revokes_the_previous_one():
    """A code read aloud last week must not come back."""
    teacher = make_teacher()
    _, _, session = live_session(teacher)

    first = scheduling.create_projector_code(teacher, session.id)
    second = scheduling.create_projector_code(teacher, session.id)

    first.refresh_from_db()
    assert first.revoked_at is not None
    with pytest.raises(NotFound):
        scheduling.redeem_projector_code(first.code)
    assert scheduling.redeem_projector_code(second.code)[0].id == session.id


# --- what the code buys ------------------------------------------------------------------------
def test_the_projector_token_can_only_watch_and_is_hidden():
    """The two flags that make a second screen a SCREEN and not a seventh participant."""
    teacher = make_teacher()
    _, lesson, session = live_session(teacher)
    cast = scheduling.create_projector_code(teacher, session.id)

    joined, token = scheduling.redeem_projector_code(cast.code)
    assert joined.id == session.id
    grant = claims_of(token)["video"]
    assert grant["canPublish"] is False, "a projector must never be able to publish"
    assert grant["hidden"] is True, "a projector must not appear in the room's participant list"
    assert grant["canSubscribe"] is True
    assert grant["room"] == str(session.id)


def test_the_projector_identity_is_not_a_person():
    teacher = make_teacher()
    _, _, session = live_session(teacher)
    cast = scheduling.create_projector_code(teacher, session.id)

    _, token = scheduling.redeem_projector_code(cast.code)
    identity = claims_of(token)["sub"]
    assert identity.startswith("projector-")
    assert str(teacher.id) not in identity, "the tablet does not borrow the teacher's identity"


def test_redeeming_is_case_insensitive_and_tolerates_stray_spaces():
    """It is typed by hand on a tablet, in a hurry."""
    teacher = make_teacher()
    _, _, session = live_session(teacher)
    cast = scheduling.create_projector_code(teacher, session.id)

    assert scheduling.redeem_projector_code(f"  {cast.code.lower()} ")[0].id == session.id


def test_an_unknown_or_expired_code_gets_nothing():
    teacher = make_teacher()
    _, _, session = live_session(teacher)
    cast = scheduling.create_projector_code(teacher, session.id)

    with pytest.raises(NotFound):
        scheduling.redeem_projector_code("ZZZZZZ")

    ProjectorCode.objects.filter(id=cast.id).update(
        expires_at=timezone.now() - timedelta(minutes=1)
    )
    with pytest.raises(NotFound):
        scheduling.redeem_projector_code(cast.code)


def test_a_code_is_useless_before_the_lesson_is_live():
    teacher = make_teacher()
    _, _, session = live_session(teacher)
    cast = scheduling.create_projector_code(teacher, session.id)
    session.status = SessionStatus.SCHEDULED.value
    session.save(update_fields=["status"])

    with pytest.raises(ValidationError):
        scheduling.redeem_projector_code(cast.code)


def test_ending_the_lesson_kills_the_second_screen():
    """A second screen must not outlive the lesson it was showing."""
    teacher = make_teacher()
    _, _, session = live_session(teacher)
    cast = scheduling.create_projector_code(teacher, session.id)

    scheduling.end_session(teacher, session.id)

    cast.refresh_from_db()
    assert cast.revoked_at is not None
    with pytest.raises(NotFound):
        scheduling.redeem_projector_code(cast.code)


def test_a_projector_is_not_counted_as_a_participant_anywhere():
    """It holds no attendance row and belongs to no person — so it cannot fill a seat."""
    from apps.scheduling.models import Attendance

    teacher = make_teacher()
    _, _, session = live_session(teacher)
    cast = scheduling.create_projector_code(teacher, session.id)
    scheduling.redeem_projector_code(cast.code)

    assert Attendance.objects.filter(session=session).count() == 0


# --- focus (F3.1) --------------------------------------------------------------------------------
def test_the_teacher_points_the_second_screen_and_only_an_id_travels(monkeypatch):
    sent = []

    class FakeLayer:
        async def group_send(self, group, message):
            sent.append((group, message))

    monkeypatch.setattr(scheduling, "get_channel_layer", lambda: FakeLayer())
    teacher = make_teacher()
    _, _, session = live_session(teacher)
    pupil = make_pupil()

    scheduling.set_projector_focus(teacher, session.id, pupil.id)

    # ⚠️ В комнату теперь уходит ДВА рода сообщений: фокус второго экрана и статус занятия
    # (`sessionStatusChanged`, промпт 35 §4). Берём своё по типу, а не «первое попавшееся»:
    # иначе тест ловил бы соседа и краснел на исправном коде.
    ((group, payload),) = [pair for pair in sent if pair[1]["type"] == "projector.focus"]
    assert group == f"projector_{session.id}"
    assert payload["student_id"] == str(pupil.id)
    # No metric rides this channel — the payload is an id and the session, nothing else.
    assert set(payload) == {"type", "session_id", "student_id"}


def test_clearing_the_focus_sends_the_whole_room_back(monkeypatch):
    sent = []

    class FakeLayer:
        async def group_send(self, group, message):
            sent.append(message)

    monkeypatch.setattr(scheduling, "get_channel_layer", lambda: FakeLayer())
    teacher = make_teacher()
    _, _, session = live_session(teacher)

    assert scheduling.set_projector_focus(teacher, session.id, None) is None
    focus = [m for m in sent if m["type"] == "projector.focus"]
    assert focus[0]["student_id"] is None


def test_only_the_sessions_teacher_may_move_the_focus():
    teacher = make_teacher()
    _, _, session = live_session(teacher)
    pupil = make_pupil()
    courses.enroll(pupil, session.lesson.section.course.id)

    with pytest.raises(PermissionDenied):
        scheduling.set_projector_focus(pupil, session.id, pupil.id)


def test_an_ordinary_join_is_still_a_publishing_participant():
    """The projector work must not have quietly changed what a real join grants."""
    teacher = make_teacher()
    course, _, session = live_session(teacher)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)

    _, token = scheduling.join_session(pupil, session.id)
    grant = claims_of(token)["video"]
    assert grant["canPublish"] is True
    assert grant["hidden"] is False
