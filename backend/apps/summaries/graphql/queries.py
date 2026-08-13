"""Summary reads. A draft is the teacher's; the lesson chat inside it is everyone's."""

from __future__ import annotations

import strawberry

from apps.summaries import services
from common.auth import require_user

from .types import ChatMessage, LessonSummary


@strawberry.type
class SummariesQuery:
    @strawberry.field
    def lesson_summary(
        self, info: strawberry.Info, session_id: strawberry.ID
    ) -> LessonSummary | None:
        """Null until the teacher sends it — for everyone but the teacher.

        Not a refusal: whether a teacher has started writing up the lesson is not something
        a learner needs to be told about either.
        """
        user = require_user(info)
        summary = services.get_summary(user, session_id)
        if summary is None:
            return None
        return LessonSummary.of(
            summary,
            can_edit=services.is_teacher_of(user, summary.session) and not summary.is_sent,
            items=services.items(user, session_id),
        )

    @strawberry.field
    def lesson_chat(self, info: strawberry.Info, session_id: strawberry.ID) -> list[ChatMessage]:
        """The lesson chat — which is the CHAT section of the summary, read live."""
        return [
            ChatMessage.of(item) for item in services.chat_messages(require_user(info), session_id)
        ]
