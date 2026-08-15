"""Слот «мои курсы» на стартовой — находка владельца 15.08, п.2.

🔴 Что чинится: интерфейс был построен так, будто курс один. Своего списка курсов у
преподавателя не было НИГДЕ — был экран одного курса, был недельный дневник и общий каталог,
где лежат курсы всех. Слот при этом простаивал: `progress` считается по записи ученика,
которой у преподавателя нет, и был пуст всегда.
"""

import datetime as dt

import pytest
from django.utils import timezone

from apps.accounts import start_page
from apps.courses import services as courses
from apps.scheduling.models import LessonSession
from common.enums import LearningProfileKind

from .test_start_page import make_pupil, make_teacher

pytestmark = pytest.mark.django_db


def _course_with_lessons(teacher, *, title, published: int, drafts: int):
    course = courses.create_course(teacher, title=title, subject="Математика", level="grade_7")
    section = courses.create_section(teacher, course.id, title="Раздел")
    lessons = []
    for i in range(published + drafts):
        lesson = courses.create_lesson(teacher, section.id, title=f"{title} · урок {i}")
        if i < published:
            courses.publish_lesson(teacher, lesson.id)
        lessons.append(lesson)
    return course, lessons


def test_a_teacher_with_several_courses_sees_all_of_them():
    """Главное: список есть и в нём ВСЕ курсы, а не тот один, который открыт."""
    teacher = make_teacher()
    _course_with_lessons(teacher, title="Алгебра", published=3, drafts=1)
    _course_with_lessons(teacher, title="Геометрия", published=0, drafts=2)
    _course_with_lessons(teacher, title="Вероятность", published=5, drafts=0)

    page = start_page.start_page(teacher)

    assert page.profile.kind is LearningProfileKind.TEACHER
    assert [row.title for row in page.teaching] == ["Алгебра", "Вероятность", "Геометрия"]


def test_each_row_says_how_much_of_the_course_is_ready():
    """Сколько уроков и сколько из них опубликовано — иначе это надо открывать по одному."""
    teacher = make_teacher()
    _course_with_lessons(teacher, title="Алгебра", published=3, drafts=1)

    row = start_page.start_page(teacher).teaching[0]

    assert (row.lesson_count, row.published_lessons, row.section_count) == (4, 3, 1)
    assert row.is_draft is True  # курс не опубликован — так и сказано


def test_the_row_carries_the_nearest_session_of_that_course():
    """«Когда ближайшее занятие» — вопрос, на который иначе отвечает только расписание."""
    teacher = make_teacher()
    _, lessons = _course_with_lessons(teacher, title="Алгебра", published=2, drafts=0)
    soon = timezone.now() + dt.timedelta(hours=2)
    LessonSession.objects.create(lesson=lessons[1], start_at=soon + dt.timedelta(days=1))
    LessonSession.objects.create(lesson=lessons[0], start_at=soon)

    row = start_page.start_page(teacher).teaching[0]

    # Ближайшее, а не первое созданное и не последнее.
    assert row.next_at == soon
    assert row.next_lesson_title == lessons[0].title


def test_a_course_with_no_session_says_so_rather_than_borrowing_one():
    teacher = make_teacher()
    _course_with_lessons(teacher, title="Алгебра", published=1, drafts=0)
    _, other = _course_with_lessons(teacher, title="Геометрия", published=1, drafts=0)
    LessonSession.objects.create(lesson=other[0], start_at=timezone.now() + dt.timedelta(hours=3))

    rows = {row.title: row for row in start_page.start_page(teacher).teaching}

    assert rows["Алгебра"].next_at is None
    assert rows["Геометрия"].next_at is not None


def test_a_pupil_has_no_teaching_list():
    """Слот один, наполнение разное. У ученика в нём прогресс, а не чужие курсы."""
    pupil = make_pupil()
    assert start_page.start_page(pupil).teaching == []


def test_a_teacher_never_sees_someone_elses_course():
    """Граница: список — свои курсы, а не каталог. Проверяется, а не подразумевается."""
    mine = make_teacher()
    stranger = make_teacher(email="stranger@example.com")
    _course_with_lessons(mine, title="Моя алгебра", published=1, drafts=0)
    _course_with_lessons(stranger, title="Чужая алгебра", published=1, drafts=0)

    titles = [row.title for row in start_page.start_page(mine).teaching]

    assert titles == ["Моя алгебра"]
