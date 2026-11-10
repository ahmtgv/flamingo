"""Админка владельца: все люди, проверка преподавателей, блокировка, журнал.

Решение владельца 10.11.2026. Экран — `frontend/src/screens/Админ.tsx`.

🔴 КТО АДМИН — РЕШАЕТ СЕРВЕР, ПО ПОЧТЕ. В `.env` — `SUPER_ADMINS` (почты через
запятую). Страница прав не даёт: каждый путь здесь заново спрашивает, кто
пришёл, и чужому отвечает отказом. Пустой список — админка закрыта для всех.

🔴 ПАРОЛЕЙ ЗДЕСЬ НЕ ВИДИТ НИКТО. «Сбросить пароль» значит выдать одноразовую
ссылку на смену — ту же, что уходит письмом, — и владелец сам передаёт её
человеку. Задать чужой пароль или прочитать его админка не умеет.

🔴 КАЖДОЕ ДЕЙСТВИЕ ПИШЕТСЯ В ЖУРНАЛ (`Deed`) в той же транзакции, что и само
действие: действия без записи не бывает.
"""
from __future__ import annotations

import json
import secrets

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import Deed, Person, Reset
from .session import who

SITE = "https://flamingo.plus"
#: Сколько строк отдаём за раз: списку людей и журналу этого хватает с запасом,
#: а безразмерный ответ однажды положит и сервер, и страницу.
СТРОК = 500


def _no(reason: str, status: int = 400) -> JsonResponse:
    return JsonResponse({"error": reason}, status=status)


def админы() -> set[str]:
    return {п.strip().lower() for п in getattr(settings, "SUPER_ADMINS", []) if п.strip()}


def админ_ли(человек: Person | None) -> bool:
    return bool(человек) and человек.email.lower() in админы()


def _админ(request: HttpRequest) -> tuple[Person | None, JsonResponse | None]:
    """Админ — или готовый отказ."""
    человек = who(request)
    if человек is None:
        return None, _no("Войдите в Flamingo — админка открывается после входа.", 401)
    if not админ_ли(человек):
        return None, _no("Админка открыта только владельцу.", 403)
    return человек, None


def _строка(п: Person) -> dict:
    return {
        "id": п.id,
        "имя": п.name,
        "почта": п.email,
        "роль": п.role,
        "проверка": п.vet,
        "почтаПодтверждена": п.email_ok,
        "телефон": п.phone,
        "заблокирован": п.blocked_at.isoformat() if п.blocked_at else None,
        "причина": п.blocked_why,
        "снами": п.made_at.isoformat(),
        "уроков": getattr(п, "уроков", None),
    }


def _запись(д: Deed) -> dict:
    return {"когда": д.at.isoformat(), "кто": д.admin, "над": д.whom, "что": д.what, "подробно": д.detail}


ГРУППЫ = {
    # ждут проверки: преподаватели, которых владелец ещё не смотрел
    "wait": Q(role=Person.TEACHER, vet=Person.VET_NEW, blocked_at__isnull=True),
    "teachers": Q(role=Person.TEACHER, blocked_at__isnull=True) & ~Q(vet=Person.VET_NEW),
    "students": Q(role=Person.STUDENT, blocked_at__isnull=True),
    "blocked": Q(blocked_at__isnull=False),
}


def summary(request: HttpRequest) -> JsonResponse:
    _, отказ = _админ(request)
    if отказ:
        return отказ
    from study.models import Lesson
    from science.models import Volunteer
    return JsonResponse({
        "ждут": Person.objects.filter(ГРУППЫ["wait"]).count(),
        "учителей": Person.objects.filter(ГРУППЫ["teachers"]).count(),
        "учеников": Person.objects.filter(ГРУППЫ["students"]).count(),
        "заблокировано": Person.objects.filter(ГРУППЫ["blocked"]).count(),
        "уроков": Lesson.objects.count(),
        "добровольцев": Volunteer.objects.count(),
    })


def people(request: HttpRequest) -> JsonResponse:
    _, отказ = _админ(request)
    if отказ:
        return отказ
    группа = request.GET.get("group", "")
    if группа not in ГРУППЫ:
        return _no("Не сказано, кого показать: wait, teachers, students или blocked.")
    слово = " ".join(request.GET.get("q", "").split())[:80]
    кто = Person.objects.filter(ГРУППЫ[группа]).annotate(уроков=Count("lessons")).order_by("-made_at")
    if слово:
        # 🔴 ИЩЕМ САМИ, А НЕ `icontains`. SQLite сравнивает без учёта регистра
        # только латиницу: «марин» не находит «Марина», и поиск по русским
        # именам молча не работает. Поймано прибором. Людей у нас тысячи, а не
        # миллионы — пройти группу в памяти дёшево.
        ищу = слово.casefold()
        кто = [п for п in кто.iterator() if ищу in п.name.casefold() or ищу in п.email.casefold()][:СТРОК]
    else:
        кто = кто[:СТРОК]
    return JsonResponse({"люди": [_строка(п) for п in кто]})


def person(request: HttpRequest, person_id: str) -> JsonResponse:
    _, отказ = _админ(request)
    if отказ:
        return отказ
    п = Person.objects.filter(id=person_id).annotate(уроков=Count("lessons")).first()
    if п is None:
        return _no("Такого человека нет.", 404)
    журнал = Deed.objects.filter(person=п)[:50]
    return JsonResponse({"человек": {**_строка(п), "заметка": п.note},
                         "журнал": [_запись(д) for д in журнал]})


def _тело(request: HttpRequest) -> dict:
    try:
        тело = json.loads(request.body or b"{}")
    except ValueError:
        return {}
    return тело if isinstance(тело, dict) else {}


@csrf_exempt
def act(request: HttpRequest, person_id: str) -> JsonResponse:
    """Одно действие над человеком. Что именно — в поле `действие`."""
    админ, отказ = _админ(request)
    if отказ:
        return отказ
    if request.method != "POST":
        return _no("Этот путь отвечает только на POST.", 405)

    тело = _тело(request)
    что = str(тело.get("действие", ""))
    слова = " ".join(str(тело.get("слова", "")).split())[:200]

    with transaction.atomic():
        п = Person.objects.select_for_update().filter(id=person_id).first()
        if п is None:
            return _no("Такого человека нет.", 404)
        кого = f"{п.name} <{п.email}>"
        ответ: dict = {}

        if что in ("verify", "reject"):
            if п.role != Person.TEACHER:
                return _no("Проверка есть только у преподавателя.")
            п.vet = Person.VET_OK if что == "verify" else Person.VET_NO
            п.save(update_fields=["vet"])
        elif что == "block":
            # 🔴 СЕБЯ ЗАБЛОКИРОВАТЬ НЕЛЬЗЯ: единственный админ запер бы админку
            # изнутри, и открыть её можно было бы только руками в базе.
            if п.id == админ.id:
                return _no("Себя заблокировать нельзя.")
            if not слова:
                return _no("Скажите, за что блокируете: причина останется в журнале.")
            п.blocked_at = timezone.now()
            п.blocked_why = слова
            п.save(update_fields=["blocked_at", "blocked_why"])
        elif что == "unblock":
            п.blocked_at = None
            п.blocked_why = ""
            п.save(update_fields=["blocked_at", "blocked_why"])
        elif что in ("email_ok", "email_no"):
            п.email_ok = что == "email_ok"
            п.save(update_fields=["email_ok"])
        elif что == "note":
            п.note = str(тело.get("слова", ""))[:4000]
            п.save(update_fields=["note"])
            слова = ""
        elif что == "reset_link":
            # Та же одноразовая ссылка, что уходит письмом: живёт час, срабатывает раз.
            from .views import _key_hash
            ключ = secrets.token_urlsafe(32)
            Reset.objects.create(token_hash=_key_hash(ключ), person=п)
            ответ["ссылка"] = f"{SITE}/новый-пароль?ключ={ключ}"
            слова = ""
        else:
            return _no("Такого действия админка не знает.")

        Deed.objects.create(admin=админ.email, person=п, whom=кого, what=что, detail=слова)

    п = Person.objects.filter(id=person_id).annotate(уроков=Count("lessons")).first()
    return JsonResponse({"человек": {**_строка(п), "заметка": п.note}, **ответ,
                         "журнал": [_запись(д) for д in Deed.objects.filter(person=п)[:50]]})


def lessons(request: HttpRequest) -> JsonResponse:
    _, отказ = _админ(request)
    if отказ:
        return отказ
    from study.models import Lesson
    уроки = Lesson.objects.select_related("teacher").order_by("-on", "-at")[:СТРОК]
    return JsonResponse({"уроки": [{
        "id": у.id, "название": у.title, "дата": у.on.isoformat(), "время": у.at.strftime("%H:%M"),
        "минут": у.minutes, "учитель": у.teacher.name, "почта": у.teacher.email,
    } for у in уроки]})


def log(request: HttpRequest) -> JsonResponse:
    _, отказ = _админ(request)
    if отказ:
        return отказ
    return JsonResponse({"журнал": [_запись(д) for д in Deed.objects.all()[:СТРОК]]})
