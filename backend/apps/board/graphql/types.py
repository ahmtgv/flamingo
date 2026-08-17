"""GraphQL types for the board.

`BoardSnapshot`, never `BoardFrame` (§2.8) — the storage-policy gate greps the schema for
`frame`, and rightly: a board is not a recording of anything.
"""

from __future__ import annotations

import datetime as dt

import strawberry
from strawberry.scalars import JSON

from common.enums import BoardElementKind


def resolved_data(data) -> dict:
    """Данные элемента для показа: ключ объекта → короткоживущая подписанная ссылка.

    🔴 §28.1.1. Картинка хранится КЛЮЧОМ (`data.key`) — в базе, в снимке доски, в зеркале
    ученика и в сообщении канала. Пять мегабайт base64 больше никуда не едут: по каналу
    летит ключ, а саму картинку каждый забирает у хранилища сам.

    ⚠️ СТАРЫЕ ЭЛЕМЕНТЫ ПРОДОЛЖАЮТ ПОКАЗЫВАТЬСЯ. Всё, что нарисовано до этой правки, лежит
    как `data.src` с `data:`-строкой внутри. Такие данные проходят НАСКВОЗЬ и не трогаются:
    сломать уже нарисованное — ровно то, чего эта фаза запрещает («не навреди»).

    Ссылка не хранится нигде и живёт минуты: она выдаётся на чтение и протухает сама.
    """
    if not isinstance(data, dict):
        return data
    key = data.get("key")
    if not key or data.get("src"):
        return data
    from common import storage

    return {**data, "src": storage.presign_get(str(key))}


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
            data=resolved_data(element.data),
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
            # Снимок хранит ЭЛЕМЕНТЫ целиком, а ключ лежит внутри их `data` — резолвим его,
            # иначе сохранённая доска показывала бы пустые рамки вместо картинок.
            elements=[_snapshot_element(e) for e in snapshot.elements],
        )


def _snapshot_element(element):
    """Замороженный элемент снимка: ключ картинки внутри него — тоже ключ."""
    if not isinstance(element, dict) or "data" not in element:
        return element
    return {**element, "data": resolved_data(element["data"])}


@strawberry.type
class BoardChange:
    """One live change. `kind` says which of the three it is: an element was put down, an
    element was taken away, or the teacher opened/closed writing."""

    lesson_id: strawberry.ID
    kind: str
    element: BoardElement | None
    element_id: strawberry.ID | None
    open_for_students: bool | None
