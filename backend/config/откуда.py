"""Изменения принимаются только со своих страниц.

🔴 ЗАЧЕМ (11.11.2026). Кука входа действует на весь `flamingo.plus`, и браузер
приложит её к запросу с любой страницы этого домена — в том числе с
`hub.flamingo.plus`, где через посредник открыт чужой сайт. Прочитать наш ответ
такая страница не может (это держит CORS), но отправить запрос «создай урок»,
«напиши сообщение» — могла бы: простому POST разрешение не нужно.

Поэтому всё, что меняет данные, сверяется с заголовком `Origin`: браузер ставит
его сам, и подделать его страница не может. Свои страницы — те же, что в
`CORS_ALLOWED_ORIGINS`. Запрос без `Origin` (не из браузера: приборы, служебные
вызовы) проходит как раньше — куки у такого запроса чужой странице не добыть.
"""
from __future__ import annotations

from django.conf import settings
from django.http import JsonResponse

ЧТЕНИЕ = {"GET", "HEAD", "OPTIONS"}


class ТолькоСвоиСтраницы:
    def __init__(self, дальше) -> None:
        self.дальше = дальше

    def __call__(self, request):
        if request.method not in ЧТЕНИЕ:
            откуда = request.headers.get("Origin")
            if откуда is not None and откуда not in settings.CORS_ALLOWED_ORIGINS:
                return JsonResponse({"error": "С этой страницы изменения не принимаются."}, status=403)
        return self.дальше(request)
