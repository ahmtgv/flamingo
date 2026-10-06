"""Исследование внимания SEduM: приём записей от добровольцев.

На проводе:

    GET  /api/science/join/<секрет>                    жива ли общая ссылка
    POST /api/science/join/<секрет>                    назваться → свой код
    GET  /api/science/v/<код>                          кто я: имя, согласие, анкета, мои проверки
    POST /api/science/v/<код>/consent                  согласие (и анкета, если прислали)
    POST /api/science/v/<код>/profile                  анкета — по желанию, отдельно
    POST /api/science/v/<код>/runs                     начать проверку → id
    PUT  /api/science/v/<код>/runs/<id>/<вид>/<n>      кусок записи: video, frames, events, audio
    POST /api/science/v/<код>/runs/<id>/finish         проверка закончена

🔴 ПРОПУСК — КОД В АДРЕСЕ, КУКИ НЕТ. Доброволец не заводит учётную запись: его
код выдаём мы — личной ссылкой `flamingo.plus/наука/<код>` (`manage.py
наука_участник`) или через общую `flamingo.plus/наука/вход-<секрет>`, где
человек называет себя и получает свой код (`manage.py наука_ссылка`). Раз
куки нет, подделать запрос «от его имени» с чужого сайта нечем — защищаться от
этого не нужно, и `csrf_exempt` здесь честный, а не «чтобы заработало».

🔴 ЧУЖОЕ — «НЕ НАЙДЕНО», А НЕ «НЕЛЬЗЯ». Проверка чужого добровольца, неверный
код, несуществующая проверка — один и тот же ответ: «нельзя» подтверждало бы,
что такое существует.
"""
from __future__ import annotations

import json
import re
from datetime import timedelta

from django.db.models import F, Sum
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import Invite, Run, Volunteer
from .хранилище import (
    CODE, ДОБРОВОЛЕЦ_МАКС, ПРОВЕРКА_МАКС, RUN, Отказ, записать_json, записать_кусок, имя_куска,
    папка_добровольца, папка_проверки,
)

#: Версии текста согласия, которые страница может прислать. Новая версия текста —
#: новая строка здесь: так видно, на что именно согласился каждый.
СОГЛАСИЯ = {"2026-10-06"}
#: Виды проверок. Порядок и смысл — в docs/SEDUM-ИССЛЕДОВАНИЕ.md.
ВИДЫ_ПРОВЕРОК = {"настройка", "взгляд", "тетрадь", "сон", "думай", "точка", "чтение", "голос"}
#: Секрет общей ссылки — тот же алфавит, что у кода, 8 знаков.
TOKEN = re.compile(r"^[a-hjkmnp-z2-9]{8}$")
#: Сколько новых людей может войти по одной общей ссылке за час. Друзей и
#: близких столько не придёт; если придёт больше — ссылка ушла не туда, и
#: лучше остановиться, чем завести тысячу пустых строк.
НОВЫХ_В_ЧАС = 60
#: Поля анкеты и «как вы сейчас»: что берём и сколько знаков. Остальное отбрасываем —
#: в базу не должно попадать то, о чём мы не спрашивали.
АНКЕТА = {"возраст": 8, "пол": 24, "очки": 24, "рука": 24, "зрение": 200, "роль": 24, "заметка": 500}
#: «спрошено» — когда человек ответил на «как вы сейчас»: ответ живёт два часа
#: (решение владельца 06.10), и следующая проверка может идти со старым ответом.
ПЕРЕД = {"сонливость": 4, "свет": 24, "очки": 24, "где": 24, "самочувствие": 200, "спрошено": 40}
УСТРОЙСТВО_МАКС = 4000
ИТОГ_МАКС = 20000


def _no(reason: str, status: int = 400) -> JsonResponse:
    return JsonResponse({"error": reason}, status=status)


def _body(request: HttpRequest) -> dict:
    try:
        данные = json.loads(request.body or b"{}")
    except ValueError:
        return {}
    return данные if isinstance(данные, dict) else {}


def _поля(сырое: object, разрешено: dict[str, int]) -> dict:
    """Берёт из словаря только разрешённые поля и обрезает их по длине."""
    if not isinstance(сырое, dict):
        return {}
    итог = {}
    for ключ, длина in разрешено.items():
        значение = сырое.get(ключ)
        if значение is None or значение == "":
            continue
        итог[ключ] = str(значение)[:длина]
    return итог


def _json_до(сырое: object, предел: int) -> dict:
    """Произвольный словарь, но не больше `предел` знаков в записи."""
    if not isinstance(сырое, dict):
        return {}
    текст = json.dumps(сырое, ensure_ascii=False, default=str)
    return сырое if len(текст) <= предел else {"обрезано": текст[:предел]}


def _доброволец(код: str) -> Volunteer | None:
    if not CODE.match(код or ""):
        return None
    return Volunteer.objects.filter(code=код).first()


def _проверка(в: Volunteer, run_id: str) -> Run | None:
    if not RUN.match(run_id or ""):
        return None
    return Run.objects.filter(id=run_id, volunteer=в).first()


def _о_добровольце(в: Volunteer) -> dict:
    return {
        "имя": в.name or None,
        "согласие": в.consent or None,
        "анкета": в.profile or None,
        "проверки": [
            {
                "id": р.id,
                "вид": р.kind,
                "начата": р.started.isoformat(),
                "закончена": р.finished.isoformat() if р.finished else None,
                # Остановил сам: запись есть, но проверка не пройдена — значка нет.
                "прервана": isinstance(р.summary, dict) and bool(р.summary.get("прервано")),
            }
            for р in в.runs.all()
        ],
    }


def _meta(р: Run) -> dict:
    return {
        "доброволец": р.volunteer_id,
        "проверка": р.id,
        "вид": р.kind,
        "протокол": р.protocol,
        "начата": р.started,
        "закончена": р.finished,
        "перед": р.before,
        "устройство": р.device,
        "итог": р.summary,
        "байт": р.bytes,
        "кусков": р.chunks,
    }


def _имя(сырое: object) -> str:
    """Имя одной строкой: без переводов строк и лишних пробелов, до 60 знаков."""
    return " ".join(str(сырое or "").split())[:60]


@csrf_exempt
def join(request: HttpRequest, токен: str) -> JsonResponse:
    """Общая ссылка: GET — жива ли она, POST {имя} — завести своего добровольца."""
    if request.method not in ("GET", "POST"):
        return _no("Не тот метод.", 405)
    приглашение = Invite.objects.filter(token=токен, active=True).first() if TOKEN.match(токен or "") else None
    if not приглашение:
        return _no("Эта ссылка больше не действует. Попросите новую у того, кто её прислал.", 404)
    if request.method == "GET":
        return JsonResponse({"ссылка": "действует"})
    имя = _имя(_body(request).get("имя"))
    if not имя:
        return _no("Напишите, как вас зовут: так Адель поймёт, чьи это записи.")
    час = timezone.now() - timedelta(hours=1)
    if Volunteer.objects.filter(invite=приглашение, created__gte=час).count() >= НОВЫХ_В_ЧАС:
        return _no("По этой ссылке за час пришло слишком много новых людей. Попробуйте через час или напишите Аделю.", 429)
    в = Volunteer.objects.create(name=имя, label=имя, invite=приглашение)
    return JsonResponse({"код": в.code, **_о_добровольце(в)}, status=201)


@csrf_exempt
def volunteer(request: HttpRequest, код: str) -> JsonResponse:
    if request.method != "GET":
        return _no("Не тот метод.", 405)
    в = _доброволец(код)
    if not в:
        return _no("Ссылка не найдена. Проверьте, что она скопирована целиком.", 404)
    return JsonResponse(_о_добровольце(в))


@csrf_exempt
def consent(request: HttpRequest, код: str) -> JsonResponse:
    if request.method != "POST":
        return _no("Не тот метод.", 405)
    в = _доброволец(код)
    if not в:
        return _no("Ссылка не найдена. Проверьте, что она скопирована целиком.", 404)
    тело = _body(request)
    версия = str(тело.get("версия", ""))
    if версия not in СОГЛАСИЯ:
        return _no("Без согласия записывать нельзя.")
    в.consent = версия
    в.consent_at = timezone.now()
    в.profile = _поля(тело.get("анкета"), АНКЕТА)
    в.save()
    записать_json(папка_добровольца(в.code) / "volunteer.json", {
        "доброволец": в.code,
        "имя": в.name,
        "согласие": в.consent,
        "согласие_когда": в.consent_at,
        "анкета": в.profile,
    })
    return JsonResponse(_о_добровольце(в))


@csrf_exempt
def profile(request: HttpRequest, код: str) -> JsonResponse:
    """Анкета — по желанию и отдельно от согласия: согласие даётся на первом
    экране, анкета — на втором, и её можно пропустить."""
    if request.method != "POST":
        return _no("Не тот метод.", 405)
    в = _доброволец(код)
    if not в:
        return _no("Ссылка не найдена. Проверьте, что она скопирована целиком.", 404)
    if not в.consent:
        return _no("Сначала нужно согласие на запись.", 403)
    в.profile = _поля(_body(request).get("анкета"), АНКЕТА)
    в.save(update_fields=["profile"])
    записать_json(папка_добровольца(в.code) / "volunteer.json", {
        "доброволец": в.code,
        "имя": в.name,
        "согласие": в.consent,
        "согласие_когда": в.consent_at,
        "анкета": в.profile,
    })
    return JsonResponse(_о_добровольце(в))


@csrf_exempt
def runs(request: HttpRequest, код: str) -> JsonResponse:
    if request.method != "POST":
        return _no("Не тот метод.", 405)
    в = _доброволец(код)
    if not в:
        return _no("Ссылка не найдена. Проверьте, что она скопирована целиком.", 404)
    if not в.consent:
        return _no("Сначала нужно согласие на запись.", 403)
    тело = _body(request)
    вид = str(тело.get("вид", ""))
    if вид not in ВИДЫ_ПРОВЕРОК:
        return _no("Такой проверки нет.")
    занято = Run.objects.filter(volunteer=в).aggregate(s=Sum("bytes"))["s"] or 0
    if занято >= ДОБРОВОЛЕЦ_МАКС:
        return _no("Записей у вас уже очень много — спасибо! Напишите нам, мы освободим место.", 413)
    р = Run.objects.create(
        volunteer=в,
        kind=вид,
        protocol=str(тело.get("протокол", ""))[:24],
        before=_поля(тело.get("перед"), ПЕРЕД),
        device=_json_до(тело.get("устройство"), УСТРОЙСТВО_МАКС),
    )
    записать_json(папка_проверки(в.code, р.id) / "meta.json", _meta(р))
    return JsonResponse({"id": р.id}, status=201)


@csrf_exempt
def chunk(request: HttpRequest, код: str, run_id: str, вид: str, n: int) -> JsonResponse:
    if request.method != "PUT":
        return _no("Не тот метод.", 405)
    в = _доброволец(код)
    р = _проверка(в, run_id) if в else None
    if not р:
        return _no("Такой проверки нет.", 404)
    try:
        имя = имя_куска(вид, n, request.content_type or "")
    except Отказ as e:
        return _no(str(e))
    try:
        длина = int(request.META.get("CONTENT_LENGTH") or 0) or None
    except ValueError:
        длина = None
    папка = папка_проверки(в.code, р.id)
    try:
        всего, было = записать_кусок(папка, имя, request, длина, ПРОВЕРКА_МАКС - р.bytes)
    except Отказ as e:
        return _no(str(e), 413)
    # 🔴 СЧЁТ — В БАЗЕ, А НЕ В ПАМЯТИ. Страница шлёт по два куска разом: два
    # запроса читают одну и ту же строку и каждый пишет «было + 1» — один кусок
    # пропадает из счёта. Поймано живой пробой 06.10 (106 кусков на диске,
    # 104 в базе). F() прибавляет внутри базы, и гонки нет.
    Run.objects.filter(id=р.id).update(
        bytes=F("bytes") + (всего - было),
        chunks=F("chunks") + (1 if было == 0 else 0),
    )
    return JsonResponse({"принято": имя, "байт": всего})


@csrf_exempt
def finish(request: HttpRequest, код: str, run_id: str) -> JsonResponse:
    if request.method != "POST":
        return _no("Не тот метод.", 405)
    в = _доброволец(код)
    р = _проверка(в, run_id) if в else None
    if not р:
        return _no("Такой проверки нет.", 404)
    тело = _body(request)
    р.summary = _json_до(тело.get("итог"), ИТОГ_МАКС)
    р.finished = р.finished or timezone.now()
    р.save(update_fields=["summary", "finished"])
    записать_json(папка_проверки(в.code, р.id) / "meta.json", _meta(р))
    return JsonResponse({"кусков": р.chunks, "байт": р.bytes})
