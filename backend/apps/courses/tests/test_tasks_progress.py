"""Subject cabinet — atlas sheet 01, second half (PROMPT_13 R1.2).

What is worth pinning: a retake shows the new mark while every attempt survives, a learner
is compared only with their own past, a teacher gets counts rather than per-pupil profiles,
and neither tab is a way around ``can_access_course``.
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.courses import services as courses
from apps.courses import subject, tasks_progress
from apps.courses.tasks_progress import TaskState
from apps.homework import services as homework
from apps.homework.models import Submission
from apps.institutions.models import Institution
from common.enums import HomeworkType, LearningProfileKind, LessonKind
from common.exceptions import NotFound, PermissionDenied

from .test_subject import build_course, make_pupil, make_teacher

pytestmark = pytest.mark.django_db


def publish_homework(teacher, lesson, *, title="Лабораторная", allow_redo=False, due_at=None):
    hw = homework.create_homework(
        teacher,
        title=title,
        type=HomeworkType.FILE,
        lesson_id=lesson.id,
        due_at=due_at,
        allow_redo=allow_redo,
    )
    homework.publish_homework(teacher, hw.id)
    return hw


def submit_and_grade(teacher, pupil, hw, score, comment=""):
    submission = homework.submit_homework(pupil, homework_id=hw.id, content_text="ответ")
    return homework.grade_submission(
        teacher, submission_id=submission.id, score=score, comment=comment
    )


# --- access ------------------------------------------------------------------------------------
def test_neither_tab_is_a_way_around_the_chokepoint():
    teacher = make_teacher()
    course, _, _ = build_course(teacher)
    stranger = make_pupil("stranger@example.com")

    with pytest.raises(NotFound):
        tasks_progress.subject_tasks(stranger, course.id)
    with pytest.raises(NotFound):
        tasks_progress.subject_progress(stranger, course.id)


# --- tasks -------------------------------------------------------------------------------------
def test_a_task_waiting_to_be_handed_in_says_so():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    publish_homework(teacher, lessons[0], due_at=timezone.now() + timedelta(days=1))
    pupil = make_pupil()
    courses.enroll(pupil, course.id)

    (row,) = tasks_progress.subject_tasks(pupil, course.id)
    assert row.state is TaskState.TODO
    assert row.attempts == 0
    assert row.score is None
    assert row.lesson_label == "1"  # the ordinal; the client words "Урок 1"


def test_a_missed_deadline_reads_as_overdue_not_as_nothing():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    publish_homework(teacher, lessons[0], due_at=timezone.now() - timedelta(days=1))
    pupil = make_pupil()
    courses.enroll(pupil, course.id)

    (row,) = tasks_progress.subject_tasks(pupil, course.id)
    assert row.state is TaskState.OVERDUE


def test_handed_in_but_unmarked_work_shows_no_grade_yet():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    hw = publish_homework(teacher, lessons[0])
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    homework.submit_homework(pupil, homework_id=hw.id, content_text="ответ")

    (row,) = tasks_progress.subject_tasks(pupil, course.id)
    assert row.state is TaskState.SUBMITTED
    assert row.score is None and row.comment is None
    assert row.submitted_at is not None


def test_a_graded_task_carries_the_mark_and_the_teachers_words():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    hw = publish_homework(teacher, lessons[0])
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    submit_and_grade(teacher, pupil, hw, 80, comment="Период посчитан по двум минимумам")

    (row,) = tasks_progress.subject_tasks(pupil, course.id)
    assert row.state is TaskState.GRADED
    assert row.score == 80
    assert row.comment == "Период посчитан по двум минимумам"
    assert row.attempts == 1
    assert row.redo_open is False  # allow_redo was not set


def test_a_retake_shows_the_new_mark_and_keeps_every_attempt():
    """Owner decision (sheet 01, answer 2): the new grade is what the learner sees, but the
    earlier attempt is still a row in the database — the journal raises the history."""
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    hw = publish_homework(teacher, lessons[0], allow_redo=True)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)

    submit_and_grade(teacher, pupil, hw, 60, comment="Пересчитай период")
    (row,) = tasks_progress.subject_tasks(pupil, course.id)
    assert row.score == 60 and row.redo_open is True

    submit_and_grade(teacher, pupil, hw, 95, comment="Теперь верно")
    (row,) = tasks_progress.subject_tasks(pupil, course.id)
    assert row.score == 95, "the retake replaces the mark that is shown"
    assert row.comment == "Теперь верно"
    assert row.attempts == 2, "the row admits there were two attempts"

    kept = list(
        Submission.objects.filter(homework=hw, student=pupil.student_profile)
        .order_by("attempt")
        .values_list("attempt", "score")
    )
    assert kept == [(1, 60), (2, 95)], "nothing was overwritten — every attempt survives"


def test_a_teacher_sees_the_queue_as_counts_never_as_a_list_of_children():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    hw = publish_homework(teacher, lessons[0], allow_redo=True)
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com")
    for pupil in (anya, boris):
        courses.enroll(pupil, course.id)
    submit_and_grade(teacher, anya, hw, 70)
    homework.submit_homework(anya, homework_id=hw.id, content_text="пересдача")  # 2nd attempt
    homework.submit_homework(boris, homework_id=hw.id, content_text="ответ")  # waiting

    (row,) = tasks_progress.subject_tasks(teacher, course.id)
    assert row.submitted_by == 2 and row.group_size == 2
    assert row.graded_count == 1
    assert row.waiting_count == 2  # Аня's retake and Борис's first hand-in
    assert row.retake_count == 1
    # No child is named anywhere in the row.
    assert not hasattr(row, "students")
    assert "Аня" not in str(row) and "Борис" not in str(row)


def test_a_long_wait_is_counted_so_the_queue_can_say_so():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    hw = publish_homework(teacher, lessons[0])
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    submission = homework.submit_homework(pupil, homework_id=hw.id, content_text="ответ")
    Submission.objects.filter(id=submission.id).update(
        submitted_at=timezone.now() - timedelta(days=3)
    )

    (row,) = tasks_progress.subject_tasks(teacher, course.id)
    assert row.waiting_count == 1 and row.stale_count == 1


def test_unpublished_homework_is_not_a_task_yet():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    homework.create_homework(
        teacher, title="Черновик", type=HomeworkType.TEXT, lesson_id=lessons[0].id
    )
    pupil = make_pupil()
    courses.enroll(pupil, course.id)

    assert tasks_progress.subject_tasks(pupil, course.id) == []


# --- progress ----------------------------------------------------------------------------------
def test_mastery_is_per_topic_and_a_topic_without_marks_stays_blank():
    """A topic nobody has been marked on has not been failed — it reads as «—», not as 0 %."""
    teacher = make_teacher()
    course, section, lessons = build_course(teacher)
    other = courses.create_section(teacher, course.id, title="Раздел 3 · Звёзды")
    later = courses.create_lesson(teacher, other.id, title="Урок 4", duration_min=45)
    courses.publish_lesson(teacher, later.id)
    hw = publish_homework(teacher, lessons[0])
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    submit_and_grade(teacher, pupil, hw, 88)

    progress = tasks_progress.subject_progress(pupil, course.id)
    by_title = {t.title: t for t in progress.topics}
    assert by_title["Раздел 2 · Планетные системы"].pct == 88
    assert by_title["Раздел 3 · Звёзды"].pct is None
    assert by_title["Раздел 2 · Планетные системы"].lesson_from == "1"


def test_a_learner_is_compared_only_with_their_own_past():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    old_hw = publish_homework(teacher, lessons[0], title="Раньше")
    new_hw = publish_homework(teacher, lessons[1], title="Сейчас")
    pupil = make_pupil()
    classmate = make_pupil("c@example.com")
    for learner in (pupil, classmate):
        courses.enroll(learner, course.id)

    old = submit_and_grade(teacher, pupil, old_hw, 55)
    Submission.objects.filter(id=old.id).update(graded_at=timezone.now() - timedelta(days=14))
    submit_and_grade(teacher, pupil, new_hw, 69)
    # A classmate's marks must not move this learner's numbers in any direction.
    submit_and_grade(teacher, classmate, new_hw, 100)

    progress = tasks_progress.subject_progress(pupil, course.id)
    assert progress.overall_pct == 62  # mean(55, 69)
    assert progress.previous_overall_pct == 55  # only what was already graded a week ago
    # A standalone course is self-paced, so the viewer reads as a cadet — either way
    # the numbers above came only from this learner's own work.
    assert progress.profile_kind is LearningProfileKind.CADET


def test_a_teacher_sees_group_mastery_and_a_count_of_who_struggles():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    hw = publish_homework(teacher, lessons[0])
    strong, weak = make_pupil("s@example.com"), make_pupil("w@example.com")
    for pupil in (strong, weak):
        courses.enroll(pupil, course.id)
    submit_and_grade(teacher, strong, hw, 90)
    submit_and_grade(teacher, weak, hw, 30)

    progress = tasks_progress.subject_progress(teacher, course.id)
    topic = progress.topics[0]
    assert topic.pct == 60, "the group's mastery is the mean of both pupils, not one of them"
    assert topic.learner_count == 2
    assert topic.weak_count == 1
    assert progress.weak_below_pct == tasks_progress.WEAK_BELOW_PCT
    # No per-pupil profile leaves the projection: only counts.
    assert progress.previous_overall_pct is None
    assert "s@example.com" not in str(progress) and "w@example.com" not in str(progress)


def test_group_mastery_counts_every_pupil_not_just_the_last_one():
    """Regression: keying attempts by homework alone silently kept one pupil and dropped
    the rest, so a group of 20 could report one child's mark as the topic's mastery."""
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    hw = publish_homework(teacher, lessons[0])
    pupils = [make_pupil(f"p{i}@example.com") for i in range(4)]
    for pupil in pupils:
        courses.enroll(pupil, course.id)
    for pupil, score in zip(pupils, (100, 80, 60, 40), strict=True):
        submit_and_grade(teacher, pupil, hw, score)

    topic = tasks_progress.subject_progress(teacher, course.id).topics[0]
    assert topic.pct == 70  # mean(100, 80, 60, 40)
    assert topic.learner_count == 4


def test_only_the_latest_attempt_counts_towards_mastery():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    hw = publish_homework(teacher, lessons[0], allow_redo=True)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    submit_and_grade(teacher, pupil, hw, 40)
    submit_and_grade(teacher, pupil, hw, 90)

    assert tasks_progress.subject_progress(pupil, course.id).overall_pct == 90


def test_the_topic_being_worked_through_is_marked_as_current():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    other = courses.create_section(teacher, course.id, title="Раздел 3 · Звёзды")
    later = courses.create_lesson(teacher, other.id, title="Урок 4", duration_min=45)
    courses.publish_lesson(teacher, later.id)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    courses.mark_lesson_viewed(pupil, lessons[0].id)

    topics = {t.title: t for t in tasks_progress.subject_progress(pupil, course.id).topics}
    assert topics["Раздел 2 · Планетные системы"].is_current is True
    assert topics["Раздел 3 · Звёзды"].is_current is False


# --- programme edit mode (server-side, never trusted from the client) -----------------------
def test_only_the_owning_teacher_may_reshape_the_programme():
    teacher = make_teacher()
    course, section, lessons = build_course(teacher)
    intruder = make_teacher("other@example.com")
    pupil = make_pupil()
    courses.enroll(pupil, course.id)

    for actor in (intruder, pupil):
        with pytest.raises(PermissionDenied):
            courses.update_lesson(actor, lessons[0].id, title="Взломано")
        with pytest.raises(PermissionDenied):
            courses.create_lesson(actor, section.id, title="Чужой урок", duration_min=10)
        with pytest.raises(PermissionDenied):
            courses.reorder_lessons(actor, section.id, [lessons[1].id, lessons[0].id])
        with pytest.raises(PermissionDenied):
            courses.delete_lesson(actor, lessons[0].id)

    lessons[0].refresh_from_db()
    assert lessons[0].title == "Урок 1"


def test_the_owner_can_reorder_and_the_programme_renumbers():
    teacher = make_teacher()
    course, section, lessons = build_course(teacher)
    courses.reorder_lessons(teacher, section.id, [lessons[2].id, lessons[0].id, lessons[1].id])

    programme = subject.subject_cabinet(teacher, course.id).sections[0].lessons
    assert [x.title for x in programme] == ["Урок 3", "Урок 1", "Урок 2"]
    assert [x.order_label for x in programme] == ["1", "2", "3"]


def test_marking_a_lesson_as_a_device_lesson_is_an_edit_not_a_new_concept():
    """R1.1 introduced the lesson kind; the edit mode is where a teacher actually sets it."""
    teacher = make_teacher()
    _, section, lessons = build_course(teacher)

    updated = courses.update_lesson(
        teacher,
        lessons[0].id,
        kind=LessonKind.EXTERNAL_DEVICE,
        device_key="microobservatory",
    )
    assert updated.kind == LessonKind.EXTERNAL_DEVICE.value
    assert updated.device_key == "microobservatory"

    # Turning it back into an ordinary lesson must not leave a device behind.
    back = courses.update_lesson(teacher, lessons[0].id, kind=LessonKind.STANDARD)
    assert back.device_key == ""

    created = courses.create_lesson(
        teacher,
        section.id,
        title="Своё наблюдение",
        duration_min=45,
        kind=LessonKind.EXTERNAL_DEVICE,
        device_key="microobservatory",
    )
    assert created.kind == LessonKind.EXTERNAL_DEVICE.value


def test_an_institutional_course_keeps_its_group_scope_in_both_tabs():
    """A pupil of the institution reaches the tabs through the group path, not an enrolment."""
    institution = Institution.objects.create(name="Гимназия №1")
    teacher = make_teacher()
    course, _, lessons = build_course(teacher, institution=institution)
    outsider = make_pupil("outside@example.com")

    with pytest.raises(NotFound):
        tasks_progress.subject_tasks(outsider, course.id)
    assert tasks_progress.subject_progress(teacher, course.id).topics[0].pct is None
    assert lessons  # the programme exists; there is simply nothing graded yet
