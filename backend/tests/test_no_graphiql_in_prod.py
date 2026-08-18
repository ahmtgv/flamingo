"""Отладочная консоль не должна открываться миру (наряд 37 §4.1).

🔴 НАЙДЕНО 18.08: `api.flamingo.plus/graphql/` отдавал GraphiQL — консоль со схемой, доступную
кому угодно без входа.

⚠️ Интроспекция при этом НЕ выключена и выключаться не должна: на ней держатся генерация типов
и наши собственные приборы. Убрана именно человеческая консоль.
"""

from __future__ import annotations

import pytest
from django.test import Client

pytestmark = pytest.mark.django_db


def _console_page(response) -> bool:
    """Похоже ли на консоль: HTML со скриптом GraphiQL, а не JSON-ответ API."""
    body = response.content.decode("utf-8", "replace").lower()
    return "graphiql" in body or "<!doctype html" in body


def test_the_console_is_closed_when_debug_is_off(settings):
    settings.DEBUG = False
    response = Client().get("/graphql/", HTTP_ACCEPT="text/html")
    assert not _console_page(response), "на бою открыта отладочная консоль"


def test_the_console_can_still_open_on_a_developer_machine(rf):
    """Прибор проверяет себя: если консоль не открывается НИКОГДА, первый тест зелен зря.

    ⚠️ `settings.DEBUG = True` здесь бы НЕ СРАБОТАЛ, и это свойство продукта, а не помеха:
    `config/urls.py` читает `DEBUG` один раз, при загрузке маршрутов. Значит на бою консоль не
    включится ни переменной окружения на лету, ни чем-либо ещё — только перезапуском с
    `DEBUG=1`. Поэтому прибор поднимает представление напрямую.
    """
    from strawberry.django.views import GraphQLView

    from api.schema import schema

    view = GraphQLView.as_view(schema=schema, graphql_ide="graphiql")
    response = view(rf.get("/graphql/", HTTP_ACCEPT="text/html"))
    assert _console_page(response), "консоль не открылась даже когда её просят — проверка пуста"


def test_introspection_still_works(settings):
    """Схему по-прежнему можно спросить: на этом держатся codegen и наши приборы."""
    settings.DEBUG = False
    response = Client().post(
        "/graphql/",
        data={"query": "{ __schema { queryType { name } } }"},
        content_type="application/json",
    )
    assert response.status_code == 200
    assert b"queryType" in response.content
