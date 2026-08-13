"""Identity models: USER, role profiles, guardianship, verification."""

import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from common.enums import (
    AgeBand,
    GuardianshipStatus,
    Role,
    VerificationStatus,
    choices,
)
from common.models import BaseModel, JurisdictionMixin, TimeStampedModel

from .managers import UserManager


class User(JurisdictionMixin, AbstractBaseUser, PermissionsMixin):
    """Single account table. Role-specific data lives in 1:1 profiles.

    The jurisdiction fields apply to B2C users only: for a user who belongs to an
    institution, the institution's jurisdiction wins (it is the tenant).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=32, blank=True, default="")
    role = models.CharField(max_length=16, choices=choices(Role))
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120)
    locale = models.CharField(max_length=8, default="ru")  # i18n-ready
    # Which learning profile the account is currently working in ("pupil:<uuid>" /
    # "cadet:<uuid>" / "teacher:<uuid>"). The profiles themselves are NOT stored — they are
    # projected from INSTITUTION_MEMBERSHIP and ENROLLMENT (apps/accounts/learning.py); this
    # is only a pointer, so the choice follows the person between devices. Empty = "not
    # chosen yet", which resolves to the first available profile.
    active_learning_profile = models.CharField(max_length=64, blank=True, default="")
    # PROMPT_13 §5: the explicit consent point — «речь занятий обрабатывается для саммари;
    # видео и аудио не записываются». Withheld by default, because a default-on consent is
    # not a consent. A minor additionally needs their guardian's 152-FZ consent; both checks
    # live in apps/summaries/consent.py, which is the only place that reads these fields.
    consent_speech = models.BooleanField(default=False)
    consent_speech_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    # A-authz-3: bumped on logout / password-reset to invalidate every outstanding token
    # (embedded as the `tv` claim; auth rejects a token whose tv != this).
    token_version = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name", "role"]

    def __str__(self) -> str:
        return self.email


class StudentProfile(TimeStampedModel):
    user = models.OneToOneField(
        User, primary_key=True, related_name="student_profile", on_delete=models.CASCADE
    )
    birth_date = models.DateField(null=True, blank=True)
    age_band = models.CharField(max_length=8, choices=choices(AgeBand), default=AgeBand.TEEN.value)
    grade_level = models.CharField(max_length=32, blank=True, default="")
    points_cached = models.PositiveIntegerField(default=0)
    avatar_key = models.CharField(max_length=512, blank=True, default="")
    # institution FK is added with the institutions module.


class ParentProfile(TimeStampedModel):
    user = models.OneToOneField(
        User, primary_key=True, related_name="parent_profile", on_delete=models.CASCADE
    )


class TeacherProfile(TimeStampedModel):
    user = models.OneToOneField(
        User, primary_key=True, related_name="teacher_profile", on_delete=models.CASCADE
    )
    specialty = models.CharField(max_length=200, blank=True, default="")
    education = models.TextField(blank=True, default="")
    experience = models.TextField(blank=True, default="")
    bio = models.TextField(blank=True, default="")
    verification_status = models.CharField(
        max_length=12, choices=choices(VerificationStatus), default=VerificationStatus.PENDING.value
    )
    rating_cached = models.DecimalField(max_digits=2, decimal_places=1, null=True, blank=True)
    avatar_key = models.CharField(max_length=512, blank=True, default="")


class AdminProfile(TimeStampedModel):
    user = models.OneToOneField(
        User, primary_key=True, related_name="admin_profile", on_delete=models.CASCADE
    )
    # institution FK is added with the institutions module.


class Guardianship(BaseModel):
    """Parent <-> child link with 152-FZ consent."""

    parent_user = models.ForeignKey(User, related_name="children_links", on_delete=models.CASCADE)
    child_user = models.ForeignKey(User, related_name="parent_links", on_delete=models.CASCADE)
    status = models.CharField(
        max_length=12, choices=choices(GuardianshipStatus), default=GuardianshipStatus.PENDING.value
    )
    consent_152fz = models.BooleanField(default=False)
    consent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["parent_user", "child_user"], name="uniq_guardianship")
        ]


class VerificationDocument(BaseModel):
    """Teacher diploma/certificate submitted for moderation."""

    teacher_user = models.ForeignKey(
        User, related_name="verification_documents", on_delete=models.CASCADE
    )
    file_key = models.CharField(max_length=512)
    status = models.CharField(
        max_length=12, choices=choices(VerificationStatus), default=VerificationStatus.PENDING.value
    )


class RevokedToken(BaseModel):
    """A-authz-3: server-side revocation list for refresh-token ``jti``s. A refresh token whose
    jti is here is rejected — used to invalidate the presented token on rotation (refresh) so a
    rotated/leaked refresh token cannot be replayed. Expired entries are safe to prune."""

    jti = models.UUIDField(unique=True)
    expires_at = models.DateTimeField()
