"""Запросы надзора. Каждый — через сервис, который пишет в журнал ДО выдачи."""

from __future__ import annotations

import strawberry

from apps.oversight import services
from common.auth import require_user

from .types import AccessLogRow, VerificationQueueEntry


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
