"""GraphQL types for the meeting point (atlas D3).

Everything here is answerable without the teacher's machine — that is the app's whole
purpose. The one thing the view will not do is pretend: `capabilities` says plainly which
parts of the product need the host awake, so the offline screen states it instead of letting
a pupil discover it by clicking.
"""

from __future__ import annotations

import datetime as dt
from enum import Enum

import strawberry
from strawberry.scalars import JSON

from common.enums import JoinDecision, MeetingAccessMode, MirrorKind


@strawberry.type
class OfflineCapabilities:
    """Reachable while the host is off. One source (meetingpoint/capabilities.py) so the
    screen and the future desktop refusals cannot disagree.

    The line is drawn by whose data it is (§20.2/§20.3/§20.5): a pupil's own work, grades,
    diary, summaries, the saved boards of their lessons and the guides they were **given**
    come from their mirror and open always. Only the LIVE board and the guides of the lesson
    happening right now need the machine — that is D3's «честная и маленькая цена».
    """

    schedule: bool
    chat: bool
    homework: bool
    my_work: bool
    my_grades: bool
    my_summaries: bool
    my_diary: bool
    my_boards: bool
    my_materials: bool
    lesson_materials: bool
    live_board: bool
    room: bool

    @classmethod
    def of(cls, caps) -> OfflineCapabilities:
        return cls(
            schedule=caps.schedule,
            chat=caps.chat,
            homework=caps.homework,
            my_work=caps.my_work,
            my_grades=caps.my_grades,
            my_summaries=caps.my_summaries,
            my_diary=caps.my_diary,
            my_boards=caps.my_boards,
            my_materials=caps.my_materials,
            lesson_materials=caps.lesson_materials,
            live_board=caps.live_board,
            room=caps.room,
        )


@strawberry.type
class MirroredRecord:
    """One thing a pupil keeps regardless of whose laptop is on (Р5.0-Б).

    `payload` is JSON and it is TEXT: no file key, no blob, no bytes. CLAUDE.md §2.2 governs
    both places the data lives, and `mirror._text_only` refuses anything else rather than
    quietly dropping it.
    """

    id: strawberry.ID
    kind: MirrorKind
    #: The id of the original record — stable across a restore, and not a foreign key.
    source_id: strawberry.ID
    occurred_at: dt.datetime
    updated_at: dt.datetime
    payload: JSON

    @classmethod
    def of(cls, row) -> MirroredRecord:
        return cls(
            id=strawberry.ID(str(row.id)),
            kind=MirrorKind(row.kind),
            source_id=strawberry.ID(str(row.source_id)),
            occurred_at=row.occurred_at,
            updated_at=row.updated_at,
            payload=row.payload,
        )


@strawberry.type
class UpcomingLesson:
    """Enough to caption the wait. Nothing about the other people in the group."""

    session_id: strawberry.ID
    title: str
    start_at: dt.datetime
    is_live: bool

    @classmethod
    def of(cls, session) -> UpcomingLesson:
        return cls(
            session_id=strawberry.ID(str(session.id)),
            title=session.lesson.title,
            start_at=session.start_at,
            is_live=session.status == "live",
        )


@strawberry.type
class MeetingPointView:
    """What the person holding a link is shown.

    A replaced link gets a view too, with `LINK_REPLACED` and no group details: they are told
    what happened rather than shown a room they may not enter, and «не найдено» would have
    sent them hunting for a typo they did not make.
    """

    slug: str
    decision: JoinDecision
    group_name: str
    teacher_name: str
    host_online: bool
    next_lesson: UpcomingLesson | None
    capabilities: OfflineCapabilities

    @classmethod
    def of(cls, row: dict) -> MeetingPointView:
        session = row["next_session"]
        return cls(
            slug=row["slug"],
            decision=row["decision"],
            group_name=row["group_name"],
            teacher_name=row["teacher_name"],
            host_online=row["host_online"],
            next_lesson=UpcomingLesson.of(session) if session is not None else None,
            capabilities=OfflineCapabilities.of(row["capabilities"]),
        )


@strawberry.type
class MeetingPoint:
    """The teacher's own view of their group's front door."""

    group_id: strawberry.ID
    slug: str
    code: str
    access_mode: MeetingAccessMode
    host_online: bool
    #: 🔴 Ключ встречи у группы (решение владельца §27.4). Без него «Начать урок» на листе D3
    #: обещало комнату и вело в расписание: занятие, которое надо начать, экрану было
    #: неизвестно. Ученику то же самое поле отдаётся давно (`MeetingPointView.next_lesson`) —
    #: преподаватель был единственным, кому его не показывали.
    #: `None` — занятия впереди нет, и кнопка обязана сказать это словами, а не молчать.
    next_lesson: UpcomingLesson | None

    @classmethod
    def of(cls, point, *, host_online: bool, next_session=None) -> MeetingPoint:
        return cls(
            group_id=strawberry.ID(str(point.group_id)),
            slug=point.slug,
            code=point.code,
            access_mode=MeetingAccessMode(point.access_mode),
            host_online=host_online,
            next_lesson=UpcomingLesson.of(next_session) if next_session is not None else None,
        )


@strawberry.type
class HostPresence:
    """A slug and a boolean. Nothing about where the machine is or what it is doing."""

    slug: str
    online: bool


@strawberry.enum
class ParticipantState(Enum):
    """Где человек сейчас — лист D3, «Участники».

    Каждое состояние выводится из существующего признака; выдуманных здесь нет.
    """

    IN_ROOM = "in_room"  # «в комнате»
    AT_THE_DOOR = "at_the_door"  # «открыла ссылку, ждёт»
    INVITED = "invited"  # «приглашение открыто вчера»
    NEVER_OPENED = "never_opened"  # «ссылка не открывалась ни разу»


@strawberry.type
class MeetingParticipant:
    student_id: strawberry.ID
    name: str
    state: ParticipantState
    #: Когда это стало правдой. Пусто для того, кто не заходил: времени у «никогда» нет.
    since: dt.datetime | None

    @classmethod
    def of(cls, row: dict) -> MeetingParticipant:
        return cls(
            student_id=strawberry.ID(row["student_id"]),
            name=row["name"],
            state=ParticipantState(row["state"]),
            since=row["since"],
        )
