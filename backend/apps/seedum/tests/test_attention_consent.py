"""Анализ внимания по умолчанию выключен — D2 step 3, OWNER_SCOPE §19.

The sheet gives the reason and it is worth keeping in the test that holds it: «это не
осторожность, а уважение: включать наблюдение за вниманием ребёнка должно быть осознанным
действием, а не следствием того, что кто-то не снял галочку».

So the default is enforced by the server, not by whichever component last drew the switch.
"""

from __future__ import annotations

from datetime import date

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.scheduling import services as scheduling
from apps.seedum import services
from apps.seedum.models import AttentionMetric
from common.enums import Role
from common.exceptions import PermissionDenied

pytestmark = pytest.mark.django_db


class _FakeLayer:
    async def group_send(self, *a, **k):
        return None


def _cast(monkeypatch):
    monkeypatch.setattr(services, "get_channel_layer", lambda: _FakeLayer())


def _lesson_with_a_pupil():
    teacher = accounts.register_user(
        email="t@example.com",
        password="strongpass1!",
        first_name="Люция",
        last_name="Валерьевна",
        role=Role.TEACHER,
        consent_152fz=True,
    )
    pupil = accounts.register_user(
        email="p@example.com",
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2011, 5, 1),
        consent_152fz=True,
    )
    course = courses.create_course(teacher, title="English A2", subject="Английский", level="a2")
    section = courses.create_section(teacher, course.id, title="Unit 4")
    lesson = courses.create_lesson(teacher, section.id, title="Travel", duration_min=40)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    courses.enroll(pupil, course.id)
    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())
    return teacher, pupil, session


def test_a_fresh_account_has_attention_analysis_off():
    _t, pupil, _s = _lesson_with_a_pupil()
    assert pupil.consent_attention is False
    assert pupil.consent_attention_at is None


def test_nothing_is_recorded_until_someone_turns_it_on(monkeypatch):
    _cast(monkeypatch)
    _t, pupil, session = _lesson_with_a_pupil()

    accepted = services.record_attention(
        pupil, session_id=session.id, bucket_start=timezone.now(), avg_attention=77
    )
    assert accepted is False
    assert AttentionMetric.objects.count() == 0


def test_once_turned_on_the_bucket_lands(monkeypatch):
    _cast(monkeypatch)
    _t, pupil, session = _lesson_with_a_pupil()
    pupil.consent_attention = True
    pupil.save(update_fields=["consent_attention"])

    assert (
        services.record_attention(
            pupil, session_id=session.id, bucket_start=timezone.now(), avg_attention=77
        )
        is True
    )
    assert AttentionMetric.objects.count() == 1


def test_turning_it_off_again_stops_the_next_bucket(monkeypatch):
    _cast(monkeypatch)
    _t, pupil, session = _lesson_with_a_pupil()
    pupil.consent_attention = True
    pupil.save(update_fields=["consent_attention"])
    services.record_attention(
        pupil, session_id=session.id, bucket_start=timezone.now(), avg_attention=77
    )

    pupil.consent_attention = False
    pupil.save(update_fields=["consent_attention"])
    assert (
        services.record_attention(
            pupil, session_id=session.id, bucket_start=timezone.now(), avg_attention=80
        )
        is False
    )
    # What was already stored stays: one averaged number per interval is all that ever left
    # the device, and withdrawing consent is not a retraction of the lesson that happened.
    assert AttentionMetric.objects.count() == 1


def test_the_consent_check_never_stands_in_for_a_permission_check(monkeypatch):
    """⚠️ Ordering, and the reason it is a test rather than a comment.

    Put the consent check first and a stranger gets «no» for the wrong reason: a permission
    boundary quietly becomes a preference, and the refusal stops being auditable as one. A
    non-participant must be refused as a non-participant whether or not they consented.
    """
    _cast(monkeypatch)
    teacher, _p, session = _lesson_with_a_pupil()
    stranger = accounts.register_user(
        email="x@example.com",
        password="strongpass1!",
        first_name="Чужой",
        last_name="Человек",
        role=Role.STUDENT,
        birth_date=date(2011, 5, 1),
        consent_152fz=True,
    )
    assert stranger.consent_attention is False
    with pytest.raises(PermissionDenied):
        services.record_attention(
            stranger, session_id=session.id, bucket_start=timezone.now(), avg_attention=50
        )
    # And with consent granted it is still a permission failure, not a silent False.
    stranger.consent_attention = True
    stranger.save(update_fields=["consent_attention"])
    with pytest.raises(PermissionDenied):
        services.record_attention(
            stranger, session_id=session.id, bucket_start=timezone.now(), avg_attention=50
        )
    assert teacher is not None
