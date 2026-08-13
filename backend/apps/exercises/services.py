"""Exercise services: answering, marking, and what reaches the journal.

The whole of §7.4 lives in `record_attempt` and `submit_homework_set`:

* practice never reaches the journal — it feeds progress and repetition and nothing else;
* a live lesson does not grade by default, because being wrong in class is part of learning;
* homework does, and the objective kinds mark themselves so a teacher spends their attention
  on the writing and the speaking, which is where it is worth something.

The teacher's live picture is an AGGREGATE by construction: `live_picture` returns counts and
a distribution over the options, and there is no function here that returns who answered
what. Sheet 02 asks for «ответили 5 из 6 · верно 4», not for a list of who is struggling.
"""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.courses.access import can_access_course
from common.enums import (
    AttemptContext,
    ExerciseKind,
    ExerciseMode,
    GradingScale,
    SubmissionStatus,
)
from common.exceptions import NotFound, PermissionDenied, ValidationError

from .checking import (
    AUTO_CHECKED,
    MASTERED_AT,
    P_INIT,
    TEACHER_CHECKED,
    bkt_update,
    check,
    guess_rate,
)
from .models import Attempt, Exercise, ExerciseSet, SkillMastery


def _set_or_deny(user, set_id) -> ExerciseSet:
    """A set is the lesson's, so it lives behind the lesson's own access rule."""
    row = (
        ExerciseSet.objects.filter(id=set_id)
        .select_related("lesson__section__course__owner", "homework")
        .first()
    )
    if row is None:
        raise NotFound("Exercise set not found")
    if not can_access_course(user, row.lesson.section.course):
        raise NotFound("Exercise set not found")
    return row


def is_teacher_of(user, exercise_set: ExerciseSet) -> bool:
    return exercise_set.lesson.section.course.owner.user_id == getattr(user, "id", None)


def _student(user):
    profile = getattr(user, "student_profile", None)
    if profile is None:
        raise PermissionDenied("Only a learner answers exercises")
    return profile


def exercises_of(user, set_id) -> list[Exercise]:
    return list(Exercise.objects.filter(exercise_set=_set_or_deny(user, set_id)))


def sets_of_lesson(user, lesson_id) -> list[ExerciseSet]:
    from apps.courses.models import Lesson

    lesson = Lesson.objects.filter(id=lesson_id).select_related("section__course").first()
    if lesson is None or not can_access_course(user, lesson.section.course):
        raise NotFound("Lesson not found")
    return list(ExerciseSet.objects.filter(lesson=lesson))


# --- answering ------------------------------------------------------------------------------
@transaction.atomic
def record_attempt(
    user,
    exercise_id,
    *,
    response: dict,
    context: AttemptContext | str = AttemptContext.PRACTICE,
    session_id=None,
    latency_ms: int = 0,
    hints_used: int = 0,
) -> Attempt:
    """Record one answer. Append-only: a second try is a second row, never an edit."""
    exercise = (
        Exercise.objects.filter(id=exercise_id)
        .select_related("exercise_set__lesson__section__course")
        .first()
    )
    if exercise is None:
        raise NotFound("Exercise not found")
    exercise_set = exercise.exercise_set
    if not can_access_course(user, exercise_set.lesson.section.course):
        raise NotFound("Exercise not found")

    student = _student(user)
    kind = ExerciseKind(exercise.kind)
    correct = check(kind, exercise.answer_key or {}, response or {})
    attempt = Attempt.objects.create(
        exercise=exercise,
        student=student,
        context=AttemptContext(getattr(context, "value", context)).value,
        lesson_session_id=session_id,
        response=response or {},
        is_correct=correct,
        score=exercise.points if correct else 0,
        latency_ms=max(0, latency_ms),
        hints_used=max(0, hints_used),
    )
    if correct is not None:
        _update_mastery(student, exercise, correct=correct)
    return attempt


def _update_mastery(student, exercise: Exercise, *, correct: bool) -> None:
    """BKT over each skill tag the exercise exercises (§7.3)."""
    p_guess = guess_rate(ExerciseKind(exercise.kind))
    for tag in exercise.skill_tags or []:
        row, _ = SkillMastery.objects.get_or_create(
            student=student, skill_tag=tag, defaults={"p_known": P_INIT}
        )
        row.p_known = bkt_update(row.p_known, correct, p_guess=p_guess)
        row.opportunities += 1
        row.save(update_fields=["p_known", "opportunities", "updated_at"])


def mastery_of(user, *, mastered_only: bool = False) -> list[SkillMastery]:
    rows = SkillMastery.objects.filter(student=_student(user))
    return list(rows.filter(p_known__gte=MASTERED_AT) if mastered_only else rows)


# --- the journal (§7.4) -----------------------------------------------------------------------
def _latest_attempts(student, exercises) -> dict[str, Attempt]:
    latest: dict[str, Attempt] = {}
    for attempt in Attempt.objects.filter(student=student, exercise__in=exercises).order_by(
        "created_at"
    ):
        latest[str(attempt.exercise_id)] = attempt
    return latest


@transaction.atomic
def submit_homework_set(user, set_id):
    """Hand in a homework set.

    The objective kinds are marked here and their aggregate lands in `Submission.score`; the
    open ones are left for the teacher, whose `grade_submission` already exists and overrides
    the total. No new grade entity — the journal stays a view over Submission (§7.4).
    """
    from apps.homework import services as homework_services

    exercise_set = _set_or_deny(user, set_id)
    if ExerciseMode(exercise_set.mode) is not ExerciseMode.HOMEWORK:
        raise ValidationError("This set is not homework")
    if exercise_set.homework_id is None:
        raise ValidationError("This set is not attached to a homework")

    student = _student(user)
    exercises = list(Exercise.objects.filter(exercise_set=exercise_set))
    latest = _latest_attempts(student, exercises)

    auto = [e for e in exercises if ExerciseKind(e.kind) in AUTO_CHECKED]
    pending = [e for e in exercises if ExerciseKind(e.kind) in TEACHER_CHECKED]
    earned = sum(latest[str(e.id)].score for e in auto if str(e.id) in latest)
    possible = sum(e.points for e in auto) or 0

    submission = homework_services.submit_homework(
        user, homework_id=exercise_set.homework_id, content_text=""
    )
    if possible:
        scale = exercise_set.lesson.section.course.scale
        fraction = earned / possible
        # One stored number, read in the course's own scale (owner decision 2026-08-13).
        submission.score = (
            round(fraction * 5) if scale is GradingScale.FIVE_POINT else round(fraction * 100)
        )
        # Auto-marking is not grading: the row stays SUBMITTED until a person looks at the
        # open answers, so «авто: 8/10, требуют проверки: 2» is honest on the teacher's side.
        submission.status = SubmissionStatus.SUBMITTED.value
        submission.save(update_fields=["score", "status", "updated_at"])
    return submission, {
        "auto": len(auto),
        "pending": len(pending),
        "earned": earned,
        "possible": possible,
    }


@transaction.atomic
def count_live_as_classwork(user, set_id, student_id):
    """The teacher decides a live set was worth marking after all (§7.4).

    Nothing about a live lesson reaches the journal until this is called on purpose.
    """
    from apps.accounts.models import StudentProfile
    from apps.homework import services as homework_services

    exercise_set = _set_or_deny(user, set_id)
    if not is_teacher_of(user, exercise_set):
        raise PermissionDenied("Only the teacher counts classwork")
    if exercise_set.homework_id is None:
        raise ValidationError("Attach a homework to this set first")
    student = StudentProfile.objects.filter(user_id=student_id).first()
    if student is None:
        raise NotFound("Student not found")

    exercises = list(Exercise.objects.filter(exercise_set=exercise_set))
    latest = _latest_attempts(student, exercises)
    auto = [e for e in exercises if ExerciseKind(e.kind) in AUTO_CHECKED]
    earned = sum(latest[str(e.id)].score for e in auto if str(e.id) in latest)
    possible = sum(e.points for e in auto) or 1

    scale = exercise_set.lesson.section.course.scale
    fraction = earned / possible
    score = round(fraction * 5) if scale is GradingScale.FIVE_POINT else round(fraction * 100)
    return homework_services.record_classwork(
        user,
        homework_id=exercise_set.homework_id,
        student=student,
        score=score,
    )


# --- the teacher's live picture ------------------------------------------------------------
def live_picture(user, set_id) -> list[dict]:
    """What the class is doing, as counts.

    Deliberately aggregate: how many answered, how many got it right, and how the answers
    spread across the options. There is no per-pupil breakdown here and there is not meant to
    be one — the teacher needs to know whether to re-explain, not who to look at.
    """
    exercise_set = _set_or_deny(user, set_id)
    if not is_teacher_of(user, exercise_set):
        raise PermissionDenied("The live picture is the teacher's view")

    from apps.courses.models import Enrollment

    group_size = Enrollment.objects.filter(course=exercise_set.lesson.section.course).count()
    picture = []
    for exercise in Exercise.objects.filter(exercise_set=exercise_set):
        attempts = Attempt.objects.filter(
            exercise=exercise, context=AttemptContext.LIVE.value
        ).order_by("created_at")
        by_student: dict[str, Attempt] = {str(a.student_id): a for a in attempts}
        spread: dict[str, int] = {}
        for attempt in by_student.values():
            choice = attempt.response.get("choice")
            if choice is not None:
                spread[str(choice)] = spread.get(str(choice), 0) + 1
        picture.append(
            {
                "exercise_id": str(exercise.id),
                "answered": len(by_student),
                "group_size": group_size,
                "correct": sum(1 for a in by_student.values() if a.is_correct),
                "spread": spread,
            }
        )
    return picture


def my_attempts(user, set_id) -> list[Attempt]:
    """The caller's own attempts on a set — every one of them, in order."""
    exercise_set = _set_or_deny(user, set_id)
    return list(
        Attempt.objects.filter(
            student=_student(user), exercise__exercise_set=exercise_set
        ).select_related("exercise")
    )


def set_progress(user, set_id) -> dict:
    """How far the caller has got, for the learner's own view."""
    exercise_set = _set_or_deny(user, set_id)
    exercises = list(Exercise.objects.filter(exercise_set=exercise_set))
    latest = _latest_attempts(_student(user), exercises)
    done = [e for e in exercises if str(e.id) in latest]
    correct = [e for e in done if latest[str(e.id)].is_correct]
    return {
        "total": len(exercises),
        "answered": len(done),
        "correct": len(correct),
        "finished_at": timezone.now() if len(done) == len(exercises) and exercises else None,
    }
