"""Homework access is routed through courses.access.can_access_course.

These assert the chokepoint is actually the gate for student-side decisions: when
a course becomes paid (price set), a student without active access can no longer
view or submit homework, while an actively-enrolled student and the owning teacher
still can. No resolver re-implements its own access logic.
"""

from datetime import date

import pytest

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.courses.models import Course
from apps.homework import services
from common.enums import HomeworkType, Role
from common.exceptions import PermissionDenied

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
        consent_152fz=True,
    )


def setup_published_homework(teacher):
    course = courses.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    section = courses.create_section(teacher, course.id, title="Раздел 1")
    lesson = courses.create_lesson(teacher, section.id, title="Урок 1", duration_min=30)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    hw = services.create_homework(
        teacher, title="Домашка", type=HomeworkType.TEXT, lesson_id=lesson.id
    )
    services.publish_homework(teacher, hw.id)
    return course, lesson, hw


def test_free_course_homework_is_open():
    """Default-open today: a student can view/submit on a free course."""
    teacher = make_teacher()
    student = make_student()
    course, _lesson, hw = setup_published_homework(teacher)
    courses.enroll(student, course.id)

    assert services.get_homework(student, hw.id) is not None
    sub = services.submit_homework(student, homework_id=hw.id, content_text="ответ")
    assert sub.attempt == 1


def test_paid_course_blocks_student_without_access():
    teacher = make_teacher()
    enrolled = make_student("enrolled@example.com")
    outsider = make_student("outsider@example.com")
    course, _lesson, hw = setup_published_homework(teacher)
    courses.enroll(enrolled, course.id)  # active access by default

    # make the course paid: the chokepoint now gates non-enrolled users
    Course.objects.filter(id=course.id).update(price=50000, currency="RUB")

    # outsider: no access -> cannot view or submit
    assert services.get_homework(outsider, hw.id) is None
    with pytest.raises(PermissionDenied):
        services.submit_homework(outsider, homework_id=hw.id, content_text="нет доступа")

    # enrolled (active) student: still has access through the chokepoint
    assert services.get_homework(enrolled, hw.id) is not None
    assert services.submit_homework(enrolled, homework_id=hw.id, content_text="ок").attempt == 1

    # owning teacher: always sees the homework
    assert services.get_homework(teacher, hw.id) is not None


def test_grading_list_is_owner_only():
    teacher = make_teacher()
    other_teacher = make_teacher("other@example.com")
    student = make_student()
    course, _lesson, hw = setup_published_homework(teacher)
    courses.enroll(student, course.id)
    services.submit_homework(student, homework_id=hw.id, content_text="ответ")

    with pytest.raises(PermissionDenied):
        services.homework_submissions(student, hw.id)
    with pytest.raises(PermissionDenied):
        services.homework_submissions(other_teacher, hw.id)
    assert len(services.homework_submissions(teacher, hw.id)) == 1
