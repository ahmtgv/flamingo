"""The subject cabinet — atlas sheet 01, second half (задания · прогресс).

Two owner decisions from the sheet are load-bearing here and are enforced in this module:

* **A retake shows the NEW grade, and every attempt survives.** The learner sees the latest
  graded attempt so an old mark does not keep stinging; nothing is overwritten, because a
  retake has always been a new ``Submission`` row (``uniq_submission_attempt``). The full
  history is raised from the teacher's journal, and the row says how many attempts there
  were so the learner is never misled into thinking the earlier one vanished.
* **Progress is mastery per topic, never one blended percentage.** A learner is compared
  only with their own past — there is no cohort ranking anywhere in this file. A teacher
  sees how the GROUP took a topic plus a COUNT of who is struggling; there is no per-pupil
  breakdown, because sheet 01 rules out efficiency profiles of children.

Rows carry data, never display text: "сдать до завтра, 18:00" and "9 ученикам тема даётся
тяжело" are composed on the client from the state, the timestamps and the counts.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from enum import Enum

import strawberry
from django.db.models import Q
from django.utils import timezone

from common.enums import GradingScale, LearningProfileKind, SessionStatus, SubmissionStatus

from .models import Course, Enrollment
from .subject import LessonProgress, _course_or_deny, _sessions_by_lesson, _viewer_kind

# `Submission.score` is one number whatever the course SHOWS (owner decision 2026-08-13):
# a five-point course stores 1–5, a percent course stores 0–100. Analytics must not care, so
# every score is normalised to an internal fraction 0..1 before anything is averaged — a
# five-point scale would otherwise quantise mastery into 20-point steps.
SCORE_MAX = 100
FIVE_POINT_MAX = 5
# Below this a topic counts as "не даётся" for the teacher's count. One named constant, not a
# threshold scattered through the code — and it is a COUNT of pupils, never a list of them.
WEAK_BELOW_PCT = 60
# The learner's "ты вырос на 7" compares against where they were a week ago.
SELF_COMPARE_WINDOW = dt.timedelta(days=7)
# The teacher's queue calls a submission old once it has waited this long.
STALE_AFTER = dt.timedelta(days=2)


@strawberry.enum
class TaskState(Enum):
    """Where a piece of work stands for this learner."""

    TODO = "todo"
    SUBMITTED = "submitted"  # handed in, waiting for the teacher
    GRADED = "graded"
    OVERDUE = "overdue"  # nothing handed in and the deadline has passed


@dataclass(frozen=True)
class SubjectTask:
    """One row of the «Задания» tab (for a teacher, one row of «На проверке»)."""

    id: str
    title: str
    lesson_id: str | None
    lesson_label: str | None  # the lesson's ordinal; the client words "Урок 12"
    due_at: dt.datetime | None
    state: TaskState
    # --- learner
    submitted_at: dt.datetime | None = None
    score: int | None = None  # the LATEST graded attempt — a retake replaces the mark shown
    comment: str | None = None  # the teacher's feedback on that attempt
    attempts: int = 0  # every attempt is kept; this says how many there were
    redo_open: bool = False
    # --- teacher (counts only)
    submitted_by: int | None = None
    group_size: int | None = None
    graded_count: int | None = None
    waiting_count: int | None = None
    stale_count: int | None = None  # of those waiting, how many waited longer than STALE_AFTER
    retake_count: int | None = None


@dataclass(frozen=True)
class SubjectTopic:
    """One row of the «Прогресс» tab: a section of the programme, and how it was taken.

    `pct` is None when there is nothing graded yet — an honest blank, not a zero, because a
    topic nobody has been marked on has not been failed.
    """

    id: str
    title: str
    lesson_from: str | None
    lesson_to: str | None
    is_current: bool  # the topic being taught right now
    pct: int | None = None
    # --- learner: comparison with their own past only
    previous_pct: int | None = None
    # --- teacher: the group, as counts
    weak_count: int | None = None
    learner_count: int | None = None


@dataclass(frozen=True)
class SubjectProgress:
    profile_kind: LearningProfileKind
    topics: list[SubjectTopic] = field(default_factory=list)
    overall_pct: int | None = None
    previous_overall_pct: int | None = None
    weak_below_pct: int = WEAK_BELOW_PCT


# --- helpers ---------------------------------------------------------------------------------
def _lesson_ordinals(course: Course) -> dict[str, int]:
    """Ordinal of every lesson in programme order — the same numbering the Уроки tab shows."""
    ordinals: dict[str, int] = {}
    n = 0
    for section in course.sections.all().order_by("order", "created_at"):
        for lesson_id in (
            section.lessons.all().order_by("order", "created_at").values_list("id", flat=True)
        ):
            n += 1
            ordinals[str(lesson_id)] = n
    return ordinals


def _first_unfinished_lesson(user, course: Course, ordinals: dict[str, int]) -> str | None:
    """The lesson the viewer is on — the first one they have not finished."""
    student_profile = getattr(user, "student_profile", None)
    enrolment = (
        Enrollment.objects.filter(student=student_profile, course=course).first()
        if student_profile
        else None
    )
    viewed = {str(x) for x in (enrolment.viewed_lesson_ids if enrolment else [])}
    for lesson_id, _ in sorted(ordinals.items(), key=lambda pair: pair[1]):
        if lesson_id not in viewed:
            return lesson_id
    return None


def _published_homework(course: Course):
    """Published homework of this course, whether pinned to a lesson or to the course."""
    from apps.homework.models import Homework

    # `Homework.objects` is the SoftDeleteManager, so deleted rows are already out.
    return (
        Homework.objects.filter(
            Q(lesson__section__course=course) | Q(course=course),
            published_at__isnull=False,
        )
        .select_related("lesson")
        .distinct()
        .order_by("due_at", "created_at")
    )


def _latest_attempts(submissions) -> dict[tuple[str, str], object]:
    """The most recent attempt per (student, homework). Earlier attempts are NOT dropped from
    the database — this only decides which mark is shown (owner decision on retakes).

    The key carries the student: a group's rows span many pupils, and keying by homework
    alone would silently keep one pupil's mark and drop the rest.
    """
    latest: dict[tuple[str, str], object] = {}
    for submission in submissions:
        key = (str(submission.student_id), str(submission.homework_id))
        current = latest.get(key)
        if current is None or submission.attempt > current.attempt:
            latest[key] = submission
    return latest


def _latest_by_homework(submissions) -> dict[str, object]:
    """Same, for ONE learner's own rows — keyed by homework so a row can look itself up."""
    return {homework_id: s for (_student, homework_id), s in _latest_attempts(submissions).items()}


def score_fraction(score: int, scale: GradingScale) -> float:
    """One mark → an internal fraction 0..1, whatever scale the course is shown in."""
    top = FIVE_POINT_MAX if scale is GradingScale.FIVE_POINT else SCORE_MAX
    return max(0.0, min(1.0, score / top))


def _mean_pct(scores: list[int], scale: GradingScale = GradingScale.PERCENT) -> int | None:
    """Mastery as a percentage, averaged over FRACTIONS rather than raw marks."""
    if not scores:
        return None
    fractions = [score_fraction(s, scale) for s in scores]
    return round(100 * sum(fractions) / len(fractions))


def _graded_scores_by_lesson(submissions) -> dict[str, list[int]]:
    """Latest graded mark per (student, homework), bucketed by the homework's lesson."""
    by_lesson: dict[str, list[int]] = {}
    for submission in _latest_attempts(submissions).values():
        if submission.score is None:
            continue
        lesson_id = getattr(submission.homework, "lesson_id", None)
        if lesson_id is None:
            continue
        by_lesson.setdefault(str(lesson_id), []).append(submission.score)
    return by_lesson


# --- tasks -------------------------------------------------------------------------------------
def subject_tasks(user, course_id) -> list[SubjectTask]:
    """The «Задания» tab. Access goes through the same chokepoint as the rest of the cabinet."""
    from apps.homework.models import Submission

    course = _course_or_deny(user, course_id)
    is_teacher = _viewer_kind(user, course) is LearningProfileKind.TEACHER
    ordinals = _lesson_ordinals(course)
    now = timezone.now()
    homework_list = list(_published_homework(course))
    if not homework_list:
        return []

    def row(hw, **extra) -> SubjectTask:
        return SubjectTask(
            id=str(hw.id),
            title=hw.title,
            lesson_id=str(hw.lesson_id) if hw.lesson_id else None,
            lesson_label=(
                str(ordinals[str(hw.lesson_id)])
                if hw.lesson_id and str(hw.lesson_id) in ordinals
                else None
            ),
            due_at=hw.due_at,
            **extra,
        )

    if is_teacher:
        rows: list[SubjectTask] = []
        group_size = Enrollment.objects.filter(course=course).count()
        submissions = list(
            Submission.objects.filter(homework__in=homework_list).only(
                "homework_id", "student_id", "attempt", "status", "submitted_at", "score"
            )
        )
        for hw in homework_list:
            mine = [s for s in submissions if str(s.homework_id) == str(hw.id)]
            by_student: dict[str, list] = {}
            for s in mine:
                by_student.setdefault(str(s.student_id), []).append(s)
            waiting = [
                s
                for s in mine
                if s.status in (SubmissionStatus.SUBMITTED.value, SubmissionStatus.LATE.value)
            ]
            graded_students = {
                sid
                for sid, items in by_student.items()
                if any(s.status == SubmissionStatus.GRADED.value for s in items)
            }
            rows.append(
                row(
                    hw,
                    # A queue row is "graded" only once nobody is waiting on it.
                    state=TaskState.GRADED if not waiting else TaskState.SUBMITTED,
                    submitted_by=len(by_student),
                    group_size=group_size,
                    graded_count=len(graded_students),
                    waiting_count=len(waiting),
                    stale_count=sum(
                        1 for s in waiting if s.submitted_at and now - s.submitted_at > STALE_AFTER
                    ),
                    retake_count=sum(1 for items in by_student.values() if len(items) > 1),
                )
            )
        return rows

    student_profile = getattr(user, "student_profile", None)
    mine_by_hw = (
        _latest_by_homework(
            Submission.objects.filter(
                student=student_profile, homework__in=homework_list
            ).select_related("homework")
        )
        if student_profile
        else {}
    )
    attempt_counts: dict[str, int] = {}
    if student_profile:
        for hw_id in Submission.objects.filter(
            student=student_profile, homework__in=homework_list
        ).values_list("homework_id", flat=True):
            attempt_counts[str(hw_id)] = attempt_counts.get(str(hw_id), 0) + 1

    rows = []
    for hw in homework_list:
        latest = mine_by_hw.get(str(hw.id))
        if latest is None:
            state = (
                TaskState.OVERDUE if hw.due_at is not None and hw.due_at < now else TaskState.TODO
            )
            rows.append(row(hw, state=state))
            continue
        graded = latest.status == SubmissionStatus.GRADED.value
        rows.append(
            row(
                hw,
                state=TaskState.GRADED if graded else TaskState.SUBMITTED,
                submitted_at=latest.submitted_at,
                score=latest.score if graded else None,
                comment=(latest.comment or None) if graded else None,
                attempts=attempt_counts.get(str(hw.id), 1),
                # A retake is offered only once the current attempt came back marked.
                redo_open=bool(hw.allow_redo and graded),
            )
        )
    return rows


# --- progress ------------------------------------------------------------------------------------
def subject_progress(user, course_id) -> SubjectProgress:
    """The «Прогресс» tab: mastery per topic (a section), never one blended number.

    A learner is compared only with their own past. A teacher gets the group's mastery and a
    count of who is struggling — no names, no per-pupil profile.
    """
    from apps.homework.models import Submission

    course = _course_or_deny(user, course_id)
    is_teacher = _viewer_kind(user, course) is LearningProfileKind.TEACHER
    # Marks are normalised through the COURSE's scale, not the viewer's preference.
    scale = course.scale
    ordinals = _lesson_ordinals(course)
    sessions = _sessions_by_lesson(course)
    live_lessons = {
        lesson_id
        for lesson_id, session in sessions.items()
        if getattr(session, "status", "") == SessionStatus.LIVE.value
    }
    # The topic being worked through: the one holding the first lesson not yet done. Same
    # pointer the Уроки tab marks with «›», so the two tabs cannot disagree.
    current_lesson = _first_unfinished_lesson(user, course, ordinals)
    cutoff = timezone.now() - SELF_COMPARE_WINDOW

    base = Submission.objects.filter(
        homework__lesson__section__course=course,
        status=SubmissionStatus.GRADED.value,
        score__isnull=False,
    ).select_related("homework")

    if is_teacher:
        rows = list(base)
        per_student: dict[str, list] = {}
        for submission in rows:
            per_student.setdefault(str(submission.student_id), []).append(submission)
        scores_by_lesson = _graded_scores_by_lesson(rows)
        # Per-student mastery is computed only to COUNT who is struggling; it is never
        # returned, so no child's profile leaves this function.
        weak_by_lesson: dict[str, set[str]] = {}
        learners_by_lesson: dict[str, set[str]] = {}
        for student_id, items in per_student.items():
            for lesson_id, scores in _graded_scores_by_lesson(items).items():
                learners_by_lesson.setdefault(lesson_id, set()).add(student_id)
                pct = _mean_pct(scores, scale)
                if pct is not None and pct < WEAK_BELOW_PCT:
                    weak_by_lesson.setdefault(lesson_id, set()).add(student_id)
    else:
        student_profile = getattr(user, "student_profile", None)
        mine = list(base.filter(student=student_profile)) if student_profile else []
        scores_by_lesson = _graded_scores_by_lesson(mine)
        earlier = [s for s in mine if s.graded_at and s.graded_at < cutoff]
        previous_by_lesson = _graded_scores_by_lesson(earlier)
        weak_by_lesson = {}
        learners_by_lesson = {}

    topics: list[SubjectTopic] = []
    all_scores: list[int] = []
    all_previous: list[int] = []

    for section in course.sections.all().order_by("order", "created_at"):
        lesson_ids = [
            str(x)
            for x in section.lessons.all()
            .order_by("order", "created_at")
            .values_list("id", flat=True)
        ]
        if not lesson_ids:
            continue
        scores = [s for lid in lesson_ids for s in scores_by_lesson.get(lid, [])]
        all_scores.extend(scores)
        is_current = any(lid in live_lessons or lid == current_lesson for lid in lesson_ids)

        if is_teacher:
            weak = {sid for lid in lesson_ids for sid in weak_by_lesson.get(lid, set())}
            learners = {sid for lid in lesson_ids for sid in learners_by_lesson.get(lid, set())}
            previous_pct = None
        else:
            previous = [s for lid in lesson_ids for s in previous_by_lesson.get(lid, [])]
            all_previous.extend(previous)
            previous_pct = _mean_pct(previous, scale)
            weak = learners = set()

        topics.append(
            SubjectTopic(
                id=str(section.id),
                title=section.title,
                lesson_from=str(ordinals[lesson_ids[0]]) if lesson_ids[0] in ordinals else None,
                lesson_to=str(ordinals[lesson_ids[-1]]) if lesson_ids[-1] in ordinals else None,
                is_current=is_current,
                pct=_mean_pct(scores, scale),
                previous_pct=previous_pct,
                weak_count=len(weak) if is_teacher else None,
                learner_count=len(learners) if is_teacher else None,
            )
        )

    return SubjectProgress(
        profile_kind=_viewer_kind(user, course),
        topics=topics,
        overall_pct=_mean_pct(all_scores, scale),
        previous_overall_pct=None if is_teacher else _mean_pct(all_previous, scale),
    )


__all__ = [
    "LessonProgress",
    "SubjectProgress",
    "SubjectTask",
    "SubjectTopic",
    "TaskState",
    "subject_progress",
    "subject_tasks",
    "WEAK_BELOW_PCT",
]
