"""Service-level tests for SEduM (logic + privacy/authorization boundaries)."""

import base64
from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.scheduling.models import LessonSession
from apps.seedum import services
from apps.seedum.models import AttentionMetric, Recommendation
from common.enums import Role
from common.exceptions import PermissionDenied

pytestmark = pytest.mark.django_db


def make_teacher(email="teacher@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Тимур",
        last_name="Учитель",
        role=Role.TEACHER,
        specialty="Математика",
    )


def make_student(email="student@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Стёпа",
        last_name="Ученик",
        role=Role.STUDENT,
        birth_date=date(2009, 1, 1),
    )


def setup_session(teacher, subject="Математика"):
    course = courses.create_course(teacher, title="Алгебра", subject=subject, level="grade_7")
    section = courses.create_section(teacher, course.id, title="Раздел 1")
    lesson = courses.create_lesson(teacher, section.id, title="Урок 1", duration_min=40)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    session = LessonSession.objects.create(lesson=lesson, start_at=timezone.now())
    return course, lesson, session


class _FakeLayer:
    def __init__(self):
        self.sent = []

    async def group_send(self, group, message):
        self.sent.append((group, message))


# --- record_attention: aggregate-only, studentId derived from auth user -----
def test_record_attention_persists_and_derives_student(monkeypatch):
    fake = _FakeLayer()
    monkeypatch.setattr(services, "get_channel_layer", lambda: fake)
    teacher = make_teacher()
    student = make_student()
    _c, _l, session = setup_session(teacher)
    now = timezone.now()

    assert (
        services.record_attention(
            student, session_id=session.id, bucket_start=now, avg_attention=150
        )
        is True
    )
    metric = AttentionMetric.objects.get(lesson_session=session)
    assert metric.student_id == student.id  # derived from the auth user, not input
    assert metric.avg_attention == 100  # clamped to 0..100

    # published the aggregate to the session's live group (never video)
    assert len(fake.sent) == 1
    group, msg = fake.sent[0]
    assert group == f"attention_{session.id}"
    assert msg["type"] == "attention.update"
    assert msg["avg_attention"] == 100
    assert msg["student_id"] == str(student.id)
    assert set(msg) == {"type", "id", "session_id", "student_id", "bucket_start", "avg_attention"}


def test_record_attention_requires_student(monkeypatch):
    monkeypatch.setattr(services, "get_channel_layer", lambda: _FakeLayer())
    teacher = make_teacher()
    _c, _l, session = setup_session(teacher)
    with pytest.raises(PermissionDenied):
        services.record_attention(
            teacher, session_id=session.id, bucket_start=timezone.now(), avg_attention=50
        )


# --- session report (teacher-only) ------------------------------------------
def test_session_attention_teacher_only(monkeypatch):
    monkeypatch.setattr(services, "get_channel_layer", lambda: _FakeLayer())
    teacher = make_teacher()
    other = make_teacher("other@example.com")
    student = make_student()
    _c, _l, session = setup_session(teacher)
    base = timezone.now()
    for i, v in enumerate([60, 80, 40]):
        services.record_attention(
            student,
            session_id=session.id,
            bucket_start=base + timedelta(seconds=10 * i),
            avg_attention=v,
        )

    summary = services.session_attention(teacher, session.id)
    assert summary["average"] == 60
    assert summary["peak"] == 80 and summary["low"] == 40
    assert len(summary["points"]) == 3

    with pytest.raises(PermissionDenied):
        services.session_attention(other, session.id)


# --- analytics (self / authz) -----------------------------------------------
def test_attention_analytics_self_and_authz(monkeypatch):
    monkeypatch.setattr(services, "get_channel_layer", lambda: _FakeLayer())
    teacher = make_teacher()
    student = make_student()
    outsider = make_student("out@example.com")
    _c, _l, session = setup_session(teacher)
    services.record_attention(
        student, session_id=session.id, bucket_start=timezone.now(), avg_attention=85
    )

    a = services.attention_analytics(student)  # own
    assert a["average"] == 85
    assert a["by_subject"][0]["subject"] == "Математика"
    assert any(i["kind"] == "good" for i in a["insights"])

    # another student cannot view this student's analytics
    with pytest.raises(PermissionDenied):
        services.attention_analytics(outsider, student_id=student.id)


# --- recommendations (rule-based) -------------------------------------------
def test_recommendations_generated_and_dismissed(monkeypatch):
    monkeypatch.setattr(services, "get_channel_layer", lambda: _FakeLayer())
    teacher = make_teacher()
    student = make_student()
    _c, _l, session = setup_session(teacher)
    base = timezone.now()
    # attention drops over the session (early high, late low)
    for i, v in enumerate([90, 85, 80, 30, 25, 20]):
        services.record_attention(
            student,
            session_id=session.id,
            bucket_start=base + timedelta(seconds=10 * i),
            avg_attention=v,
        )

    recs = services.recommendations(student.__class__.objects.get(id=student.id))
    assert any("перерыв" in r.body.lower() or "перерыв" in r.title.lower() for r in recs)

    rec = recs[0]
    services.dismiss_recommendation(student, rec.id)
    assert Recommendation.objects.get(id=rec.id).dismissed is True
    assert all(r.id != rec.id for r in services.recommendations(student))


# --- UBP backup (opaque, base64 round-trip) ---------------------------------
def test_ubp_backup_roundtrip_and_delete():
    student = make_student()
    blob = base64.b64encode(b"\x00\x01encrypted-bytes\xff").decode()
    backup = services.backup_ubp(student, encrypted_blob=blob, key_hint="v1")
    assert backup.key_hint == "v1"
    assert services.ubp_blob_b64(backup) == blob  # server stores opaque bytes, returns them

    assert services.get_ubp_backup(student) is not None
    assert services.delete_ubp_backup(student) is True
    assert services.get_ubp_backup(student) is None
