"""Service-level tests for the courses domain (logic + permission boundaries)."""

from datetime import date

import pytest

from apps.accounts import services as accounts
from apps.courses import services
from apps.courses.models import Enrollment, Section
from common.enums import CourseStatus, EnrollmentStatus, Role
from common.exceptions import PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


def make_teacher(email="teacher@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Иван",
        last_name="Петров",
        role=Role.TEACHER,
        specialty="Математика",
    )


def make_student(email="student@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Пётр",
        last_name="Сидоров",
        role=Role.STUDENT,
        birth_date=date(2008, 1, 1),
    )


def test_create_course_requires_teacher():
    parent = accounts.register_user(
        email="p@example.com",
        password="strongpass1!",
        first_name="A",
        last_name="B",
        role=Role.PARENT,
    )
    with pytest.raises(PermissionDenied):
        services.create_course(parent, title="Алгебра", subject="Математика", level="grade_7")


def test_create_and_publish_course():
    teacher = make_teacher()
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    assert course.status == CourseStatus.DRAFT.value
    published = services.publish_course(teacher, course.id)
    assert published.status == CourseStatus.PUBLISHED.value


def test_non_owner_cannot_edit_course():
    owner = make_teacher("owner@example.com")
    other = make_teacher("other@example.com")
    course = services.create_course(owner, title="Алгебра", subject="Математика", level="grade_7")
    with pytest.raises(PermissionDenied):
        services.update_course(other, course.id, title="Взлом")


def test_catalog_returns_only_published():
    teacher = make_teacher()
    draft = services.create_course(teacher, title="Черновик", subject="Физика", level="grade_8")
    published = services.create_course(teacher, title="Готовый", subject="Физика", level="grade_8")
    services.publish_course(teacher, published.id)
    ids = set(services.published_courses().values_list("id", flat=True))
    assert published.id in ids
    assert draft.id not in ids


def test_enroll_published_only_and_no_duplicates():
    teacher = make_teacher()
    student = make_student()
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    with pytest.raises(ValidationError):
        services.enroll(student, course.id)  # still a draft
    services.publish_course(teacher, course.id)
    services.enroll(student, course.id)
    services.enroll(student, course.id)  # idempotent
    assert Enrollment.objects.filter(course=course).count() == 1


def test_enroll_requires_student():
    teacher = make_teacher()
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    services.publish_course(teacher, course.id)
    with pytest.raises(PermissionDenied):
        services.enroll(teacher, course.id)


def test_reorder_sections():
    teacher = make_teacher()
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    a = services.create_section(teacher, course.id, title="A")
    b = services.create_section(teacher, course.id, title="B")
    c = services.create_section(teacher, course.id, title="C")
    services.reorder_sections(teacher, course.id, [c.id, a.id, b.id])
    order = list(
        Section.objects.filter(course=course).order_by("order").values_list("id", flat=True)
    )
    assert order == [c.id, a.id, b.id]


def test_mark_lesson_viewed_updates_progress():
    teacher = make_teacher()
    student = make_student()
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    section = services.create_section(teacher, course.id, title="Раздел 1")
    l1 = services.create_lesson(teacher, section.id, title="Урок 1", duration_min=30)
    l2 = services.create_lesson(teacher, section.id, title="Урок 2", duration_min=30)
    services.publish_lesson(teacher, l1.id)
    services.publish_lesson(teacher, l2.id)
    services.publish_course(teacher, course.id)
    services.enroll(student, course.id)

    enrollment = services.mark_lesson_viewed(student, l1.id)
    assert enrollment.progress_pct == 50
    enrollment = services.mark_lesson_viewed(student, l2.id)
    assert enrollment.progress_pct == 100
    assert enrollment.status == EnrollmentStatus.COMPLETED.value
