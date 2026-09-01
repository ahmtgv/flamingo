"""Кто пришёл — по куке.

🔴 Вынесено из `views.py` отдельным файлом не ради красоты: журналу и занятиям
нужен тот же ответ на тот же вопрос, а импортировать `_who` из чужого модуля
через подчёркивание — значит договориться, что приватное больше не приватно.
Правило одно: узнаёт человека ровно этот файл, все остальные спрашивают его.
"""
from __future__ import annotations

from django.conf import settings
from django.core import signing
from django.http import HttpRequest, HttpResponse

from .models import Person

COOKIE = "fl_ses"
SALT = "flamingo.session"
DAYS = 30


def remember(res: HttpResponse, person: Person) -> HttpResponse:
    """Кладёт куку сессии. Подпись, а не хранимая сессия: сервер не держит
    таблицу сеансов и не растёт от входов."""
    res.set_cookie(
        COOKIE,
        signing.dumps({"id": person.id}, salt=SALT),
        max_age=DAYS * 24 * 3600,
        httponly=True,   # ни один скрипт на странице её не прочитает
        secure=True,     # только по https
        samesite="Lax",
        domain=settings.SESSION_COOKIE_DOMAIN or None,  # .flamingo.plus — общая для сайта и api
        path="/",
    )
    return res


def forget(res: HttpResponse) -> HttpResponse:
    res.delete_cookie(COOKIE, domain=settings.SESSION_COOKIE_DOMAIN or None, path="/")
    return res


def who(request: HttpRequest) -> Person | None:
    """Человек за кукой — или ничего. Испорченная и просроченная подпись
    отвечают одинаково: «никого», а не ошибкой."""
    raw = request.COOKIES.get(COOKIE)
    if not raw:
        return None
    try:
        data = signing.loads(raw, salt=SALT, max_age=DAYS * 24 * 3600)
    except signing.BadSignature:
        return None
    return Person.objects.filter(id=data.get("id")).first()
