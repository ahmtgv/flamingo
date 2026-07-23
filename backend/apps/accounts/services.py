"""Business logic for the accounts domain. Resolvers stay thin and call these."""

from __future__ import annotations

import logging
import secrets
from datetime import date

from django.contrib.auth import authenticate
from django.core import signing
from django.db import transaction
from django.utils import timezone

from common.auth import decode_token, issue_tokens
from common.enums import AgeBand, GuardianshipStatus, Role, UploadPurpose, VerificationStatus
from common.exceptions import AuthError, NotFound, PermissionDenied, ValidationError

from .models import (
    AdminProfile,
    Guardianship,
    ParentProfile,
    StudentProfile,
    TeacherProfile,
    User,
    VerificationDocument,
)

logger = logging.getLogger(__name__)

_EMAIL_SALT = "accounts.email-verify"
_RESET_SALT = "accounts.password-reset"


# --- helpers ----------------------------------------------------------------
def compute_age_band(birth_date: date | None) -> AgeBand:
    if not birth_date:
        return AgeBand.TEEN
    today = date.today()
    age = (
        today.year
        - birth_date.year
        - ((today.month, today.day) < (birth_date.month, birth_date.day))
    )
    if age < 12:
        return AgeBand.JUNIOR
    if age < 18:
        return AgeBand.TEEN
    return AgeBand.ADULT


def _coerce_role(role) -> Role:
    return role if isinstance(role, Role) else Role(role)


# --- email stubs (replaced by Celery email tasks) --------------------------
def _send_verification_email(user: User) -> None:
    token = signing.dumps({"uid": str(user.id)}, salt=_EMAIL_SALT)
    logger.info("verification email -> %s token=%s", user.email, token)


def _send_password_reset_email(user: User) -> None:
    token = signing.dumps({"uid": str(user.id)}, salt=_RESET_SALT)
    logger.info("password-reset email -> %s token=%s", user.email, token)


def _send_parent_consent_request(parent_email: str, child: User) -> None:
    logger.info("parent-consent request -> %s for child=%s", parent_email, child.id)


# --- registration -----------------------------------------------------------
@transaction.atomic
def register_user(
    *,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    role,
    locale: str = "ru",
    birth_date: date | None = None,
    grade_level: str | None = None,
    parent_email: str | None = None,
    specialty: str | None = None,
    education: str | None = None,
    experience: str | None = None,
) -> User:
    role = _coerce_role(role)
    if User.objects.filter(email=email.lower()).exists():
        raise ValidationError("This email is already registered")

    user = User.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=role.value,
        locale=locale,
    )

    if role is Role.STUDENT:
        band = compute_age_band(birth_date)
        StudentProfile.objects.create(
            user=user,
            birth_date=birth_date,
            age_band=band.value,
            grade_level=grade_level or "",
        )
        # Minors require parental consent before they can be active learners.
        if band in (AgeBand.JUNIOR, AgeBand.TEEN) and parent_email:
            _send_parent_consent_request(parent_email, user)
    elif role is Role.PARENT:
        ParentProfile.objects.create(user=user)
    elif role is Role.TEACHER:
        TeacherProfile.objects.create(
            user=user,
            specialty=specialty or "",
            education=education or "",
            experience=experience or "",
        )
    elif role is Role.ADMIN:
        AdminProfile.objects.create(user=user)

    _send_verification_email(user)
    return user


# --- sessions ----------------------------------------------------------------
def login(*, email: str, password: str) -> tuple[User, dict[str, str]]:
    user = authenticate(username=email.lower(), password=password)
    if user is None or not user.is_active:
        raise AuthError("Invalid email or password")
    return user, issue_tokens(user)


def refresh(refresh_token: str) -> tuple[User, dict[str, str]]:
    payload = decode_token(refresh_token, expected_type="refresh")
    try:
        user = User.objects.get(id=payload["sub"], is_active=True)
    except User.DoesNotExist as exc:
        raise AuthError("Invalid token") from exc
    return user, issue_tokens(user)  # rotation: a fresh pair each refresh


# --- guardianship ------------------------------------------------------------
@transaction.atomic
def add_child(
    parent: User,
    *,
    first_name: str,
    last_name: str,
    grade_level: str | None = None,
    birth_date: date | None = None,
    child_email: str | None = None,
    consent_152fz: bool = False,
) -> Guardianship:
    if parent.role != Role.PARENT.value:
        raise PermissionDenied("Only a parent can add a child")

    ParentProfile.objects.get_or_create(user=parent)

    # A young child managed by the parent may not have an email yet.
    email = (child_email or f"child+{secrets.token_hex(6)}@flamingo.local").lower()
    if User.objects.filter(email=email).exists():
        raise ValidationError("A user with this email already exists")

    child = User.objects.create_user(
        email=email,
        password=secrets.token_urlsafe(16),  # parent-managed; reset later
        first_name=first_name,
        last_name=last_name,
        role=Role.STUDENT.value,
    )
    band = compute_age_band(birth_date)
    StudentProfile.objects.create(
        user=child, birth_date=birth_date, age_band=band.value, grade_level=grade_level or ""
    )
    return Guardianship.objects.create(
        parent_user=parent,
        child_user=child,
        status=GuardianshipStatus.ACTIVE.value,
        consent_152fz=consent_152fz,
        consent_at=timezone.now() if consent_152fz else None,
    )


def respond_guardianship(user: User, guardianship_id, accept: bool) -> Guardianship:
    try:
        link = Guardianship.objects.get(id=guardianship_id)
    except Guardianship.DoesNotExist as exc:
        raise NotFound("Guardianship request not found") from exc
    if user.id not in (link.parent_user_id, link.child_user_id):
        raise PermissionDenied("Not your guardianship request")
    link.status = GuardianshipStatus.ACTIVE.value if accept else GuardianshipStatus.PENDING.value
    link.save(update_fields=["status", "updated_at"])
    return link


# --- avatar ------------------------------------------------------------------
def set_avatar(user: User, file_key: str) -> User:
    """Set the caller's avatar. The key MUST be in the caller's own ``avatar/<userId>/``
    namespace, and the object must exist within the AVATAR size/type limit. ``avatar_key`` lives
    only on student/teacher profiles — other roles get a graceful error (no model change)."""
    from apps.files import services as files

    files.assert_caller_key(user, file_key, UploadPurpose.AVATAR)
    files.validate_uploaded(file_key, UploadPurpose.AVATAR)
    if user.role == Role.STUDENT.value:
        profile = user.student_profile
    elif user.role == Role.TEACHER.value:
        profile = user.teacher_profile
    else:
        raise ValidationError("Avatar is not supported for this role")
    profile.avatar_key = file_key
    profile.save(update_fields=["avatar_key"])
    return user


# --- teacher verification ----------------------------------------------------
@transaction.atomic
def submit_verification_document(user: User, file_key: str) -> VerificationDocument:
    if user.role != Role.TEACHER.value:
        raise PermissionDenied("Only a teacher can submit verification documents")
    doc = VerificationDocument.objects.create(
        teacher_user=user, file_key=file_key, status=VerificationStatus.PENDING.value
    )
    TeacherProfile.objects.filter(user=user).update(
        verification_status=VerificationStatus.PENDING.value
    )
    return doc


# --- email verification & password reset ------------------------------------
def verify_email(token: str) -> None:
    try:
        data = signing.loads(token, salt=_EMAIL_SALT, max_age=60 * 60 * 48)
    except signing.BadSignature as exc:
        raise ValidationError("Invalid or expired verification link") from exc
    User.objects.filter(id=data["uid"]).update(is_email_verified=True)


def request_password_reset(email: str) -> None:
    # Do not reveal whether the email exists.
    user = User.objects.filter(email=email.lower()).first()
    if user:
        _send_password_reset_email(user)


def reset_password(token: str, new_password: str) -> None:
    try:
        data = signing.loads(token, salt=_RESET_SALT, max_age=60 * 60)
    except signing.BadSignature as exc:
        raise ValidationError("Invalid or expired reset link") from exc
    try:
        user = User.objects.get(id=data["uid"])
    except User.DoesNotExist as exc:
        raise NotFound("User not found") from exc
    user.set_password(new_password)
    user.save(update_fields=["password"])
