"""Журнал преподавателя по одному предмету: кто был, кто что сдал, что получил.

🔴 ЧТО ЭТО ЧИНИТ (наряд 36 §5). Кнопка «Открыть журнал» на листе 01 — контракт — вела в
очередь проверки старой рамы: экран прежнего кабинета, из которого назад дороги нет. Это одна
из «смесей» в самом дорогом виде: не «экран старый», а новый и старый склеены переходом.

⚠️ ЭТО ПЕРВАЯ ПОЛОВИНА, И СКАЗАНО ЧЕСТНО. Здесь занятия, присутствие и оценки по группе —
то, ради чего журнал открывают. Чего НЕТ и что остаётся следующей фазе: правка оценки прямо в
клетке, выгрузка, свод по четверти, переход из клетки в работу.

🔒 Список учеников берётся ЧОКПОЙНТОМ `students_of_course`, а не своим запросом. Именно
собственные запросы в четырёх местах когда-то потеряли группового ученика для зеркала: у него
нет строки `Enrollment`, и любой «свой» список его не видел.
"""

from __future__ import annotations

from dataclasses import dataclass

from apps.courses.access import students_of_course
from apps.courses.models import Course
from common.exceptions import NotFound
from common.marking import is_markless


@dataclass(frozen=True)
class JournalCell:
    """Что этот ученик получил за это занятие."""

    student_id: str
    session_id: str
    #: «был» / «не был» / «опоздал» — ровно то, что записала посещаемость. Пусто — не отмечался.
    attendance: str
    #: Отметка за работу этого занятия. None и у безотметочных, и у несданного — различает `markless`.
    score: int | None


@dataclass(frozen=True)
class JournalStudent:
    student_id: str
    name: str
    #: Дошкольник или первый класс — отметок не ставят (ФГОС НОО, ФЗ-273). См. `common/marking`.
    markless: bool


@dataclass(frozen=True)
class JournalSession:
    session_id: str
    title: str
    start_at: object
    status: str


@dataclass(frozen=True)
class CourseJournal:
    course_id: str
    title: str
    students: list[JournalStudent]
    sessions: list[JournalSession]
    cells: list[JournalCell]


def course_journal(user, course_id) -> CourseJournal:
    """Журнал одного предмета. Только владельцу курса — это чужие дети и чужие оценки."""
    from apps.homework.models import Submission
    from apps.scheduling.models import Attendance, LessonSession

    course = Course.objects.filter(id=course_id).select_related("owner").first()
    if course is None:
        raise NotFound("Course not found")
    if course.owner.user_id != getattr(user, "id", None):
        # Не «нет прав», а «нет такого»: по отказу в правах чужой курс перебирается скриптом.
        raise NotFound("Course not found")

    profiles = students_of_course(course)
    students = [
        JournalStudent(
            student_id=str(profile.user_id),
            name=profile.user.short_name,
            markless=is_markless(profile),
        )
        for profile in profiles
    ]

    sessions = list(
        LessonSession.objects.filter(lesson__section__course=course)
        .select_related("lesson")
        .order_by("start_at")
    )
    by_id = {str(profile.user_id): profile for profile in profiles}

    attendance = {
        (str(row.student.user_id), str(row.session_id)): row.status
        for row in Attendance.objects.filter(session__in=sessions).select_related("student")
    }
    # Оценка привязана к занятию через домашнюю работу этого занятия: журнал — это про урок,
    # а не про задание, и клетка обязана стоять там, где человек её ищет.
    scores: dict[tuple[str, str], int | None] = {}
    submissions = (
        Submission.objects.filter(homework__lesson__section__course=course, score__isnull=False)
        .select_related("student", "homework__lesson")
        .order_by("attempt")
    )
    lesson_to_sessions: dict[str, list[str]] = {}
    for session in sessions:
        lesson_to_sessions.setdefault(str(session.lesson_id), []).append(str(session.id))
    for submission in submissions:
        student_id = str(submission.student.user_id)
        if student_id not in by_id:
            continue
        for session_id in lesson_to_sessions.get(str(submission.homework.lesson_id), []):
            # Последняя попытка побеждает: пересдача и есть новая оценка (§28.2).
            scores[(student_id, session_id)] = submission.score

    cells = [
        JournalCell(
            student_id=student.student_id,
            session_id=str(session.id),
            attendance=attendance.get((student.student_id, str(session.id)), ""),
            score=None if student.markless else scores.get((student.student_id, str(session.id))),
        )
        for student in students
        for session in sessions
    ]

    return CourseJournal(
        course_id=str(course.id),
        title=course.title,
        students=students,
        sessions=[
            JournalSession(
                session_id=str(session.id),
                title=session.lesson.title,
                start_at=session.start_at,
                status=session.status,
            )
            for session in sessions
        ],
        cells=cells,
    )


__all__ = ["CourseJournal", "JournalCell", "JournalSession", "JournalStudent", "course_journal"]
