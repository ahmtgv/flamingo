"""GraphQL types for the board.

`BoardSnapshot`, never `BoardFrame` (§2.8) — the storage-policy gate greps the schema for
`frame`, and rightly: a board is not a recording of anything.
"""

from __future__ import annotations

import datetime as dt

import strawberry
from strawberry.scalars import JSON

from common.enums import BoardElementKind


@strawberry.type
class BoardElement:
    id: strawberry.ID
    kind: BoardElementKind
    author_id: strawberry.ID
    #: Sheet 02 requires it: you can always see who put a thing on the board.
    author_name: str
    x: float
    y: float
    width: float
    height: float
    data: JSON
    revision: int

    @classmethod
    def of(cls, element) -> BoardElement:
        author = element.author
        return cls(
            id=strawberry.ID(str(element.id)),
            kind=BoardElementKind(element.kind),
            author_id=strawberry.ID(str(element.author_id)),
            author_name=author.formal_name,
            x=element.x,
            y=element.y,
            width=element.width,
            height=element.height,
            data=element.data,
            revision=element.revision,
        )


@strawberry.type
class Board:
    lesson_id: strawberry.ID
    #: The teacher's switch. A learner is TOLD the state rather than discovering it by a
    #: click that does nothing.
    open_for_students: bool
    can_write: bool
    is_teacher: bool
    elements: list[BoardElement]


@strawberry.type
class BoardSnapshot:
    id: strawberry.ID
    title: str
    saved_at: dt.datetime
    saved_by_name: str
    lesson_id: strawberry.ID
    lesson_title: str
    elements: JSON

    @classmethod
    def of(cls, snapshot) -> BoardSnapshot:
        who = snapshot.saved_by
        lesson = snapshot.board.lesson
        return cls(
            id=strawberry.ID(str(snapshot.id)),
            title=snapshot.title,
            saved_at=snapshot.created_at,
            saved_by_name=who.formal_name,
            lesson_id=strawberry.ID(str(lesson.id)),
            lesson_title=lesson.title,
            elements=snapshot.elements,
        )


@strawberry.type
class BoardChange:
    """One live change. `kind` says which of the three it is: an element was put down, an
    element was taken away, or the teacher opened/closed writing."""

    lesson_id: strawberry.ID
    kind: str
    element: BoardElement | None
    element_id: strawberry.ID | None
    open_for_students: bool | None
