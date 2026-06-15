"""GraphQL types for the institutions domain. Names mirror the SDL contract."""

from __future__ import annotations

import strawberry_django
from strawberry import auto
from strawberry.scalars import JSON

from apps.accounts.graphql.types import StudentProfileType, TeacherProfileType, UserType
from apps.institutions import models
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
    def students(self) -> list[StudentProfileType]:
        return [m.student for m in self.memberships.select_related("student__user")]

    @strawberry_django.field
    def teachers(self) -> list[GroupTeacher]:
        return list(self.group_teachers.select_related("teacher__user"))
