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


# ── свой браузер: настоящий хром на сервере (`common/браузерная.py`) ─────────

import subprocess                                             # noqa: E402
import sys                                                    # noqa: E402
import time                                                   # noqa: E402
import urllib.error                                           # noqa: E402
import urllib.request                                         # noqa: E402
from urllib.parse import urlencode                            # noqa: E402

from . import браузерная                                      # noqa: E402

_БРАУЗЕРНАЯ = f"http://127.0.0.1:{браузерная.ПОРТ}"


def _поднять_браузерную() -> None:
    """Запустить браузерную отдельным процессом. Двое сразу не поднимутся:
    порт один, второй процесс увидит, что он занят, и молча уйдёт."""
    subprocess.Popen(
        [sys.executable, str(Path(settings.BASE_DIR) / "manage.py"), "хаб_браузер"],
        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        start_new_session=True, cwd=str(settings.BASE_DIR),
    )


def _к_браузерной(путь: str, тело: dict | None = None, срок: float = 14):
    """Запрос к браузерной. Возвращает (код, заголовки, тело). Службы нет —
    поднимаем и ждём её несколько секунд."""
    данные = json.dumps(тело, ensure_ascii=False).encode() if тело is not None else None
    for попытка in range(14):
        запрос = urllib.request.Request(_БРАУЗЕРНАЯ + путь, data=данные,
                                        headers={"Content-Type": "application/json"} if данные else {})
        try:
            with urllib.request.urlopen(запрос, timeout=срок) as о:
                return о.status, о.headers, о.read()
        except urllib.error.HTTPError as e:
            return e.code, e.headers, e.read()
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            if попытка == 0:
                _поднять_браузерную()
            time.sleep(0.5)
    return 503, {}, json.dumps({"error": "Браузер на сервере не поднялся."}, ensure_ascii=False).encode()


def _слова(код: int, тело: bytes) -> HttpResponse:
    return HttpResponse(тело or b"{}", status=код, content_type="application/json")


@lru_cache(maxsize=1)
def _дома() -> dict[str, str]:
    try:
        return {и["id"]: и["home"] for и in json.loads(СПИСОК.read_text(encoding="utf-8"))}
    except Exception:                                        # noqa: BLE001
        return {}


@csrf_exempt
def браузер_открыть(request: HttpRequest) -> HttpResponse:
    """Открыть источник в браузере на сервере.

    🔴 ТОЛЬКО ВОШЕДШЕМУ И ТОЛЬКО ИСТОЧНИК ИЗ КАТАЛОГА. Окно — это живой хром на
    нашем сервере; открытое любому встречному и на любой адрес, оно стало бы
    бесплатным чужим браузером. Начальный адрес поэтому берётся из каталога по
    имени источника, а не из запроса.
    """
    я = who(request)
    if я is None:
        return JsonResponse({"error": "Сначала войдите."}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Так нельзя."}, status=405)
    try:
        тело = json.loads(request.body or b"{}")
    except ValueError:
        тело = {}
    дом = _дома().get(str(тело.get("id", "")))
    if not дом:
        return JsonResponse({"error": "Такого источника в каталоге нет."}, status=404)
    код, _, ответ = _к_браузерной("/open", {"хозяин": str(я.id), "дом": дом, "ш": тело.get("ш"), "в": тело.get("в")})
    return _слова(код, ответ)


def браузер_кадр(request: HttpRequest) -> HttpResponse:
    """Кадр окна. 204 — с прошлого раза ничего не изменилось."""
    я = who(request)
    if я is None:
        return JsonResponse({"error": "Сначала войдите."}, status=401)
    путь = "/frame?" + urlencode({"окно": request.GET.get("w", ""), "знаю": request.GET.get("h", ""), "хозяин": str(я.id)})
    код, заголовки, ответ = _к_браузерной(путь, срок=8)
    if код not in (200, 204):
        return _слова(код, ответ)
    итог = HttpResponse(ответ, status=код, content_type="image/jpeg")
    итог["X-Hub-Hash"] = заголовки.get("X-Hub-Hash", "")
    итог["X-Hub-Url"] = заголовки.get("X-Hub-Url", "")
    итог["Cache-Control"] = "no-store"
    return итог


@csrf_exempt
def браузер_действие(request: HttpRequest) -> HttpResponse:
    """Нажатие, прокрутка, клавиша, назад, обновить, размер — или закрыть окно."""
    я = who(request)
    if я is None:
        return JsonResponse({"error": "Сначала войдите."}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Так нельзя."}, status=405)
    try:
        тело = json.loads(request.body or b"{}")
    except ValueError:
        тело = {}
    if not isinstance(тело, dict):
        тело = {}
    тело["хозяин"] = str(я.id)          # чьё окно — говорит кука, а не запрос
    тело["окно"] = str(тело.get("w", ""))
    код, _, ответ = _к_браузерной("/close" if тело.get("что") == "close" else "/act", тело)
    return _слова(код, ответ)
