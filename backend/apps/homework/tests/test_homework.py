"""Service-level tests for the homework domain (logic + permission boundaries)."""

from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.homework import services
from common.enums import HomeworkType, Role, SubmissionStatus
from common.exceptions import PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


def make_teacher(email="teacher@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Иван",
        last_name="Петров",
        role=Role.TEACHER,
        specialty="Математика",
    )


def make_student(email="student@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Пётр",
        last_name="Сидоров",
        role=Role.STUDENT,
        birth_date=date(2008, 1, 1),
    )


def published_course_with_lesson(teacher):
    course = courses.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    section = courses.create_section(teacher, course.id, title="Раздел 1")
    lesson = courses.create_lesson(teacher, section.id, title="Урок 1", duration_min=30)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    return course, lesson


def make_homework(teacher, lesson, **kw):
    return services.create_homework(
        teacher, title="Домашка 1", type=HomeworkType.TEXT, lesson_id=lesson.id, **kw
    )


def test_create_requires_teacher_and_ownership():
    teacher = make_teacher()
    other_teacher = make_teacher("other@example.com")
    student = make_student()
    _course, lesson = published_course_with_lesson(teacher)

    # student cannot create homework
    with pytest.raises(PermissionDenied):
        services.create_homework(student, title="X", type=HomeworkType.TEXT, lesson_id=lesson.id)
    # a teacher who does not own the lesson's course cannot create on it
    with pytest.raises(PermissionDenied):
        services.create_homework(
            other_teacher, title="X", type=HomeworkType.TEXT, lesson_id=lesson.id
        )
    # owner creates an unpublished homework
    hw = make_homework(teacher, lesson)
    assert hw.published_at is None
    assert hw.is_published is False
    assert hw.lesson_id == lesson.id


def test_create_needs_lesson_or_course():
    teacher = make_teacher()
    with pytest.raises(ValidationError):
        services.create_homework(teacher, title="X", type=HomeworkType.TEXT)


def test_cannot_submit_unpublished():
    teacher = make_teacher()
    student = make_student()
    _course, lesson = published_course_with_lesson(teacher)
    hw = make_homework(teacher, lesson)
    courses.enroll(student, _course.id)
    with pytest.raises(ValidationError):
        services.submit_homework(student, homework_id=hw.id, content_text="ответ")


def test_submit_creates_submission():
    teacher = make_teacher()
    student = make_student()
    course, lesson = published_course_with_lesson(teacher)
    hw = make_homework(teacher, lesson)
    services.publish_homework(teacher, hw.id)
    courses.enroll(student, course.id)

    sub = services.submit_homework(student, homework_id=hw.id, content_text="ответ")
    assert sub.attempt == 1
    assert sub.status == SubmissionStatus.SUBMITTED.value
    assert sub.submitted_at is not None


def test_submit_is_late_when_overdue():
    teacher = make_teacher()
    student = make_student()
    course, lesson = published_course_with_lesson(teacher)
    hw = make_homework(teacher, lesson, due_at=timezone.now() - timedelta(days=1))
    services.publish_homework(teacher, hw.id)
    courses.enroll(student, course.id)

    sub = services.submit_homework(student, homework_id=hw.id, content_text="поздно")
    assert sub.status == SubmissionStatus.LATE.value


def test_redo_rule():
    teacher = make_teacher()
    student = make_student()
    course, lesson = published_course_with_lesson(teacher)
    hw = make_homework(teacher, lesson)
    services.publish_homework(teacher, hw.id)
    courses.enroll(student, course.id)

    services.submit_homework(student, homework_id=hw.id, content_text="v1")
    # no redo allowed -> second attempt blocked
    with pytest.raises(ValidationError):
        services.submit_homework(student, homework_id=hw.id, content_text="v2")
    # allow redo -> second attempt accepted
    services.update_homework(teacher, hw.id, allow_redo=True)
    sub2 = services.submit_homework(student, homework_id=hw.id, content_text="v2")
    assert sub2.attempt == 2


def test_grade_submission_owner_only():
    teacher = make_teacher()
    other_teacher = make_teacher("other@example.com")
    student = make_student()
    course, lesson = published_course_with_lesson(teacher)
    hw = make_homework(teacher, lesson)
    services.publish_homework(teacher, hw.id)
    courses.enroll(student, course.id)
    sub = services.submit_homework(student, homework_id=hw.id, content_text="ответ")

    # student cannot grade
    with pytest.raises(PermissionDenied):
        services.grade_submission(student, submission_id=sub.id, score=90)
    # a non-owner teacher cannot grade
    with pytest.raises(PermissionDenied):
        services.grade_submission(other_teacher, submission_id=sub.id, score=90)

    graded = services.grade_submission(teacher, submission_id=sub.id, score=90, comment="Отлично")
    assert graded.status == SubmissionStatus.GRADED.value
    assert graded.score == 90
    assert graded.graded_by_id == teacher.id


def test_submission_stats_and_my_submissions():
    teacher = make_teacher()
    s1 = make_student("s1@example.com")
    s2 = make_student("s2@example.com")
    course, lesson = published_course_with_lesson(teacher)
    hw = make_homework(teacher, lesson)
    services.publish_homework(teacher, hw.id)
    courses.enroll(s1, course.id)
    courses.enroll(s2, course.id)

    sub1 = services.submit_homework(s1, homework_id=hw.id, content_text="a")
    services.submit_homework(s2, homework_id=hw.id, content_text="b")
    services.grade_submission(teacher, submission_id=sub1.id, score=80)

    stats = services.submission_stats(hw)
    assert stats == {"total": 2, "submitted": 1, "graded": 1, "late": 0}

    mine = services.my_submissions(s1)
    assert len(mine) == 1 and mine[0].id == sub1.id


def test_lesson_homework_hides_drafts_from_students():
    teacher = make_teacher()
    student = make_student()
    course, lesson = published_course_with_lesson(teacher)
    published = make_homework(teacher, lesson)
    services.publish_homework(teacher, published.id)
    make_homework(teacher, lesson)  # draft
    courses.enroll(student, course.id)

    assert len(services.lesson_homework(teacher, lesson.id)) == 2  # owner sees all
    student_visible = services.lesson_homework(student, lesson.id)
    assert len(student_visible) == 1 and student_visible[0].id == published.id
