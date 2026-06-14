"""Service-level tests for the accounts domain."""
from datetime import date

import pytest

from common.enums import AgeBand, GuardianshipStatus, Role

from apps.accounts import services
from apps.accounts.models import Guardianship, StudentProfile, TeacherProfile, User

pytestmark = pytest.mark.django_db


def test_register_student_creates_profile_and_age_band():
    user = services.register_user(
        email="Petya@Example.com",
        password="strongpass1!",
        first_name="Петя",
        last_name="Сидоров",
        role=Role.STUDENT,
        birth_date=date(2013, 1, 1),  # ~13 y.o. -> teen
        grade_level="7",
    )
    assert user.email == "petya@example.com"  # normalised
    profile = StudentProfile.objects.get(user=user)
    assert profile.age_band == AgeBand.TEEN.value
    assert profile.grade_level == "7"


def test_register_junior_age_band():
    user = services.register_user(
        email="kid@example.com",
        password="strongpass1!",
        first_name="Соня",
        last_name="А",
        role=Role.STUDENT,
        birth_date=date(2018, 6, 1),  # ~8 y.o. -> junior
    )
    assert StudentProfile.objects.get(user=user).age_band == AgeBand.JUNIOR.value


def test_register_teacher_creates_teacher_profile():
    user = services.register_user(
        email="t@example.com",
        password="strongpass1!",
        first_name="Иван",
        last_name="Петров",
        role=Role.TEACHER,
        specialty="Математика",
    )
    assert TeacherProfile.objects.filter(user=user, specialty="Математика").exists()


def test_duplicate_email_rejected():
    services.register_user(
        email="dup@example.com", password="strongpass1!",
        first_name="A", last_name="B", role=Role.PARENT,
    )
    with pytest.raises(Exception):
        services.register_user(
            email="DUP@example.com", password="strongpass1!",
            first_name="A", last_name="B", role=Role.PARENT,
        )


def test_login_returns_token_pair():
    services.register_user(
        email="login@example.com", password="strongpass1!",
        first_name="A", last_name="B", role=Role.PARENT,
    )
    user, tokens = services.login(email="login@example.com", password="strongpass1!")
    assert tokens["token"] and tokens["refresh_token"]


def test_login_wrong_password_fails():
    services.register_user(
        email="login2@example.com", password="strongpass1!",
        first_name="A", last_name="B", role=Role.PARENT,
    )
    with pytest.raises(Exception):
        services.login(email="login2@example.com", password="wrong")


def test_add_child_creates_guardianship_with_consent():
    parent = services.register_user(
        email="parent@example.com", password="strongpass1!",
        first_name="P", last_name="A", role=Role.PARENT,
    )
    link = services.add_child(
        parent,
        first_name="Соня",
        last_name="А",
        grade_level="3",
        birth_date=date(2017, 5, 1),
        consent_152fz=True,
    )
    assert link.status == GuardianshipStatus.ACTIVE.value
    assert link.consent_152fz is True
    assert link.consent_at is not None
    assert Guardianship.objects.count() == 1
    assert User.objects.filter(role=Role.STUDENT.value).count() == 1


def test_non_parent_cannot_add_child():
    teacher = services.register_user(
        email="nt@example.com", password="strongpass1!",
        first_name="T", last_name="A", role=Role.TEACHER,
    )
    with pytest.raises(Exception):
        services.add_child(teacher, first_name="X", last_name="Y", consent_152fz=True)
