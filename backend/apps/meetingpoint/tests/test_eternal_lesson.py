"""«Вечный урок» — занятие, которое никогда не закрывается (находка ревьюера Р-1, 18.08).

🔴 ЧТО БЫЛО. Занятие началось в 17:16, преподаватель ушёл около 17:30 — в 20:40 продукт всё
ещё считал его идущим. Стартовая звала ученика «Войти в урок» в брошенную комнату; саммари не
собиралось; зеркало не наполнялось; дневник, серия и посещаемость ждали завершения, которое
не наступит.

Причина: автозакрытие пропускало занятие БЕЗ связанной машины (`last_seen is None`) — то есть
каждое, что ведут из браузера. Оговорка была разумной, но у неё не было второго конца.
"""

from __future__ import annotations

import datetime as dt

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.meetingpoint import services as mp
from apps.scheduling import services as sch
from apps.scheduling.models import LessonSession
from common.enums import Role, SessionStatus

pytestmark = pytest.mark.django_db


def a_lesson_running_from_a_browser(minutes_ago: int, duration: int = 40):
    """Занятие, которое ведут БЕЗ приложения: связанной машины у преподавателя нет."""
    teacher = accounts.register_user(
        email=f"eternal-{minutes_ago}-{duration}@example.com", password="strongpass1!",
        first_name="Ирина", last_name="Петровна", role=Role.TEACHER,
        specialty="Астрономия", consent_152fz=True,
    )
    course = courses.create_course(teacher, title="Астрономия", subject="Астрономия", level="grade_9")
    section = courses.create_section(teacher, course.id, title="Раздел 1")
    lesson = courses.create_lesson(teacher, section.id, title="Большой взрыв", duration_min=duration)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    session = sch.schedule_session(
        teacher, lesson_id=lesson.id,
        start_at=timezone.now() - dt.timedelta(minutes=minutes_ago),
    )
    sch.start_session(teacher, session.id)
    return session


def test_a_forgotten_browser_lesson_is_closed():
    """🔴 ВОРОТА: четыре часа «идёт» — это поломка, а не запас."""
    session = a_lesson_running_from_a_browser(minutes_ago=4 * 60)

    closed = mp.close_abandoned_sessions()

    assert session.id in [s.id for s in closed]
    session.refresh_from_db()
    assert session.status == SessionStatus.ENDED.value
    assert session.closed_automatically is True
    # Пишем плановый конец, а не «сейчас»: выдуманной длительности не бывает.
    assert session.end_at < timezone.now() - dt.timedelta(hours=1)


def test_a_lesson_that_is_merely_running_late_is_not_touched():
    """⚠️ Обратная сторона: преподаватель имеет право задержаться. Занятие, переработавшее
    полчаса, не гасится — иначе автозакрытие станет само по себе срывом урока."""
    session = a_lesson_running_from_a_browser(minutes_ago=70)  # 40 плановых + 30 переработки

    assert mp.close_abandoned_sessions() == []
    session.refresh_from_db()
    assert session.status == SessionStatus.LIVE.value


def test_a_lesson_still_within_its_schedule_is_not_touched():
    session = a_lesson_running_from_a_browser(minutes_ago=10)
    assert mp.close_abandoned_sessions() == []
    assert LessonSession.objects.get(id=session.id).status == SessionStatus.LIVE.value
