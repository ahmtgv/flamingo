"""GraphQL-layer tests for courses: execute operations through the schema."""

from datetime import date
from types import SimpleNamespace

import pytest
from django.contrib.auth.models import AnonymousUser

from api.schema import schema
from apps.accounts import services as accounts
from common.enums import Role

pytestmark = pytest.mark.django_db


def _ctx(user=None):
    request = SimpleNamespace(META={}, user=user or AnonymousUser())
    return SimpleNamespace(request=request)


CREATE = (
    "mutation($i: CourseInput!) { createCourse(input: $i) "
    "{ id title status level subject owner { specialty } } }"
)
PUBLISH = "mutation($id: ID!) { publishCourse(id: $id) { id status } }"
CATALOG = (
    "query { catalog { totalCount nodes { id title status } pageInfo { hasNextPage endCursor } } }"
)
ENROLL = "mutation($id: ID!) { enroll(courseId: $id) { id status progressPct course { id } } }"
COURSE = "query($id: ID!) { course(id: $id) { id viewerEnrollment { id status } } }"


def test_course_flow_through_schema():
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

    res = schema.execute_sync(
        CREATE,
        variable_values={"i": {"title": "Алгебра", "subject": "Математика", "level": "GRADE_7"}},
        context_value=_ctx(teacher),
    )
    assert res.errors is None, res.errors
    course_id = res.data["createCourse"]["id"]
    assert res.data["createCourse"]["status"] == "DRAFT"
    assert res.data["createCourse"]["owner"]["specialty"] == "Математика"

    res = schema.execute_sync(
        PUBLISH, variable_values={"id": course_id}, context_value=_ctx(teacher)
    )
    assert res.errors is None, res.errors
    assert res.data["publishCourse"]["status"] == "PUBLISHED"

    res = schema.execute_sync(CATALOG, context_value=_ctx())
    assert res.errors is None, res.errors
    assert res.data["catalog"]["totalCount"] == 1
    assert res.data["catalog"]["nodes"][0]["id"] == course_id

    res = schema.execute_sync(
        ENROLL, variable_values={"id": course_id}, context_value=_ctx(student)
    )
    assert res.errors is None, res.errors
    assert res.data["enroll"]["status"] == "ACTIVE"

    res = schema.execute_sync(
        COURSE, variable_values={"id": course_id}, context_value=_ctx(student)
    )
    assert res.errors is None, res.errors
    assert res.data["course"]["viewerEnrollment"]["status"] == "ACTIVE"


LESSON = "query($id: ID!) { lesson(id: $id) { id title } }"


def test_lesson_query_is_enrollment_gated():
    """A-C1: lesson CONTENT goes through can_access_course — owner and ACTIVE-enrolled
    students see it; unenrolled/anonymous get None (the file's denial convention)."""
    from apps.courses import services as courses

    teacher = accounts.register_user(
        email="lg.teacher@example.com",
        password="strongpass1!",
        first_name="И",
        last_name="П",
        role=Role.TEACHER,
        specialty="Математика",
    )
    enrolled = accounts.register_user(
        email="lg.enrolled@example.com",
        password="strongpass1!",
        first_name="П",
        last_name="С",
        role=Role.STUDENT,
        birth_date=date(2008, 1, 1),
    )
    stranger = accounts.register_user(
        email="lg.stranger@example.com",
        password="strongpass1!",
        first_name="Ч",
        last_name="У",
        role=Role.STUDENT,
        birth_date=date(2008, 1, 1),
    )

    course = courses.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    courses.publish_course(teacher, course.id)
    section = courses.create_section(teacher, course.id, title="Раздел 1")
    lesson = courses.create_lesson(teacher, section.id, title="Урок 1")
    courses.enroll(enrolled, course.id)

    def fetch(user):
        res = schema.execute_sync(
            LESSON, variable_values={"id": str(lesson.id)}, context_value=_ctx(user)
        )
        assert res.errors is None, res.errors
        return res.data["lesson"]

    # positive: the owner and an ACTIVE-enrolled student see the lesson
    assert fetch(teacher)["title"] == "Урок 1"
    assert fetch(enrolled)["id"] == str(lesson.id)
    # negative: an authenticated-but-unenrolled student and an anonymous user are denied
    assert fetch(stranger) is None


DISCOVERY = (
    "query($id: ID!) { course(id: $id) { sections { lessons "
    "{ id title status description materials { id body url } } } } }"
)


def test_course_discovery_hides_gated_content_and_drafts():
    """A-authz-1/2: the public course→sections→lessons→materials path is a published-syllabus
    only. Guests/unenrolled see published lesson TITLES but NO description, NO materials, and NO
    DRAFT lessons; enrolled students see description + material bodies/urls; the owner sees drafts.
    """
    from apps.courses import services as courses

    teacher = accounts.register_user(
        email="disc.teacher@example.com",
        password="strongpass1!",
        first_name="И",
        last_name="П",
        role=Role.TEACHER,
        specialty="Математика",
    )
    enrolled = accounts.register_user(
        email="disc.enrolled@example.com",
        password="strongpass1!",
        first_name="П",
        last_name="С",
        role=Role.STUDENT,
        birth_date=date(2008, 1, 1),
    )
    stranger = accounts.register_user(
        email="disc.stranger@example.com",
        password="strongpass1!",
        first_name="Ч",
        last_name="У",
        role=Role.STUDENT,
        birth_date=date(2008, 1, 1),
    )

    course = courses.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    courses.publish_course(teacher, course.id)
    section = courses.create_section(teacher, course.id, title="Раздел 1")
    pub = courses.create_lesson(
        teacher, section.id, title="Открытый урок", description="Приватное содержимое урока"
    )
    courses.publish_lesson(teacher, pub.id)
    courses.add_material(
        teacher, type="text", title="Конспект", lesson_id=pub.id, body="ПОЛНЫЙ ТЕКСТ КОНСПЕКТА"
    )
    courses.add_material(
        teacher, type="link", title="Тренажёр", lesson_id=pub.id, url="https://secret.example.com/x"
    )
    courses.create_lesson(teacher, section.id, title="Черновик урока")  # stays DRAFT
    courses.enroll(enrolled, course.id)

    def sections_for(user):
        res = schema.execute_sync(
            DISCOVERY, variable_values={"id": str(course.id)}, context_value=_ctx(user)
        )
        assert res.errors is None, res.errors
        return res.data["course"]["sections"]

    # Guest + authenticated-but-unenrolled: published title only — no body, no materials, no draft.
    for viewer in (None, stranger):
        lessons = sections_for(viewer)[0]["lessons"]
        assert [lsn["title"] for lsn in lessons] == ["Открытый урок"]  # draft hidden
        assert lessons[0]["description"] is None
        assert lessons[0]["materials"] == []

    # Enrolled: sees the description + material bodies/urls; still no draft.
    el = sections_for(enrolled)[0]["lessons"]
    assert [lsn["title"] for lsn in el] == ["Открытый урок"]
    assert el[0]["description"] == "Приватное содержимое урока"
    assert "ПОЛНЫЙ ТЕКСТ КОНСПЕКТА" in {m["body"] for m in el[0]["materials"]}
    assert "https://secret.example.com/x" in {m["url"] for m in el[0]["materials"]}

    # Owner: sees the DRAFT lesson too.
    owner_titles = {lsn["title"] for lsn in sections_for(teacher)[0]["lessons"]}
    assert owner_titles == {"Открытый урок", "Черновик урока"}
