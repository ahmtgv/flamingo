"""Мутации надзора — решение по преподавателю. Тонкие: правила и журнал в сервисе."""

from __future__ import annotations

import strawberry

from apps.accounts.graphql.types import UserType
from apps.oversight import services
from apps.oversight import state as account_state
from common.auth import require_user

from .types import AccountStateValue


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

    @strawberry.mutation
    def set_account_state(
        self,
        info: strawberry.Info,
        user_id: strawberry.ID,
        state: AccountStateValue,
        reason: str = "",
    ) -> UserType:
        """Перевести учётную запись в состояние — лист D7, раздел «Люди».

        🔴 §3-тер, найдено аудитом 17.08: ЭТОЙ МУТАЦИИ НЕ БЫЛО. `set_state` был написан,
        обложен тринадцатью зелёными тестами и **не имел ни одного вызывающего**: в схеме
        операции нет — значит из продукта в неё не попасть. Три состояния существовали только
        в тестах, которые звали сервис напрямую.

        Ровно механизм `hostHeartbeat`: функция умеет ответить, и никто не спрашивает. Тест на
        сервис проверяет, что правило работает; он никогда не спросит, есть ли к правилу дверь.

        ⚠️ Право не расширено ни на шаг: `set_state` сам требует сотрудника платформы, причина
        обязательна для всего, кроме возврата в `active`, и переход пишется в журнал. Здесь
        только дверь к тому, что уже решено.
        """
        return account_state.set_state(
            require_user(info), user_id, state=state.value, reason=reason
        )
