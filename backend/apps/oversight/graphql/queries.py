"""Запросы надзора. Каждый — через сервис, который пишет в журнал ДО выдачи."""

from __future__ import annotations

import strawberry

from apps.oversight import services
from common.auth import require_user

from .types import AccessLogRow, AccountStateRow, PersonRow, VerificationQueueEntry


@strawberry.type
class OversightQuery:
    @strawberry.field
    def verification_queue(self, info: strawberry.Info) -> list[VerificationQueueEntry]:
        rows = services.pending_verifications(require_user(info))
        return [VerificationQueueEntry.of(row) for row in rows]

    @strawberry.field
    def verification_document_url(self, info: strawberry.Info, id: strawberry.ID) -> str:
        """Подписанная ссылка на документ. Строка журнала пишется раньше ссылки."""
        return services.document_url(require_user(info), id)

    @strawberry.field
    def oversight_log(self, info: strawberry.Info, limit: int = 100) -> list[AccessLogRow]:
        rows = services.access_log(require_user(info), limit=limit)
        return [AccessLogRow.of(row) for row in rows]

    @strawberry.field
    def account_state_history(
        self, info: strawberry.Info, user_id: strawberry.ID
    ) -> list[AccountStateRow]:
        """История состояний человека — чтобы «почему у меня нет доступа» имело ответ.

        Читает сотрудник платформы: `history` живёт рядом с `set_state`, а право спрашивает
        тот же `_require_staff`, что и всё в этом модуле.
        """
        return [
            AccountStateRow.of(row)
            for row in services.account_state_history(require_user(info), user_id)
        ]

    @strawberry.field
    def oversight_people(
        self, info: strawberry.Info, query: str = "", limit: int = 50
    ) -> list[PersonRow]:
        """Раздел «Люди» листа D7 — кто есть и в каком состоянии его учётка."""
        return [
            PersonRow.of(person, state)
            for person, state in services.people(require_user(info), query=query, limit=limit)
        ]
