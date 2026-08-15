"""Business logic for the accounts domain. Resolvers stay thin and call these."""

from __future__ import annotations

import datetime as dt
import logging
import secrets
from datetime import date

from django.contrib.auth import authenticate
from django.core import signing
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from common.auth import decode_token, issue_tokens
from common.enums import (
    AgeBand,
    GuardianshipStatus,
    MembershipRole,
    MembershipStatus,
    Role,
    UploadPurpose,
    VerificationStatus,
)
from common.exceptions import AuthError, NotFound, PermissionDenied, ValidationError

from .models import (
    AdminProfile,
    Guardianship,
    ParentProfile,
    RevokedToken,
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


# --- email stubs (inline for now; async delivery is deferred) --------------
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
    consent_152fz: bool = False,
) -> User:
    """Завести учётную запись.

    🔴 R-04: для несовершеннолетнего согласие 152-ФЗ — условие регистрации, а не поле формы.
    Отказ стоит здесь, а не на экране: экран это последовательность компонентов, и обойти его
    можно адресом. Проверка идёт по ВЫЧИСЛЕННОЙ возрастной группе (по дате рождения), а не по
    тому, что выбрали в интерфейсе — иначе согласие спрашивали бы у одних, а требовали от
    других (это же чинит R-05 со стороны базы).
    """
    role = _coerce_role(role)
    if User.objects.filter(email=email.lower()).exists():
        raise ValidationError("Эта почта уже зарегистрирована")

    # 🔴 Б3 (PROMPT_16, R-15). 152-ФЗ требует согласия на обработку персональных данных от
    # ЛЮБОГО субъекта, а не только от несовершеннолетнего. Раньше блок согласия рисовался
    # только младшему ученику, и взрослые регистрировались вовсе без него — то есть у
    # преподавателя, родителя и администратора правового основания обработки не было.
    #
    # Отказ один на всех и стоит здесь, а не на экране: форм регистрации четыре, а закон один.
    if not consent_152fz:
        raise ValidationError(
            "Без согласия на обработку персональных данных мы не можем завести учётную запись"
        )

    if _coerce_role(role) is Role.STUDENT:
        band = compute_age_band(birth_date)
        if band in (AgeBand.JUNIOR, AgeBand.TEEN):
            # У несовершеннолетнего то же согласие даёт родитель — текст на экране называет
            # это прямо, а проверка одна: согласие есть или его нет.
            pass

    user = User.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=role.value,
        locale=locale,
    )

    if consent_152fz:
        user.consent_152fz = True
        user.consent_152fz_at = timezone.now()
        user.save(update_fields=["consent_152fz", "consent_152fz_at", "updated_at"])

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


@transaction.atomic
def refresh(refresh_token: str) -> tuple[User, dict[str, str]]:
    payload = decode_token(refresh_token, expected_type="refresh")
    try:
        user = User.objects.get(id=payload["sub"], is_active=True)
    except User.DoesNotExist as exc:
        raise AuthError("Invalid token") from exc
    # A-authz-3: reject a token from an invalidated session (logout/reset bumped token_version)
    # or one that was already rotated/revoked (its jti is on the denylist).
    if payload.get("tv") != user.token_version:
        raise AuthError("Invalid token")
    jti = payload.get("jti")
    if jti is None or RevokedToken.objects.filter(jti=jti).exists():
        raise AuthError("Invalid token")
    # Rotation: revoke the presented refresh token so it cannot be replayed, then mint a fresh
    # pair (with a new jti). expires_at follows the token's own exp so the row can be pruned.
    RevokedToken.objects.get_or_create(
        jti=jti,
        defaults={"expires_at": dt.datetime.fromtimestamp(payload["exp"], tz=dt.UTC)},
    )
    return user, issue_tokens(user)


def logout(user: User) -> bool:
    """A-authz-3: revoke every outstanding token for the user (sign out on all devices) by
    bumping token_version — subsequent access/refresh tokens with the old tv are rejected."""
    User.objects.filter(id=user.id).update(token_version=F("token_version") + 1)
    return True


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


# --- contact PII visibility (A-152fz-1) --------------------------------------
def contact_visible(viewer, target: User) -> bool:
    """Whether ``viewer`` may see ``target``'s contact PII (email/phone). 152-FZ: contact data
    is returned only to the user themselves or to an ACTIVE admin of an institution the target
    belongs to. Anonymous and unrelated viewers (e.g. the public catalog / teacher card) get None.
    """
    if viewer is None or not getattr(viewer, "is_authenticated", False):
        return False
    if viewer.id == target.id:
        return True
    from apps.institutions.models import InstitutionMembership  # lazy: avoid app import cycle

    admin_institution_ids = list(
        InstitutionMembership.objects.filter(
            user=viewer,
            role=MembershipRole.ADMIN.value,
            status=MembershipStatus.ACTIVE.value,
        ).values_list("institution_id", flat=True)
    )
    if not admin_institution_ids:
        return False
    return InstitutionMembership.objects.filter(
        user=target, institution_id__in=admin_institution_ids
    ).exists()


# --- teacher verification ----------------------------------------------------
@transaction.atomic
def submit_verification_document(user: User, file_key: str) -> VerificationDocument:
    from apps.files import services as files
    from common import storage

    if user.role != Role.TEACHER.value:
        raise PermissionDenied("Only a teacher can submit verification documents")

    # Ключ обязан быть своим и объект — существовать. Ровно те же две проверки, что у всякой
    # привязки файла (files/services.py): без них в очередь падает ссылка на чужой объект.
    files.assert_caller_key(user, file_key, UploadPurpose.VERIFICATION)
    files.validate_uploaded(file_key, UploadPurpose.VERIFICATION)

    meta = storage.head(file_key) or {}
    doc = VerificationDocument.objects.create(
        teacher_user=user,
        file_key=file_key,
        filename=file_key.rsplit("/", 1)[-1],
        size_bytes=meta.get("size"),
        status=VerificationStatus.PENDING.value,
    )
    TeacherProfile.objects.filter(user=user).update(
        verification_status=VerificationStatus.PENDING.value
    )
    return doc


def my_verification_documents(user: User) -> list[VerificationDocument]:
    """Свои документы — чтобы экран преподавателя говорил правду.

    🔴 Находка владельца 15.08, п.4: баннер «Документы на проверке» висел у КАЖДОГО
    преподавателя, потому что `verification_status` рождается со значением PENDING. Человек,
    не загрузивший ничего, читал, что его документы проверяют. Отличить одно от другого можно
    только по наличию документов — поэтому экран их и получает.
    """
    if getattr(user, "role", None) != Role.TEACHER.value:
        return []
    return list(VerificationDocument.objects.filter(teacher_user=user).order_by("-created_at"))


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
    # A-authz-3: a password reset invalidates all existing sessions (bump token_version).
    user.token_version = user.token_version + 1
    user.save(update_fields=["password", "token_version"])
