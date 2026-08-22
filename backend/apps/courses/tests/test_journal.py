"""Журнал преподавателя — первая половина (наряд 36 §5).

🔴 Кнопка «Открыть журнал» на листе 01 вела в очередь проверки СТАРОЙ рамы. Лист — контракт:
кнопку не переименовать, старый экран не расширять. Значит нужен свой журнал.
"""

from __future__ import annotations

from datetime import date

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.courses.journal import course_journal
from apps.homework import services as hw
from apps.institutions.models import (
    Group,
    GroupMembership,
    GroupTeacher,
    Institution,
    InstitutionMembership,
)
from apps.scheduling import services as sch
from common.enums import HomeworkType, MembershipRole, MembershipStatus, Role
from common.exceptions import NotFound
from tests.consent_helpers import sign_for_child

pytestmark = pytest.mark.django_db


def teacher(email="j-t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Ирина",
        last_name="Петровна",
        role=Role.TEACHER,
        specialty="Английский",
        consent_152fz=True,
    )


def pupil(email, grade="7"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2011, 5, 1),
        grade_level=grade,
        consent_152fz=True,
    )


def a_course_with_a_lesson(owner):
    course = courses.create_course(owner, title="Английский", subject="Английский", level="grade_7")
    section = courses.create_section(owner, course.id, title="Unit 1")
    lesson = courses.create_lesson(owner, section.id, title="Present Perfect", duration_min=40)
    courses.publish_lesson(owner, lesson.id)
    courses.publish_course(owner, course.id)
    return course, lesson


def test_the_journal_shows_who_was_there_and_what_they_got():
    t = teacher()
    p = pupil("j-p1@example.com")
    course, lesson = a_course_with_a_lesson(t)
    sign_for_child(p)  # §51: младше 16 — подпись представителя
    courses.enroll(p, course.id)

    homework = hw.create_homework(
        t, title="Упражнения", type=HomeworkType.TEXT, lesson_id=lesson.id
    )
    hw.publish_homework(t, homework.id)
    submission = hw.submit_homework(p, homework_id=homework.id, content_text="готово")
    hw.grade_submission(t, submission_id=submission.id, score=5, comment="хорошо")

    session = sch.schedule_session(t, lesson_id=lesson.id, start_at=timezone.now())
    sch.start_session(t, session.id)
    sch.join_session(p, session.id)

    data = course_journal(t, course.id)
    assert [s.name for s in data.students] == [p.short_name]
    assert [s.title for s in data.sessions] == ["Present Perfect"]
    cell = data.cells[0]
    assert cell.attendance == "present"
    assert cell.score == 5


def test_a_group_pupil_is_in_the_journal_too():
    """🔴 Ученик, пришедший КЛАССОМ, строки `Enrollment` не имеет. Свой запрос вместо чокпойнта
    его бы не увидел — ровно так зеркало однажды потеряло половину детей."""
    t = teacher("j-t2@example.com")
    p = pupil("j-p2@example.com")
    school = Institution.objects.create(name="Гимназия")
    group = Group.objects.create(institution=school, name="7А")
    GroupMembership.objects.create(group=group, student=p.student_profile)
    GroupTeacher.objects.create(group=group, teacher=t.teacher_profile, subject="Английский")
    # Курс внутри учреждения заводит только его участник — это правило продукта, не помеха.
    InstitutionMembership.objects.create(
        user=t,
        institution=school,
        role=MembershipRole.TEACHER.value,
        status=MembershipStatus.ACTIVE.value,
    )
    course = courses.create_course(
        t,
        title="Английский",
        subject="Английский",
        level="grade_7",
        institution_id=school.id,
        group_id=group.id,
    )
    section = courses.create_section(t, course.id, title="Unit 1")
    lesson = courses.create_lesson(t, section.id, title="Урок", duration_min=40)
    courses.publish_lesson(t, lesson.id)
    courses.publish_course(t, course.id)

    data = course_journal(t, course.id)
    assert [s.student_id for s in data.students] == [str(p.id)]


def test_a_first_grader_has_no_marks_in_the_journal():
    """Безотметочный ученик и в журнале без отметки — правило одно на продукт (§34.4)."""
    t = teacher("j-t3@example.com")
    p = pupil("j-p3@example.com", grade="1")
    course, lesson = a_course_with_a_lesson(t)
    sign_for_child(p)  # §51: младше 16 — подпись представителя
    courses.enroll(p, course.id)
    homework = hw.create_homework(t, title="Прописи", type=HomeworkType.TEXT, lesson_id=lesson.id)
    hw.publish_homework(t, homework.id)
    submission = hw.submit_homework(p, homework_id=homework.id, content_text="сделала")
    hw.grade_submission(t, submission_id=submission.id, score=None, comment="Молодец")
    session = sch.schedule_session(t, lesson_id=lesson.id, start_at=timezone.now())
    sch.start_session(t, session.id)

    data = course_journal(t, course.id)
    assert data.students[0].markless is True
    assert all(cell.score is None for cell in data.cells)


def test_somebody_elses_journal_is_not_reachable_by_asking():
    """🔒 Чужой журнал — это чужие дети и чужие оценки. Отвечаем «нет такого», а не «нет прав»:
    по отказу в правах чужой курс перебирается скриптом."""
    mine = teacher("j-t4@example.com")
    theirs = teacher("j-t5@example.com")
    course, _ = a_course_with_a_lesson(theirs)
    with pytest.raises(NotFound):
        course_journal(mine, course.id)
