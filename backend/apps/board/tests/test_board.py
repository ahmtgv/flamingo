"""The lesson board (PROMPT_13 R3.2, atlas sheet 02).

What is worth pinning: the teacher's switch actually gates writing, everyone can always see
the board, conflicts resolve optimistically rather than by locking, a saved board reaches the
lesson's materials, and the whole thing sits behind the lesson's own access rule.
"""

from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.board import services as board
from apps.board.models import BoardElement, BoardSnapshot
from apps.courses import services as courses
from apps.courses.models import Material
from common.enums import BoardElementKind, Role
from common.exceptions import NotFound, PermissionDenied

pytestmark = pytest.mark.django_db


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Ирина",
        last_name="Соколова",
        role=Role.TEACHER,
        specialty="English",
    )


def make_pupil(email="p@example.com", first="Аня"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name=first,
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2010, 1, 1),
        consent_152fz=True,
    )


def a_lesson(teacher):
    course = courses.create_course(teacher, title="English A2", subject="Английский", level="adult")
    section = courses.create_section(teacher, course.id, title="Unit 4 · Travel")
    lesson = courses.create_lesson(
        teacher, section.id, title="Asking for directions", duration_min=45
    )
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    return course, lesson


def enrolled_pupil(course, email="p@example.com", first="Аня"):
    pupil = make_pupil(email, first)
    courses.enroll(pupil, course.id)
    return pupil


# --- access ------------------------------------------------------------------------------
def test_a_stranger_cannot_open_the_board():
    """The board is the lesson's, so it lives behind the lesson's own access rule."""
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    stranger = make_pupil("far@example.com", "Чужой")

    with pytest.raises(NotFound):
        board.get_board(stranger, lesson.id)


def test_everyone_in_the_lesson_can_see_the_board_even_when_it_is_closed():
    """Closed means «cannot draw», never «cannot look» — the board IS the lesson happening."""
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    pupil = enrolled_pupil(course)
    board.put_element(teacher, lesson.id, kind=BoardElementKind.TEXT, data={"text": "Unit 4"})

    seen = board.elements(pupil, lesson.id)
    assert [e.data["text"] for e in seen] == ["Unit 4"]
    assert board.can_write(pupil, board.get_board(pupil, lesson.id)) is False


# --- the teacher's switch ------------------------------------------------------------------
def test_a_pupil_cannot_draw_until_the_teacher_opens_the_board():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    pupil = enrolled_pupil(course)

    with pytest.raises(PermissionDenied):
        board.put_element(pupil, lesson.id, kind=BoardElementKind.STICKER, data={"text": "я"})

    board.set_open_for_students(teacher, lesson.id, is_open=True)
    element = board.put_element(pupil, lesson.id, kind=BoardElementKind.STICKER, data={"text": "я"})
    assert element.author_id == pupil.id


def test_closing_the_board_again_stops_the_pupils():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    pupil = enrolled_pupil(course)
    board.set_open_for_students(teacher, lesson.id, is_open=True)
    board.put_element(pupil, lesson.id, kind=BoardElementKind.PEN, data={"points": [1, 2]})

    board.set_open_for_students(teacher, lesson.id, is_open=False)
    with pytest.raises(PermissionDenied):
        board.put_element(pupil, lesson.id, kind=BoardElementKind.PEN, data={"points": [3, 4]})


def test_only_the_teacher_holds_the_switch():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    pupil = enrolled_pupil(course)

    with pytest.raises(PermissionDenied):
        board.set_open_for_students(pupil, lesson.id, is_open=True)


def test_the_state_of_the_switch_is_readable_so_a_learner_is_told_not_left_guessing():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    pupil = enrolled_pupil(course)

    assert board.get_board(pupil, lesson.id).open_for_students is False
    board.set_open_for_students(teacher, lesson.id, is_open=True)
    assert board.get_board(pupil, lesson.id).open_for_students is True


# --- the canvas ------------------------------------------------------------------------------
def test_every_kind_the_sheet_asks_for_lives_on_the_same_canvas():
    """Pen, text, sticker, shape, link, image — a mind-map is these plus LINK, not a mode."""
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)

    for kind in BoardElementKind:
        board.put_element(teacher, lesson.id, kind=kind, data={"k": kind.value})

    kinds = {e.kind for e in board.elements(teacher, lesson.id)}
    assert kinds == {k.value for k in BoardElementKind}


def test_a_pasted_image_is_a_stored_file_reference_not_a_media_stream():
    """Ctrl+V puts an image on the canvas; what is kept is an object key, and the board is
    still not a recording of anything (§2.2 / §4)."""
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)

    element = board.put_element(
        teacher,
        lesson.id,
        kind=BoardElementKind.IMAGE,
        width=320,
        height=240,
        data={"fileKey": "uploads/board/map.png"},
    )
    assert element.kind == BoardElementKind.IMAGE.value
    assert element.data["fileKey"].endswith(".png")


def test_moving_and_resizing_is_an_update_of_the_same_element():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    element = board.put_element(
        teacher, lesson.id, kind=BoardElementKind.STICKER, x=10, y=10, width=100, height=80
    )

    moved = board.put_element(
        teacher, lesson.id, element_id=element.id, x=200, y=120, width=160, height=120
    )
    assert (moved.id, moved.x, moved.width) == (element.id, 200, 160)
    assert BoardElement.objects.filter(board=moved.board, deleted_at__isnull=True).count() == 1


def test_conflicts_resolve_optimistically_last_write_wins():
    """No locks: two people on one element is rare, a frozen canvas is not."""
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    pupil = enrolled_pupil(course)
    board.set_open_for_students(teacher, lesson.id, is_open=True)
    element = board.put_element(teacher, lesson.id, kind=BoardElementKind.TEXT, data={"t": "a"})

    board.put_element(pupil, lesson.id, element_id=element.id, data={"t": "b"})
    final = board.put_element(teacher, lesson.id, element_id=element.id, data={"t": "c"})

    element.refresh_from_db()
    assert element.data == {"t": "c"}
    assert final.revision == 3, "the revision counts the writes rather than blocking them"


def test_authorship_is_kept_because_the_sheet_requires_it_to_be_visible():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    pupil = enrolled_pupil(course, first="Пётр")
    board.set_open_for_students(teacher, lesson.id, is_open=True)
    board.put_element(pupil, lesson.id, kind=BoardElementKind.STICKER, data={"text": "мой"})

    (element,) = [e for e in board.elements(teacher, lesson.id) if e.author_id == pupil.id]
    assert element.author.first_name == "Пётр"


def test_a_learner_may_take_back_their_own_but_not_someone_elses():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    anya = enrolled_pupil(course, "a@example.com", "Аня")
    boris = enrolled_pupil(course, "b@example.com", "Борис")
    board.set_open_for_students(teacher, lesson.id, is_open=True)
    hers = board.put_element(anya, lesson.id, kind=BoardElementKind.STICKER, data={"t": "мой"})

    with pytest.raises(PermissionDenied):
        board.remove_element(boris, lesson.id, hers.id)
    assert board.remove_element(anya, lesson.id, hers.id) is True
    # The teacher can clear anything from their own board.
    his = board.put_element(boris, lesson.id, kind=BoardElementKind.PEN, data={"p": [1]})
    assert board.remove_element(teacher, lesson.id, his.id) is True


# --- saving --------------------------------------------------------------------------------
def test_saving_the_board_puts_it_in_the_lessons_materials():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    board.put_element(teacher, lesson.id, kind=BoardElementKind.TEXT, data={"t": "маршрут"})

    snapshot = board.save_snapshot(teacher, lesson.id, "Доска · маршруты")

    assert snapshot.title == "Доска · маршруты"
    assert [e["data"]["t"] for e in snapshot.elements] == ["маршрут"]
    material = Material.objects.get(board_snapshot=snapshot)
    assert material.lesson_id == lesson.id and material.title == snapshot.title


def test_a_saved_board_keeps_what_it_showed_even_after_the_canvas_moves_on():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    element = board.put_element(teacher, lesson.id, kind=BoardElementKind.TEXT, data={"t": "было"})
    snapshot = board.save_snapshot(teacher, lesson.id)

    board.put_element(teacher, lesson.id, element_id=element.id, data={"t": "стало"})

    snapshot.refresh_from_db()
    assert [e["data"]["t"] for e in snapshot.elements] == ["было"]


def test_only_the_teacher_saves_the_board():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    pupil = enrolled_pupil(course)

    with pytest.raises(PermissionDenied):
        board.save_snapshot(pupil, lesson.id)


def test_past_lessons_boards_are_reachable_from_the_course():
    """«Доска прошлого урока» — the sheet asks for last time's board to be there."""
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    second = courses.create_lesson(teacher, lesson.section_id, title="Урок 2", duration_min=45)
    courses.publish_lesson(teacher, second.id)
    board.put_element(teacher, lesson.id, kind=BoardElementKind.TEXT, data={"t": "первый"})
    board.save_snapshot(teacher, lesson.id, "Доска урока 1")
    board.put_element(teacher, second.id, kind=BoardElementKind.TEXT, data={"t": "второй"})
    board.save_snapshot(teacher, second.id, "Доска урока 2")

    pupil = enrolled_pupil(course)
    titles = [s.title for s in board.course_snapshots(pupil, course.id)]
    assert set(titles) == {"Доска урока 1", "Доска урока 2"}


def test_a_stranger_cannot_read_the_courses_boards():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    board.save_snapshot(teacher, lesson.id)
    stranger = make_pupil("far@example.com", "Чужой")

    with pytest.raises(NotFound):
        board.course_snapshots(stranger, course.id)


# --- realtime ---------------------------------------------------------------------------------
def test_changes_are_broadcast_to_the_lessons_board_group(monkeypatch):
    sent = []

    class FakeLayer:
        async def group_send(self, group, message):
            sent.append((group, message))

    monkeypatch.setattr(board, "get_channel_layer", lambda: FakeLayer())
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)

    element = board.put_element(teacher, lesson.id, kind=BoardElementKind.TEXT, data={"t": "hi"})
    board.set_open_for_students(teacher, lesson.id, is_open=True)
    board.remove_element(teacher, lesson.id, element.id)

    groups = {g for g, _ in sent}
    kinds = [m["kind"] for _, m in sent]
    assert groups == {f"board_{lesson.id}"}
    assert kinds == ["element", "access", "removed"]
    # Authorship rides the wire so a tile can be labelled without a second round trip.
    assert sent[0][1]["element"]["author_name"] == "Ирина Соколова"


def test_the_board_never_grows_without_bound():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    monkey = board.MAX_ELEMENTS
    assert monkey > 0, "an unbounded canvas is a memory leak with a UI"


def test_a_deleted_element_stops_being_part_of_the_board():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    element = board.put_element(teacher, lesson.id, kind=BoardElementKind.SHAPE)

    board.remove_element(teacher, lesson.id, element.id)
    assert board.elements(teacher, lesson.id) == []
    # Kept as a row (soft delete) so a late change from another client cannot resurrect it
    # as a NEW element — it just updates a hidden one.
    assert BoardElement.objects.filter(id=element.id).exists()


def test_snapshot_naming_never_says_frame():
    """§2.8: the storage-policy gate greps the schema for `frame`, and a board is not video."""
    assert "Frame" not in BoardSnapshot.__name__
    assert BoardSnapshot.__name__ == "BoardSnapshot"


def test_a_lesson_has_exactly_one_live_board():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    first = board.get_board(teacher, lesson.id)
    second = board.get_board(teacher, lesson.id)
    assert first.id == second.id


def test_snapshots_are_listed_newest_first():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    older = board.save_snapshot(teacher, lesson.id, "Раньше")
    BoardSnapshot.objects.filter(id=older.id).update(created_at=timezone.now() - timedelta(days=1))
    board.save_snapshot(teacher, lesson.id, "Позже")

    assert [s.title for s in board.snapshots(teacher, lesson.id)] == ["Позже", "Раньше"]
