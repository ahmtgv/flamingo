"""Accounts queries."""

import strawberry

from apps.accounts import models
from common.auth import get_current_user

from .types import TeacherProfileType, UserType


@strawberry.type
class AccountsQuery:
    @strawberry.field
    def me(self, info: strawberry.Info) -> UserType | None:
        """The currently authenticated user (or null)."""
        return get_current_user(info)

    @strawberry.field
    def teacher(self, id: strawberry.ID) -> TeacherProfileType | None:
        """Public teacher card."""
        return models.TeacherProfile.objects.filter(user_id=id).first()
