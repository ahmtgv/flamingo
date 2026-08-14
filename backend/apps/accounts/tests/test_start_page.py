"""Start page (atlas sheet 00) — assembled per ACTIVE learning profile.

The behaviour worth pinning is that switching education re-scopes the whole page, not just
the label in the header, and that every slot is built from real rows rather than guesses.
"""

from datetime import UTC, date, datetime, timedelta
from unittest import mock

import pytest
from django.utils import timezone

from apps.accounts import learning, start_page
from apps.accounts import services as accounts
from apps.accounts.start_page import StartEntryKind
from apps.courses import services as courses
from apps.homework import services as homework
from apps.institutions.models import (
    Group,
    GroupMembership,
    Institution,
    InstitutionMembership,
)
from apps.scheduling.models import LessonSession
from common.enums import HomeworkType, MembershipRole, MembershipStatus, Role

pytestmark = pytest.mark.django_db


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Мария",
        last_name="Петровна",
        role=Role.TEACHER,
        specialty="Английский",
        consent_152fz=True,
    )


def make_pupil(email="p@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2010, 1, 1),
        consent_152fz=True,
    )


def join(user, institution, role=MembershipRole.STUDENT):
    InstitutionMembership.objects.get_or_create(
        user=user,
        institution=institution,
        defaults={"role": role.value, "status": MembershipStatus.ACTIVE.value},
    )


def course_with_lesson(teacher, title, institution=None, lesson_title="Урок 1"):
    if institution is not None:
        join(teacher, institution, MembershipRole.TEACHER)
    course = courses.create_course(
        teacher,
        title=title,
        subject="Английский",
        level="grade_9",
        institution_id=(institution.id if institution else None),
    )
    section = courses.create_section(teacher, course.id, title="Раздел 1")
    lesson = courses.create_lesson(teacher, section.id, title=lesson_title, duration_min=45)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    return course, lesson


def test_account_without_an_education_gets_an_empty_page():
    """A fresh sign-up has no profile, so the page comes back empty rather than erroring —
    the client renders the empty state from that."""
    page = start_page.start_page(make_pupil())
    assert page.profile is None
    assert page.now is None and page.today == [] and page.week == []


def test_switching_education_rescopes_the_whole_page():
    """The heart of sheet 00: the frame stays, the content follows the active profile.

    The pupil profile shows the school's lesson; switching to the cadet profile shows the
    self-paced course instead — same account, same query.
    """
    teacher = make_teacher()
    school = Institution.objects.create(name="Гимназия №1")
    pupil = make_pupil()
    join(pupil, school)
    GroupMembership.objects.create(
        group=Group.objects.create(institution=school, name="9А"),
        student=pupil.student_profile,
    )
    school_course, school_lesson = course_with_lesson(
        teacher, "Астрономия", institution=school, lesson_title="Экзопланеты"
    )
    solo_course, solo_lesson = course_with_lesson(teacher, "English A2", lesson_title="Unit 4")
    courses.enroll(pupil, school_course.id)
    courses.enroll(pupil, solo_course.id)
    LessonSession.objects.create(lesson=school_lesson, start_at=timezone.now() + timedelta(hours=2))

    as_pupil = start_page.start_page(pupil)
    assert as_pupil.profile.kind.value == "pupil"
    assert [e.title for e in as_pupil.today] == ["Экзопланеты"]
    assert {p.course_title for p in as_pupil.progress} == {"Астрономия"}

    learning.set_active_learning_profile(pupil, f"cadet:{solo_course.id}")
    pupil.refresh_from_db()
    as_cadet = start_page.start_page(pupil)
    assert as_cadet.profile.kind.value == "cadet"
    assert as_cadet.today == []  # self-paced study has no timetable
    assert {p.course_title for p in as_cadet.progress} == {"English A2"}
    assert [e.title for e in as_cadet.continue_entries] == ["Unit 4"]


def test_now_prefers_a_running_lesson_then_the_next_one():
    """⚠️ Тест владеет часами, а не заимствует их.

    Прежняя версия ставила занятие «через три часа» от настоящего времени и падала между
    21:00 и 24:00 UTC: три часа перепрыгивали полночь, занятие уезжало в завтра и в
    сегодняшнее окно не попадало. Тест, который проходит девять раз из десяти, хуже
    отсутствующего — он приучает не верить красному.
    """
    teacher = make_teacher()
    school = Institution.objects.create(name="Гимназия №1")
    pupil = make_pupil()
    join(pupil, school)
    course, lesson = course_with_lesson(teacher, "Астрономия", institution=school)
    courses.enroll(pupil, course.id)

    moment = datetime(2026, 8, 14, 10, 0, tzinfo=UTC)
    later = LessonSession.objects.create(lesson=lesson, start_at=moment + timedelta(hours=3))
    with mock.patch("django.utils.timezone.now", return_value=moment):
        assert start_page.start_page(pupil).now.session_id == str(later.id)

        live = LessonSession.objects.create(
            lesson=lesson, start_at=moment - timedelta(minutes=5), status="live"
        )
        now_entry = start_page.start_page(pupil).now
        assert now_entry.session_id == str(live.id) and now_entry.is_live


def test_a_cadet_with_nothing_scheduled_still_gets_somewhere_to_continue():
    """No timetable means "сейчас" falls back to the next unviewed lesson — the sheet's
    "Продолжить" card for a self-paced learner."""
    teacher = make_teacher()
    pupil = make_pupil()
    course, lesson = course_with_lesson(teacher, "English A2", lesson_title="Unit 4")
    courses.enroll(pupil, course.id)

    page = start_page.start_page(pupil)
    assert page.now is not None
    assert page.now.kind is StartEntryKind.CONTINUE_LESSON
    assert page.now.title == "Unit 4"


def test_attention_shows_owed_work_and_returned_feedback():
    teacher = make_teacher()
    pupil = make_pupil()
    course, lesson = course_with_lesson(teacher, "English A2")
    courses.enroll(pupil, course.id)

    due = homework.create_homework(
        teacher,
        title="Эссе",
        type=HomeworkType.TEXT,
        lesson_id=lesson.id,
        due_at=timezone.now() + timedelta(days=1),
    )
    homework.publish_homework(teacher, due.id)
    marked = homework.create_homework(
        teacher, title="Аудирование", type=HomeworkType.TEXT, lesson_id=lesson.id
    )
    homework.publish_homework(teacher, marked.id)
    submission = homework.submit_homework(pupil, homework_id=marked.id, content_text="ответ")
    homework.grade_submission(teacher, submission_id=submission.id, score=5, comment="Отлично")

    kinds = {e.kind for e in start_page.start_page(pupil).attention}
    assert StartEntryKind.HOMEWORK_DUE in kinds  # unsubmitted, has a deadline
    assert StartEntryKind.HOMEWORK_GRADED in kinds  # came back with a comment


def test_submitted_work_stops_asking_for_attention():
    teacher = make_teacher()
    pupil = make_pupil()
    course, lesson = course_with_lesson(teacher, "English A2")
    courses.enroll(pupil, course.id)
    item = homework.create_homework(
        teacher,
        title="Эссе",
        type=HomeworkType.TEXT,
        lesson_id=lesson.id,
        due_at=timezone.now() + timedelta(days=1),
    )
    homework.publish_homework(teacher, item.id)

    assert any(
        e.kind is StartEntryKind.HOMEWORK_DUE for e in start_page.start_page(pupil).attention
    )
    homework.submit_homework(pupil, homework_id=item.id, content_text="сдано")
    assert not any(
        e.kind is StartEntryKind.HOMEWORK_DUE for e in start_page.start_page(pupil).attention
    )


def test_teacher_sees_a_grading_queue_not_a_pupil_progress_list():
    """Sheet 00 gives the teacher a queue with a count; progress/continue belong to learners
    and must not appear in a teaching context."""
    teacher = make_teacher()
    school = Institution.objects.create(name="Гимназия №1")
    join(teacher, school, MembershipRole.TEACHER)
    pupil = make_pupil()
    course, lesson = course_with_lesson(teacher, "Астрономия", institution=school)
    courses.enroll(pupil, course.id)
    item = homework.create_homework(
        teacher, title="Эссе", type=HomeworkType.TEXT, lesson_id=lesson.id
    )
    homework.publish_homework(teacher, item.id)
    homework.submit_homework(pupil, homework_id=item.id, content_text="ответ")

    page = start_page.start_page(teacher)
    assert page.profile.kind.value == "teacher"
    (queue,) = page.attention
    assert queue.kind is StartEntryKind.GRADING_QUEUE and queue.count == 1
    assert page.progress == [] and page.continue_entries == []


def test_week_is_seven_days_starting_today_and_marks_today():
    teacher = make_teacher()
    school = Institution.objects.create(name="Гимназия №1")
    pupil = make_pupil()
    join(pupil, school)
    course, lesson = course_with_lesson(teacher, "Астрономия", institution=school)
    courses.enroll(pupil, course.id)
    LessonSession.objects.create(lesson=lesson, start_at=timezone.now() + timedelta(days=2))

    week = start_page.start_page(pupil).week
    assert len(week) == 7
    assert [day.is_today for day in week].count(True) == 1 and week[0].is_today
    assert sum(len(day.entries) for day in week) >= 1


def test_another_pupils_lessons_never_appear():
    """Scoping is the caller's own enrolments — a classmate's other school stays invisible."""
    teacher = make_teacher()
    mine = Institution.objects.create(name="Моя школа")
    theirs = Institution.objects.create(name="Чужая школа")
    pupil = make_pupil()
    join(pupil, mine)
    my_course, my_lesson = course_with_lesson(teacher, "Моя астрономия", institution=mine)
    courses.enroll(pupil, my_course.id)
    _, their_lesson = course_with_lesson(teacher, "Чужая физика", institution=theirs)
    LessonSession.objects.create(lesson=my_lesson, start_at=timezone.now() + timedelta(hours=1))
    LessonSession.objects.create(lesson=their_lesson, start_at=timezone.now() + timedelta(hours=1))

    titles = {e.course_title for e in start_page.start_page(pupil).today}
    assert titles == {"Моя астрономия"}


def test_anonymous_gets_an_empty_page_not_an_error():
    page = start_page.start_page(None)
    assert page.profile is None and page.today == []
