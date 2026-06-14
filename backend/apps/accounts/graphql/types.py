"""GraphQL types for the accounts domain (strawberry-django)."""
from __future__ import annotations

import datetime as dt
from typing import List, Optional

import strawberry
import strawberry_django
from strawberry import auto

from common.enums import (
    AgeBand,
    GuardianshipStatus,
    Role,
    VerificationStatus,
)

from apps.accounts import models


@strawberry_django.type(models.StudentProfile)
class StudentProfileType:
    user: "UserType"
    birth_date: auto
    grade_level: auto

    @strawberry_django.field
    def age_band(self) -> AgeBand:
        return AgeBand(self.age_band)

    @strawberry_django.field
    def points(self) -> int:
        return self.points_cached


@strawberry_django.type(models.TeacherProfile)
class TeacherProfileType:
    user: "UserType"
    specialty: auto
    education: auto
    experience: auto
    bio: auto

    @strawberry_django.field
    def verification_status(self) -> VerificationStatus:
        return VerificationStatus(self.verification_status)

    @strawberry_django.field
    def rating(self) -> Optional[float]:
        return float(self.rating_cached) if self.rating_cached is not None else None

    @strawberry_django.field
    def review_count(self) -> int:
        return 0  # populated by the engagement module


@strawberry_django.type(models.AdminProfile)
class AdminProfileType:
    user: "UserType"


@strawberry_django.type(models.ParentProfile)
class ParentProfileType:
    user: "UserType"

    @strawberry_django.field
    def children(self) -> List[StudentProfileType]:
        child_ids = models.Guardianship.objects.filter(
            parent_user=self.user, status=GuardianshipStatus.ACTIVE.value
        ).values_list("child_user_id", flat=True)
        return list(models.StudentProfile.objects.filter(user_id__in=child_ids))


@strawberry_django.type(models.User)
class UserType:
    id: auto
    email: auto
    phone: auto
    first_name: auto
    last_name: auto
    locale: auto
    is_active: auto
    created_at: auto

    @strawberry_django.field
    def role(self) -> Role:
        return Role(self.role)

    @strawberry_django.field
    def avatar_url(self) -> Optional[str]:
        # Presigned avatar URL is wired with the files module.
        return None

    @strawberry_django.field
    def student_profile(self) -> Optional[StudentProfileType]:
        return getattr(self, "student_profile", None)

    @strawberry_django.field
    def teacher_profile(self) -> Optional[TeacherProfileType]:
        return getattr(self, "teacher_profile", None)

    @strawberry_django.field
    def parent_profile(self) -> Optional[ParentProfileType]:
        return getattr(self, "parent_profile", None)

    @strawberry_django.field
    def admin_profile(self) -> Optional[AdminProfileType]:
        return getattr(self, "admin_profile", None)


@strawberry_django.type(models.Guardianship)
class GuardianshipType:
    id: auto
    parent: "UserType" = strawberry_django.field(field_name="parent_user")
    child: "UserType" = strawberry_django.field(field_name="child_user")
    consent_at: auto

    @strawberry_django.field
    def status(self) -> GuardianshipStatus:
        return GuardianshipStatus(self.status)

    @strawberry.field(name="consent152fz")
    def consent_152fz(self) -> bool:
        return self.consent_152fz


@strawberry_django.type(models.VerificationDocument)
class VerificationDocumentType:
    id: auto
    created_at: auto

    @strawberry_django.field
    def status(self) -> VerificationStatus:
        return VerificationStatus(self.status)

    @strawberry_django.field
    def file_url(self) -> str:
        # Presigned GET is wired with the files module.
        return f"/files/{self.file_key}"


@strawberry.type
class AuthPayload:
    token: str
    refresh_token: str
    user: UserType
