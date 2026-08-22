"""Стартовая страница ЧЕРЕЗ СХЕМУ, а не через сервис.

🔴 НАЙДЕНО СОБСТВЕННОЙ ОШИБКОЙ 17.08. Добавляя «Усвоение группы» (§27.5 п.3), я объявил поле
`mastery` на GraphQL-типе и не передал его в `StartPage.of` — замена по тексту не совпала с
отступом и молча ничего не сделала. Живой запрос падал:

    StartPage.__init__() missing 1 required keyword-only argument: 'mastery'

**639 тестов при этом были зелёными.** Ни один не собирал стартовую через схему: все звали
`start_page.start_page(user)` — то есть слой данных, — а разошлись данные и СХЕМА. Дефект
поймал браузер, на экране «Не получилось загрузить стартовую страницу».

Ровно механизм `hostHeartbeat` и `set_state`: проверено то, что умеет ответить, и не
проверено, доходит ли вопрос. Здесь — самый дешёвый возможный сторож: один запрос всех полей.
"""

from __future__ import annotations

from datetime import date
from types import SimpleNamespace

import pytest
from django.contrib.auth.models import AnonymousUser

from api.schema import schema
from apps.accounts import services as accounts
from common.enums import Role
from tests.consent_helpers import sign_for_child

pytestmark = pytest.mark.django_db

# Все поля стартовой разом: тест обязан покраснеть на ЛЮБОМ поле, которое объявили и не
# передали, а не только на том, о котором вспомнили.
START = """
query {
  startPage {
    profile { id kind }
    now { id kind title }
    today { id kind }
    attention { id kind count }
    week { date isToday entries { id } }
    continueEntries { id }
    progress { courseId progressPct }
    teaching { courseId title }
    mastery { lessonId title masteryPct answers struggling }
  }
}
"""


def _exec(query, user, **variables):
    request = SimpleNamespace(META={}, user=user or AnonymousUser())
    return schema.execute_sync(
        query, variable_values=variables or None, context_value=SimpleNamespace(request=request)
    )


def _teacher():
    return accounts.register_user(
        email="sp.teacher@example.com",
        password="strongpass1!",
        first_name="Люция",
        last_name="Валерьевна",
        role=Role.TEACHER,
        specialty="Английский",
        consent_152fz=True,
    )


def _pupil():
    return accounts.register_user(
        email="sp.pupil@example.com",
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2011, 5, 1),
        consent_152fz=True,
    )


def test_the_teacher_start_page_assembles_through_the_schema():
    result = _exec(START, _teacher())
    assert result.errors is None, result.errors
    page = result.data["startPage"]
    # Пустые списки — законный ответ; отсутствующий ключ — нет.
    for field in (
        "today",
        "attention",
        "week",
        "continueEntries",
        "progress",
        "teaching",
        "mastery",
    ):
        assert field in page, f"поле {field} не доехало до схемы"


def test_the_pupil_start_page_assembles_through_the_schema():
    result = _exec(START, _pupil())
    assert result.errors is None, result.errors
    assert result.data["startPage"]["mastery"] == [], "усвоение группы — не ученический блок"


WEEK = "query($d: Date!){ weekStrip(weekStart: $d){ date isToday entries { id } } }"


def test_a_person_without_an_education_gets_an_empty_strip_not_an_error():
    """Учёбы нет — недели нет. Это ответ, а не отказ: пустая полоса честнее выдуманной."""
    result = _exec(WEEK, _pupil(), d="2026-09-07")
    assert result.errors is None, result.errors
    assert result.data["weekStrip"] == []


def test_the_week_strip_answers_for_a_neighbouring_week():
    """Стрелки «‹ ›» листа 00: соседняя неделя приезжает отдельным запросом (§27.5 п.2)."""
    from apps.courses import services as courses

    teacher = _teacher()
    pupil = _pupil()
    course = courses.create_course(teacher, title="English A2", subject="Английский", level="a2")
    courses.publish_course(teacher, course.id)
    # §51: ребёнку младше 16 курс открывает подпись законного представителя.
    sign_for_child(pupil)
    courses.enroll(pupil, course.id)

    result = _exec(WEEK, pupil, d="2026-09-07")
    assert result.errors is None, result.errors
    days = result.data["weekStrip"]
    assert len(days) == 7
    assert [d["date"] for d in days] == [f"2026-09-{n:02d}" for n in range(7, 14)]
    # «Сегодня» считается от настоящего сегодня, иначе подсветка соврёт на чужой неделе.
    assert all(d["isToday"] is False for d in days)
