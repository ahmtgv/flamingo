"""Мутации надзора — решение по преподавателю. Тонкие: правила и журнал в сервисе."""

from __future__ import annotations

import strawberry

from apps.accounts.graphql.types import UserType
from apps.oversight import services
from common.auth import require_user


@strawberry.type
class OversightMutation:
    @strawberry.mutation
    def verify_teacher(self, info: strawberry.Info, teacher_user_id: strawberry.ID) -> UserType:
        return services.review_verification(require_user(info), teacher_user_id, approve=True)

    @strawberry.mutation
    def reject_teacher(
        self, info: strawberry.Info, teacher_user_id: strawberry.ID, reason: str
    ) -> UserType:
        """Отказ обязан нести причину — она уходит человеку текстом (лист D7)."""
        return services.review_verification(
            require_user(info), teacher_user_id, approve=False, reason=reason
        )

    @strawberry.mutation
    def request_verification_documents(
        self, info: strawberry.Info, teacher_user_id: strawberry.ID, reason: str
    ) -> UserType:
        return services.request_more_documents(require_user(info), teacher_user_id, reason=reason)
