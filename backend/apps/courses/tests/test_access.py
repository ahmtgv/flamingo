"""Tests for the payment-readiness seam: defaults and the central access gate.

These lock in two things while the seam is unused: (1) the new model fields keep
everything open/free by default, and (2) ``can_access_course`` is default-open for
free courses yet already structured for the future paid path. No resolver is wired
through it yet (see the TODO in ``courses/access.py``), so none of this changes
current behaviour.
"""

from datetime import date

import pytest

from apps.accounts import services as accounts
from apps.courses import services
from apps.courses.access import can_access_course
from apps.courses.models import Course, Enrollment
from common.enums import AccessStatus, Role

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


def make_published_course(teacher):
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    return services.publish_course(teacher, course.id)


# --- defaults: open/free ----------------------------------------------------
def test_new_course_is_free_by_default():
    teacher = make_teacher()
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    assert course.price is None
    assert course.currency is None


def test_new_enrollment_access_status_defaults_active():
    teacher = make_teacher()
    student = make_student()
    course = make_published_course(teacher)
    enrollment = services.enroll(student, course.id)
    assert enrollment.access_status == AccessStatus.ACTIVE.value


# --- can_access_course: default-open for free courses -----------------------
def test_free_course_is_open_to_everyone():
    teacher = make_teacher()
    student = make_student()
    course = make_published_course(teacher)  # price is None => free

    assert can_access_course(None, course) is True  # anonymous
    assert can_access_course(student, course) is True  # unenrolled student
    assert can_access_course(teacher, course) is True  # owner


# --- forward-looking: the seam is structured for the future paid path -------
# (No resolver calls this yet, so these document intent without gating anything.)
def test_paid_course_blocks_anonymous_and_unenrolled():
    teacher = make_teacher()
    student = make_student()
    course = make_published_course(teacher)
    Course.objects.filter(id=course.id).update(price=50000, currency="RUB")
    course.refresh_from_db()

    assert can_access_course(None, course) is False  # anonymous
    assert can_access_course(student, course) is False  # unenrolled student


def test_paid_course_allows_owner_and_active_enrollment():
    teacher = make_teacher()
    student = make_student()
    course = make_published_course(teacher)
    services.enroll(student, course.id)  # access_status defaults to active
    Course.objects.filter(id=course.id).update(price=50000, currency="RUB")
    course.refresh_from_db()

    assert can_access_course(teacher, course) is True  # owner
    assert can_access_course(student, course) is True  # active enrollment


def test_paid_course_blocks_pending_payment_enrollment():
    teacher = make_teacher()
    student = make_student()
    course = make_published_course(teacher)
    services.enroll(student, course.id)
    Enrollment.objects.filter(course=course).update(
        access_status=AccessStatus.PENDING_PAYMENT.value
    )
    Course.objects.filter(id=course.id).update(price=50000, currency="RUB")
    course.refresh_from_db()

    assert can_access_course(student, course) is False
