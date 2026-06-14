"""Accounts queries."""
from typing import Optional

import strawberry

from common.auth import get_current_user

from apps.accounts import models

from .types import TeacherProfileType, UserType


@strawberry.type
class AccountsQuery:
    @strawberry.field
    def me(self, info: strawberry.Info) -> Optional[UserType]:
        """The currently authenticated user (or null)."""
        return get_current_user(info)

    @strawberry.field
    def teacher(self, id: strawberry.ID) -> Optional[TeacherProfileType]:
        """Public teacher card."""
        return models.TeacherProfile.objects.filter(user_id=id).first()
