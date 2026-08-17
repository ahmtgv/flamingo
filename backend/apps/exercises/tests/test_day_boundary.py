"""Граница суток — там, где её видит человек (RnD-заход 18.08, промпт 30 §3.4).

🔴 ЧТО БЫЛО. `TIME_ZONE = "UTC"`, а продукт российский. «День» на сервере не совпадал с днём
ученика, и серия «дней подряд» врала в обе стороны:

  занимался в пн 23:00 и во вт 01:00 по Москве → сервер видел ОДИН день, серия не росла;
  занимался во вт 02:00 и во вт 22:00 по Москве → сервер видел ДВА дня, серия росла дважды.

⚠️ ЭТОТ ТЕСТ НАПИСАН ТАК, ЧТОБЫ БЫТЬ КРАСНЫМ КРУГЛЫЕ СУТКИ. Один из прежних тестов был зелёным
двадцать два часа в сутки и красным два — потому что брал «сейчас». Здесь время задаётся явно,
и результат не зависит от того, в котором часу запустили прогон.
"""

from __future__ import annotations

import datetime as dt
import zoneinfo

import pytest
from django.utils import timezone

pytestmark = pytest.mark.django_db

MSK = zoneinfo.ZoneInfo("Europe/Moscow")


def _day_of(moment: dt.datetime) -> dt.date:
    """Тем же способом, каким сутки считает продукт."""
    return timezone.localtime(moment).date()


def test_two_evenings_in_a_row_are_two_days_even_across_midnight():
    """Понедельник 23:00 и вторник 01:00 по Москве — это два дня, а не один."""
    monday_late = dt.datetime(2026, 8, 17, 23, 0, tzinfo=MSK)
    tuesday_early = dt.datetime(2026, 8, 18, 1, 0, tzinfo=MSK)

    assert _day_of(monday_late) != _day_of(tuesday_early), (
        "сервер считает это одним днём — серия занятий ребёнка не вырастет, "
        "хотя он занимался два вечера подряд"
    )


def test_night_and_evening_of_the_same_day_are_one_day():
    """Вторник 02:00 и вторник 22:00 по Москве — один день, а не два."""
    night = dt.datetime(2026, 8, 18, 2, 0, tzinfo=MSK)
    evening = dt.datetime(2026, 8, 18, 22, 0, tzinfo=MSK)

    assert _day_of(night) == _day_of(
        evening
    ), "сервер считает это двумя днями — серия вырастет дважды за одни сутки"


def test_the_day_boundary_is_where_a_person_sees_it():
    """Полночь по Москве — и есть смена суток на сервере."""
    before = dt.datetime(2026, 8, 18, 23, 59, tzinfo=MSK)
    after = dt.datetime(2026, 8, 19, 0, 1, tzinfo=MSK)

    assert _day_of(before) == dt.date(2026, 8, 18)
    assert _day_of(after) == dt.date(2026, 8, 19)


def test_the_streak_counts_the_learners_days_not_the_servers():
    """И то же самое — через сам механизм серии, а не только через расчёт даты."""
    from datetime import date

    from apps.accounts import services as accounts
    from apps.exercises.repetition import _touch_streak
    from common.enums import Role

    pupil = accounts.register_user(
        email="streak@example.com",
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2011, 5, 1),
        consent_152fz=True,
    )

    _touch_streak(pupil.student_profile, dt.datetime(2026, 8, 17, 23, 0, tzinfo=MSK))
    streak = _touch_streak(pupil.student_profile, dt.datetime(2026, 8, 18, 1, 0, tzinfo=MSK))

    assert (
        streak.current_days == 2
    ), f"два вечера подряд дали серию {streak.current_days} — ребёнку не засчитали день"
