"""GraphQL-layer tests for SEduM: execute operations through the schema."""

import base64
from datetime import date
from types import SimpleNamespace

import pytest
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

from api.schema import schema
from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.scheduling.models import LessonSession
from apps.seedum import services
from common.enums import Role

pytestmark = pytest.mark.django_db


def _ctx(user=None):
    request = SimpleNamespace(META={}, user=user or AnonymousUser())
    return SimpleNamespace(request=request)


REPORT = "mutation($i: AttentionInput!){ reportAttention(input: $i) }"
BACKUP = "mutation($i: UbpBackupInput!){ backupUbp(input: $i){ encryptedBlob keyHint } }"
UBP = "query { ubpBackup { encryptedBlob keyHint } }"
SESSION_ATT = (
    "query($id: ID!){ sessionAttention(sessionId: $id){ averageAttention peak low "
    "points { value } } }"
)


def test_report_and_session_attention_through_schema(monkeypatch):
    monkeypatch.setattr(services, "get_channel_layer", lambda: None)  # no live group needed here
    teacher = accounts.register_user(
        email="t@example.com",
        password="strongpass1!",
        first_name="Т",
        last_name="У",
        role=Role.TEACHER,
        specialty="Математика",
    )
    student = accounts.register_user(
        email="s@example.com",
        password="strongpass1!",
        first_name="С",
        last_name="У",
        role=Role.STUDENT,
        birth_date=date(2009, 1, 1),
    )
    course = courses.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    section = courses.create_section(teacher, course.id, title="Раздел 1")
    lesson = courses.create_lesson(teacher, section.id, title="Урок 1", duration_min=40)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    session = LessonSession.objects.create(lesson=lesson, start_at=timezone.now())

    res = schema.execute_sync(
        REPORT,
        variable_values={
            "i": {
                "sessionId": str(session.id),
                "bucketStart": timezone.now().isoformat(),
                "avgAttention": 72,
            }
        },
        context_value=_ctx(student),
    )
    assert res.errors is None, res.errors
    assert res.data["reportAttention"] is True

    # teacher reads the post-session report
    res = schema.execute_sync(
        SESSION_ATT, variable_values={"id": str(session.id)}, context_value=_ctx(teacher)
    )
    assert res.errors is None, res.errors
    assert res.data["sessionAttention"]["averageAttention"] == 72


def test_ubp_backup_through_schema():
    student = accounts.register_user(
        email="u@example.com",
        password="strongpass1!",
        first_name="У",
        last_name="Б",
        role=Role.STUDENT,
        birth_date=date(2009, 1, 1),
    )
    blob = base64.b64encode(b"opaque-encrypted").decode()
    res = schema.execute_sync(
        BACKUP,
        variable_values={"i": {"encryptedBlob": blob, "keyHint": "v1"}},
        context_value=_ctx(student),
    )
    assert res.errors is None, res.errors
    assert res.data["backupUbp"]["encryptedBlob"] == blob

    res = schema.execute_sync(UBP, context_value=_ctx(student))
    assert res.errors is None, res.errors
    assert res.data["ubpBackup"]["keyHint"] == "v1"
