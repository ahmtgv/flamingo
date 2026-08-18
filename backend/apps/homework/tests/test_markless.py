"""Дошкольники и первый класс — без отметок. Проверено ПОВЕДЕНИЕМ, а не наличием значения.

🔴 `GradingScale.MARKLESS` жил в перечислении с промпта 28 и НЕ ЗНАЧИЛ НИЧЕГО: ни одна строка
кода его не проверяла. Значение в перечислении — это слово, а не правило. Здесь правило.

Основание внешнее: ФГОС начального общего образования (приказ Минобрнауки РФ № 373 от
06.10.2009, ред. приказа Минпросвещения № 286 от 31.05.2021) и ФЗ-273 «Об образовании в РФ».
"""

from datetime import date

import pytest

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.homework import services
from common.enums import GradingScale, HomeworkType, Role
from common.exceptions import ValidationError
from common.marking import is_markless, scale_for, school_year

pytestmark = pytest.mark.django_db


def make_teacher(email="markless.t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Ирина",
        last_name="Петровна",
        role=Role.TEACHER,
        specialty="Начальные классы",
        consent_152fz=True,
    )


def make_pupil(email, grade_level):
    pupil = accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2019, 5, 1),
        grade_level=grade_level,
        consent_152fz=True,
    )
    return pupil


@pytest.mark.parametrize(
    ("written", "year"),
    [
        ("1", 1),
        ("1 класс", 1),
        ("grade_1", 1),
        ("дошкольник", 0),
        ("preschool", 0),
        ("7", 7),
        ("", None),
        (None, None),
        ("не знаю", None),
    ],
)
def test_year_is_read_from_a_free_field(written, year):
    """Поле свободное, и разбор один на весь продукт: иначе места разойдутся на «1 класс»."""
    assert school_year(written) == year


def test_first_grader_and_preschooler_are_markless():
    first = make_pupil("markless.1@example.com", "1")
    pre = make_pupil("markless.0@example.com", "дошкольник")
    second = make_pupil("markless.2@example.com", "2")
    assert is_markless(first.student_profile) is True
    assert is_markless(pre.student_profile) is True
    assert is_markless(second.student_profile) is False


def test_unknown_year_is_not_markless():
    """Неизвестность — не запрет. Иначе продукт придумал бы ограничение вместо закона (§6)."""
    nobody_asked = make_pupil("markless.x@example.com", "")
    assert is_markless(nobody_asked.student_profile) is False


def test_scale_of_a_first_grader_overrides_the_course():
    """Первоклассник остаётся первоклассником и на курсе, где остальные в девятом."""
    teacher = make_teacher("markless.scale@example.com")
    course = courses.create_course(teacher, title="Чтение", subject="Литература", level="grade_1")
    course.grading_scale = GradingScale.FIVE_POINT.value
    course.save(update_fields=["grading_scale"])
    first = make_pupil("markless.s1@example.com", "1")
    ninth = make_pupil("markless.s9@example.com", "9")
    assert scale_for(first.student_profile, course) is GradingScale.MARKLESS
    assert scale_for(ninth.student_profile, course) is GradingScale.FIVE_POINT


def a_submission_from(pupil, teacher, suffix=""):
    course = courses.create_course(
        teacher, title=f"Чтение{suffix}", subject="Литература", level="grade_1"
    )
    section = courses.create_section(teacher, course.id, title="Раздел 1")
    lesson = courses.create_lesson(teacher, section.id, title="Урок 1", duration_min=30)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    homework = services.create_homework(
        teacher, title="Прописи", type=HomeworkType.TEXT, lesson_id=lesson.id
    )
    services.publish_homework(teacher, homework.id)
    courses.enroll(pupil, course.id)
    return services.submit_homework(pupil, homework_id=homework.id, content_text="сделала")


def test_a_mark_for_a_first_grader_is_refused():
    """🔴 ВОРОТА: отметку первокласснику поставить НЕЛЬЗЯ. Отказ словами, а не молча."""
    teacher = make_teacher("markless.g1@example.com")
    pupil = make_pupil("markless.g1p@example.com", "1")
    submission = a_submission_from(pupil, teacher)

    with pytest.raises(ValidationError) as refusal:
        services.grade_submission(teacher, submission_id=submission.id, score=5)

    assert "без отметок" in str(refusal.value).lower()
    submission.refresh_from_db()
    assert submission.score is None


def test_zero_is_a_mark_too():
    """⚠️ Ноль — тоже отметка. Проверка «если score» пропустила бы его молча."""
    teacher = make_teacher("markless.g0@example.com")
    pupil = make_pupil("markless.g0p@example.com", "1")
    submission = a_submission_from(pupil, teacher)
    with pytest.raises(ValidationError):
        services.grade_submission(teacher, submission_id=submission.id, score=0)


def test_a_verbal_assessment_for_a_first_grader_is_accepted():
    """Словесная оценка — единственное, что разрешено, и она обязана работать."""
    teacher = make_teacher("markless.v@example.com")
    pupil = make_pupil("markless.vp@example.com", "1")
    submission = a_submission_from(pupil, teacher)

    services.grade_submission(
        teacher,
        submission_id=submission.id,
        score=None,
        comment="Молодец, буквы стали ровнее — потренируй «д».",
    )

    submission.refresh_from_db()
    assert submission.score is None
    assert "буквы" in submission.comment


def test_empty_words_are_not_an_assessment():
    """Безотметочная проверка — это словесная оценка. Пустая строка ею не является."""
    teacher = make_teacher("markless.e@example.com")
    pupil = make_pupil("markless.ep@example.com", "1")
    submission = a_submission_from(pupil, teacher)
    with pytest.raises(ValidationError):
        services.grade_submission(teacher, submission_id=submission.id, score=None, comment="   ")


def test_a_ninth_grader_still_gets_marks():
    """⚠️ Проверка, что правило не расползлось: обычному ученику отметку ставят как ставили."""
    teacher = make_teacher("markless.n@example.com")
    pupil = make_pupil("markless.np@example.com", "9")
    submission = a_submission_from(pupil, teacher)
    graded = services.grade_submission(teacher, submission_id=submission.id, score=5)
    assert graded.score == 5
