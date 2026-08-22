"""Tests for the central course-content access gate (``can_access_course``).

Access is ENROLLMENT-CONTROLLED, not price-based: owner / institutional-group / actively-
enrolled get in; anonymous and unenrolled are denied even on a free course. Price does not
determine access today (billing is a future ADDITIVE gate). The paid-course tests below set a
price only to document that the seam stays payment-ready — the access result is the same as for
a free course (enrollment-based).
"""

import datetime as dt
import uuid
from datetime import date

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.accounts.services import consents_for_self
from apps.courses import services
from apps.courses.access import can_access_course, students_of_course
from apps.courses.models import Course, Enrollment
from apps.institutions import services as institutions
from common.enums import AccessStatus, EnrollmentStatus, Role
from common.exceptions import NotFound, PermissionDenied, ValidationError

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
    # §54.1: заявка из каталога висит, пока преподаватель не примет, поэтому тест принимает
    # её явно. Раньше здесь хватало одного `enroll` — это и было изменённое правило.
    services.approve_enrollment(teacher, services.request_enrollment(enrolled, course.id).id)

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
    # Приняли заявку (§54.1); `access_status` при этом остаётся ACTIVE по умолчанию —
    # это и проверяется: приём преподавателя и оплата живут в разных полях.
    services.approve_enrollment(teacher, services.request_enrollment(student, course.id).id)
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


# --- кого касается занятие: пояса учеников (лист «Создание курса и занятия») --
def test_course_audience_is_owner_only():
    """
    🔴 Имя и город чужого ребёнка — персональные данные. Список отдаётся ТОЛЬКО владельцу
    курса: знание `courseId` правом не является.
    """
    from apps.courses import services

    owner = make_teacher("aud.owner@example.com")
    stranger = make_teacher("aud.stranger@example.com")
    course = make_published_course(owner)
    pupil = make_student("aud.p@example.com")
    services.enroll(pupil, course.id)

    assert [m["name"] for m in services.course_audience(owner, course.id)] == [pupil.display_name]
    with pytest.raises(PermissionDenied):
        services.course_audience(stranger, course.id)
    with pytest.raises(PermissionDenied):
        services.course_audience(pupil, course.id)


def test_course_audience_says_when_a_timezone_is_not_named():
    """
    Пояс не назван — отдаём `None`, а не подставляем свой. Подставленный пояс выглядит как
    знание, которого нет, и преподаватель поставит занятие «удобно» тому, о ком не знает
    ничего.
    """
    from apps.courses import services

    owner = make_teacher("aud.o2@example.com")
    course = make_published_course(owner)
    silent = make_student("aud.silent@example.com")
    named = make_student("aud.named@example.com")
    named.timezone = "Asia/Shanghai"
    named.save(update_fields=["timezone"])
    services.enroll(silent, course.id)
    services.enroll(named, course.id)

    zones = {m["student_id"]: m["timezone"] for m in services.course_audience(owner, course.id)}
    assert zones[str(silent.id)] is None, "пояс не назван — говорим об этом, а не подставляем свой"
    assert zones[str(named.id)] == "Asia/Shanghai"


# --- приглашение в курс: как позвать постороннего (§53) ---------------------
def test_invite_is_one_per_course_not_one_per_click():
    """
    Приглашение одно на курс. Иначе преподаватель, открывший экран трижды, раздаёт три кода
    и сам не знает, какой из них у ученика.
    """
    from apps.courses import services

    teacher = make_teacher("inv.t@example.com")
    course = make_published_course(teacher)
    first = services.course_invite(teacher, course.id)
    again = services.course_invite(teacher, course.id)
    assert first.id == again.id
    assert first.code.startswith("FLM-")


def test_invite_belongs_to_the_owner_only():
    """Код курса раздаёт тот, чей курс. Иначе позвать в чужой курс мог бы кто угодно."""
    from apps.courses import services

    owner = make_teacher("inv.o@example.com")
    stranger = make_teacher("inv.s@example.com")
    course = make_published_course(owner)
    with pytest.raises(PermissionDenied):
        services.course_invite(stranger, course.id)


def test_redeem_puts_a_stranger_into_the_course():
    """🔴 То самое действие, которого не было: код → человек на занятиях."""
    from apps.courses import services

    teacher = make_teacher("inv.t2@example.com")
    course = make_published_course(teacher)
    invite = services.course_invite(teacher, course.id)
    stranger = make_student("inv.p@example.com")

    assert Enrollment.objects.filter(course=course, student__user=stranger).count() == 0
    services.redeem_course_invite(stranger, invite.code)
    assert Enrollment.objects.filter(course=course, student__user=stranger).count() == 1


def test_three_refusals_are_told_apart():
    """
    🔴 «Срок вышел», «код закрыт» и «такого кода нет» — три разные новости и три разных
    действия. Один ответ «не найдено» на все три отправляет человека искать опечатку,
    которой он не делал.
    """
    from datetime import timedelta

    from apps.courses import services
    from apps.courses.models import CourseInvite

    teacher = make_teacher("inv.t3@example.com")
    course = make_published_course(teacher)
    pupil = make_student("inv.p3@example.com")

    with pytest.raises(NotFound):
        services.redeem_course_invite(pupil, "FLM-XXXX")

    expired = services.course_invite(teacher, course.id)
    CourseInvite.objects.filter(id=expired.id).update(
        expires_at=timezone.now() - timedelta(hours=1)
    )
    with pytest.raises(ValidationError, match="Срок"):
        services.redeem_course_invite(pupil, expired.code)

    fresh = services.course_invite(teacher, course.id)
    services.revoke_course_invite(teacher, course.id)
    with pytest.raises(ValidationError, match="закрыт"):
        services.redeem_course_invite(pupil, fresh.code)


def test_revoking_kills_the_old_code_immediately():
    """«Заменить код»: старый перестаёт работать сразу, иначе замена ничего не меняет."""
    from apps.courses import services

    teacher = make_teacher("inv.t4@example.com")
    course = make_published_course(teacher)
    old = services.course_invite(teacher, course.id)
    services.revoke_course_invite(teacher, course.id)
    new = services.course_invite(teacher, course.id)
    assert new.code != old.code


# --- 16 лет, ожидание и доступ (§51, §54.1) ---------------------------------
def make_pupil(years: int):
    """Ученик указанного возраста. Дата рождения считается назад от сегодня, иначе тест
    зеленел бы ровно до дня рождения — это уже случалось с недельным."""
    born = date.today() - dt.timedelta(days=int(years * 365.25) + 1)
    return accounts.register_user(
        email=f"pupil-{years}-{uuid.uuid4().hex[:6]}@example.com",
        password="strongpass1!",
        first_name="Аня",
        last_name="Ковалёва",
        role=Role.STUDENT,
        birth_date=born,
        consent_152fz=True,
    )


def test_sixteen_signs_for_self_fifteen_does_not():
    assert consents_for_self(date.today() - dt.timedelta(days=16 * 365 + 5)) is True
    assert consents_for_self(date.today() - dt.timedelta(days=15 * 365 + 5)) is False
    # Возраст неизвестен — это НЕ «взрослый»: подпись доказывается, а не предполагается.
    assert consents_for_self(None) is False


def test_under_sixteen_by_invite_waits_for_a_parent_and_cannot_enter():
    teacher = make_teacher()
    course = make_published_course(teacher)
    pupil = make_pupil(14)

    services.redeem_course_invite(pupil, services.course_invite(teacher, course.id).code)

    e = Enrollment.objects.get(student__user=pupil, course=course)
    assert e.status == EnrollmentStatus.PENDING_CONSENT.value
    # Оплата тут ни при чём и остаётся нетронутой (§54.1).
    assert e.access_status == AccessStatus.ACTIVE.value
    assert can_access_course(pupil, course) is False


def test_sixteen_by_invite_gets_in_at_once():
    teacher = make_teacher()
    course = make_published_course(teacher)
    pupil = make_pupil(16)

    services.redeem_course_invite(pupil, services.course_invite(teacher, course.id).code)

    e = Enrollment.objects.get(student__user=pupil, course=course)
    assert e.status == EnrollmentStatus.ACTIVE.value
    assert can_access_course(pupil, course) is True


def test_from_catalog_waits_for_the_teacher():
    teacher = make_teacher()
    course = make_published_course(teacher)
    pupil = make_pupil(17)

    services.request_enrollment(pupil, course.id)

    e = Enrollment.objects.get(student__user=pupil, course=course)
    assert e.status == EnrollmentStatus.PENDING_TEACHER.value
    assert can_access_course(pupil, course) is False

    services.approve_enrollment(teacher, e.id)
    e.refresh_from_db()
    assert e.status == EnrollmentStatus.ACTIVE.value
    assert can_access_course(pupil, course) is True


def test_teacher_cannot_sign_for_a_parent():
    teacher = make_teacher()
    course = make_published_course(teacher)
    pupil = make_pupil(13)
    services.redeem_course_invite(pupil, services.course_invite(teacher, course.id).code)
    e = Enrollment.objects.get(student__user=pupil, course=course)

    with pytest.raises(ValidationError):
        services.approve_enrollment(teacher, e.id)
    assert can_access_course(pupil, course) is False


def test_invitation_outweighs_a_pending_request():
    teacher = make_teacher()
    course = make_published_course(teacher)
    pupil = make_pupil(17)
    services.request_enrollment(pupil, course.id)

    services.redeem_course_invite(pupil, services.course_invite(teacher, course.id).code)

    assert Enrollment.objects.get(student__user=pupil, course=course).status == (
        EnrollmentStatus.ACTIVE.value
    )


def test_waiting_pupil_is_not_on_the_lesson():
    teacher = make_teacher()
    course = make_published_course(teacher)
    pupil = make_pupil(14)
    services.redeem_course_invite(pupil, services.course_invite(teacher, course.id).code)

    assert [s.user_id for s in students_of_course(course)] == []


def test_teacher_sees_what_exactly_is_awaited():
    teacher = make_teacher()
    course = make_published_course(teacher)
    young, grown = make_pupil(13), make_pupil(16)
    code = services.course_invite(teacher, course.id).code
    services.redeem_course_invite(young, code)
    services.redeem_course_invite(grown, code)

    by_id = {r["student_id"]: r["status"] for r in services.course_audience(teacher, course.id)}
    assert by_id[str(young.id)] == EnrollmentStatus.PENDING_CONSENT.value
    assert by_id[str(grown.id)] == EnrollmentStatus.ACTIVE.value
