"""GraphQL types for the lesson summary.

Note what is not here: no field carries recognised speech, and no field carries a
server-composed Russian caption. An item ships `source` + `sourceMeta`, and the client turns
that into «с доски · 4 узла, добавил Петя» in whatever locale it is running.
"""

from __future__ import annotations

import datetime as dt

import strawberry
from strawberry.scalars import JSON

from common.enums import SummarySection, SummarySource, SummaryStatus


@strawberry.type
class SummaryItem:
    id: strawberry.ID
    section: SummarySection
    source: SummarySource
    #: Provenance specifics the client composes its caption from — counts, names, ids.
    source_meta: JSON
    #: Seconds from the start of the lesson; null on items that are not a moment.
    at_offset_sec: int | None
    text: str
    author_id: strawberry.ID | None
    author_name: str
    due_at: dt.datetime | None
    #: Set once the item has become a real homework in «Задания».
    homework_id: strawberry.ID | None
    edited: bool

    @classmethod
    def of(cls, item) -> SummaryItem:
        author = item.author
        return cls(
            id=strawberry.ID(str(item.id)),
            section=SummarySection(item.section),
            source=SummarySource(item.source),
            source_meta=item.source_meta or {},
            at_offset_sec=item.at_offset_sec,
            text=item.text,
            author_id=strawberry.ID(str(item.author_id)) if item.author_id else None,
            author_name=(
                f"{author.first_name} {author.last_name}".strip() if author is not None else ""
            ),
            due_at=item.due_at,
            homework_id=strawberry.ID(str(item.homework_id)) if item.homework_id else None,
            edited=item.edited,
        )


@strawberry.type
class LessonSummary:
    id: strawberry.ID
    session_id: strawberry.ID
    status: SummaryStatus
    intro: str
    assembled_at: dt.datetime | None
    sent_at: dt.datetime | None
    #: True when speech points were dropped — jurisdiction or a missing consent. The screen
    #: says so rather than quietly showing a thinner summary.
    speech_omitted: bool
    can_edit: bool
    items: list[SummaryItem]

    @classmethod
    def of(cls, summary, *, can_edit: bool, items) -> LessonSummary:
        return cls(
            id=strawberry.ID(str(summary.id)),
            session_id=strawberry.ID(str(summary.session_id)),
            status=SummaryStatus(summary.status),
            intro=summary.intro,
            assembled_at=summary.assembled_at,
            sent_at=summary.sent_at,
            speech_omitted=summary.speech_omitted,
            can_edit=can_edit,
            items=[SummaryItem.of(i) for i in items],
        )


@strawberry.type
class ChatMessage:
    """A message in the lesson chat.

    It is a projection of a CHAT summary item, not a separate row: the lesson chat lives
    inside the summary (§4.2 п.1), so «отправить сообщение» and «дописать в саммари» are the
    same write. The published contract keeps this shape from the SDL.
    """

    id: strawberry.ID
    session_id: strawberry.ID
    sender_id: strawberry.ID
    sender_name: str
    text: str
    sent_at: dt.datetime

    @classmethod
    def of(cls, item) -> ChatMessage:
        author = item.author
        return cls(
            id=strawberry.ID(str(item.id)),
            session_id=strawberry.ID(str(item.summary.session_id)),
            sender_id=strawberry.ID(str(item.author_id)) if item.author_id else strawberry.ID(""),
            sender_name=(
                f"{author.first_name} {author.last_name}".strip() if author is not None else ""
            ),
            text=item.text,
            sent_at=item.created_at,
        )
