"""Board writes. The teacher's switch decides who may call the drawing ones."""

from __future__ import annotations

import strawberry
from strawberry.scalars import JSON

from apps.board import services
from common.auth import require_user
from common.enums import BoardElementKind

from .types import BoardElement, BoardSnapshot


@strawberry.input
class BoardElementInput:
    kind: BoardElementKind
    x: float = 0
    y: float = 0
    width: float = 0
    height: float = 0
    data: JSON | None = None
    #: Present when updating an existing element; absent when putting a new one down.
    id: strawberry.ID | None = None


@strawberry.type
class BoardMutation:
    @strawberry.mutation
    def put_board_element(
        self, info: strawberry.Info, lesson_id: strawberry.ID, input: BoardElementInput
    ) -> BoardElement:
        """Create or move/resize/edit one element. Last write wins — no locks (sheet 02)."""
        return BoardElement.of(
            services.put_element(
                require_user(info),
                lesson_id,
                element_id=input.id,
                kind=input.kind,
                x=input.x,
                y=input.y,
                width=input.width,
                height=input.height,
                data=input.data,
            )
        )

    @strawberry.mutation
    def remove_board_element(
        self, info: strawberry.Info, lesson_id: strawberry.ID, element_id: strawberry.ID
    ) -> bool:
        return services.remove_element(require_user(info), lesson_id, element_id)

    @strawberry.mutation
    def set_board_open(
        self, info: strawberry.Info, lesson_id: strawberry.ID, is_open: bool
    ) -> bool:
        """The teacher opens and closes the board for everyone else."""
        return services.set_open_for_students(
            require_user(info), lesson_id, is_open=is_open
        ).open_for_students

    @strawberry.mutation
    def save_board(
        self, info: strawberry.Info, lesson_id: strawberry.ID, title: str | None = None
    ) -> BoardSnapshot:
        """Keep the board in the lesson's materials."""
        return BoardSnapshot.of(services.save_snapshot(require_user(info), lesson_id, title or ""))
