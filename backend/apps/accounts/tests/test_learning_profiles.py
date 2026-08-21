"""Learning profiles: the several educations inside one account (PROMPT_13 R0.2).

The point of these tests is that the profiles are a PROJECTION. Nothing is stored except a
pointer to the active one, so the tests assert that the projection tracks the underlying
memberships and enrolments — and that a person can only ever switch into their own.
"""

from datetime import date

import pytest
from django.utils import timezone

from apps.accounts import learning
from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.institutions.models import (
    Group,
    GroupMembership,
    Institution,
    InstitutionMembership,
)
from common.enums import LearningProfileKind, MembershipRole, MembershipStatus, Role
from common.exceptions import NotFound

pytestmark = pytest.mark.django_db


def make_student(email="pupil@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2010, 1, 1),
        consent_152fz=True,
    )


def make_teacher(email="teacher@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Мария",
        last_name="Петровна",
        role=Role.TEACHER,
        specialty="Английский язык",
        consent_152fz=True,
    )


def enrol_in_school(user, institution, group=None):
    InstitutionMembership.objects.create(
        user=user,
        institution=institution,
        role=MembershipRole.STUDENT.value,
        status=MembershipStatus.ACTIVE.value,
    )
    if group is not None:
        GroupMembership.objects.create(group=group, student=user.student_profile)


def published_course(teacher, title, institution=None):
    if institution is not None:
        # create_course only lets a teacher attach a course to an institution they belong to
        # (audit #9) — so the fixture has to make that membership real, not bypass the check.
        InstitutionMembership.objects.get_or_create(
            user=teacher,
            institution=institution,
            defaults={
                "role": MembershipRole.TEACHER.value,
                "status": MembershipStatus.ACTIVE.value,
            },
        )
    course = courses.create_course(
        teacher,
        title=title,
        subject="Английский",
        level="grade_9",
        institution_id=(institution.id if institution else None),
    )
    courses.publish_course(teacher, course.id)
    return course


# --- the projection ------------------------------------------------------------------------
def test_account_with_no_memberships_has_no_profiles():
    """A fresh sign-up has nothing to be a pupil or cadet of — and that is not an error."""
    assert learning.learning_profiles(make_student()) == []
    assert learning.active_learning_profile(make_student("b@example.com")) is None


def test_pupil_profile_is_projected_from_membership_and_class():
    """ "Ученик · 9А / Гимназия №1 · N предметов" comes entirely from existing relations."""
    teacher = make_teacher()
    school = Institution.objects.create(name="Гимназия №1")
    group = Group.objects.create(institution=school, name="9А", level="9 класс")
    pupil = make_student()
    enrol_in_school(pupil, school, group)
    for title in ("Английский", "Астрономия"):
        courses.enroll(pupil, published_course(teacher, title, institution=school).id)

    (profile,) = learning.learning_profiles(pupil)
    assert profile.kind is LearningProfileKind.PUPIL
    assert profile.institution_name == "Гимназия №1"
    assert profile.group_name == "9А"
    assert profile.course_count == 2  # the two subjects of that school
    assert profile.is_active  # the only profile is the active one by default
    # No display text crosses the boundary — the client composes it via i18n.
    assert "Ученик" not in str(profile)


def test_schoolchild_taking_courses_holds_both_profiles():
    """Owner req. 15: one account, two educations — a pupil at school AND a cadet on a
    standalone course. The standalone course is the one with no institution."""
    teacher = make_teacher()
    school = Institution.objects.create(name="Гимназия №1")
    pupil = make_student()
    enrol_in_school(pupil, school, Group.objects.create(institution=school, name="9А"))
    courses.enroll(pupil, published_course(teacher, "Астрономия", institution=school).id)
    courses.enroll(pupil, published_course(teacher, "English A2").id)  # no institution

    profiles = learning.learning_profiles(pupil)
    kinds = [profile.kind for profile in profiles]
    assert kinds == [LearningProfileKind.PUPIL, LearningProfileKind.CADET]
    cadet = profiles[1]
    assert cadet.course_title == "English A2"
    assert cadet.institution_id is None  # self-paced: belongs to no school


def test_teacher_profile_is_projected_from_a_teaching_membership():
    teacher = make_teacher()
    school = Institution.objects.create(name="Гимназия №1")
    InstitutionMembership.objects.create(
        user=teacher,
        institution=school,
        role=MembershipRole.TEACHER.value,
        status=MembershipStatus.ACTIVE.value,
    )
    (profile,) = learning.learning_profiles(teacher)
    assert profile.kind is LearningProfileKind.TEACHER
    assert profile.institution_name == "Гимназия №1"


def test_pending_membership_is_not_a_profile_yet():
    """An invitation is not an education: only ACTIVE membership projects a profile."""
    pupil = make_student()
    InstitutionMembership.objects.create(
        user=pupil,
        institution=Institution.objects.create(name="Гимназия №1"),
        role=MembershipRole.STUDENT.value,
        status=MembershipStatus.PENDING.value,
    )
    assert learning.learning_profiles(pupil) == []


# --- switching -------------------------------------------------------------------------------
def test_switching_persists_and_moves_the_active_marker():
    teacher = make_teacher()
    school = Institution.objects.create(name="Гимназия №1")
    pupil = make_student()
    enrol_in_school(pupil, school, Group.objects.create(institution=school, name="9А"))
    courses.enroll(pupil, published_course(teacher, "Астрономия", institution=school).id)
    course = published_course(teacher, "English A2")
    courses.enroll(pupil, course.id)

    cadet_id = f"cadet:{course.id}"
    switched = learning.set_active_learning_profile(pupil, cadet_id)
    assert switched.is_active and switched.id == cadet_id

    pupil.refresh_from_db()
    assert pupil.active_learning_profile == cadet_id  # survives the request, and the device
    active = learning.active_learning_profile(pupil)
    assert active is not None and active.kind is LearningProfileKind.CADET


def test_cannot_switch_into_someone_elses_education():
    """The id is validated against the caller's OWN projection — an id from another
    person's school is refused, and the refusal does not confirm it exists elsewhere."""
    teacher = make_teacher()
    stranger_school = Institution.objects.create(name="Чужая школа")
    stranger = make_student("stranger@example.com")
    enrol_in_school(stranger, stranger_school)

    pupil = make_student()
    own_school = Institution.objects.create(name="Гимназия №1")
    enrol_in_school(pupil, own_school)
    courses.enroll(pupil, published_course(teacher, "Астрономия", institution=own_school).id)

    with pytest.raises(NotFound):
        learning.set_active_learning_profile(pupil, f"pupil:{stranger_school.id}")
    pupil.refresh_from_db()
    assert pupil.active_learning_profile == ""  # unchanged


def test_a_stale_choice_falls_back_instead_of_stranding_the_account():
    """Leaving a school must not leave the person in no context at all."""
    teacher = make_teacher()
    pupil = make_student()
    course = published_course(teacher, "English A2")
    courses.enroll(pupil, course.id)
    pupil.active_learning_profile = "pupil:00000000-0000-0000-0000-000000000000"
    pupil.save(update_fields=["active_learning_profile"])

    active = learning.active_learning_profile(pupil)
    assert active is not None and active.id == f"cadet:{course.id}"


def test_anonymous_caller_has_no_profiles():
    assert learning.learning_profiles(None) == []


# --- 152-ФЗ состоянием, а не галочкой (решение владельца) --------------------
def test_consent_state_for_an_adult_is_their_own():
    """Взрослый подписывает за себя — так и сказано, с именем и датой."""
    from apps.accounts import services

    user = accounts.register_user(
        email="c.adult@example.com",
        password="strongpass1!",
        first_name="Адель",
        last_name="А",
        role=Role.TEACHER,
        specialty="Химия",
        consent_152fz=True,
    )
    state = services.consent_152fz_state(user)
    assert state["state"] == "granted"
    assert state["is_self"] is True
    assert state["at"] is not None


def test_consent_state_for_a_teen_is_missing_even_though_the_box_was_ticked():
    """
    🔴 САМОЕ ВАЖНОЕ. Галочку при регистрации подросток ставит САМ — родительским согласием
    она не является. Выдать её за родительскую подпись значит подменить подписанта: ровно то,
    ради чего с экрана аккаунта убрана кнопка.

    Письмо родителю при этом не уходит — почта отложена, — поэтому честное состояние
    сегодня «нет», а не «дано».
    """
    from apps.accounts import services

    teen = accounts.register_user(
        email="c.teen@example.com",
        password="strongpass1!",
        first_name="Аня",
        last_name="К",
        role=Role.STUDENT,
        birth_date=date(2012, 5, 1),
        parent_email="parent@example.com",
        consent_152fz=True,
    )
    state = services.consent_152fz_state(teen)
    assert state["state"] == "missing", "галочка подростка — не согласие родителя"
    assert state["by_whom"] is None


def test_consent_state_names_the_parent_once_the_link_is_confirmed():
    """Подтверждённая связь сильнее галочки: тогда мы знаем и КЕМ, и когда."""
    from apps.accounts import services
    from apps.accounts.models import Guardianship
    from common.enums import GuardianshipStatus

    teen = accounts.register_user(
        email="c.teen2@example.com",
        password="strongpass1!",
        first_name="Петя",
        last_name="К",
        role=Role.STUDENT,
        birth_date=date(2012, 5, 1),
        consent_152fz=True,
    )
    parent = accounts.register_user(
        email="c.parent@example.com",
        password="strongpass1!",
        first_name="Мария",
        last_name="К",
        role=Role.PARENT,
        consent_152fz=True,
    )
    Guardianship.objects.create(
        parent_user=parent,
        child_user=teen,
        status=GuardianshipStatus.ACTIVE.value,
        consent_152fz=True,
        consent_at=timezone.now(),
    )
    state = services.consent_152fz_state(teen)
    assert state["state"] == "granted"
    assert state["by_whom"] == parent.display_name
    assert state["is_self"] is False


def test_consent_state_tells_revoked_apart_from_never_given():
    """
    152-ФЗ даёт право отозвать согласие в любой момент. «Не давали» и «отозвано» — разные
    положения, и булево поле их не различает: различаем по тому, что отметка времени
    осталась, а флаг снят.
    """
    from apps.accounts import services

    user = accounts.register_user(
        email="c.rev@example.com",
        password="strongpass1!",
        first_name="Ольга",
        last_name="Б",
        role=Role.TEACHER,
        specialty="Физика",
        consent_152fz=True,
    )
    assert services.consent_152fz_state(user)["state"] == "granted"

    user.consent_152fz = False  # отзыв: отметка времени остаётся
    user.save(update_fields=["consent_152fz"])
    assert services.consent_152fz_state(user)["state"] == "revoked"

    never = accounts.register_user(
        email="c.never@example.com",
        password="strongpass1!",
        first_name="Иван",
        last_name="Н",
        role=Role.TEACHER,
        specialty="История",
        consent_152fz=True,
    )
    never.consent_152fz = False
    never.consent_152fz_at = None
    never.save(update_fields=["consent_152fz", "consent_152fz_at"])
    assert services.consent_152fz_state(never)["state"] == "missing"
