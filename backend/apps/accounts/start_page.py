"""The start page — what the account sees first, for the education it is currently in.

Atlas sheet 00 is the contract. One frame for every role; the ACTIVE learning profile
(R0.2) decides what fills it, which is why this lives next to ``learning.py`` rather than in
one of the subject apps: it is a view of the account, assembled from the domains.

Everything returned is DATA. Lesson, course and homework titles are user-generated content,
so they travel; UI copy ("Сдать до завтра", "урок начинается") never does — the client builds
those from `kind` + `at` through i18n. That is what keeps the page translatable.

Authorization comes from the existing chokepoints: the schedule is filtered by
``scheduling.services.my_schedule`` (enrolment-scoped for a pupil, ownership-scoped for a
teacher), the grading queue by ``homework.services.teacher_pending_submissions`` (own courses
only). Nothing here widens what a caller may see; it narrows it to the active profile.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from enum import Enum

import strawberry
from django.utils import timezone

from common.enums import LearningProfileKind, SessionStatus, SubmissionStatus

from .learning import LearningProfile, active_learning_profile

WEEK_DAYS = 7


@strawberry.enum
class StartEntryKind(Enum):
    """What a row on the start page is. The client turns this into wording."""

    LESSON_SESSION = "lesson_session"  # a scheduled or running lesson
    HOMEWORK_DUE = "homework_due"  # work the pupil still owes
    HOMEWORK_GRADED = "homework_graded"  # graded, feedback waiting to be read
    GRADING_QUEUE = "grading_queue"  # teacher: work awaiting their marking
    CONTINUE_LESSON = "continue_lesson"  # next unviewed lesson of a course


@dataclass(frozen=True)
class StartEntry:
    id: str
    kind: StartEntryKind
    title: str
    course_title: str | None = None
    teacher_name: str | None = None
    at: dt.datetime | None = None
    count: int | None = None
    age_days: int | None = None
    session_id: str | None = None
    lesson_id: str | None = None
    course_id: str | None = None
    is_live: bool = False


@dataclass(frozen=True)
class StartDay:
    date: dt.date
    is_today: bool
    entries: list[StartEntry] = field(default_factory=list)


@dataclass(frozen=True)
class StartProgress:
    course_id: str
    course_title: str
    done_lessons: int
    total_lessons: int
    progress_pct: int


@dataclass(frozen=True)
class StartPage:
    profile: LearningProfile | None
    now: StartEntry | None
    today: list[StartEntry]
    attention: list[StartEntry]
    week: list[StartDay]
    continue_entries: list[StartEntry]
    progress: list[StartProgress]


# --- scope ---------------------------------------------------------------------------------
def _scoped_course_ids(user, profile: LearningProfile) -> list[str]:
    """The courses the ACTIVE profile is about — this is how switching education changes the
    whole page rather than just a label in the header."""
    from apps.courses.models import Course, Enrollment

    student_profile = getattr(user, "student_profile", None)

    if profile.kind is LearningProfileKind.CADET:
        return [profile.course_id] if profile.course_id else []

    if profile.kind is LearningProfileKind.PUPIL:
        if student_profile is None:
            return []
        return [
            str(course_id)
            for course_id in Enrollment.objects.filter(
                student=student_profile, course__institution_id=profile.institution_id
            ).values_list("course_id", flat=True)
        ]

    # TEACHER: their own courses in this institution. Courses with no institution travel with
    # the teacher (there is no other profile that would ever show them).
    from django.db.models import Q

    return [
        str(course_id)
        for course_id in Course.objects.filter(owner__user=user)
        .filter(Q(institution_id=profile.institution_id) | Q(institution__isnull=True))
        .values_list("id", flat=True)
    ]


def _session_entry(session, *, now: dt.datetime) -> StartEntry:
    from apps.scheduling.services import teacher_name_for

    course = session.lesson.section.course
    return StartEntry(
        id=f"session:{session.id}",
        kind=StartEntryKind.LESSON_SESSION,
        title=session.lesson.title,
        course_title=course.title,
        teacher_name=teacher_name_for(session),
        at=session.start_at,
        session_id=str(session.id),
        lesson_id=str(session.lesson_id),
        course_id=str(course.id),
        is_live=session.status == SessionStatus.LIVE.value,
    )


# --- slots ---------------------------------------------------------------------------------
def _sessions_in_range(user, course_ids, start, end):
    from apps.scheduling.services import my_schedule

    if not course_ids:
        return []
    return [
        session
        for session in my_schedule(user, start, end)
        if str(session.lesson.section.course_id) in set(course_ids)
        and session.status != SessionStatus.CANCELED.value
    ]


def _pupil_attention(user, course_ids, now) -> list[StartEntry]:
    """What a pupil owes and what came back marked. Both are real rows, not a guess: an
    unsubmitted published homework with a deadline, and a graded submission carrying a
    comment they have not seen acknowledged yet."""
    from apps.homework.models import Homework, Submission

    student_profile = getattr(user, "student_profile", None)
    if student_profile is None or not course_ids:
        return []

    submitted_ids = set(
        Submission.objects.filter(student=student_profile).values_list("homework_id", flat=True)
    )
    due = (
        Homework.objects.filter(published_at__isnull=False, due_at__isnull=False)
        .filter(_homework_course_filter(course_ids))
        .exclude(id__in=submitted_ids)
        .select_related("course", "lesson__section__course")
        .order_by("due_at")[:5]
    )
    entries = [
        StartEntry(
            id=f"homework:{item.id}",
            kind=StartEntryKind.HOMEWORK_DUE,
            title=item.title,
            course_title=_homework_course_title(item),
            at=item.due_at,
            age_days=max(0, (item.due_at - now).days) if item.due_at else None,
            lesson_id=str(item.lesson_id) if item.lesson_id else None,
        )
        for item in due
    ]

    graded = (
        Submission.objects.filter(student=student_profile, status=SubmissionStatus.GRADED.value)
        .exclude(comment="")
        .select_related("homework")
        .order_by("-graded_at")[:3]
    )
    entries.extend(
        StartEntry(
            id=f"submission:{submission.id}",
            kind=StartEntryKind.HOMEWORK_GRADED,
            title=submission.homework.title,
            at=submission.graded_at,
            count=submission.score,
            lesson_id=(
                str(submission.homework.lesson_id) if submission.homework.lesson_id else None
            ),
        )
        for submission in graded
    )
    return entries


def _homework_course_filter(course_ids):
    from django.db.models import Q

    return Q(course_id__in=course_ids) | Q(lesson__section__course_id__in=course_ids)


def _homework_course_title(item) -> str | None:
    if item.course_id:
        return item.course.title
    if item.lesson_id:
        return item.lesson.section.course.title
    return None


def _teacher_attention(user) -> list[StartEntry]:
    """The teacher's queue, as one row with a count — the sheet shows "11 работ на проверке",
    not eleven rows."""
    from apps.homework.services import teacher_pending_submissions

    pending = teacher_pending_submissions(user)
    if not pending:
        return []
    now = timezone.now()
    oldest = min((s.submitted_at for s in pending if s.submitted_at), default=None)
    return [
        StartEntry(
            id="grading-queue",
            kind=StartEntryKind.GRADING_QUEUE,
            title="",  # the client words this from `kind` + `count`
            count=len(pending),
            age_days=(now - oldest).days if oldest else None,
        )
    ]


def _continue_entries(user, course_ids) -> list[StartEntry]:
    """Where the learner stopped: the first published lesson of a scoped course they have not
    marked as viewed. Real data — Enrollment.viewed_lesson_ids already tracks it."""
    from apps.courses.models import Enrollment, Lesson
    from common.enums import LessonStatus

    student_profile = getattr(user, "student_profile", None)
    if student_profile is None or not course_ids:
        return []

    entries = []
    for enrolment in (
        Enrollment.objects.filter(student=student_profile, course_id__in=course_ids)
        .select_related("course")
        .order_by("created_at")
    ):
        viewed = {str(x) for x in (enrolment.viewed_lesson_ids or [])}
        following = (
            Lesson.objects.filter(
                section__course_id=enrolment.course_id, status=LessonStatus.PUBLISHED.value
            )
            .exclude(id__in=viewed)
            .select_related("section")
            .order_by("section__order", "order")
            .first()
        )
        if following is None:
            continue
        entries.append(
            StartEntry(
                id=f"continue:{following.id}",
                kind=StartEntryKind.CONTINUE_LESSON,
                title=following.title,
                course_title=enrolment.course.title,
                lesson_id=str(following.id),
                course_id=str(enrolment.course_id),
            )
        )
    return entries[:3]


def _progress(user, course_ids) -> list[StartProgress]:
    from apps.courses.models import Enrollment, Lesson
    from common.enums import LessonStatus

    student_profile = getattr(user, "student_profile", None)
    if student_profile is None or not course_ids:
        return []

    rows = []
    for enrolment in (
        Enrollment.objects.filter(student=student_profile, course_id__in=course_ids)
        .select_related("course")
        .order_by("created_at")
    ):
        total = Lesson.objects.filter(
            section__course_id=enrolment.course_id, status=LessonStatus.PUBLISHED.value
        ).count()
        viewed = len(enrolment.viewed_lesson_ids or [])
        rows.append(
            StartProgress(
                course_id=str(enrolment.course_id),
                course_title=enrolment.course.title,
                done_lessons=min(viewed, total),
                total_lessons=total,
                progress_pct=enrolment.progress_pct,
            )
        )
    return rows


def _week(sessions, attention, today: dt.date) -> list[StartDay]:
    """Seven days from today — sessions plus anything with a deadline in that window.

    A cadet has no timetable, so their strip simply comes back with empty days: the sheet
    fills it with repetition load, and spaced repetition (FSRS) is R4.4. Showing invented
    card counts here would be worse than showing an honest empty week.
    """
    by_day: dict[dt.date, list[StartEntry]] = {
        today + dt.timedelta(days=offset): [] for offset in range(WEEK_DAYS)
    }
    for entry in [*sessions, *attention]:
        if entry.at is None:
            continue
        day = timezone.localtime(entry.at).date()
        if day in by_day:
            by_day[day].append(entry)
    return [
        StartDay(date=day, is_today=day == today, entries=sorted(items, key=_entry_sort_key))
        for day, items in sorted(by_day.items())
    ]


def _entry_sort_key(entry: StartEntry):
    return (entry.at is None, entry.at or timezone.now())


def start_page(user) -> StartPage:
    """Assemble the start page for the caller's ACTIVE learning profile."""
    empty = StartPage(None, None, [], [], [], [], [])
    if user is None or not getattr(user, "is_authenticated", False):
        return empty

    profile = active_learning_profile(user)
    if profile is None:
        return empty  # an account with no education yet: the client shows the empty state

    now = timezone.now()
    today = timezone.localtime(now).date()
    course_ids = _scoped_course_ids(user, profile)

    day_start = timezone.make_aware(
        dt.datetime.combine(today, dt.time.min), timezone.get_current_timezone()
    )
    week_end = day_start + dt.timedelta(days=WEEK_DAYS)

    week_sessions = _sessions_in_range(user, course_ids, day_start, week_end)
    today_sessions = [
        _session_entry(session, now=now)
        for session in week_sessions
        if timezone.localtime(session.start_at).date() == today
    ]
    week_entries = [_session_entry(session, now=now) for session in week_sessions]

    if profile.kind is LearningProfileKind.TEACHER:
        attention = _teacher_attention(user)
        continue_entries: list[StartEntry] = []
        progress: list[StartProgress] = []
    else:
        attention = _pupil_attention(user, course_ids, now)
        continue_entries = _continue_entries(user, course_ids)
        progress = _progress(user, course_ids)

    # "Сейчас" — the live lesson if one is running, else the next one today, else (for a
    # self-paced learner with no timetable) the thing to carry on with.
    now_entry = next((entry for entry in today_sessions if entry.is_live), None)
    if now_entry is None:
        now_entry = next((entry for entry in today_sessions if entry.at and entry.at >= now), None)
    if now_entry is None and continue_entries:
        now_entry = continue_entries[0]

    return StartPage(
        profile=profile,
        now=now_entry,
        today=sorted(today_sessions, key=_entry_sort_key),
        attention=attention,
        week=_week(week_entries, attention, today),
        continue_entries=continue_entries,
        progress=progress,
    )
