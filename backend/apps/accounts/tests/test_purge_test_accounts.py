"""Уборка тестовых учёток — только тестовых и только по команде.

🔴 Команда удаляет людей из боевой базы. Всё, что ниже, — про то, чтобы она не удалила
не тех и не тогда. Проверяется поведение: что именно исчезло и что уцелело.
"""

from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.accounts import services as accounts
from apps.accounts.models import User
from common.enums import Role

pytestmark = pytest.mark.django_db


def a_teacher(email: str) -> User:
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Тест",
        last_name="Преподаватель",
        role=Role.TEACHER,
        specialty="Английский",
        consent_152fz=True,
    )


def run(*args) -> str:
    out = StringIO()
    call_command("purge_test_accounts", *args, stdout=out)
    return out.getvalue()


def test_without_confirm_it_shows_and_deletes_nothing():
    """Показ — не действие. Команда, удаляющая по умолчанию, однажды удалит по ошибке."""
    a_teacher("test-teacher-1@flamingo-test.invalid")

    output = run()

    assert "test-teacher-1@flamingo-test.invalid" in output
    assert "--confirm" in output
    assert User.objects.filter(email__endswith="@flamingo-test.invalid").count() == 1


def test_with_confirm_it_deletes_only_the_masked_ones():
    """🔴 Главное: живые учётки не трогаются.

    Маска зашита в код и параметром не передаётся — иначе однажды кто-то наберёт
    `--mask "*@gmail.com"`, и команда послушно выполнит.
    """
    a_teacher("test-teacher-2@flamingo-test.invalid")
    real = a_teacher("irina@example.com")

    run("--confirm")

    assert not User.objects.filter(email__endswith="@flamingo-test.invalid").exists()
    assert User.objects.filter(id=real.id).exists(), "живую учётку тронули — это худшее"


def test_it_refuses_when_too_many_match():
    """Защита от опечатки: больше десяти — это уже не уборка, а авария."""
    for i in range(11):
        a_teacher(f"test-teacher-{i}@flamingo-test.invalid")

    with pytest.raises(CommandError, match="больше разумного предела"):
        run("--confirm")

    assert User.objects.filter(email__endswith="@flamingo-test.invalid").count() == 11


def test_it_names_what_goes_with_them():
    """Уборка не молчит: печатает машины, ключи, коды и токены — а не «готово».

    Молчаливое удаление в боевой базе — это то же самое, что молчащая кнопка, только
    последствия необратимы.
    """
    a_teacher("test-teacher-3@flamingo-test.invalid")

    output = run()

    for label in ("машины", "ключи машин", "коды связывания"):
        assert label in output, f"в отчёте нет строки «{label}»"


def test_an_empty_base_is_not_an_error():
    """Запуск на чистой базе — обычное дело, а не повод падать."""
    output = run("--confirm")

    assert "не найдено" in output
