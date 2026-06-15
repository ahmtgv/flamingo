"""Institutions queries: institution, groups, group, institutionMembers (admin-scoped)."""

import strawberry

from apps.institutions import services
from common.auth import get_current_user, require_user
from common.enums import MembershipRole

from .types import Group, Institution, InstitutionMembership


@strawberry.type
class InstitutionsQuery:
    @strawberry.field
    def institution(self, info: strawberry.Info, id: strawberry.ID) -> Institution | None:
        return services.get_institution(get_current_user(info), id)

    @strawberry.field
    def groups(self, info: strawberry.Info, institution_id: strawberry.ID) -> list[Group]:
        return services.list_groups(require_user(info), institution_id)

    @strawberry.field
    def group(self, info: strawberry.Info, id: strawberry.ID) -> Group | None:
        return services.get_group(get_current_user(info), id)

    @strawberry.field
    def institution_members(
        self,
        info: strawberry.Info,
        institution_id: strawberry.ID,
        role: MembershipRole | None = None,
    ) -> list[InstitutionMembership]:
        return services.institution_members(require_user(info), institution_id, role)
