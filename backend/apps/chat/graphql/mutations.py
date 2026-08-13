"""Chat mutations. Opening a channel is itself an authorisation decision, so each of these
goes through the services layer rather than writing rows directly."""

from __future__ import annotations

import strawberry

from apps.chat import services
from common.auth import require_user

from .types import ChannelMessage, ChatChannel, ChatReport


@strawberry.type
class ChatMutation:
    @strawberry.mutation
    def open_subject_channel(self, info: strawberry.Info, course_id: strawberry.ID) -> ChatChannel:
        """The предмет × группа room, provisioned from the group on first open."""
        user = require_user(info)
        channel = services.subject_channel(user, course_id)
        return ChatChannel.of(channel, user, services.unread_counts(user).get(str(channel.id), 0))

    @strawberry.mutation
    def open_direct_channel(self, info: strawberry.Info, user_id: strawberry.ID) -> ChatChannel:
        """Write to somebody from your own groups. Anyone else is refused server-side."""
        user = require_user(info)
        channel = services.direct_channel(user, user_id)
        return ChatChannel.of(channel, user)

    @strawberry.mutation
    def open_staff_channel(
        self, info: strawberry.Info, institution_id: strawberry.ID
    ) -> ChatChannel:
        user = require_user(info)
        channel = services.staff_channel(user, institution_id)
        return ChatChannel.of(channel, user)

    @strawberry.mutation
    def send_channel_message(
        self, info: strawberry.Info, channel_id: strawberry.ID, text: str
    ) -> ChannelMessage:
        user = require_user(info)
        return ChannelMessage.of(services.send_message(user, channel_id, text), user.id)

    @strawberry.mutation
    def mark_channel_read(self, info: strawberry.Info, channel_id: strawberry.ID) -> bool:
        services.mark_read(require_user(info), channel_id)
        return True

    @strawberry.mutation
    def report_channel(
        self,
        info: strawberry.Info,
        channel_id: strawberry.ID,
        reason: str | None = None,
        message_id: strawberry.ID | None = None,
    ) -> ChatReport:
        """«Пожаловаться». Filing this is what lets the group's teacher open the
        conversation — see chat/services.report_channel."""
        report = services.report_channel(
            require_user(info), channel_id, message_id=message_id, reason=reason or ""
        )
        return ChatReport.of(report)

    @strawberry.mutation
    def resolve_chat_report(
        self, info: strawberry.Info, report_id: strawberry.ID, dismiss: bool = False
    ) -> ChatReport:
        return ChatReport.of(
            services.resolve_report(require_user(info), report_id, dismiss=dismiss)
        )
