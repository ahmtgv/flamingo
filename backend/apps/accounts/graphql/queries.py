"""Accounts queries."""

import strawberry

from apps.accounts import learning, models, start_page
from common.auth import get_current_user

from .types import LearningProfile, StartPage, TeacherProfileType, UserType


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
    def start_page(self, info: strawberry.Info) -> StartPage:
        """Atlas sheet 00, filled for the caller's ACTIVE learning profile.

        Self-scoped: every slot is assembled from the caller's own schedule, enrolments and
        (for a teacher) their own courses, through the existing chokepoints. Switching
        education re-scopes the whole page, which is the point of the sheet.
        """
        return StartPage.of(start_page.start_page(get_current_user(info)))

    @strawberry.field
    def teacher(self, id: strawberry.ID) -> TeacherProfileType | None:
        """Public teacher card."""
        return models.TeacherProfile.objects.filter(user_id=id).first()
