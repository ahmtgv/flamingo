"""Ожидаемое состояние — не ошибка в логе (наряд 37 §4.2).

🔴 НАЙДЕНО 18.08. Приложение опрашивает связывание каждые две секунды, и на каждый опрос
сервер писал ПОЛНУЮ ТРАССИРОВКУ «This code has not been confirmed yet». Этот шум скрыл
настоящую причину поломки входа: её нашли, только заглушив приложение.
"""

from __future__ import annotations

import logging

import pytest

from api.schema import schema

pytestmark = pytest.mark.django_db


def test_an_expected_refusal_is_one_line_without_a_traceback(caplog):
    """Отказ продукта — ответ человеку, а не авария."""
    with caplog.at_level(logging.DEBUG):
        result = schema.execute_sync(
            'mutation { claimDeviceToken(code: "НЕТ-ТАКОГО", secret: "x") { token } }'
        )

    assert result.errors, "прибор пуст: запрос обязан был отказать"
    strawberry_errors = [r for r in caplog.records if r.levelno >= logging.ERROR]
    assert strawberry_errors == [], "ожидаемый отказ записан как ошибка — лог снова тонет"
    assert any(
        "отказ продукта" in r.getMessage() for r in caplog.records
    ), "отказ не записан вовсе — так его не найдут, когда он станет важен"


def test_an_unexpected_error_is_still_logged_loudly(caplog):
    """🔴 Прибор проверяет себя: если бы глушилось ВСЁ, первый тест был бы зелен зря."""
    from graphql import GraphQLError

    boom = GraphQLError("нежданное", original_error=RuntimeError("нежданное"))
    with caplog.at_level(logging.DEBUG):
        schema.process_errors([boom], None)

    assert any(
        r.levelno >= logging.ERROR for r in caplog.records
    ), "неожиданная ошибка проглочена — это хуже шума"
