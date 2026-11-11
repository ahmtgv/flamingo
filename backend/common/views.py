"""Отдача снимков хаба.

🔴 ОТДАЁМ ТОЛЬКО ТО, ЧТО ЕСТЬ В КАТАЛОГЕ. Имя источника приходит адресом, то
есть от человека, а превращается в имя файла. Проверяем не «нет ли точек в
имени», а «есть ли такой источник в каталоге» — список разрешённого, а не
список запрещённого (тот же закон, что у пособий в `study/files.py`).

🔴 ЭТО ВРЕМЕННОЕ МЕСТО РАЗДАЧИ, И ЭТО СКАЗАНО ВСЛУХ. Раздавать картинки питоном
дороже, чем nginx-ом: когда снимки поедут заметным потоком, `location /api/hub/
preview/` уходит в nginx на ту же папку, а эта пара строк удаляется. Пока
источников тридцать шесть, а превью кэшируется на сутки, разницы нет.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.http import FileResponse, HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from people.session import who
from people.models import Star

from . import рамки, снимки

СПИСОК = Path(__file__).resolve().parent / "хаб-источники.json"


@lru_cache(maxsize=1)
def _каталог() -> set[str]:
    """Кому снимок вообще положен. Отказ человека (`БЕЗ_СНИМКА` в каталоге
    витрины) действует и здесь: файл на диске мог остаться с прошлых обходов,
    но наружу он больше не идёт — иначе отказ был бы отказом только на словах."""
    try:
        сп = json.loads(СПИСОК.read_text(encoding="utf-8"))
        return {и["id"] for и in сп if и.get("снимок", True)}
    except Exception:                                        # noqa: BLE001
        return set()


def список(request: HttpRequest) -> HttpResponse:
    """Какие снимки уже есть. Витрина спрашивает это один раз и не стучится за
    теми, которых нет: сорок ответов «404» на первом экране — это не «пусто»,
    это похоже на поломку."""
    корень = Path(settings.MEDIA_ROOT)
    опись = снимки.прочесть_опись(корень)
    папка = снимки.куда(корень)
    можно = _каталог()
    есть = sorted(id for id in опись if id in можно and (папка / f"{id}.jpg").exists())
    взято = max((str(опись[id].get("взято", "")) for id in есть), default="")
    # Кто из источников запрещает показ в рамке (`manage.py хаб_рамки`).
    # Пусто, пока проверку не запускали.
    нельзя = sorted(id for id, з in рамки.прочесть(корень).items()
                    if isinstance(з, dict) and з.get("рамка") == рамки.НЕЛЬЗЯ)
    ответ = JsonResponse({"есть": есть, "взято": взято, "без_рамки": нельзя})
    ответ["Cache-Control"] = "public, max-age=600"
    return ответ


def превью(request: HttpRequest, id: str) -> HttpResponse:
    if id not in _каталог():
        return HttpResponse(status=404)
    файл = снимки.куда(Path(settings.MEDIA_ROOT)) / f"{id}.jpg"
    if not файл.exists():
        return HttpResponse(status=404)
    ответ = FileResponse(файл.open("rb"), content_type="image/jpeg")
    # Сутки: обход всё равно чаще не ходит, а витрину открывают часто.
    ответ["Cache-Control"] = "public, max-age=86400"
    return ответ


@lru_cache(maxsize=1)
def _все_источники() -> set[str]:
    """Все имена каталога — в избранное годится любой из них."""
    try:
        return {и["id"] for и in json.loads(СПИСОК.read_text(encoding="utf-8"))}
    except Exception:                                        # noqa: BLE001
        return set()


#: Избранного не бывает больше, чем источников; запас — на рост каталога.
ИЗБРАННОГО_НЕ_БОЛЬШЕ = 200


@csrf_exempt
def избранное(request: HttpRequest) -> HttpResponse:
    """Избранные источники человека: прочитать (GET) или заменить список (PUT).

    🔴 СПИСОК ЦЕЛИКОМ, А НЕ «ДОБАВЬ / УБЕРИ». Экран держит избранное списком и
    шлёт его таким, какой он есть: порядок — порядок добавления, его и храним.
    Имена сверяются с каталогом: чужую строку в базу не положить.
    """
    я = who(request)
    if я is None:
        return JsonResponse({"error": "Сначала войдите."}, status=401)
    if request.method == "GET":
        return JsonResponse({"избранное": list(я.stars.values_list("source", flat=True))})
    if request.method != "PUT":
        return JsonResponse({"error": "Так нельзя."}, status=405)
    try:
        тело = json.loads(request.body or b"{}")
    except ValueError:
        тело = {}
    список = тело.get("избранное") if isinstance(тело, dict) else None
    if not isinstance(список, list):
        return JsonResponse({"error": "Нужен список избранного."}, status=400)
    можно = _все_источники()
    чисто: list[str] = []
    for x in список[:ИЗБРАННОГО_НЕ_БОЛЬШЕ]:
        if isinstance(x, str) and x in можно and x not in чисто:
            чисто.append(x)
    with transaction.atomic():
        я.stars.all().delete()
        Star.objects.bulk_create([Star(person=я, source=x) for x in чисто])
    return JsonResponse({"избранное": чисто})

