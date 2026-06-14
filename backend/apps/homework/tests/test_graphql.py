"""GraphQL-layer tests for homework: execute operations through the schema."""

from datetime import date
from types import SimpleNamespace

import pytest
from django.contrib.auth.models import AnonymousUser

from api.schema import schema
from apps.accounts import services as accounts
from apps.courses import services as courses
from common.enums import Role

pytestmark = pytest.mark.django_db


def _ctx(user=None):
    request = SimpleNamespace(META={}, user=user or AnonymousUser())
    return SimpleNamespace(request=request)


CREATE = (
    "mutation($i: HomeworkInput!) { createHomework(input: $i) "
    "{ id title type allowRedo publishedAt } }"
)
PUBLISH = "mutation($id: ID!) { publishHomework(id: $id) { id publishedAt } }"
SUBMIT = (
    "mutation($i: SubmitHomeworkInput!) { submitHomework(input: $i) "
    "{ id status attempt contentText } }"
)
GRADE = "mutation($i: GradeInput!) { gradeSubmission(input: $i) { id status score comment } }"
LESSON_HW = (
    "query($id: ID!) { lessonHomework(lessonId: $id) "
    "{ id title viewerSubmission { id status } submissionStats { total graded } } }"
)


def test_homework_flow_through_schema():
    teacher = accounts.register_user(
        email="t@example.com",
        password="strongpass1!",
        first_name="И",
        last_name="П",
        role=Role.TEACHER,
        specialty="Математика",
    )
    student = accounts.register_user(
        email="s@example.com",
        password="strongpass1!",
        first_name="П",
        last_name="С",
        role=Role.STUDENT,
        birth_date=date(2008, 1, 1),
    )
    course = courses.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    section = courses.create_section(teacher, course.id, title="Раздел 1")
    lesson = courses.create_lesson(teacher, section.id, title="Урок 1", duration_min=30)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    courses.enroll(student, course.id)

    # teacher creates + publishes homework
    res = schema.execute_sync(
        CREATE,
        variable_values={"i": {"title": "Домашка", "type": "TEXT", "lessonId": str(lesson.id)}},
        context_value=_ctx(teacher),
    )
    assert res.errors is None, res.errors
    hw_id = res.data["createHomework"]["id"]
    assert res.data["createHomework"]["type"] == "TEXT"
    assert res.data["createHomework"]["publishedAt"] is None

    res = schema.execute_sync(PUBLISH, variable_values={"id": hw_id}, context_value=_ctx(teacher))
    assert res.errors is None, res.errors
    assert res.data["publishHomework"]["publishedAt"] is not None

    # student submits
    res = schema.execute_sync(
        SUBMIT,
        variable_values={"i": {"homeworkId": hw_id, "contentText": "мой ответ"}},
        context_value=_ctx(student),
    )
    assert res.errors is None, res.errors
    assert res.data["submitHomework"]["status"] == "SUBMITTED"
    assert res.data["submitHomework"]["attempt"] == 1
    submission_id = res.data["submitHomework"]["id"]

    # teacher grades
    res = schema.execute_sync(
        GRADE,
        variable_values={"i": {"submissionId": submission_id, "score": 95, "comment": "Отлично"}},
        context_value=_ctx(teacher),
    )
    assert res.errors is None, res.errors
    assert res.data["gradeSubmission"]["status"] == "GRADED"
    assert res.data["gradeSubmission"]["score"] == 95

    # student sees the homework on the lesson with their own submission
    res = schema.execute_sync(
        LESSON_HW, variable_values={"id": str(lesson.id)}, context_value=_ctx(student)
    )
    assert res.errors is None, res.errors
    rows = res.data["lessonHomework"]
    assert len(rows) == 1
    assert rows[0]["viewerSubmission"]["status"] == "GRADED"
    # stats are owner-only -> zeros for the student
    assert rows[0]["submissionStats"]["graded"] == 0

    # teacher sees real stats
    res = schema.execute_sync(
        LESSON_HW, variable_values={"id": str(lesson.id)}, context_value=_ctx(teacher)
    )
    assert res.errors is None, res.errors
    assert res.data["lessonHomework"][0]["submissionStats"]["graded"] == 1
