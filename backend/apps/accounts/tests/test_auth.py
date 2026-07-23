"""Service-level tests for the accounts domain."""

from datetime import date
from types import SimpleNamespace

import pytest
from django.core import signing

from apps.accounts import services
from apps.accounts.models import Guardianship, StudentProfile, TeacherProfile, User
from common import storage
from common.auth import authenticate_request
from common.enums import AgeBand, GuardianshipStatus, Role
from common.exceptions import AuthError, PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


def _auth_request(token: str):
    return SimpleNamespace(META={"HTTP_AUTHORIZATION": f"Bearer {token}"})


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
        email="dup@example.com",
        password="strongpass1!",
        first_name="A",
        last_name="B",
        role=Role.PARENT,
    )
    with pytest.raises(ValidationError):
        services.register_user(
            email="DUP@example.com",
            password="strongpass1!",
            first_name="A",
            last_name="B",
            role=Role.PARENT,
        )


def test_login_returns_token_pair():
    services.register_user(
        email="login@example.com",
        password="strongpass1!",
        first_name="A",
        last_name="B",
        role=Role.PARENT,
    )
    user, tokens = services.login(email="login@example.com", password="strongpass1!")
    assert tokens["token"] and tokens["refresh_token"]


def test_login_wrong_password_fails():
    services.register_user(
        email="login2@example.com",
        password="strongpass1!",
        first_name="A",
        last_name="B",
        role=Role.PARENT,
    )
    with pytest.raises(AuthError):
        services.login(email="login2@example.com", password="wrong")


# --- A-authz-3: refresh-token revocation ------------------------------------
def test_logout_revokes_outstanding_tokens():
    """logout bumps token_version, so the outstanding access token stops authenticating."""
    services.register_user(
        email="lo@example.com",
        password="strongpass1!",
        first_name="A",
        last_name="B",
        role=Role.PARENT,
    )
    user, tokens = services.login(email="lo@example.com", password="strongpass1!")
    assert authenticate_request(_auth_request(tokens["token"])) is not None
    services.logout(user)
    assert authenticate_request(_auth_request(tokens["token"])) is None


def test_refresh_rotates_and_revokes_the_presented_token():
    """refresh mints a fresh pair and denylists the presented refresh token (no replay)."""
    services.register_user(
        email="rf@example.com",
        password="strongpass1!",
        first_name="A",
        last_name="B",
        role=Role.PARENT,
    )
    _u, tokens = services.login(email="rf@example.com", password="strongpass1!")
    old_refresh = tokens["refresh_token"]
    _u2, new_tokens = services.refresh(old_refresh)
    assert new_tokens["refresh_token"] != old_refresh
    assert authenticate_request(_auth_request(new_tokens["token"])) is not None
    # replaying the rotated refresh token is rejected
    with pytest.raises(AuthError):
        services.refresh(old_refresh)


def test_password_reset_invalidates_existing_sessions():
    """A password reset bumps token_version, invalidating pre-reset refresh tokens."""
    user = services.register_user(
        email="rs@example.com",
        password="strongpass1!",
        first_name="A",
        last_name="B",
        role=Role.PARENT,
    )
    _u, tokens = services.login(email="rs@example.com", password="strongpass1!")
    reset_token = signing.dumps({"uid": str(user.id)}, salt=services._RESET_SALT)
    services.reset_password(reset_token, "newstrongpass2!")
    with pytest.raises(AuthError):
        services.refresh(tokens["refresh_token"])


def test_add_child_creates_guardianship_with_consent():
    parent = services.register_user(
        email="parent@example.com",
        password="strongpass1!",
        first_name="P",
        last_name="A",
        role=Role.PARENT,
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
        email="nt@example.com",
        password="strongpass1!",
        first_name="T",
        last_name="A",
        role=Role.TEACHER,
    )
    with pytest.raises(PermissionDenied):
        services.add_child(teacher, first_name="X", last_name="Y", consent_152fz=True)


def _student(email="av@example.com"):
    return services.register_user(
        email=email,
        password="strongpass1!",
        first_name="A",
        last_name="B",
        role=Role.STUDENT,
        birth_date=date(2008, 1, 1),
    )


def test_set_avatar_namespace_and_write(monkeypatch):
    student = _student()
    other = _student("other@example.com")
    monkeypatch.setattr(storage, "head", lambda key: {"size": 10, "content_type": "image/png"})

    # A key outside the caller's own avatar namespace is rejected…
    with pytest.raises(PermissionDenied):
        services.set_avatar(student, f"avatar/{other.id}/x/me.png")
    # …the caller's own key is written to their profile…
    key = f"avatar/{student.id}/abc/me.png"
    services.set_avatar(student, key)
    student.student_profile.refresh_from_db()
    assert student.student_profile.avatar_key == key
    # …and that key presigns to a real (private-bucket) GET URL.
    assert storage.presign_get(key).startswith("http")


def test_set_avatar_unsupported_role(monkeypatch):
    parent = services.register_user(
        email="par@example.com",
        password="strongpass1!",
        first_name="P",
        last_name="A",
        role=Role.PARENT,
    )
    monkeypatch.setattr(storage, "head", lambda key: {"size": 10, "content_type": "image/png"})
    # Parent/admin profiles have no avatar_key — graceful error, no model change.
    with pytest.raises(ValidationError):
        services.set_avatar(parent, f"avatar/{parent.id}/x/me.png")
