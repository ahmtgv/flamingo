"""Service-level tests for the homework domain (logic + permission boundaries)."""

from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.homework import services
from common import storage
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
        consent_152fz=True,
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


# --- teacher dashboard: grading queue + student counts (atlas 03) -----------
def test_teacher_pending_submissions_is_owner_scoped():
    """The grading queue = pending (SUBMITTED/LATE) submissions on the teacher's OWN courses,
    oldest first. A teacher never sees another teacher's queue; grading drops it; non-teacher → [].
    """
    teacher_a = make_teacher("dash.a@example.com")
    teacher_b = make_teacher("dash.b@example.com")
    student = make_student("dash.s@example.com")
    other = make_student("dash.o@example.com")

    course_a, lesson_a = published_course_with_lesson(teacher_a)
    hw_a = make_homework(teacher_a, lesson_a)
    services.publish_homework(teacher_a, hw_a.id)
    courses.enroll(student, course_a.id)
    sub_a = services.submit_homework(student, homework_id=hw_a.id, content_text="ответ A")

    course_b, lesson_b = published_course_with_lesson(teacher_b)
    hw_b = make_homework(teacher_b, lesson_b)
    services.publish_homework(teacher_b, hw_b.id)
    courses.enroll(other, course_b.id)
    services.submit_homework(other, homework_id=hw_b.id, content_text="ответ B")

    # A sees only A's pending submission — not B's.
    assert [s.id for s in services.teacher_pending_submissions(teacher_a)] == [sub_a.id]
    # Grading it removes it from the queue.
    services.grade_submission(teacher_a, submission_id=sub_a.id, score=5)
    assert services.teacher_pending_submissions(teacher_a) == []
    # A non-teacher has no queue.
    assert services.teacher_pending_submissions(student) == []


def test_teacher_student_counts():
    teacher = make_teacher("cnt.t@example.com")
    course, _lesson = published_course_with_lesson(teacher)
    s1 = make_student("cnt.s1@example.com")
    s2 = make_student("cnt.s2@example.com")
    courses.enroll(s1, course.id)
    courses.enroll(s2, course.id)

    assert courses.teacher_student_count(teacher) == 2
    week_ago = timezone.now() - timedelta(days=7)
    assert courses.teacher_new_students_this_week(teacher, week_ago) == 2
    # scoped: a student is not a teacher → 0
    assert courses.teacher_student_count(s1) == 0


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


def test_file_submission_and_download_authz(monkeypatch):
    teacher = make_teacher()
    course, lesson = published_course_with_lesson(teacher)
    hw = make_homework(teacher, lesson, allow_redo=True)
    services.publish_homework(teacher, hw.id)
    student = make_student("owner@example.com")
    classmate = make_student("mate@example.com")
    courses.enroll(student, course.id)
    courses.enroll(classmate, course.id)

    # validate_uploaded HEADs S3 — stub it to a valid small object (no MinIO in tests).
    monkeypatch.setattr(
        storage, "head", lambda key: {"size": 10, "content_type": "application/pdf"}
    )
    key = f"submission/{student.id}/abc/hw.pdf"
    sub = services.submit_homework(student, homework_id=hw.id, file_keys=[key])
    sf = sub.files.first()
    assert sf is not None and sf.file_key == key

    # Download authz: the submitting student and the owning teacher each get a presigned URL…
    assert services.submission_file_url(student, sf).startswith("http")
    assert services.submission_file_url(teacher, sf).startswith("http")
    # …but a classmate (also enrolled) is DENIED — never reads another student's file.
    with pytest.raises(PermissionDenied):
        services.submission_file_url(classmate, sf)


def test_cannot_bind_another_students_upload_key(monkeypatch):
    teacher = make_teacher()
    course, lesson = published_course_with_lesson(teacher)
    hw = make_homework(teacher, lesson)
    services.publish_homework(teacher, hw.id)
    student = make_student("a@example.com")
    other = make_student("b@example.com")
    courses.enroll(student, course.id)
    monkeypatch.setattr(
        storage, "head", lambda key: {"size": 10, "content_type": "application/pdf"}
    )
    # The key is in ANOTHER student's namespace → bind-time assert_caller_key denies it.
    with pytest.raises(PermissionDenied):
        services.submit_homework(
            student, homework_id=hw.id, file_keys=[f"submission/{other.id}/x/hw.pdf"]
        )
