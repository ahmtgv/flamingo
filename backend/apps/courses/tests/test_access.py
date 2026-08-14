"""Tests for the central course-content access gate (``can_access_course``).

Access is ENROLLMENT-CONTROLLED, not price-based: owner / institutional-group / actively-
enrolled get in; anonymous and unenrolled are denied even on a free course. Price does not
determine access today (billing is a future ADDITIVE gate). The paid-course tests below set a
price only to document that the seam stays payment-ready — the access result is the same as for
a free course (enrollment-based).
"""

from datetime import date

import pytest

from apps.accounts import services as accounts
from apps.courses import services
from apps.courses.access import can_access_course
from apps.courses.models import Course, Enrollment
from apps.institutions import services as institutions
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
        consent_152fz=True,
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


# --- can_access_course: enrollment-controlled (even for free courses) -------
def test_free_course_is_enrollment_controlled():
    teacher = make_teacher()
    enrolled = make_student("enrolled@example.com")
    outsider = make_student("outsider@example.com")
    course = make_published_course(teacher)  # free (price is None) — still enrollment-gated
    services.enroll(enrolled, course.id)

    assert can_access_course(teacher, course) is True  # owner
    assert can_access_course(enrolled, course) is True  # active enrollment
    assert can_access_course(outsider, course) is False  # unenrolled — denied though free
    assert can_access_course(None, course) is False  # anonymous


# --- payment-ready: price never loosens access; the gate stays enrollment-based -------
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


# --- institutional (group) access — decided inside can_access_course --------
def test_paid_course_access_via_group_membership():
    teacher = make_teacher()
    in_group = make_student("ingroup@example.com")
    outsider = make_student("outsider@example.com")

    # back-office sets up an institution + admin; admin makes a group with one student
    staff = accounts.register_user(
        email="staff@example.com",
        password="strongpass1!",
        first_name="S",
        last_name="T",
        role=Role.ADMIN,
        consent_152fz=True,
    )
    staff.is_staff = True
    staff.save(update_fields=["is_staff"])
    admin = accounts.register_user(
        email="adm@example.com",
        password="strongpass1!",
        first_name="A",
        last_name="D",
        role=Role.ADMIN,
        consent_152fz=True,
    )
    inst = institutions.create_institution(staff, name="Школа №1")
    institutions.add_admin(staff, institution_id=inst.id, admin_user_id=admin.id)
    group = institutions.create_group(admin, institution_id=inst.id, name="7А")
    institutions.add_students_to_group(admin, group.id, [in_group.id])

    # a paid course targeted at that group
    course = make_published_course(teacher)
    Course.objects.filter(id=course.id).update(price=50000, currency="RUB", group_id=group.id)
    course.refresh_from_db()

    # the group member gets access (no individual enrollment); the outsider does not
    assert can_access_course(in_group, course) is True
    assert can_access_course(outsider, course) is False


def test_create_course_persists_and_honors_institutional_group():
    """A-drop-course-inst-group: create_course now PERSISTS the institutional group binding
    (validated) — not via a manual DB update — and can_access_course honors it. A teacher who is
    not a member of the institution cannot bind a course to its group."""
    from apps.institutions.models import InstitutionMembership
    from common.enums import MembershipRole, MembershipStatus
    from common.exceptions import PermissionDenied

    teacher = make_teacher()
    in_group = make_student("ig2@example.com")
    outsider = make_student("out2@example.com")
    staff = accounts.register_user(
        email="staff2@example.com",
        password="strongpass1!",
        first_name="S",
        last_name="T",
        role=Role.ADMIN,
        consent_152fz=True,
    )
    staff.is_staff = True
    staff.save(update_fields=["is_staff"])
    admin = accounts.register_user(
        email="adm2@example.com",
        password="strongpass1!",
        first_name="A",
        last_name="D",
        role=Role.ADMIN,
        consent_152fz=True,
    )
    inst = institutions.create_institution(staff, name="Гимназия №2")
    institutions.add_admin(staff, institution_id=inst.id, admin_user_id=admin.id)
    group = institutions.create_group(admin, institution_id=inst.id, name="8Б")
    institutions.add_students_to_group(admin, group.id, [in_group.id])
    InstitutionMembership.objects.create(
        user=teacher,
        institution=inst,
        role=MembershipRole.TEACHER.value,
        status=MembershipStatus.ACTIVE.value,
    )

    # Bind THROUGH the service (not a raw update).
    course = services.create_course(
        teacher,
        title="Курс",
        subject="Математика",
        level="grade_7",
        institution_id=str(inst.id),
        group_id=str(group.id),
    )
    services.publish_course(teacher, course.id)
    course.refresh_from_db()
    assert str(course.group_id) == str(group.id)
    assert str(course.institution_id) == str(inst.id)
    assert can_access_course(in_group, course) is True
    assert can_access_course(outsider, course) is False

    # A teacher who is NOT a member of the institution cannot bind to its group.
    stranger = make_teacher("stranger.teacher@example.com")
    with pytest.raises(PermissionDenied):
        services.create_course(
            stranger, title="X", subject="Математика", level="grade_7", group_id=str(group.id)
        )
