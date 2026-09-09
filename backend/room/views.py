"""Пропуск в комнату: единственное место, где он выписывается.

🔴 ТОТ ДЕНЬ НАСТУПИЛ. В шапке этого файла было написано: «когда появятся аккаунты,
право входить в комнату станет вопросом к ним — и спросят его здесь же». Аккаунты
появились, и решение владельца 08.09: пропуск выдаёт сервер, а не функция Pages.

Что изменилось по существу — ОДНА проверка, и она дорогая. Прежде пропуск получал
любой, кто прислал строку, похожую на код: три группы по четыре из нашего алфавита.
За такой строкой не обязано стоять занятие вовсе — то есть посторонний мог заводить
на нашем медиасервере сколько угодно комнат, и платили бы за них мы. Теперь код
обязан принадлежать настоящему занятию, иначе пропуска нет.

Что НЕ изменилось: войти по ссылке можно без учётной записи. Это и есть продукт —
«урок по ссылке», у ученика может не быть ничего, кроме адреса. Гость называет себя
сам, как и прежде.

Что добавилось для вошедших: имя берётся из учётной записи, а не из того, что человек
о себе написал. Класс видит имя, под которым его знает преподаватель.

Сервер по-прежнему не знает, что люди пишут на доске: это между браузерами
(docs/ГРАНИЦА.md §4).
"""

from __future__ import annotations

import json
import re
import secrets

from django.conf import settings
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from common.livekit import room_token
from people.session import who
from study.models import Lesson

#: Код комнаты — то, что мы сами и выдали: три группы по четыре из безопасного алфавита.
ROOM_CODE = re.compile(r"^[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}$")
NAME_MAX = 40


def _bad(reason: str, status: int = 400) -> JsonResponse:
    """Отказ называет причину словами (ПРАВИЛА 6.4). «Что-то пошло не так» запрещено."""
    return JsonResponse({"error": reason}, status=status)


@csrf_exempt
@require_POST
def token(request: HttpRequest) -> JsonResponse:
    try:
        body = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        return _bad("Запрос не разобран: ожидался JSON.")

    room = str(body.get("room", "")).strip().lower()
    name = " ".join(str(body.get("name", "")).split())[:NAME_MAX]

    if not ROOM_CODE.match(room):
        return _bad("Код комнаты не похож на код: ждём три группы по четыре знака.")

    # 🔴 ИМЯ ВОШЕДШЕГО — ИЗ УЧЁТНОЙ ЗАПИСИ, А НЕ ИЗ ТЕЛА ЗАПРОСА. Иначе класс видит
    # то, что человек о себе написал в поле, и «Мария Петровна» ничем не отличается
    # от чужого, кто вписал то же самое. Гостю верим на слово — у него ничего другого
    # нет, и это осознанная цена входа по ссылке.
    person = who(request)
    if person:
        name = person.name or name
    if not name:
        return _bad("Не сказано, как вас зовут.")

    # 🔴 КОД ОБЯЗАН ПРИНАДЛЕЖАТЬ ЗАНЯТИЮ. Без этой строки пропуск получала любая
    # строка нужного вида — и посторонний заводил на нашем медиасервере комнаты,
    # за которые платим мы. Отказ говорит «нет такой комнаты», а не «нельзя»:
    # «нельзя» подтвердило бы, что комната существует (то же правило, что в
    # study/views.py у самого занятия).
    if not Lesson.objects.filter(code=room).exists():
        return _bad("Нет такой комнаты. Проверьте ссылку — возможно, урок уже сняли.", status=404)

    cfg = getattr(settings, "LIVEKIT", {})
    # 🔴 КЛЮЧ ПРОВЕРЯЕТСЯ НАРАВНЕ С АДРЕСОМ И СЕКРЕТОМ. Стояло только два из трёх, и
    # это была настоящая мина: при заданных адресе и секрете, но пустом ключе
    # `common/livekit.py` подставляет издателя «devkey», подписывая НАСТОЯЩИМ
    # секретом. Проверка проходила, токен выписывался, облако его отклоняло — и
    # человек видел «подключаемся» без единого слова о причине. Ровно то, что
    # соседний комментарий обещал не допустить.
    if not cfg.get("url") or not cfg.get("api_secret") or not cfg.get("api_key"):
        # Молчаливая выдача токена, который LiveKit отклонит, — худший вид отказа:
        # человек видит «подключаемся» и не узнаёт, что подключаться некуда.
        return _bad("Медиасервер не настроен: в backend/.env пустые LIVEKIT_*.", status=503)

    # Опознаватель уникален в комнате, имя — нет: двух Ань никто не запрещал.
    identity = f"{secrets.token_urlsafe(9)}"
    return JsonResponse(
        {
            "token": room_token(identity=identity, room=room, display_name=name),
            "url": cfg["url"],
            "identity": identity,
            "name": name,
        }
    )


def healthz(request: HttpRequest) -> JsonResponse:
    """Живость без базы: здоровье, зависящее от базы, врёт диагнозом при её падении."""
    cfg = getattr(settings, "LIVEKIT", {})
    # Три из трёх, а не два: пустой `api_key` даёт издателя «devkey» и токен,
    # который облако отклонит. Здоровье, закрывающее глаза на одну треть, врёт.
    готов = bool(cfg.get("url") and cfg.get("api_secret") and cfg.get("api_key"))
    return JsonResponse({"ok": True, "livekit": готов})
