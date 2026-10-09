"""Кабинет исследования — только для владельца (решение владельца 06.10:
«где я могу видеть все данные»).

На проводе (всё — с кукой входа Flamingo, `people/session.py`):

    GET  /api/science/cabinet                          люди, итоги, общая ссылка
    GET  /api/science/cabinet/v/<код>                  человек и его проверки
    GET  /api/science/cabinet/runs/<id>                одна проверка: meta и список кусков
    GET  /api/science/cabinet/runs/<id>/<вид>/<n>      кусок записи — видео, кадры, события, звук
    POST /api/science/cabinet/link                     погасить общую ссылку и выдать новую
    GET  /api/science/cabinet/archive?video=0|1        все записи одним архивом, потоком
    POST /api/science/cabinet/v/<код>/delete           удалить человека и все его записи

🔴 КТО ВЛАДЕЛЕЦ — РЕШАЕТ СЕРВЕР, ПО ПОЧТЕ. В `.env` — `SCIENCE_OWNERS` (почты
через запятую); пусто — кабинет закрыт для всех. Ролей и прав в продукте нет
(`people/models.py`), и заводить их ради одной страницы не стоит: почта
владельца — единственное, что о нём нужно знать. Записи добровольцев видит
только он — так сказано в согласии.

🔴 ЧУЖОМУ — НИЧЕГО. Не вошёл — 401, вошёл не владелец — 403, и ни в одном из
ответов нет ни имён, ни счёта записей.
"""
from __future__ import annotations

import json
import re

from django.conf import settings
from django.db.models import Sum
from django.http import FileResponse, HttpRequest, JsonResponse, StreamingHttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from people.models import Person
from people.session import who

from .models import Invite, Run, Volunteer
from .выгрузка import поток
from .удаление import удалить
from .хранилище import CODE, RUN, ВИДЫ, корень, свободно

#: Куски на диске: `video-000003.webm`, `frames-000003.fr.gz`, `events-000003.ndjson`.
КУСОК = re.compile(r"^(video|frames|events|audio)-(\d{6})\.([a-z0-9.]+)$")
ТИП = {
    "webm": "video/webm", "mp4": "video/mp4", "ogg": "audio/ogg", "bin": "application/octet-stream",
    "fr.gz": "application/gzip", "ndjson": "application/x-ndjson",
}


def _no(reason: str, status: int = 400) -> JsonResponse:
    return JsonResponse({"error": reason}, status=status)


def владельцы() -> set[str]:
    return {п.strip().lower() for п in getattr(settings, "SCIENCE_OWNERS", []) if п.strip()}


def _владелец(request: HttpRequest) -> tuple[Person | None, JsonResponse | None]:
    """Владелец исследования — или готовый отказ."""
    человек = who(request)
    if человек is None:
        return None, _no("Войдите в Flamingo — кабинет исследования открывается после входа.", 401)
    if человек.email.lower() not in владельцы():
        return None, _no("Кабинет исследования открыт только владельцу. Записи добровольцев видит один человек — так сказано в согласии.", 403)
    return человек, None


def _прервана(р: Run) -> bool:
    return isinstance(р.summary, dict) and bool(р.summary.get("прервано"))


def _длина(р: Run) -> float | None:
    if not р.finished:
        return None
    return max(0.0, (р.finished - р.started).total_seconds())


def _проверка_кратко(р: Run) -> dict:
    итог = р.summary if isinstance(р.summary, dict) else {}
    лицо = итог.get("лицо")
    совпало = итог.get("совпало")
    return {
        "id": р.id,
        "вид": р.kind,
        "протокол": р.protocol,
        "начата": р.started.isoformat(),
        "закончена": р.finished.isoformat() if р.finished else None,
        "длина": _длина(р),
        "прервана": _прервана(р),
        "перед": р.before or {},
        "лицо": лицо if isinstance(лицо, (int, float)) else None,
        "совпало": совпало if isinstance(совпало, dict) else None,
        "байт": р.bytes,
        "кусков": р.chunks,
    }


def _ссылка() -> dict:
    п = Invite.objects.filter(active=True).first()
    if not п:
        return {"секрет": None, "вошло": 0}
    return {"секрет": п.token, "вошло": п.volunteers.count(), "с": п.created.isoformat()}


@csrf_exempt
def cabinet(request: HttpRequest) -> JsonResponse:
    if request.method != "GET":
        return _no("Этот путь отвечает только на GET.", 405)
    _, отказ = _владелец(request)
    if отказ:
        return отказ
    люди = []
    for в in Volunteer.objects.order_by("-created").prefetch_related("runs"):
        проверки = list(в.runs.all())
        пройдены = {р.kind for р in проверки if р.finished and not _прервана(р)}
        последняя = max((р.started for р in проверки), default=None)
        люди.append({
            "код": в.code,
            "имя": в.name or в.label or "",
            "пометка": в.label,
            "анкета": в.profile or {},
            "согласие": в.consent or None,
            "по_ссылке": bool(в.invite_id),
            "пройдено": sorted(пройдены),
            "проверок": len(проверки),
            "последняя": последняя.isoformat() if последняя else None,
            "заведён": в.created.isoformat(),
        })
    запуски = Run.objects.all()
    секунд = sum((_длина(р) or 0) for р in запуски.filter(finished__isnull=False))
    return JsonResponse({
        "люди": люди,
        "всего": {
            "людей": len(люди),
            "проверок": запуски.count(),
            "секунд": round(секунд),
            "байт": запуски.aggregate(б=Sum("bytes"))["б"] or 0,
            "свободно": свободно(),
        },
        "ссылка": _ссылка(),
    })


@csrf_exempt
def cabinet_volunteer(request: HttpRequest, код: str) -> JsonResponse:
    if request.method != "GET":
        return _no("Этот путь отвечает только на GET.", 405)
    _, отказ = _владелец(request)
    if отказ:
        return отказ
    в = Volunteer.objects.filter(code=код).first() if CODE.match(код or "") else None
    if not в:
        return _no("Такого человека нет.", 404)
    return JsonResponse({
        "код": в.code,
        "имя": в.name or в.label or "",
        "пометка": в.label,
        "анкета": в.profile or {},
        "согласие": в.consent or None,
        "проверки": [_проверка_кратко(р) for р in в.runs.order_by("-started")],
    })


def _папка(р: Run):
    return корень() / р.volunteer_id / р.id


def _куски(р: Run) -> dict[str, list[dict]]:
    """Что лежит на диске у проверки: номера и размеры кусков по видам."""
    итог: dict[str, list[dict]] = {в: [] for в in sorted(ВИДЫ)}
    папка = _папка(р)
    if not папка.exists():
        return итог
    for f in sorted(папка.iterdir()):
        м = КУСОК.match(f.name)
        if м:
            итог[м.group(1)].append({"n": int(м.group(2)), "тип": ТИП.get(м.group(3), "application/octet-stream"), "байт": f.stat().st_size})
    return итог


@csrf_exempt
def cabinet_run(request: HttpRequest, run_id: str) -> JsonResponse:
    if request.method != "GET":
        return _no("Этот путь отвечает только на GET.", 405)
    _, отказ = _владелец(request)
    if отказ:
        return отказ
    р = Run.objects.select_related("volunteer").filter(id=run_id).first() if RUN.match(run_id or "") else None
    if not р:
        return _no("Такой проверки нет.", 404)
    в = р.volunteer
    return JsonResponse({
        **_проверка_кратко(р),
        "человек": {"код": в.code, "имя": в.name or в.label or "", "анкета": в.profile or {}},
        "устройство": р.device or {},
        "итог": р.summary or {},
        "куски": _куски(р),
    })


@csrf_exempt
def cabinet_chunk(request: HttpRequest, run_id: str, вид: str, n: int):
    if request.method != "GET":
        return _no("Этот путь отвечает только на GET.", 405)
    _, отказ = _владелец(request)
    if отказ:
        return отказ
    р = Run.objects.filter(id=run_id).first() if RUN.match(run_id or "") else None
    if not р or вид not in ВИДЫ or not 0 <= n < 1_000_000:
        return _no("Такого куска нет.", 404)
    папка = _папка(р)
    for f in (sorted(папка.glob(f"{вид}-{n:06d}.*")) if папка.exists() else []):
        м = КУСОК.match(f.name)
        if м:
            ответ = FileResponse(f.open("rb"), content_type=ТИП.get(м.group(3), "application/octet-stream"))
            # Записи не кэшируются нигде по дороге: это личные данные добровольца.
            ответ["Cache-Control"] = "private, no-store"
            return ответ
    return _no("Такого куска нет.", 404)


@csrf_exempt
def cabinet_link(request: HttpRequest) -> JsonResponse:
    """«Сменить» в кабинете: прежние ссылки гаснут, новые люди по ним не войдут;
    кто вошёл раньше — остаётся со своим кодом и записями."""
    if request.method != "POST":
        return _no("Этот путь отвечает только на POST.", 405)
    _, отказ = _владелец(request)
    if отказ:
        return отказ
    # Тело — JSON: такой запрос с чужого сайта браузер без разрешения не отправит.
    if "application/json" not in (request.content_type or ""):
        return _no("Нужен JSON.", 415)
    try:
        тело = json.loads(request.body or b"{}")
    except ValueError:
        тело = {}
    if not isinstance(тело, dict) or тело.get("сменить") is not True:
        return _no("Чтобы сменить ссылку, подтвердите: {\"сменить\": true}.")
    погашено = Invite.objects.filter(active=True).update(active=False)
    Invite.objects.create()
    return JsonResponse({"ссылка": _ссылка(), "погашено": погашено, "когда": timezone.now().isoformat()})


@csrf_exempt
def cabinet_archive(request: HttpRequest):
    if request.method != "GET":
        return _no("Этот путь отвечает только на GET.", 405)
    _, отказ = _владелец(request)
    if отказ:
        return отказ
    с_видео = request.GET.get("video") == "1"
    метка = timezone.now().strftime("%Y-%m-%d-%H%M")
    ответ = StreamingHttpResponse(поток(без_видео=not с_видео), content_type="application/gzip")
    имя = f"nauka-{метка}{'' if с_видео else '-bez-video'}.tgz"
    ответ["Content-Disposition"] = f'attachment; filename="{имя}"'
    ответ["Cache-Control"] = "private, no-store"
    return ответ


@csrf_exempt
def cabinet_delete(request: HttpRequest, код: str) -> JsonResponse:
    """«Удалить» в кабинете (решение владельца 09.10): черновики и те, кто
    попросил стереть свои данные. Необратимо — поэтому тело обязано повторить
    код человека: случайный или чужой запрос его не знает, а JSON с чужого
    сайта браузер без разрешения не отправит."""
    if request.method != "POST":
        return _no("Этот путь отвечает только на POST.", 405)
    владелец, отказ = _владелец(request)
    if отказ:
        return отказ
    if "application/json" not in (request.content_type or ""):
        return _no("Нужен JSON.", 415)
    try:
        тело = json.loads(request.body or b"{}")
    except ValueError:
        тело = {}
    if not CODE.match(код or ""):
        return _no("Такого человека нет.", 404)
    if not isinstance(тело, dict) or тело.get("удалить") != код:
        return _no("Чтобы удалить, подтвердите кодом человека: {\"удалить\": \"<код>\"}.")
    итог = удалить(код)
    if итог is None:
        return _no("Такого человека нет — возможно, его уже удалили.", 404)
    # След в журнале службы — без имени и без записей: кто, когда, сколько.
    print(f"НАУКА: удалён доброволец {код} · проверок {итог['проверок']} · {итог['байт']} байт · удалил {владелец.email}", flush=True)
    return JsonResponse({
        "удалено": код,
        "проверок": итог["проверок"],
        "байт": итог["байт"],
        "выгрузок": итог["выгрузок"],
    })
