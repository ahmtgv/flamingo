"""Занятия, пособия и журнал.

На проводе:

    GET    /api/study/lessons?month=ГГГГ-ММ   свои занятия (у ученика — своих учителей)
    POST   /api/study/lessons                 завести занятие
    PATCH  /api/study/lessons/<id>            поправить
    DELETE /api/study/lessons/<id>            убрать
    POST   /api/study/lessons/<id>/materials  положить пособие (файл или ссылку)
    DELETE /api/study/materials/<id>          снять пособие
    GET    /api/study/file/<id>               отдать файл пособия
    GET    /api/study/journal?month=ГГГГ-ММ   ученики × занятия × посещения
    POST   /api/study/invites                 сделать ссылку в журнал (и письмо)
    GET    /api/study/invites/<ключ>          кто зовёт
    POST   /api/study/invites/<ключ>          принять приглашение
    POST   /api/study/visits                  отметиться на занятии по коду комнаты
    GET    /api/study/teachers                у кого я учусь

🔴 ЧУЖОЕ НЕ ОТДАЁМ И НЕ ПРАВИМ. Каждый путь, который трогает занятие, сначала
спрашивает: это занятие ЭТОГО преподавателя? Ответ на чужой id — «не найдено»,
а не «нельзя»: «нельзя» подтверждает, что такое занятие существует.
"""
from __future__ import annotations

import hashlib
import json
import re
import secrets
from datetime import date, time
from pathlib import Path

from django.conf import settings
from django.db import IntegrityError
from django.http import FileResponse, HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from people.models import Person
from people.session import who

from .files import ALL_MAX, Отказ, сохранить, тип
from .models import Bond, Invite, Lesson, Material, Visit

SITE = "https://flamingo.plus"
MONTH = re.compile(r"^(\d{4})-(\d{2})$")
ROOM_CODE = re.compile(r"^[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
LINK = re.compile(r"^https?://[^\s]+$")


def _no(reason: str, status: int = 400) -> JsonResponse:
    """Отказ называет причину словами (ПРАВИЛА 6.4)."""
    return JsonResponse({"error": reason}, status=status)


def _body(request: HttpRequest) -> dict:
    try:
        return json.loads(request.body or b"{}")
    except ValueError:
        return {}


def _месяц(request: HttpRequest) -> tuple[date, date]:
    """Границы месяца из ?month=ГГГГ-ММ. Не сказано или враньё — текущий."""
    m = MONTH.match(request.GET.get("month", ""))
    сегодня = timezone.localdate()
    год, мес = (int(m.group(1)), int(m.group(2))) if m else (сегодня.year, сегодня.month)
    if not 1 <= мес <= 12 or not 1970 <= год <= 2999:
        год, мес = сегодня.year, сегодня.month
    с = date(год, мес, 1)
    по = date(год + (мес == 12), 1 if мес == 12 else мес + 1, 1)
    return с, по


def _пособие(m: Material) -> dict:
    return {
        "id": m.id,
        "вид": m.kind,
        "имя": m.name,
        "размер": m.size,
        "адрес": m.url if m.kind == Material.LINK else f"/api/study/file/{m.id}",
    }


def _урок(lesson: Lesson) -> dict:
    return {
        "id": lesson.id,
        "название": lesson.title,
        "дата": lesson.on.isoformat(),
        "время": lesson.at.strftime("%H:%M"),
        "минут": lesson.minutes,
        "код": lesson.code,
        "материалы": [_пособие(m) for m in lesson.materials.all()],
    }


def _поля(body: dict) -> tuple[dict, str]:
    """Разбирает название/дату/время/длительность. Второе — отказ словами или пусто.

    🔴 Возвращает НАСТОЯЩИЕ `date` и `time`, а не строки. Django строку в поле
    примет и в базу запишет верно, но объект в памяти останется строкой — и
    первый же `lesson.on.isoformat()` падает пятисоткой сразу после удачного
    создания. Поймано прибором, а не на боевом.
    """
    title = " ".join(str(body.get("название", "")).split())[:120]
    on = str(body.get("дата", "")).strip()
    at = str(body.get("время", "")).strip()
    minutes = body.get("минут", 45)
    if not title:
        return {}, "Без названия урок не найти в расписании."
    if not DATE.match(on):
        return {}, "Дата должна быть днём, месяцем и годом."
    try:
        когда = date.fromisoformat(on)
    except ValueError:
        return {}, "Такой даты не существует."
    if not TIME.match(at):
        return {}, "Время должно быть часами и минутами."
    во = time(int(at[:2]), int(at[3:]))
    try:
        minutes = int(minutes)
    except (TypeError, ValueError):
        return {}, "Длительность — число минут."
    if not 5 <= minutes <= 480:
        return {}, "Длительность — от 5 до 480 минут."
    return {"title": title, "on": когда, "at": во, "minutes": minutes}, ""


# ── занятия ──────────────────────────────────────────────────────────────────

@csrf_exempt
def lessons(request: HttpRequest) -> JsonResponse:
    person = who(request)
    if not person:
        return _no("Сначала войдите: занятия принадлежат учётной записи.", 401)

    if request.method == "GET":
        с, по = _месяц(request)
        if person.role == Person.TEACHER:
            рядом = Lesson.objects.filter(teacher=person)
        else:
            # Ученик видит занятия ТЕХ, у кого учится, и ничьи больше.
            учителя = list(
                Bond.objects.filter(student=person).values_list("teacher_id", flat=True))
            рядом = Lesson.objects.filter(teacher_id__in=учителя)
        свои = рядом.filter(on__gte=с, on__lt=по).prefetch_related("materials")
        return JsonResponse({"уроки": [_урок(l) for l in свои]})

    if request.method != "POST":
        return _no("Этот путь отвечает на GET и POST.", 405)
    if person.role != Person.TEACHER:
        return _no("Заводить занятия может преподаватель.", 403)

    поля, беда = _поля(_body(request))
    if беда:
        return _no(беда)
    lesson = Lesson.objects.create(teacher=person, **поля)
    return JsonResponse({"урок": _урок(lesson)}, status=201)


@csrf_exempt
def lesson(request: HttpRequest, lesson_id: str) -> JsonResponse:
    person = who(request)
    if not person:
        return _no("Сначала войдите.", 401)
    # Чужое — «не найдено», а не «нельзя»: иначе отказ подтверждает, что оно есть.
    l = Lesson.objects.filter(id=lesson_id, teacher=person).first()
    if not l:
        return _no("Такого занятия у вас нет.", 404)

    if request.method == "PATCH":
        поля, беда = _поля(_body(request))
        if беда:
            return _no(беда)
        for имя, знач in поля.items():
            setattr(l, имя, знач)
        l.save()
        return JsonResponse({"урок": _урок(l)})

    if request.method == "DELETE":
        # Файлы уходят вместе с занятием: иначе диск копит то, чего никто не ждёт.
        for m in l.materials.all():
            if m.path:
                (Path(settings.MEDIA_ROOT) / m.path).unlink(missing_ok=True)
        l.delete()
        return JsonResponse({"ok": True})

    return _no("Этот путь отвечает на PATCH и DELETE.", 405)


# ── пособия ──────────────────────────────────────────────────────────────────

@csrf_exempt
def materials(request: HttpRequest, lesson_id: str) -> JsonResponse:
    if request.method != "POST":
        return _no("Этот путь отвечает только на POST.", 405)
    person = who(request)
    if not person:
        return _no("Сначала войдите.", 401)
    l = Lesson.objects.filter(id=lesson_id, teacher=person).first()
    if not l:
        return _no("Такого занятия у вас нет.", 404)

    # Ссылка — не файл: ни места, ни ограничений по весу.
    url = str(request.POST.get("url", "")).strip()
    if url:
        if not LINK.match(url):
            return _no("Ссылка должна начинаться с http:// или https://.")
        имя = " ".join(str(request.POST.get("имя", "")).split())[:200] or url[:200]
        m = Material.objects.create(lesson=l, kind=Material.LINK, name=имя, url=url[:500])
        return JsonResponse({"пособие": _пособие(m)}, status=201)

    файл = request.FILES.get("файл")
    if not файл:
        return _no("Не пришло ни файла, ни ссылки.")

    # Общий вес у преподавателя — до потолка, и об этом говорим числами.
    занято = sum(Material.objects.filter(lesson__teacher=person)
                 .values_list("size", flat=True))
    if занято + файл.size > ALL_MAX:
        return _no(
            f"Место кончилось: у вас занято {занято // (1024 ** 3)} ГБ из "
            f"{ALL_MAX // (1024 ** 3)}. Снимите лишнее со старых уроков или "
            "положите крупное ссылкой.")
    try:
        kind, имя, путь, размер = сохранить(файл, l.id)
    except Отказ as e:
        return _no(str(e))
    m = Material.objects.create(lesson=l, kind=kind, name=имя, path=путь, size=размер)
    return JsonResponse({"пособие": _пособие(m)}, status=201)


@csrf_exempt
def material(request: HttpRequest, material_id: str) -> JsonResponse:
    if request.method != "DELETE":
        return _no("Этот путь отвечает только на DELETE.", 405)
    person = who(request)
    if not person:
        return _no("Сначала войдите.", 401)
    m = Material.objects.filter(id=material_id, lesson__teacher=person).first()
    if not m:
        return _no("Такого пособия у вас нет.", 404)
    if m.path:
        (Path(settings.MEDIA_ROOT) / m.path).unlink(missing_ok=True)
    m.delete()
    return JsonResponse({"ok": True})


def file(request: HttpRequest, material_id: str):
    """Отдаёт файл пособия.

    🔴 Два заголовка обязательны. `nosniff` — чтобы браузер не решил сам, что
    текстовый файл на самом деле разметка. `sandbox` в CSP — чтобы даже если
    что-то исполняемое просочилось мимо списка расширений, оно исполнялось
    без прав нашего домена и не дотянулось до куки урока.
    """
    person = who(request)
    if not person:
        return _no("Сначала войдите.", 401)
    m = Material.objects.filter(id=material_id).exclude(path="").first()
    if not m:
        return _no("Такого пособия нет.", 404)
    # Смотреть может преподаватель занятия и его ученики — больше никто.
    свой = m.lesson.teacher_id == person.id or Bond.objects.filter(
        teacher_id=m.lesson.teacher_id, student=person).exists()
    if not свой:
        return _no("Такого пособия нет.", 404)
    полный = Path(settings.MEDIA_ROOT) / m.path
    if not полный.exists():
        return _no("Файл не найден на диске. Похоже, его сняли.", 404)
    res = FileResponse(open(полный, "rb"), content_type=тип(m.path))
    res["X-Content-Type-Options"] = "nosniff"
    res["Content-Security-Policy"] = "sandbox; default-src 'none'"
    res["Cache-Control"] = "private, max-age=3600"
    return res


# ── журнал ───────────────────────────────────────────────────────────────────

def journal(request: HttpRequest) -> JsonResponse:
    if request.method != "GET":
        return _no("Этот путь отвечает только на GET.", 405)
    person = who(request)
    if not person:
        return _no("Сначала войдите.", 401)
    if person.role != Person.TEACHER:
        return _no("Журнал ведёт преподаватель.", 403)

    с, по = _месяц(request)
    уроки = list(Lesson.objects.filter(teacher=person, on__gte=с, on__lt=по))
    связи = list(Bond.objects.filter(teacher=person).select_related("student"))
    # Приглашённые, но ещё не пришедшие — тоже строки журнала: иначе непонятно,
    # отправил ты ссылку или только собирался.
    ждут = [i for i in Invite.objects.filter(teacher=person, used_at__isnull=True)
            if i.alive]

    было = set(Visit.objects.filter(lesson__in=уроки)
               .values_list("lesson_id", "person_id"))
    сейчас = timezone.localtime()

    ученики = [
        {
            "id": b.student_id,
            "имя": b.student.name,
            "как": b.how,
            "с": b.since.date().isoformat(),
            "был": [(l.id, b.student_id) in было for l in уроки],
        }
        for b in связи
    ]
    return JsonResponse({
        "уроки": [
            {"id": l.id, "дата": l.on.isoformat(), "время": l.at.strftime("%H:%M"),
             "название": l.title, "код": l.code,
             "прошёл": (l.on, l.at) <= (сейчас.date(), сейчас.time())}
            for l in уроки
        ],
        "ученики": ученики,
        "ждут": [{"почта": i.email} for i in ждут],
    })


# ── приглашения ──────────────────────────────────────────────────────────────

def _отпечаток(ключ: str) -> str:
    return hashlib.sha256(ключ.encode()).hexdigest()


@csrf_exempt
def invites(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return _no("Этот путь отвечает только на POST.", 405)
    person = who(request)
    if not person:
        return _no("Сначала войдите.", 401)
    if person.role != Person.TEACHER:
        return _no("Звать учеников может преподаватель.", 403)

    email = str(_body(request).get("почта", "")).strip().lower()[:254]
    ключ = secrets.token_urlsafe(16)
    inv = Invite.objects.create(token_hash=_отпечаток(ключ), teacher=person, email=email)

    # 🔴 Ответ ОДИН И ТОТ ЖЕ, есть у нас такая почта или нет — иначе журнал
    # становится способом перебором узнать, кто у нас зарегистрирован.
    if email:
        from people.mail import send_invite
        send_invite(email, person.name, f"{SITE}/у/{ключ}")
        сказать = "Если по этой почте можно писать, ссылка уже отправлена."
    else:
        сказать = "Ссылка живёт 7 дней и добавляет одного человека."

    return JsonResponse(
        {"ссылка": f"{SITE}/у/{ключ}", "сказать": сказать,
         "до": (inv.made_at + Invite.LIFE).date().isoformat()}, status=201)


@csrf_exempt
def invite(request: HttpRequest, ключ: str) -> JsonResponse:
    inv = (Invite.objects.filter(token_hash=_отпечаток(ключ))
           .select_related("teacher").first())
    if not inv or not inv.alive:
        return _no(
            "Ссылка не работает: она живёт семь дней и срабатывает один раз. "
            "Попросите преподавателя прислать новую.", 404)

    if request.method == "GET":
        return JsonResponse({"зовёт": inv.teacher.name})

    if request.method != "POST":
        return _no("Этот путь отвечает на GET и POST.", 405)

    person = who(request)
    if not person:
        return _no("Сначала войдите или заведите учётную запись — тогда вас "
                   "будет кому записать.", 401)
    if person.id == inv.teacher_id:
        return _no("Это ваша собственная ссылка: по ней зовут учеников.")

    try:
        Bond.objects.create(teacher=inv.teacher, student=person,
                            how="почте" if inv.email else "ссылке")
    except IntegrityError:
        # Уже связаны — не ошибка: человек просто нажал дважды.
        pass
    inv.used_at = timezone.now()
    inv.student = person
    inv.save()
    return JsonResponse({"учитель": inv.teacher.name})


# ── посещения ────────────────────────────────────────────────────────────────

@csrf_exempt
def visits(request: HttpRequest) -> JsonResponse:
    """Отметка о том, что человек вошёл в комнату занятия.

    🔴 Гость по ссылке без учётной записи не отмечается, и это не дефект:
    журнал — свидетель, а свидетельствовать про имя, которое человек сам себе
    написал в поле, нельзя. Об этом сказано словами на экране комнаты.
    """
    if request.method != "POST":
        return _no("Этот путь отвечает только на POST.", 405)
    person = who(request)
    if not person:
        return JsonResponse({"отмечен": False, "почему": "без учётной записи"})

    код = str(_body(request).get("код", "")).strip().lower()
    if not ROOM_CODE.match(код):
        return _no("Код комнаты не похож на код.")
    l = Lesson.objects.filter(code=код).first()
    if not l:
        # Комната без занятия — обычное дело: «Начать урок сейчас» журнала не ведёт.
        return JsonResponse({"отмечен": False, "почему": "комната не от занятия"})
    if l.teacher_id == person.id:
        return JsonResponse({"отмечен": False, "почему": "это ваш урок"})
    try:
        Visit.objects.create(lesson=l, person=person)
    except IntegrityError:
        pass  # уже отмечен — второй вход не считается вторым посещением
    return JsonResponse({"отмечен": True, "урок": l.title})


# ── мои преподаватели (ученику) ──────────────────────────────────────────────

def teachers(request: HttpRequest) -> JsonResponse:
    person = who(request)
    if not person:
        return _no("Сначала войдите.", 401)
    свои = Bond.objects.filter(student=person).select_related("teacher")
    return JsonResponse({"преподаватели": [
        {"id": b.teacher_id, "имя": b.teacher.name, "с": b.since.date().isoformat()}
        for b in свои]})
