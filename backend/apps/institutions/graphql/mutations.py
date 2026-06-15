"""Institutions mutations. Inputs map to thin service calls (logic + permissions there)."""

from __future__ import annotations

import strawberry
from strawberry.scalars import JSON

from apps.institutions import services
from common.auth import require_user
from common.enums import MembershipRole, MembershipStatus

from .types import Group, GroupTeacher, Institution, InstitutionMembership


@strawberry.input
class InstitutionInput:
    name: str
    address: str | None = None
    website: str | None = None
    subdomain: str | None = None
    logo_key: str | None = None
    default_locale: str = "ru"


@strawberry.input
class GroupInput:
    institution_id: strawberry.ID
    name: str
    level: str | None = None


@strawberry.input
class InviteInput:
    institution_id: strawberry.ID
    email: str
    role: MembershipRole
    group_id: strawberry.ID | None = None


@strawberry.type
class InstitutionsMutation:
    # --- institution (createInstitution is back-office/staff-only, enforced in services)
    @strawberry.mutation
    def create_institution(self, info: strawberry.Info, input: InstitutionInput) -> Institution:
        return services.create_institution(
            require_user(info),
            name=input.name,
            address=input.address or "",
            website=input.website or "",
            subdomain=input.subdomain,
            logo_key=input.logo_key or "",
            default_locale=input.default_locale,
        )

    @strawberry.mutation
    def update_institution(
        self, info: strawberry.Info, id: strawberry.ID, input: InstitutionInput
    ) -> Institution:
        return services.update_institution(
            require_user(info),
            id,
            name=input.name,
            address=input.address,
            website=input.website,
            subdomain=input.subdomain,
            logo_key=input.logo_key,
            default_locale=input.default_locale,
        )

    @strawberry.mutation
    def update_branding(
        self, info: strawberry.Info, institution_id: strawberry.ID, branding: JSON
    ) -> Institution:
        return services.update_branding(require_user(info), institution_id, branding)

    # --- memberships
    @strawberry.mutation
    def invite_member(self, info: strawberry.Info, input: InviteInput) -> InstitutionMembership:
        return services.invite_member(
            require_user(info),
            institution_id=input.institution_id,
            email=input.email,
            role=input.role,
            group_id=input.group_id,
        )

    @strawberry.mutation
    def update_membership(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
        role: MembershipRole | None = None,
        status: MembershipStatus | None = None,
    ) -> InstitutionMembership:
        return services.update_membership(require_user(info), id, role=role, status=status)

    @strawberry.mutation
    def remove_member(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        return services.remove_member(require_user(info), id)

    # --- groups
    @strawberry.mutation
    def create_group(self, info: strawberry.Info, input: GroupInput) -> Group:
        return services.create_group(
            require_user(info),
            institution_id=input.institution_id,
            name=input.name,
            level=input.level or "",
        )

    @strawberry.mutation
    def update_group(self, info: strawberry.Info, id: strawberry.ID, input: GroupInput) -> Group:
        # input.institution_id is part of the SDL GroupInput but ignored on update
        # (groups don't move between institutions).
        return services.update_group(require_user(info), id, name=input.name, level=input.level)

    @strawberry.mutation
    def add_students_to_group(
        self, info: strawberry.Info, group_id: strawberry.ID, student_ids: list[strawberry.ID]
    ) -> Group:
        return services.add_students_to_group(require_user(info), group_id, student_ids)

    @strawberry.mutation
    def remove_student_from_group(
        self, info: strawberry.Info, group_id: strawberry.ID, student_id: strawberry.ID
    ) -> Group:
        return services.remove_student_from_group(require_user(info), group_id, student_id)

    @strawberry.mutation
    def assign_teacher(
        self,
        info: strawberry.Info,
        group_id: strawberry.ID,
        teacher_id: strawberry.ID,
        subject: str,
    ) -> GroupTeacher:
        return services.assign_teacher(require_user(info), group_id, teacher_id, subject)
