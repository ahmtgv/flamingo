"""Аудитория курса — две независимые оси (решение владельца 2026-08-15).

Список «1–11 класс · Взрослые» был узок. Расширять его одним списком нельзя: «дошкольники ·
колледжи · вузы» — это МЕСТО в системе образования, «курсы · повышение квалификации» — ВИД
программы, и в одном списке пришлось бы городить пункт на каждую пару.

Тесты держат ровно то, ради чего заведена вторая ось: пары, которые одной осью не выражаются.
"""

import pytest

from apps.courses import services
from common.enums import CourseFormat, CourseLevel

from .test_courses import make_teacher

pytestmark = pytest.mark.django_db


def test_the_new_stages_are_all_storable():
    """Пять пунктов владельца доезжают до базы, а не остаются в списке на экране."""
    teacher = make_teacher()
    for level in (CourseLevel.PRESCHOOL, CourseLevel.COLLEGE, CourseLevel.UNIVERSITY):
        course = services.create_course(
            teacher, title="К", subject="П", level=level, format=CourseFormat.PROGRAM
        )
        course.refresh_from_db()
        assert course.level == level.value


def test_a_course_can_be_a_course_for_a_school_class():
    """🔴 Случай, ради которого осей две: «курс английского для 7 класса».

    Одним списком он не выражается — пришлось бы завести отдельный пункт «курс для 7 класса»,
    и так на каждую пару из пятнадцати ступеней и трёх видов.
    """
    teacher = make_teacher()
    course = services.create_course(
        teacher,
        title="Английский: разговорная практика",
        subject="Языки",
        level=CourseLevel.GRADE_7,
        format=CourseFormat.COURSE,
    )
    course.refresh_from_db()
    assert (course.level, course.format) == ("grade_7", "course")


def test_professional_development_is_a_kind_not_a_stage():
    """Повышение квалификации — вид программы; ступень у него своя (взрослые)."""
    teacher = make_teacher()
    course = services.create_course(
        teacher,
        title="Повышение квалификации: цифровые инструменты",
        subject="Педагогика",
        level=CourseLevel.ADULT,
        format=CourseFormat.PROFESSIONAL,
    )
    course.refresh_from_db()
    assert course.format == CourseFormat.PROFESSIONAL.value


def test_a_course_made_without_a_format_is_a_programme():
    """Умолчание — то, чем всякий курс и был до появления поля. Не «не указано»."""
    teacher = make_teacher()
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    course.refresh_from_db()
    assert course.format == CourseFormat.PROGRAM.value


def test_the_catalog_filters_by_each_axis_separately():
    """Обе оси фильтруют независимо — иначе вторая ось есть в базе и её нет в поиске."""
    teacher = make_teacher()
    school = services.create_course(
        teacher, title="Алгебра", subject="Математика", level="grade_7", format=CourseFormat.PROGRAM
    )
    club = services.create_course(
        teacher, title="Клуб", subject="Математика", level="grade_7", format=CourseFormat.COURSE
    )
    cpd = services.create_course(
        teacher, title="ПК", subject="Педагогика", level="adult", format=CourseFormat.PROFESSIONAL
    )
    for course in (school, club, cpd):
        services.publish_course(teacher, course.id)

    by_stage = {c.id for c in services.published_courses(level="grade_7")}
    assert by_stage == {school.id, club.id}

    by_kind = {c.id for c in services.published_courses(format="course")}
    assert by_kind == {club.id}

    # И вместе: «курс для 7 класса» — пересечение, а не отдельный пункт списка.
    both = {c.id for c in services.published_courses(level="grade_7", format="course")}
    assert both == {club.id}


def test_updating_a_course_can_change_either_axis():
    teacher = make_teacher()
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    services.update_course(teacher, course.id, level="college", format="course")
    course.refresh_from_db()
    assert (course.level, course.format) == ("college", "course")
