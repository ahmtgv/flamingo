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
from django.http import FileResponse, HttpRequest, HttpResponse, JsonResponse

from . import снимки

СПИСОК = Path(__file__).resolve().parent / "хаб-источники.json"


@lru_cache(maxsize=1)
def _каталог() -> set[str]:
    try:
        return {и["id"] for и in json.loads(СПИСОК.read_text(encoding="utf-8"))}
    except Exception:                                        # noqa: BLE001
        return set()


def список(request: HttpRequest) -> HttpResponse:
    """Какие снимки уже есть. Витрина спрашивает это один раз и не стучится за
    теми, которых нет: сорок ответов «404» на первом экране — это не «пусто»,
    это похоже на поломку."""
    корень = Path(settings.MEDIA_ROOT)
    опись = снимки.прочесть_опись(корень)
    папка = снимки.куда(корень)
    есть = sorted(id for id in опись if (папка / f"{id}.jpg").exists())
    взято = max((str(опись[id].get("взято", "")) for id in есть), default="")
    ответ = JsonResponse({"есть": есть, "взято": взято})
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
