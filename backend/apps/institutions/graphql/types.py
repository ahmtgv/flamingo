"""GraphQL types for the institutions domain. Names mirror the SDL contract."""

from __future__ import annotations

import strawberry
import strawberry_django
from strawberry import auto
from strawberry.scalars import JSON

from apps.accounts.graphql.types import StudentProfileType, TeacherProfileType, UserType
from apps.institutions import models, services
from common.auth import get_current_user
from common.enums import InstitutionStatus, MembershipRole, MembershipStatus


@strawberry_django.type(models.Institution)
class Institution:
    id: auto
    name: auto
    address: auto
    website: auto
    subdomain: auto
    default_locale: auto

    @strawberry_django.field
    def status(self) -> InstitutionStatus:
        return InstitutionStatus(self.status)

    @strawberry_django.field
    def logo_url(self) -> str | None:
        return f"/files/{self.logo_key}" if self.logo_key else None

    @strawberry_django.field
    def branding(self) -> JSON:
        return self.branding or {}


@strawberry_django.type(models.InstitutionMembership)
class InstitutionMembership:
    id: auto
    joined_at: auto

    @strawberry_django.field
    def user(self) -> UserType:
        return self.user

    @strawberry_django.field
    def institution(self) -> Institution:
        return self.institution

    @strawberry_django.field
    def role(self) -> MembershipRole:
        return MembershipRole(self.role)

    @strawberry_django.field
    def status(self) -> MembershipStatus:
        return MembershipStatus(self.status)


@strawberry_django.type(models.GroupTeacher)
class GroupTeacher:
    id: auto
    subject: auto

    @strawberry_django.field
    def teacher(self) -> TeacherProfileType:
        return self.teacher


@strawberry_django.type(models.Group)
class Group:
    id: auto
    name: auto
    level: auto

    @strawberry_django.field
    def institution(self) -> Institution:
        return self.institution

    @strawberry_django.field
    def students(self, info: strawberry.Info) -> list[StudentProfileType]:
        # A-C2: minors' roster — per-resolver scoped (own-institution admin / assigned
        # teacher / staff); everyone else reads []. Same leak class as the b2782ba fix.
        return services.group_students_for(get_current_user(info), self)

    @strawberry_django.field
    def teachers(self, info: strawberry.Info) -> list[GroupTeacher]:
        return services.group_teachers_for(get_current_user(info), self)
