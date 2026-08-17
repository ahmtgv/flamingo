"""Доска досинхронизируется после обрыва — проверка ПОВЕДЕНИЕМ (промпт 28 §1.2).

🔴 ЧТО БЫЛО. Подписка приносит изменения и не приносит того, что случилось, пока тебя не
было. Оборвалась связь на минуту — три штриха, нарисованные за эту минуту, не приезжали
никогда. У преподавателя на экране одно, у половины класса другое, и обе стороны уверены,
что видят доску.

Сценарий из наряда, дословно: **двое на доске, у одного рвём канал, второй рисует три штриха,
первый возвращается — видит все три.** Здесь проверена серверная половина: что «запросить
целиком» действительно отдаёт всё, что появилось за время отсутствия. Клиентская половина —
что холст делает этот запрос при обрыве и при возврате — проверена в браузере.
"""

from __future__ import annotations

from datetime import date

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.board import services as board
from apps.courses import services as courses
from apps.scheduling.models import LessonSession
from common.enums import BoardElementKind, Role

pytestmark = pytest.mark.django_db


def _lesson_with_two_people():
    teacher = accounts.register_user(
        email="b.teacher@example.com",
        password="strongpass1!",
        first_name="Люция",
        last_name="Валерьевна",
        role=Role.TEACHER,
        specialty="Английский",
        consent_152fz=True,
    )
    pupil = accounts.register_user(
        email="b.pupil@example.com",
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2011, 5, 1),
        consent_152fz=True,
    )
    course = courses.create_course(teacher, title="English A2", subject="Английский", level="a2")
    section = courses.create_section(teacher, course.id, title="Unit 4")
    lesson = courses.create_lesson(teacher, section.id, title="Travel", duration_min=40)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    courses.enroll(pupil, course.id)
    LessonSession.objects.create(lesson=lesson, start_at=timezone.now(), status="live")
    return teacher, pupil, lesson


def test_the_one_who_dropped_out_sees_every_stroke_drawn_without_them(monkeypatch):
    monkeypatch.setattr(board, "get_channel_layer", lambda: None)  # канал не нужен: смотрим итог
    teacher, pupil, lesson = _lesson_with_two_people()

    # Оба на доске. Ученик успел увидеть один штрих до обрыва.
    board.put_element(
        teacher,
        lesson.id,
        kind=BoardElementKind.PEN,
        x=0,
        y=0,
        width=10,
        height=10,
        data={"points": [[0, 0], [1, 1]]},
    )
    seen_before = board.elements(pupil, lesson.id)
    assert len(seen_before) == 1

    # Связь у ученика оборвалась. Преподаватель рисует ТРИ штриха.
    for n in range(3):
        board.put_element(
            teacher,
            lesson.id,
            kind=BoardElementKind.PEN,
            x=n,
            y=n,
            width=10,
            height=10,
            data={"points": [[n, n], [n + 1, n + 1]]},
        )

    # Ученик вернулся и запросил доску целиком — ровно то, что делает холст при обрыве.
    after = board.elements(pupil, lesson.id)

    assert len(after) == 4, "вернувшийся не увидел то, что нарисовали без него"
    # И это те самые штрихи, а не какие-нибудь: сверяем по идентификаторам.
    assert {str(e.id) for e in seen_before} < {str(e.id) for e in after}


def test_a_full_fetch_also_brings_removals_not_only_additions():
    """Обрыв прячет и стирание. Вернувшийся не должен видеть то, что уже стёрли."""
    teacher, pupil, lesson = _lesson_with_two_people()
    element = board.put_element(
        teacher,
        lesson.id,
        kind=BoardElementKind.PEN,
        x=0,
        y=0,
        width=10,
        height=10,
        data={"points": [[0, 0]]},
    )
    assert len(board.elements(pupil, lesson.id)) == 1

    board.remove_element(teacher, lesson.id, element.id)

    assert board.elements(pupil, lesson.id) == []
