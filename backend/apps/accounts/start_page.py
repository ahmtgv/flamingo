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
from django.db import models
from django.utils import timezone

from common import whenfor
from common.enums import LearningProfileKind, SessionStatus, SubmissionStatus
from common.exceptions import PermissionDenied

from .learning import LearningProfile, active_learning_profile

WEEK_DAYS = 7
#: Сколько тем показывать в «Усвоении группы» — лист рисует три.
MASTERY_ROWS = 3


@strawberry.enum
class StartEntryKind(Enum):
    """What a row on the start page is. The client turns this into wording."""

    LESSON_SESSION = "lesson_session"  # a scheduled or running lesson
    HOMEWORK_DUE = "homework_due"  # work the pupil still owes
    HOMEWORK_GRADED = "homework_graded"  # graded, feedback waiting to be read
    GRADING_QUEUE = "grading_queue"  # teacher: work awaiting their marking
    CONTINUE_LESSON = "continue_lesson"  # next unviewed lesson of a course
    # 🔴 §27.5 п.1: лист 00 обещает у «Требует внимания» ТРИ вида записей, реализован был
    # один — очередь проверки. Преподаватель не узнавал ни про вопросы в чате, ни про
    # занятие сегодня без материалов; ученик — про накопившееся повторение.
    CHAT_QUESTIONS = "chat_questions"  # teacher: unread messages from their people
    MATERIALS_MISSING = "materials_missing"  # teacher: a lesson today with nothing attached
    REPETITION_DUE = "repetition_due"  # pupil: cards the spacing says are due now


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
class StartMastery:
    """Одна тема и то, как она зашла классу (лист 00, «Усвоение группы»)."""

    lesson_id: str
    title: str
    course_title: str
    mastery_pct: int
    #: Сколько ответов легло в основу — без него процент нечем взвесить.
    answers: int
    struggling: int


@dataclass(frozen=True)
class StartProgress:
    course_id: str
    course_title: str
    done_lessons: int
    total_lessons: int
    progress_pct: int


@dataclass(frozen=True)
class StartCourse:
    """Один курс преподавателя — строка слота «мои курсы» (находка владельца 15.08, п.2).

    🔴 Диагноз находки: у преподавателя не было НИ ОДНОГО места, отвечающего на вопрос «что я
    веду». Был экран одного курса, был недельный дневник — и каталог, где лежат курсы всех.
    Своего списка не было нигде, и интерфейс поэтому выглядел так, будто курс ровно один.

    Слот при этом был: `progress` листа 00 у преподавателя всегда пуст — прогресс считается по
    записи ученика, которой у него нет. Заводить седьмой слот, когда шестой у этой роли пустой,
    значит чинить симптом. Роль меняет наполнение рамы, а не саму раму — так лист 00 и написан.
    """

    course_id: str
    title: str
    subject: str
    section_count: int
    lesson_count: int
    published_lessons: int
    student_count: int
    is_draft: bool
    next_at: dt.datetime | None
    next_lesson_title: str | None


@dataclass(frozen=True)
class StartPage:
    profile: LearningProfile | None
    now: StartEntry | None
    today: list[StartEntry]
    attention: list[StartEntry]
    week: list[StartDay]
    continue_entries: list[StartEntry]
    progress: list[StartProgress]
    teaching: list[StartCourse]
    mastery: list[StartMastery] = field(default_factory=list)


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


def _teacher_chat_questions(user) -> list[StartEntry]:
    """«3 вопроса от учеников» — лист 00.

    Непрочитанное в своих каналах и ничего больше: чей это канал и что там написано, строка
    не знает и знать не должна — она отправляет человека в чат, а не пересказывает его.
    """
    from apps.chat.services import total_unread

    unread = total_unread(user)
    if not unread:
        return []
    return [
        StartEntry(id="chat-unread", kind=StartEntryKind.CHAT_QUESTIONS, title="", count=unread)
    ]


def _teacher_materials_missing(user, now) -> list[StartEntry]:
    """«Материалы к 15:00 не прикреплены» — лист 00.

    Считаем только СЕГОДНЯШНИЕ занятия и только те, где не приложено ничего: ни к уроку, ни
    к курсу. Напоминание про завтрашний урок в семь утра — шум; про сегодняшний в 14:40 —
    то самое, ради чего слот существует.
    """
    from apps.courses.models import Material
    from apps.scheduling.models import LessonSession

    profile = getattr(user, "teacher_profile", None)
    if profile is None:
        return []
    # 🔴 Конец суток — в поясе ЧЕЛОВЕКА, а не сервера (§37, наряд 37 §5).
    day_end = whenfor.day_bounds(user)[1]
    sessions = (
        LessonSession.objects.filter(
            lesson__section__course__owner=profile,
            status=SessionStatus.SCHEDULED.value,
            start_at__gte=now,
            start_at__lte=day_end,
        )
        .select_related("lesson__section__course")
        .order_by("start_at")[:5]
    )
    entries = []
    for session in sessions:
        course_id = session.lesson.section.course_id
        has_any = Material.objects.filter(
            models.Q(lesson_id=session.lesson_id) | models.Q(course_id=course_id)
        ).exists()
        if has_any:
            continue
        entries.append(
            StartEntry(
                id=f"materials:{session.id}",
                kind=StartEntryKind.MATERIALS_MISSING,
                title=session.lesson.title,
                course_title=session.lesson.section.course.title,
                at=session.start_at,
                session_id=str(session.id),
                lesson_id=str(session.lesson_id),
            )
        )
    return entries


def _pupil_repetition(user) -> list[StartEntry]:
    """«Повторение» — лист 00. Сколько карточек интервальное повторение считает созревшими.

    ⚠️ Число берётся у самого механизма (`due_cards`), а не считается здесь заново: свой
    расчёт «что созрело» разошёлся бы с тем, что ученик увидит, открыв повторение.
    """
    from apps.exercises.models import SrsCard
    from apps.exercises.repetition import due_cards

    try:
        cards = due_cards(user)
    except PermissionDenied:
        return []  # не ученик — повторения у него и нет

    # 🔴 ДВЕРИ В ПОВТОРЕНИЕ У УЧЕНИКА НЕ БЫЛО (наряд 34 §5, находка ролевого аудита).
    #
    # Строка появлялась ТОЛЬКО когда что-то созрело. У ребёнка, который набрал слова на уроке
    # и открыл продукт до срока, ссылки на `/repetition` не было нигде — ни на стартовой, ни
    # в словаре. Экран построен, маршрут заведён, попасть на него нельзя.
    #
    # Условие теперь — есть ли у него слова ВООБЩЕ. Число созревших остаётся числом созревших:
    # ноль значит «сегодня не горит», а не «повторения у тебя нет».
    if not cards and not SrsCard.objects.filter(student=user.student_profile).exists():
        return []
    return [
        StartEntry(
            id="repetition-due", kind=StartEntryKind.REPETITION_DUE, title="", count=len(cards)
        )
    ]


def _teacher_mastery(user, course_ids) -> list[StartMastery]:
    """«Усвоение группы» — лист 00, у преподавателя.

    🔴 §27.5 п.3: на месте этого блока стояли «Мои курсы» — другая вещь. Преподаватель видел,
    ЧТО он ведёт, и не видел, КАК это усвоено.

    Считаем по объективным ответам (`Attempt.is_correct`), а НЕ по оценкам за работы: у оценки
    в этой базе нет максимума (`Submission.score` — просто число), и «84%» из неё пришлось бы
    вывести из договорённости, которой никто не проверяет. Число, выведенное из догадки,
    выглядит точным и потому опаснее отсутствующего.

    ⚠️ «Тема даётся тяжело» — доля верных ниже половины. Порог — не ограничение и не правило
    доступа, а полоса на шкале; названа здесь вслух, чтобы её было где менять.
    """
    from django.db.models import Count, Q

    from apps.exercises.models import Attempt

    profile = getattr(user, "teacher_profile", None)
    if profile is None or not course_ids:
        return []

    rows = (
        Attempt.objects.filter(
            exercise__exercise_set__lesson__section__course_id__in=course_ids,
            is_correct__isnull=False,  # открытые ждут самого преподавателя — не считаем
        )
        .values(
            "exercise__exercise_set__lesson_id",
            "exercise__exercise_set__lesson__title",
            "exercise__exercise_set__lesson__section__course__title",
        )
        .annotate(total=Count("id"), correct=Count("id", filter=Q(is_correct=True)))
        .order_by("-total")[:MASTERY_ROWS]
    )

    out: list[StartMastery] = []
    for row in rows:
        total = row["total"]
        if not total:
            continue
        lesson_id = row["exercise__exercise_set__lesson_id"]
        per_student = (
            Attempt.objects.filter(
                exercise__exercise_set__lesson_id=lesson_id, is_correct__isnull=False
            )
            .values("student_id")
            .annotate(total=Count("id"), correct=Count("id", filter=Q(is_correct=True)))
        )
        struggling = sum(1 for s in per_student if s["total"] and s["correct"] * 2 < s["total"])
        out.append(
            StartMastery(
                lesson_id=str(lesson_id),
                title=row["exercise__exercise_set__lesson__title"],
                course_title=row["exercise__exercise_set__lesson__section__course__title"],
                mastery_pct=round(row["correct"] * 100 / total),
                answers=total,
                struggling=struggling,
            )
        )
    return out


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


def _teaching(user, course_ids, sessions) -> list[StartCourse]:
    """Курсы преподавателя — с состоянием каждого и с ближайшим занятием по нему.

    Одним запросом с аннотациями, а не «курс, потом счётчик, потом ещё счётчик»: у активного
    преподавателя курсов десяток, и три запроса на строку — это тридцать запросов на экран,
    который открывается первым.

    Ближайшее занятие берётся из УЖЕ загруженных сессий недели: второй поход в расписание дал
    бы другой ответ, чем недельная полоса на том же экране, и объяснять расхождение пришлось бы
    преподавателю.
    """
    from django.db.models import Count, Q

    from apps.courses.models import Course
    from common.enums import CourseStatus, LessonStatus

    if not course_ids:
        return []

    soonest: dict[str, StartEntry] = {}
    for entry in sorted(sessions, key=_entry_sort_key):
        if entry.course_id and entry.course_id not in soonest:
            soonest[entry.course_id] = entry

    rows = (
        Course.objects.filter(id__in=course_ids, owner__user=user)
        .annotate(
            _sections=Count("sections", distinct=True),
            _lessons=Count(
                "sections__lessons",
                distinct=True,
                filter=Q(sections__lessons__deleted_at__isnull=True),
            ),
            _published=Count(
                "sections__lessons",
                distinct=True,
                filter=Q(
                    sections__lessons__deleted_at__isnull=True,
                    sections__lessons__status=LessonStatus.PUBLISHED.value,
                ),
            ),
            _students=Count("enrollments", distinct=True),
        )
        .order_by("title", "id")
    )

    result = []
    for course in rows:
        upcoming = soonest.get(str(course.id))
        result.append(
            StartCourse(
                course_id=str(course.id),
                title=course.title,
                subject=course.subject,
                section_count=course._sections,
                lesson_count=course._lessons,
                published_lessons=course._published,
                student_count=course._students,
                is_draft=course.status == CourseStatus.DRAFT.value,
                next_at=upcoming.at if upcoming else None,
                next_lesson_title=upcoming.title if upcoming else None,
            )
        )
    return result


def _week(user, sessions, attention, today: dt.date) -> list[StartDay]:
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
        day = timezone.localtime(entry.at, whenfor.zone_of(user)).date()
        if day in by_day:
            by_day[day].append(entry)
    return [
        StartDay(date=day, is_today=day == today, entries=sorted(items, key=_entry_sort_key))
        for day, items in sorted(by_day.items())
    ]


def _entry_sort_key(entry: StartEntry):
    return (entry.at is None, entry.at or timezone.now())


def week_strip(user, week_start: dt.date | None = None) -> list[StartDay]:
    """Полоса на семь дней от указанной даты — для стрелок «‹ ›» листа 00 (§27.5 п.2).

    Отдельный запрос, а не аргумент у `startPage`: перелистнуть неделю — это не пересобрать
    всю стартовую. Стартовая работает, и трогать её ради соседней недели значит рисковать
    восемью слотами ради одного.

    ⚠️ `is_today` считается от НАСТОЯЩЕГО сегодня, а не от начала запрошенной недели: человек,
    листающий вперёд, не должен увидеть «сегодня» в следующем вторнике.
    """
    profile = active_learning_profile(user)
    if profile is None:
        return []
    today = whenfor.local_date(user)
    start = week_start or today
    now = timezone.now()
    course_ids = _scoped_course_ids(user, profile)

    day_start = timezone.make_aware(
        dt.datetime.combine(start, dt.time.min), timezone.get_current_timezone()
    )
    sessions = [
        _session_entry(session, now=now)
        for session in _sessions_in_range(
            user, course_ids, day_start, day_start + dt.timedelta(days=WEEK_DAYS)
        )
    ]
    # Сроки работ показываем только на текущей неделе: у прошедшей недели «сдать через 2 дня»
    # это неправда, а у будущей — угадывание.
    attention = (
        _pupil_attention(user, course_ids, now)
        if start == today and profile.kind is not LearningProfileKind.TEACHER
        else []
    )

    by_day: dict[dt.date, list[StartEntry]] = {
        start + dt.timedelta(days=offset): [] for offset in range(WEEK_DAYS)
    }
    for entry in [*sessions, *attention]:
        if entry.at is None:
            continue
        day = timezone.localtime(entry.at, whenfor.zone_of(user)).date()
        if day in by_day:
            by_day[day].append(entry)
    return [
        StartDay(date=day, is_today=day == today, entries=sorted(items, key=_entry_sort_key))
        for day, items in sorted(by_day.items())
    ]


def start_page(user) -> StartPage:
    """Assemble the start page for the caller's ACTIVE learning profile."""
    empty = StartPage(None, None, [], [], [], [], [], [])
    if user is None or not getattr(user, "is_authenticated", False):
        return empty

    profile = active_learning_profile(user)
    if profile is None:
        return empty  # an account with no education yet: the client shows the empty state

    now = timezone.now()
    today = whenfor.local_date(user, now)
    course_ids = _scoped_course_ids(user, profile)

    day_start = timezone.make_aware(
        dt.datetime.combine(today, dt.time.min), timezone.get_current_timezone()
    )
    week_end = day_start + dt.timedelta(days=WEEK_DAYS)

    week_sessions = _sessions_in_range(user, course_ids, day_start, week_end)
    today_sessions = [
        _session_entry(session, now=now)
        for session in week_sessions
        if whenfor.same_local_day(user, session.start_at, today)
    ]
    week_entries = [_session_entry(session, now=now) for session in week_sessions]

    if profile.kind is LearningProfileKind.TEACHER:
        # Три вида записей листа, а не один (§27.5 п.1). Порядок — по срочности: работа
        # ждёт дольше всего, вопрос ждёт человека, материалы ждут до начала занятия.
        attention = [
            *_teacher_attention(user),
            *_teacher_chat_questions(user),
            *_teacher_materials_missing(user, now),
        ]
        continue_entries: list[StartEntry] = []
        progress: list[StartProgress] = []
        # Слот «мои курсы» вместо всегда пустого прогресса — см. StartCourse.
        teaching = _teaching(user, course_ids, week_entries)
        mastery = _teacher_mastery(user, course_ids)
    else:
        attention = [*_pupil_attention(user, course_ids, now), *_pupil_repetition(user)]
        continue_entries = _continue_entries(user, course_ids)
        progress = _progress(user, course_ids)
        teaching = []
        mastery = []

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
        week=_week(user, week_entries, attention, today),
        continue_entries=continue_entries,
        progress=progress,
        teaching=teaching,
        mastery=mastery,
    )
