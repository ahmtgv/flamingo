"""Summary writes: assemble, edit, send — and the lesson chat, which writes into it."""

from __future__ import annotations

import datetime as dt

import strawberry
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.summaries import services
from common.auth import require_user
from common.enums import SummarySection

from .types import ChatMessage, LessonSummary, SummaryItem


def _summary_payload(user, session_id) -> LessonSummary:
    summary = services.get_summary(user, session_id)
    return LessonSummary.of(
        summary,
        can_edit=services.is_teacher_of(user, summary.session) and not summary.is_sent,
        items=services.items(user, session_id),
    )


@strawberry.type
class SummariesMutation:
    @strawberry.mutation
    def assemble_lesson_summary(
        self, info: strawberry.Info, session_id: strawberry.ID
    ) -> LessonSummary:
        """«Собрать саммари сейчас». Re-running it never touches a line a person wrote."""
        user = require_user(info)
        services.assemble(user, session_id)
        return _summary_payload(user, session_id)

    @strawberry.mutation
    def add_summary_item(
        self,
        info: strawberry.Info,
        session_id: strawberry.ID,
        section: SummarySection,
        text: str,
        due_at: dt.datetime | None = None,
    ) -> SummaryItem:
        return SummaryItem.of(
            services.add_item(
                require_user(info),
                session_id,
                section=section.value,
                text=text,
                due_at=due_at,
            )
        )

    @strawberry.mutation
    def update_summary_item(
        self, info: strawberry.Info, item_id: strawberry.ID, text: str
    ) -> SummaryItem:
        return SummaryItem.of(services.update_item(require_user(info), item_id, text=text))

    @strawberry.mutation
    def remove_summary_item(self, info: strawberry.Info, item_id: strawberry.ID) -> bool:
        return services.remove_item(require_user(info), item_id)

    @strawberry.mutation
    def set_summary_intro(
        self, info: strawberry.Info, session_id: strawberry.ID, text: str
    ) -> LessonSummary:
        user = require_user(info)
        services.set_intro(user, session_id, text)
        return _summary_payload(user, session_id)

    @strawberry.mutation
    def send_lesson_summary(
        self, info: strawberry.Info, session_id: strawberry.ID
    ) -> LessonSummary:
        """«Отправить группе» — and the homework in it lands in «Задания»."""
        user = require_user(info)
        services.send(user, session_id)
        return _summary_payload(user, session_id)

    @strawberry.mutation
    def send_chat_message(
        self, info: strawberry.Info, session_id: strawberry.ID, text: str
    ) -> ChatMessage:
        """Write in the lesson chat. There is no separate lesson feed — this writes the
        CHAT section of the summary, which is where the conversation was always going."""
        item = services.post_chat_message(require_user(info), session_id, text)
        message = ChatMessage.of(item)
        _broadcast(session_id, message)
        return message

    @strawberry.mutation
    def set_speech_consent(self, info: strawberry.Info, granted: bool) -> bool:
        """The §5 consent point, on and off. Withdrawing it takes effect on the next
        assembly — and nothing of the speech was stored in the meantime anyway."""
        from django.utils import timezone

        user = require_user(info)
        user.consent_speech = granted
        user.consent_speech_at = timezone.now() if granted else None
        user.save(update_fields=["consent_speech", "consent_speech_at", "updated_at"])
        return user.consent_speech


def _broadcast(session_id, message: ChatMessage) -> None:
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(
        f"lessonchat_{session_id}",
        {
            "type": "lessonchat.message",
            "id": str(message.id),
            "session_id": str(session_id),
            "sender_id": str(message.sender_id),
            "sender_name": message.sender_name,
            "text": message.text,
            "sent_at": message.sent_at.isoformat(),
        },
    )
