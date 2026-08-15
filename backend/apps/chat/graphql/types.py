"""GraphQL types for chat.

`ChannelMessage`, not `ChatMessage`: the published contract already has a `ChatMessage` for
the **lesson** chat (R4, inside the summary). Two different things with one name in one
schema is a bug waiting for a maintainer.
"""

from __future__ import annotations

import datetime as dt

import strawberry

from apps.chat import services
from common.enums import ChannelKind, ReportStatus


@strawberry.type
class ChatParticipant:
    id: strawberry.ID
    first_name: str
    last_name: str
    role: str
    # Готовые имена — те же, что у User (§24). В чате строка узкая: заголовок канала берёт
    # display_name, список участников — short_name, и склеивать их экрану больше не нужно.
    display_name: str
    short_name: str


@strawberry.type
class ChannelMessage:
    id: strawberry.ID
    channel_id: strawberry.ID
    sender_id: strawberry.ID
    sender_name: str
    text: str
    sent_at: dt.datetime
    mine: bool

    @classmethod
    def of(cls, message, viewer_id) -> ChannelMessage:
        return cls(
            id=strawberry.ID(str(message.id)),
            channel_id=strawberry.ID(str(message.channel_id)),
            sender_id=strawberry.ID(str(message.sender_id)),
            sender_name=message.sender.formal_name,
            text=message.text,
            sent_at=message.sent_at,
            mine=str(message.sender_id) == str(viewer_id),
        )


@strawberry.type
class ChatChannel:
    """One conversation, as this viewer sees it.

    `title` is deliberately absent: the server sends the DATA a title is built from (kind,
    course, participants) and the client words it, the same way every other screen works.
    """

    id: strawberry.ID
    kind: ChannelKind
    course_id: strawberry.ID | None
    course_title: str | None
    group_name: str | None
    institution_name: str | None
    participants: list[ChatParticipant]
    unread: int
    last_message_at: dt.datetime | None
    last_message_text: str | None
    #: True when the viewer is reading a REPORTED conversation they are not part of.
    read_only: bool
    open_reports: int

    @classmethod
    def of(cls, channel, viewer, unread: int = 0, last=None) -> ChatChannel:
        people = services.participants(viewer, channel)
        member = services.is_member(viewer, channel)
        return cls(
            id=strawberry.ID(str(channel.id)),
            kind=ChannelKind(channel.kind),
            course_id=strawberry.ID(str(channel.course_id)) if channel.course_id else None,
            course_title=channel.course.title if channel.course_id else None,
            group_name=channel.group.name if channel.group_id else None,
            institution_name=channel.institution.name if channel.institution_id else None,
            participants=[
                ChatParticipant(
                    id=strawberry.ID(str(p.id)),
                    first_name=p.first_name,
                    last_name=p.last_name,
                    role=p.role,
                    display_name=p.display_name,
                    short_name=p.short_name,
                )
                for p in people
                if str(p.id) != str(viewer.id)
            ],
            unread=unread,
            last_message_at=channel.last_message_at,
            last_message_text=last.text if last is not None else None,
            read_only=not member,
            open_reports=channel.reports.filter(status=ReportStatus.OPEN.value).count(),
        )


@strawberry.type
class ChatPolicyView:
    """What this viewer's chat is allowed to do — so the UI can explain a refusal instead of
    offering a button that will fail. The server still enforces every one of these."""

    peer_chat: bool
    direct_messages: bool
    teacher_visible_always: bool
    premoderation: bool


@strawberry.type
class ChatReport:
    id: strawberry.ID
    channel_id: strawberry.ID
    reporter_name: str
    reason: str | None
    status: ReportStatus
    created_at: dt.datetime

    @classmethod
    def of(cls, report) -> ChatReport:
        return cls(
            id=strawberry.ID(str(report.id)),
            channel_id=strawberry.ID(str(report.channel_id)),
            reporter_name=report.reporter.formal_name,
            reason=report.reason or None,
            status=ReportStatus(report.status),
            created_at=report.created_at,
        )
