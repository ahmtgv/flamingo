"""Chat queries. Every one of them is scoped to the caller's own membership."""

from __future__ import annotations

import strawberry

from apps.chat import services
from common.auth import require_user

from .types import ChannelMessage, ChatChannel, ChatPolicyView, ChatReport


@strawberry.type
class ChatQuery:
    @strawberry.field
    def my_channels(self, info: strawberry.Info) -> list[ChatChannel]:
        """Conversations the caller is in. The query takes no user id — it cannot be
        pointed at somebody else."""
        user = require_user(info)
        unread = services.unread_counts(user)
        rows = services.my_channels(user)
        last = services.last_messages([c.id for c in rows])
        return [
            ChatChannel.of(c, user, unread.get(str(c.id), 0), last.get(str(c.id))) for c in rows
        ]

    @strawberry.field
    def chat_unread(self, info: strawberry.Info) -> int:
        """Total unread — the number on the header button and the bubble."""
        return services.total_unread(require_user(info))

    @strawberry.field
    def channel_messages(
        self, info: strawberry.Info, channel_id: strawberry.ID, limit: int = 100
    ) -> list[ChannelMessage]:
        user = require_user(info)
        return [
            ChannelMessage.of(m, user.id)
            for m in services.messages(user, channel_id, min(max(limit, 1), 200))
        ]

    @strawberry.field
    def chat_policy(self, info: strawberry.Info) -> ChatPolicyView:
        """What is switched on for this viewer. Advisory only — the server enforces it."""
        policy = services.policy_for(require_user(info))
        return ChatPolicyView(
            peer_chat=policy.peer_chat,
            direct_messages=policy.direct_messages,
            teacher_visible_always=policy.teacher_visible_always,
            premoderation=policy.premoderation,
        )

    @strawberry.field
    def chat_reports(self, info: strawberry.Info) -> list[ChatReport]:
        """Open complaints this teacher may act on (empty for everyone else)."""
        return [ChatReport.of(r) for r in services.open_reports(require_user(info))]
