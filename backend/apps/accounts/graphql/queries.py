"""Accounts queries."""

import strawberry

from apps.accounts import learning, models
from common.auth import get_current_user

from .types import LearningProfile, TeacherProfileType, UserType


@strawberry.type
class AccountsQuery:
    @strawberry.field
    def me(self, info: strawberry.Info) -> UserType | None:
        """The currently authenticated user (or null)."""
        return get_current_user(info)

    @strawberry.field
    def learning_profiles(self, info: strawberry.Info) -> list[LearningProfile]:
        """The educations inside the CALLER's own account, one of them marked active.

        Self-scoped: it reads only this user's memberships and enrolments, so there is no
        id parameter to tamper with. Anonymous callers get an empty list rather than an
        error — the header renders for signed-out visitors too.
        """
        return [
            LearningProfile.from_projection(profile)
            for profile in learning.learning_profiles(get_current_user(info))
        ]

    @strawberry.field
    def teacher(self, id: strawberry.ID) -> TeacherProfileType | None:
        """Public teacher card."""
        return models.TeacherProfile.objects.filter(user_id=id).first()
