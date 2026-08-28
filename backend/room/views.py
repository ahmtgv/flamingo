"""Единственная работа бэкенда в первом куске: подписать токен для комнаты.

Сервер не знает ни кто эти люди, ни что они пишут на доске. Комната — это код в адресе,
участник — имя, которое он сам себе написал. Всё остальное живёт между браузерами
(docs/ГРАНИЦА.md §4).

Почему это НЕ дыра, а решение: в первом куске за кодом комнаты не стоит ничего ценного —
ни аккаунтов, ни хранимых работ, ни оплаты. Код длинный и случайный, угадать его дороже,
чем он стоит. Когда появятся аккаунты, право входить в комнату станет вопросом к ним —
и спросят его здесь же, в этом файле.
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
    if not name:
        return _bad("Не сказано, как вас зовут.")

    cfg = getattr(settings, "LIVEKIT", {})
    if not cfg.get("url") or not cfg.get("api_secret"):
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
    return JsonResponse({"ok": True, "livekit": bool(cfg.get("url") and cfg.get("api_secret"))})
