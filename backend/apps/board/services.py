"""Board services: who may draw, what happens when they do, and what gets kept.

Two rules from sheet 02 shape this module:

* **The teacher opens and closes writing.** Everyone can always SEE the board — it is the
  lesson happening — but only the teacher can draw on it until they open it up, and the
  learner is told which state it is in rather than discovering it by a click doing nothing.
* **Conflicts resolve optimistically.** Last write wins on an element, and nothing is ever
  locked. Two people editing the same sticker is rare; a canvas that freezes under you is
  not, and it is the worse failure.
"""

from __future__ import annotations

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone

from apps.courses.access import can_access_course
from apps.courses.models import Lesson, Material
from common.enums import BoardElementKind, MaterialType
from common.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Board, BoardElement, BoardSnapshot

MAX_ELEMENTS = 2000


def _lesson_or_deny(user, lesson_id) -> Lesson:
    """The board is the lesson's, so it lives behind the lesson's own access rule."""
    lesson = Lesson.objects.filter(id=lesson_id).select_related("section__course__owner").first()
    if lesson is None:
        raise NotFound("Lesson not found")
    if not can_access_course(user, lesson.section.course):
        raise NotFound("Lesson not found")
    return lesson


def is_teacher_of(user, lesson: Lesson) -> bool:
    return lesson.section.course.owner.user_id == getattr(user, "id", None)


def get_board(user, lesson_id) -> Board:
    lesson = _lesson_or_deny(user, lesson_id)
    board, _ = Board.objects.get_or_create(lesson=lesson)
    return board


def elements(user, lesson_id) -> list[BoardElement]:
    board = get_board(user, lesson_id)
    return list(
        BoardElement.objects.filter(board=board, deleted_at__isnull=True).select_related("author")
    )


def can_write(user, board: Board) -> bool:
    return is_teacher_of(user, board.lesson) or board.open_for_students


def _require_writer(user, board: Board) -> None:
    if not can_write(user, board):
        raise PermissionDenied("The board is closed for writing")


def set_open_for_students(user, lesson_id, *, is_open: bool) -> Board:
    """One button, teacher-only (sheet 02, owner answer 3)."""
    board = get_board(user, lesson_id)
    if not is_teacher_of(user, board.lesson):
        raise PermissionDenied("Only the teacher opens the board")
    board.open_for_students = is_open
    board.save(update_fields=["open_for_students", "updated_at"])
    _broadcast(board, {"kind": "access", "open": is_open})
    return board


@transaction.atomic
def put_element(
    user,
    lesson_id,
    *,
    element_id=None,
    kind=None,
    x: float = 0,
    y: float = 0,
    width: float = 0,
    height: float = 0,
    data: dict | None = None,
) -> BoardElement:
    """Create or update one element. Optimistic: whoever wrote last is what everyone sees."""
    board = get_board(user, lesson_id)
    _require_writer(user, board)

    if element_id:
        element = BoardElement.objects.filter(id=element_id, board=board).first()
        if element is None:
            raise NotFound("Element not found")
        element.x, element.y, element.width, element.height = x, y, width, height
        if data is not None:
            element.data = data
        element.revision += 1
        element.deleted_at = None
        element.save()
    else:
        if (
            BoardElement.objects.filter(board=board, deleted_at__isnull=True).count()
            >= MAX_ELEMENTS
        ):
            raise ValidationError("The board is full")
        element = BoardElement.objects.create(
            board=board,
            kind=BoardElementKind(getattr(kind, "value", kind)).value,
            author=user,
            x=x,
            y=y,
            width=width,
            height=height,
            data=data or {},
        )
    _broadcast(board, {"kind": "element", "element": _wire(element)})
    return element


def remove_element(user, lesson_id, element_id) -> bool:
    board = get_board(user, lesson_id)
    _require_writer(user, board)
    element = BoardElement.objects.filter(id=element_id, board=board).first()
    if element is None:
        raise NotFound("Element not found")
    # A learner may take back their own; the teacher may clear anything from their board.
    if element.author_id != getattr(user, "id", None) and not is_teacher_of(user, board.lesson):
        raise PermissionDenied("Not your element")
    element.deleted_at = timezone.now()
    element.save(update_fields=["deleted_at", "updated_at"])
    _broadcast(board, {"kind": "removed", "element_id": str(element.id)})
    return True


@transaction.atomic
def save_snapshot(user, lesson_id, title: str = "") -> BoardSnapshot:
    """Keep the board in the lesson's materials — «доска прошлого урока».

    The snapshot freezes the elements as JSON, and a Material row makes it findable where a
    learner already looks for the lesson's things.
    """
    board = get_board(user, lesson_id)
    if not is_teacher_of(user, board.lesson):
        raise PermissionDenied("Only the teacher saves the board")

    rows = BoardElement.objects.filter(board=board, deleted_at__isnull=True).select_related(
        "author"
    )
    snapshot = BoardSnapshot.objects.create(
        board=board,
        title=(title or "").strip() or f"Доска · {timezone.now():%d.%m.%Y}",
        saved_by=user,
        elements=[_wire(e) for e in rows],
    )
    Material.objects.create(
        lesson=board.lesson,
        type=MaterialType.TEXT.value,
        title=snapshot.title,
        body="",
        board_snapshot=snapshot,
    )
    _mirror_to_the_class(snapshot, board.lesson)
    return snapshot


def _mirror_to_the_class(snapshot, lesson) -> None:
    """Сохранённая доска ложится ученикам занятия (Р5.4-Б, §20.5.1 п.4).

    Сохранение — акт преподавателя, по смыслу тот же, что «отправить саммари»: он решает, что
    это остаётся. Живой холст и черновик сюда не попадают, потому что событие только одно.

    Лучшее усилие: не скопировалось — доска всё равно сохранена. Уронить сохранение из-за
    копии значило бы отменить то, что преподаватель только что сделал.
    """
    from apps.courses.models import Enrollment
    from apps.meetingpoint import mirror

    students = [
        e.student
        for e in Enrollment.objects.filter(course=lesson.section.course).select_related("student")
    ]
    if not students:
        return
    try:
        mirror.mirror_board(snapshot, students)
    except Exception:  # noqa: BLE001
        pass


def snapshots(user, lesson_id) -> list[BoardSnapshot]:
    """Saved boards of this lesson, newest first."""
    return list(BoardSnapshot.objects.filter(board=get_board(user, lesson_id)))


def course_snapshots(user, course_id) -> list[BoardSnapshot]:
    """Every saved board of the course — the boards of past lessons."""
    from apps.courses.models import Course

    course = Course.objects.filter(id=course_id).first()
    if course is None or not can_access_course(user, course):
        raise NotFound("Course not found")
    return list(BoardSnapshot.objects.filter(board__lesson__section__course=course))


# --- realtime ------------------------------------------------------------------------------
def _wire(element: BoardElement) -> dict:
    return {
        "id": str(element.id),
        "kind": element.kind,
        "author_id": str(element.author_id),
        "author_name": f"{element.author.first_name} {element.author.last_name}".strip(),
        "x": element.x,
        "y": element.y,
        "width": element.width,
        "height": element.height,
        "data": element.data,
        "revision": element.revision,
    }


def _broadcast(board: Board, payload: dict) -> None:
    """Push a change to everyone on this board — the same Channels path the room already uses."""
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(
        f"board_{board.lesson_id}",
        {"type": "board.change", "lesson_id": str(board.lesson_id), **payload},
    )
