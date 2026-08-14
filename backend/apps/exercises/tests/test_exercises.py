"""Exercises end to end — what reaches the journal, and what never does (R4.1, §7.4).

The three rules this file exists to hold in place:

* practice never reaches the journal;
* a live lesson does not grade by default — being wrong in class is part of learning;
* homework does, with the objective kinds marked automatically and the open ones left for
  the teacher.

Plus the one the sheet insists on: the teacher's live picture is counts, not a list of who is
struggling.
"""

from datetime import date

import pytest

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.exercises import services as exercises
from apps.exercises.models import Attempt, Exercise, ExerciseSet, SkillMastery
from apps.homework import services as homework
from apps.homework.models import Submission
from apps.institutions.models import Institution
from common.enums import (
    AttemptContext,
    ExerciseKind,
    ExerciseMode,
    HomeworkType,
    Role,
    SkillArea,
    SubmissionStatus,
)
from common.exceptions import NotFound, PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Ирина",
        last_name="Соколова",
        role=Role.TEACHER,
        specialty="English",
        consent_152fz=True,
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


def a_lesson(teacher, institution=None):
    if institution is not None:
        from apps.institutions.models import InstitutionMembership
        from common.enums import MembershipRole, MembershipStatus

        InstitutionMembership.objects.get_or_create(
            user=teacher,
            institution=institution,
            defaults={
                "role": MembershipRole.TEACHER.value,
                "status": MembershipStatus.ACTIVE.value,
            },
        )
    course = courses.create_course(
        teacher,
        title="English A2",
        subject="Английский",
        level="adult",
        institution_id=(institution.id if institution else None),
    )
    section = courses.create_section(teacher, course.id, title="Unit 4 · Travel")
    lesson = courses.create_lesson(teacher, section.id, title="Directions", duration_min=45)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    return course, lesson


def a_set(lesson, mode=ExerciseMode.PRACTICE, homework_row=None):
    return ExerciseSet.objects.create(
        lesson=lesson, title="Directions", mode=mode.value, homework=homework_row
    )


def an_exercise(exercise_set, kind=ExerciseKind.CHOICE, *, key=None, points=1, tags=()):
    return Exercise.objects.create(
        exercise_set=exercise_set,
        kind=kind.value,
        skill=SkillArea.GRAMMAR.value,
        skill_tags=list(tags),
        prompt={"text": "Choose"},
        payload={"options": ["come", "get", "arrive"]},
        answer_key=key if key is not None else {"correct": 1},
        points=points,
    )


def published_homework(teacher, lesson, allow_redo=False):
    row = homework.create_homework(
        teacher, title="Unit 4", type=HomeworkType.QUIZ, lesson_id=lesson.id, allow_redo=allow_redo
    )
    homework.publish_homework(teacher, row.id)
    return row


# --- access ------------------------------------------------------------------------------
def test_a_stranger_reaches_neither_the_set_nor_its_exercises():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    exercise_set = a_set(lesson)
    an_exercise(exercise_set)
    stranger = make_pupil("far@example.com", "Чужой")

    with pytest.raises(NotFound):
        exercises.exercises_of(stranger, exercise_set.id)
    with pytest.raises(NotFound):
        exercises.sets_of_lesson(stranger, lesson.id)


def test_the_answer_key_is_never_part_of_what_a_learner_can_reach():
    """A key on the wire is a test that answers itself — the GraphQL type omits it entirely."""
    from apps.exercises.graphql.types import Exercise as ExerciseType

    assert "answer_key" not in ExerciseType.__annotations__
    assert "answerKey" not in str(ExerciseType.__annotations__)


# --- attempts are kept -----------------------------------------------------------------------
def test_every_attempt_is_a_new_row_never_an_edit():
    """§4.2 п.4 and §7.2: append-only, the same shape the homework journal already uses."""
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    exercise = an_exercise(a_set(lesson))
    pupil = make_pupil()
    courses.enroll(pupil, lesson.section.course.id)

    first = exercises.record_attempt(pupil, exercise.id, response={"choice": 0})
    second = exercises.record_attempt(pupil, exercise.id, response={"choice": 1})

    assert first.id != second.id
    assert (first.is_correct, second.is_correct) == (False, True)
    assert Attempt.objects.filter(exercise=exercise).count() == 2


def test_the_objective_kinds_mark_themselves_and_the_open_ones_wait():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    exercise_set = a_set(lesson)
    auto = an_exercise(exercise_set, ExerciseKind.CLOZE, key={"accepted": ["the bill"]})
    open_kind = an_exercise(exercise_set, ExerciseKind.WRITING, key={})
    pupil = make_pupil()
    courses.enroll(pupil, lesson.section.course.id)

    assert (
        exercises.record_attempt(pupil, auto.id, response={"text": "The Bill."}).is_correct is True
    )
    assert (
        exercises.record_attempt(pupil, open_kind.id, response={"text": "..."}).is_correct is None
    )


def test_answering_moves_mastery_of_the_skills_the_exercise_touches():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    exercise = an_exercise(a_set(lesson), tags=["grammar.questions.word_order"])
    pupil = make_pupil()
    courses.enroll(pupil, lesson.section.course.id)

    exercises.record_attempt(pupil, exercise.id, response={"choice": 1})

    row = SkillMastery.objects.get(
        student=pupil.student_profile, skill_tag="grammar.questions.word_order"
    )
    assert row.p_known > 0.25 and row.opportunities == 1


# --- the journal rules (§7.4) -------------------------------------------------------------------
def test_practice_never_reaches_the_journal():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    exercise = an_exercise(a_set(lesson, ExerciseMode.PRACTICE))
    pupil = make_pupil()
    courses.enroll(pupil, lesson.section.course.id)

    exercises.record_attempt(
        pupil, exercise.id, response={"choice": 1}, context=AttemptContext.PRACTICE
    )

    assert Submission.objects.count() == 0, "practice feeds progress and repetition, nothing else"


def test_a_live_lesson_does_not_grade_by_default():
    """Being wrong in class is part of learning, not a verdict."""
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    exercise = an_exercise(a_set(lesson, ExerciseMode.LIVE))
    pupil = make_pupil()
    courses.enroll(pupil, lesson.section.course.id)

    exercises.record_attempt(
        pupil, exercise.id, response={"choice": 0}, context=AttemptContext.LIVE
    )

    assert Submission.objects.count() == 0


def test_the_teacher_can_count_live_work_on_purpose():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    row = published_homework(teacher, lesson)
    exercise_set = a_set(lesson, ExerciseMode.LIVE, homework_row=row)
    exercise = an_exercise(exercise_set, points=1)
    pupil = make_pupil()
    courses.enroll(pupil, lesson.section.course.id)
    exercises.record_attempt(
        pupil, exercise.id, response={"choice": 1}, context=AttemptContext.LIVE
    )

    submission = exercises.count_live_as_classwork(teacher, exercise_set.id, pupil.id)

    assert submission.status == SubmissionStatus.GRADED.value
    assert submission.score == 100  # a standalone course reads in percent


def test_only_the_teacher_counts_classwork():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    row = published_homework(teacher, lesson)
    exercise_set = a_set(lesson, ExerciseMode.LIVE, homework_row=row)
    pupil = make_pupil()
    courses.enroll(pupil, lesson.section.course.id)

    with pytest.raises(PermissionDenied):
        exercises.count_live_as_classwork(pupil, exercise_set.id, pupil.id)


def test_homework_marks_the_objective_part_and_leaves_the_rest_to_a_person():
    """«авто: N, требуют проверки: M» — and the row stays SUBMITTED until a person looks."""
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    row = published_homework(teacher, lesson)
    exercise_set = a_set(lesson, ExerciseMode.HOMEWORK, homework_row=row)
    a = an_exercise(exercise_set, ExerciseKind.CHOICE, key={"correct": 1})
    b = an_exercise(exercise_set, ExerciseKind.CLOZE, key={"accepted": ["the bill"]})
    essay = an_exercise(exercise_set, ExerciseKind.WRITING, key={})
    pupil = make_pupil()
    courses.enroll(pupil, lesson.section.course.id)
    exercises.record_attempt(pupil, a.id, response={"choice": 1}, context=AttemptContext.HOMEWORK)
    exercises.record_attempt(
        pupil, b.id, response={"text": "the check"}, context=AttemptContext.HOMEWORK
    )
    exercises.record_attempt(
        pupil, essay.id, response={"text": "…"}, context=AttemptContext.HOMEWORK
    )

    submission, summary = exercises.submit_homework_set(pupil, exercise_set.id)

    assert (summary["auto"], summary["pending"]) == (2, 1)
    assert (summary["earned"], summary["possible"]) == (1, 2)
    assert submission.score == 50
    assert (
        submission.status == SubmissionStatus.SUBMITTED.value
    ), "auto-marking is not grading — a person still has the essay to read"


def test_a_school_courses_homework_is_written_in_the_five_point_scale():
    """One stored number, read in the course's own scale (owner decision 2026-08-13)."""
    institution = Institution.objects.create(name="Гимназия №1")
    teacher = make_teacher()
    _, lesson = a_lesson(teacher, institution=institution)
    row = published_homework(teacher, lesson)
    exercise_set = a_set(lesson, ExerciseMode.HOMEWORK, homework_row=row)
    for _ in range(4):
        an_exercise(exercise_set, ExerciseKind.CHOICE, key={"correct": 1})
    pupil = make_pupil()
    courses.enroll(pupil, lesson.section.course.id)
    for exercise in Exercise.objects.filter(exercise_set=exercise_set):
        exercises.record_attempt(
            pupil, exercise.id, response={"choice": 1}, context=AttemptContext.HOMEWORK
        )

    submission, _ = exercises.submit_homework_set(pupil, exercise_set.id)
    assert submission.score == 5, "everything right on a five-point course is a five, not 100"


def test_a_practice_set_cannot_be_handed_in_as_homework():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    exercise_set = a_set(lesson, ExerciseMode.PRACTICE)
    pupil = make_pupil()
    courses.enroll(pupil, lesson.section.course.id)

    with pytest.raises(ValidationError):
        exercises.submit_homework_set(pupil, exercise_set.id)


# --- the teacher's live picture ------------------------------------------------------------------
def test_the_live_picture_is_counts_and_a_spread_never_a_list_of_children():
    """Sheet 02: «ответили 5 из 6 · верно 4». The teacher needs to know whether to
    re-explain, not who to look at."""
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    exercise_set = a_set(lesson, ExerciseMode.LIVE)
    exercise = an_exercise(exercise_set, key={"correct": 1})
    pupils = [make_pupil(f"p{i}@example.com", f"У{i}") for i in range(3)]
    for pupil in pupils:
        courses.enroll(pupil, course.id)
    for pupil, choice in zip(pupils, (1, 1, 0), strict=True):
        exercises.record_attempt(
            pupil, exercise.id, response={"choice": choice}, context=AttemptContext.LIVE
        )

    (row,) = exercises.live_picture(teacher, exercise_set.id)

    assert (row["answered"], row["correct"], row["group_size"]) == (3, 2, 3)
    assert row["spread"] == {"1": 2, "0": 1}
    # No child is named anywhere in the picture.
    assert "student" not in row
    assert all(str(p.id) not in str(row) for p in pupils)


def test_the_live_picture_is_the_teachers_view_only():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    exercise_set = a_set(lesson, ExerciseMode.LIVE)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)

    with pytest.raises(PermissionDenied):
        exercises.live_picture(pupil, exercise_set.id)


def test_a_learner_sees_their_own_attempts_and_their_own_progress():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    exercise_set = a_set(lesson)
    first = an_exercise(exercise_set)
    an_exercise(exercise_set)
    pupil = make_pupil()
    courses.enroll(pupil, lesson.section.course.id)
    exercises.record_attempt(pupil, first.id, response={"choice": 1})

    assert len(exercises.my_attempts(pupil, exercise_set.id)) == 1
    progress = exercises.set_progress(pupil, exercise_set.id)
    assert (progress["total"], progress["answered"], progress["correct"]) == (2, 1, 1)


def test_results_reach_the_subject_progress_through_the_journal():
    """The link the reviewer asked for: what a test produced shows up in «Задания» and in
    topic mastery, because both already read Submission."""
    from apps.courses import tasks_progress

    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    row = published_homework(teacher, lesson)
    exercise_set = a_set(lesson, ExerciseMode.HOMEWORK, homework_row=row)
    exercise = an_exercise(exercise_set, ExerciseKind.CHOICE, key={"correct": 1})
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    exercises.record_attempt(
        pupil, exercise.id, response={"choice": 1}, context=AttemptContext.HOMEWORK
    )
    submission, _ = exercises.submit_homework_set(pupil, exercise_set.id)
    homework.grade_submission(teacher, submission_id=submission.id, score=submission.score)

    (task,) = tasks_progress.subject_tasks(pupil, course.id)
    assert task.score == 100
    assert tasks_progress.subject_progress(pupil, course.id).overall_pct == 100
