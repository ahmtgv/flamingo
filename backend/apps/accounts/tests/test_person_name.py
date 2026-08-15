"""Как зовут человека — OWNER_SCOPE §24 (требование владельца 15.08).

🔴 Почему это тесты, а не «поле и ладно». Склейка `f"{first} {last}"` жила в семнадцати местах
питона и в двух десятках мест фронта. Добавить отчество и обойти их руками — гарантированно
забыть половину, и тогда поле появилось бы в базе и не появилось бы на половине экранов.
Правило теперь одно и живёт на модели; здесь оно и проверяется.

Правило обращения — та же ось, что «вы»/«ты» (§Б4 промпта 16): имя-отчество это форма ДЛЯ
ПРЕПОДАВАТЕЛЯ. Ребёнка по отчеству не зовут.
"""

from datetime import date

import pytest

from apps.accounts import services
from common.enums import Role
from common.exceptions import ValidationError

pytestmark = pytest.mark.django_db


def teacher(middle="Валерьевна", first="Люция", last="Хамидуллина", email="t@example.com"):
    return services.register_user(
        email=email,
        password="strongpass1!",
        first_name=first,
        last_name=last,
        middle_name=middle,
        role=Role.TEACHER,
        specialty="Английский",
        consent_152fz=True,
    )


def pupil(middle="Дмитриевна", email="p@example.com"):
    return services.register_user(
        email=email,
        password="strongpass1!",
        first_name="Арина",
        last_name="Сафина",
        middle_name=middle,
        role=Role.STUDENT,
        birth_date=date(2011, 5, 1),
        consent_152fz=True,
    )


# --- обращение на экране ---------------------------------------------------------------------
def test_a_teacher_is_addressed_by_first_name_and_patronymic():
    """Приёмка А: «Здравствуйте, Люция Валерьевна». Лист D1 рисует эту строку — теперь она
    собирается из данных, а не нарисована."""
    assert teacher().display_name == "Люция Валерьевна"


def test_a_teacher_without_a_patronymic_gets_no_trailing_space():
    """🔴 Отчества нет у части народов России и у иностранного преподавателя.

    Проверяется не «работает», а именно отсутствие хвоста: «Люция » с пробелом на конце
    выглядит как обрезанная строка, и человек решает, что продукт потерял его имя.
    """
    user = teacher(middle="", email="nomiddle@example.com")
    assert user.display_name == "Люция"
    assert user.display_name == user.display_name.strip()


def test_a_pupil_is_never_addressed_by_patronymic():
    """🔴 Даже когда отчество в базе есть. Ребёнка по отчеству не зовут — это не настройка."""
    child = pupil()
    assert child.middle_name == "Дмитриевна"
    assert child.display_name == "Арина"


@pytest.mark.parametrize("role_maker", [pupil, teacher])
def test_display_name_never_leaks_a_surname(role_maker):
    """Обращение — это имя, а не карточка. Фамилия в приветствии звучит как вызов к доске."""
    user = role_maker()
    assert user.last_name and user.last_name not in user.display_name


# --- документы -------------------------------------------------------------------------------
def test_full_name_is_surname_first_and_includes_the_patronymic():
    """Для документов и карточки надзора — порядок, в котором пишут в документах."""
    assert teacher().full_name == "Хамидуллина Люция Валерьевна"


def test_full_name_of_a_pupil_does_include_the_patronymic():
    """В интерфейсе ученику отчество не показываем, в ДОКУМЕНТАХ — да (§24 п.2)."""
    assert pupil().full_name == "Сафина Арина Дмитриевна"


def test_full_name_without_a_patronymic_has_no_double_space():
    assert teacher(middle="", email="nm@example.com").full_name == "Хамидуллина Люция"


# --- тесно ------------------------------------------------------------------------------------
def test_short_name_is_first_name_and_an_initial():
    """Полоса участников и чат: «Имя Фамилия» там обрезается, «Имя Ф.» помещается."""
    assert teacher().short_name == "Люция Х."
    assert pupil().short_name == "Арина С."


def test_short_name_survives_a_missing_surname():
    """Фамилия обязательна при регистрации, но модель не должна падать на пустой строке:
    её пишут и миграции, и импорты, и надзор."""
    user = teacher(email="s@example.com")
    user.last_name = ""
    assert user.short_name == "Люция"


# --- поле ---------------------------------------------------------------------------------------
def test_the_patronymic_is_optional_at_registration():
    """Форма не должна требовать невозможного (§24 п.1)."""
    user = services.register_user(
        email="none@example.com",
        password="strongpass1!",
        first_name="Джон",
        last_name="Смит",
        role=Role.TEACHER,
        consent_152fz=True,
    )
    assert user.middle_name == ""
    assert user.display_name == "Джон"


def test_a_person_can_add_their_patronymic_later():
    """Отчество появилось после того, как люди уже зарегистрировались — без этого пути
    «Здравствуйте, Люция Валерьевна» досталось бы только новым учёткам."""
    user = teacher(middle="", email="later@example.com")
    services.update_my_name(
        user, first_name="Люция", last_name="Хамидуллина", middle_name="Валерьевна"
    )
    user.refresh_from_db()
    assert user.display_name == "Люция Валерьевна"


def test_a_name_cannot_be_emptied():
    user = teacher(email="empty@example.com")
    for first, last in (("", "Хамидуллина"), ("Люция", ""), ("  ", "  ")):
        with pytest.raises(ValidationError):
            services.update_my_name(user, first_name=first, last_name=last)


# --- ни одной склейки в коде ---------------------------------------------------------------------
def test_no_module_glues_a_name_by_hand():
    """🔴 Приёмка А: «ни одной склейки first_name + last_name в коде не осталось».

    Гейт, а не осмотр: правило, у которого нет проверки, разъезжается на следующей же фазе —
    ровно так эта склейка и расползлась по семнадцати местам.
    """
    import re
    from pathlib import Path

    root = Path(__file__).resolve().parents[3]
    glue = re.compile(r'f"\{[^"}]*first_name\}[^"]*\{[^"}]*last_name\}')
    offenders = []
    for path in root.rglob("*.py"):
        parts = set(path.parts)
        if {".venv", "migrations", "tests", "build", "__pycache__"} & parts:
            continue
        for number, line in enumerate(path.read_text().splitlines(), 1):
            if glue.search(line):
                offenders.append(f"{path.relative_to(root)}:{number}")
    assert not offenders, f"имя склеивается руками вместо display_name/full_name: {offenders}"
