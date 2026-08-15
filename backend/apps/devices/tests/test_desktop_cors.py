"""Предполётный запрос из приложения — по-настоящему, через HTTP.

🔴 ДЕФЕКТ 15.08, стоивший часа и дошедший до владельца. Приложение показывало пустое место
вместо кода связывания. Сервер при этом был здоров: тот же запрос из терминала возвращал код
за 200 мс. Разница была в одном заголовке — предполётный `OPTIONS` из-под адреса приложения
(`tauri://localhost`) отвечал `200`, но БЕЗ `access-control-allow-origin`, и браузерный движок
внутри приложения гасил запрос, не отправив его. С точки зрения приложения сервер молчал;
с точки зрения сервера запроса не было вовсе.

⚠️ Почему это не поймал ни один из 605 тестов: все они зовут либо функции сервисов, либо схему
напрямую. Замер 16.08 — **279** вызовов сервиса против **33** через схему и **ноль** через
HTTP-клиент. Слой, на котором живут CORS, middleware и заголовки, не проверялся вообще, а
именно на нём дефект и был.

Здесь — настоящий HTTP через тестовый клиент Django: тот же путь, что у приложения, включая
`CorsMiddleware`. Проверяется не наличие настройки в `settings`, а ОТВЕТ.
"""

import pytest
from django.conf import settings
from django.test import Client

pytestmark = pytest.mark.django_db

GRAPHQL = "/graphql/"


def preflight(origin: str):
    """Ровно то, что шлёт браузерный движок перед POST с заголовком Authorization."""
    return Client().options(
        GRAPHQL,
        HTTP_ORIGIN=origin,
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization,content-type",
    )


@pytest.mark.parametrize("origin", settings.DESKTOP_APP_ORIGINS)
def test_preflight_from_the_app_is_allowed_by_name(origin):
    """Оба адреса приложения проходят предполёт с разрешающим заголовком.

    Их два, потому что Tauri на разных системах представляется по-разному: macOS и Linux дают
    `tauri://localhost`, Windows — `http://tauri.localhost`. Забыть второй значит собрать
    приложение, которое работает у нас и молчит у второго преподавателя.
    """
    response = preflight(origin)

    assert response.status_code in (200, 204), response.status_code
    # 🔴 Тот самый заголовок. Его отсутствие и было дефектом — при коде 200.
    assert response.headers.get("access-control-allow-origin") == origin


def test_the_header_the_app_authenticates_with_is_allowed_through():
    """`Authorization` должен быть в списке разрешённых заголовков.

    Шаги 2–5 мастера ходят с `Authorization: Device <ключ>`. Если предполёт пропустит адрес,
    но не пропустит заголовок, кнопка «Дальше» снова замолчит — уже по другой причине.
    """
    allowed = preflight(settings.DESKTOP_APP_ORIGINS[0]).headers.get(
        "access-control-allow-headers", ""
    )

    assert "authorization" in allowed.lower(), allowed


def test_a_stranger_origin_is_not_allowed():
    """Чужой адрес разрешения не получает.

    Без этой проверки предыдущие две прошли бы и на `CORS_ALLOW_ALL_ORIGINS = True` — то есть
    на настройке, открывающей API любому сайту. Тест на разрешение без теста на запрет
    доказывает только то, что дверь есть.
    """
    response = preflight("https://example.com")

    assert response.headers.get("access-control-allow-origin") != "https://example.com"


def test_the_app_origins_are_a_product_constant_not_a_deployment_address():
    """Адреса приложения заданы в коде, а не в переменных окружения.

    `tauri://localhost` — это не «где развёрнут сервер», это то, чем представляется наше
    собственное приложение. Уехав в переменные окружения, он однажды не доедет до боевого
    контура — и приложение замолчит ровно так же, как 15.08.
    """
    assert "tauri://localhost" in settings.DESKTOP_APP_ORIGINS
    assert all(o in settings.CORS_ALLOWED_ORIGINS for o in settings.DESKTOP_APP_ORIGINS)
