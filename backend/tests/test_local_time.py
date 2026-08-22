"""Сутки — в поясе человека, а не сервера (решение владельца §37, наряд 37 §5).

🔴 «Все по Москве» ОТМЕНЕНО владельцем: «часовые пояса — время должно быть локальное».

⚠️ Прежняя починка не откатана, а обобщена. Дефект 18.08 был настоящий: сервер считал сутки
по UTC, и «Сегодня» у преподавателя в час ночи показывало вчерашние занятия. Москва была шагом
в верную сторону; там, где стояла она, теперь стоит пояс человека.
"""

from __future__ import annotations

import datetime as dt

import pytest
from django.utils import timezone

from apps.accounts import services
from common import whenfor
from common.enums import Role

pytestmark = pytest.mark.django_db


def a_person(email, tz=""):
    user = services.register_user(
        email=email,
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.TEACHER,
        specialty="Английский",
        consent_152fz=True,
    )
    if tz:
        user.timezone = tz
        user.save(update_fields=["timezone"])
    return user


def test_two_people_can_be_on_different_days_at_the_same_moment():
    """🔴 ВОРОТА: преподаватель в Москве и ученик во Владивостоке — и оба правы."""
    moscow = a_person("tz-msk@example.com", "Europe/Moscow")
    vladivostok = a_person("tz-vvo@example.com", "Asia/Vladivostok")
    # 22:00 в Москве — это уже следующие сутки во Владивостоке (+7).
    moment = dt.datetime(2026, 8, 18, 19, 0, tzinfo=dt.UTC)

    assert whenfor.local_date(moscow, moment) == dt.date(2026, 8, 18)
    assert whenfor.local_date(vladivostok, moment) == dt.date(2026, 8, 19)


def test_the_day_bounds_belong_to_the_person():
    vladivostok = a_person("tz-vvo2@example.com", "Asia/Vladivostok")
    start, end = whenfor.day_bounds(vladivostok, dt.date(2026, 8, 19))
    # Владивосток — UTC+10, значит его сутки начинаются в 14:00 UTC предыдущего дня
    # и заканчиваются в 13:59:59 UTC текущего.
    assert start == dt.datetime(2026, 8, 18, 14, 0, tzinfo=dt.UTC)
    assert end.astimezone(dt.UTC).hour == 13


def test_a_person_who_never_said_falls_back_to_the_server():
    """Пусто — это «человек ещё не сказал», а не «Москва навсегда»."""
    nobody_asked = a_person("tz-none@example.com")
    assert whenfor.local_date(nobody_asked) == timezone.localdate()


def test_a_broken_zone_does_not_take_the_page_down():
    """⚠️ Неверная строка в поле стоит одной ошибки, а не сорванного расписания."""
    broken = a_person("tz-bad@example.com", "Марс/Олимп")
    assert whenfor.local_date(broken) == timezone.localdate()


def test_the_streak_counts_the_pupils_own_days():
    """Серия — «дни подряд», и день здесь ученика: иначе она рвётся на ровном месте."""
    pupil = services.register_user(
        email="tz-streak@example.com",
        password="strongpass1!",
        first_name="Тимур",
        last_name="Ким",
        role=Role.STUDENT,
        birth_date=dt.date(2011, 1, 1),
        consent_152fz=True,
    )
    pupil.timezone = "Asia/Vladivostok"
    pupil.save(update_fields=["timezone"])
    moment = dt.datetime(2026, 8, 18, 19, 0, tzinfo=dt.UTC)
    assert whenfor.local_date(pupil, moment) == dt.date(2026, 8, 19)
