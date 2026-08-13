"""Board reads. Everything is behind the lesson's own access rule."""

from __future__ import annotations

import strawberry

from apps.board import services
from common.auth import require_user

from .types import Board, BoardElement, BoardSnapshot


@strawberry.type
class BoardQuery:
    @strawberry.field
    def board(self, info: strawberry.Info, lesson_id: strawberry.ID) -> Board:
        """The live canvas. Everyone who can open the lesson can SEE it; whether they may
        draw is `canWrite`, and the client is told rather than left to guess."""
        user = require_user(info)
        board = services.get_board(user, lesson_id)
        return Board(
            lesson_id=strawberry.ID(str(board.lesson_id)),
            open_for_students=board.open_for_students,
            can_write=services.can_write(user, board),
            is_teacher=services.is_teacher_of(user, board.lesson),
            elements=[BoardElement.of(e) for e in services.elements(user, lesson_id)],
        )

    @strawberry.field
    def board_snapshots(
        self, info: strawberry.Info, lesson_id: strawberry.ID
    ) -> list[BoardSnapshot]:
        return [BoardSnapshot.of(s) for s in services.snapshots(require_user(info), lesson_id)]

    @strawberry.field
    def course_boards(self, info: strawberry.Info, course_id: strawberry.ID) -> list[BoardSnapshot]:
        """«Доска прошлого урока» — every saved board of the course."""
        return [
            BoardSnapshot.of(s) for s in services.course_snapshots(require_user(info), course_id)
        ]
