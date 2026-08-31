"""Вход и регистрация на своём сервере.

Почему не на Cloudflare. Хеширование пароля стоит процессорного времени, а тариф
Workers Free даёт 10 мс на запрос: PBKDF2 даже на 100 000 повторов стоит 46 мс,
и регистрация падала на каждой попытке. Решение владельца 31.08 — перенести сюда,
где лимита нет и доступен argon2id: он придуман против перебора на видеокартах,
а PBKDF2 — нет.

На проводе всё осталось прежним, чтобы фронт не заметил переезда:
    POST /api/auth/register  {email,name,role,password} → {id,name,role} + кука
    POST /api/auth/login     {email,password}           → {id,name,role} + кука
    GET  /api/auth/me                                    → {person: … | null}
    DELETE /api/auth/me                                  → {ok:true}, кука гаснет
"""
from __future__ import annotations

import hashlib
import json
import re
import secrets
from datetime import timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from django.conf import settings
from django.core import signing
from django.db import IntegrityError
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from . import guard
from .mail import send_reset
from .models import Person, Reset

#: argon2id с настройками по умолчанию argon2-cffi: 3 прохода, 64 МБ памяти, 4 потока.
#: Память здесь — главное: перебор на видеокарте упирается не в такты, а в неё.
HASHER = PasswordHasher()

#: Отпечаток впустую, чтобы отказ на незнакомую почту занимал столько же времени,
#: сколько отказ на неверный пароль. Иначе по секундомеру узнают, кто у нас есть.
EMPTY_HASH = HASHER.hash("пароль, которого ни у кого нет")

EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
#: Ключ на смену пароля живёт час. Дольше — он становится вторым паролем,
#: который лежит в почтовом ящике и которого никто не помнит.
RESET_LIFE = timedelta(hours=1)
SITE = "https://flamingo.plus"
COOKIE = "fl_ses"
DAYS = 30
SALT = "flamingo.session"


def _no(reason: str, status: int = 400) -> JsonResponse:
    """Отказ называет причину словами (ПРАВИЛА 6.4)."""
    return JsonResponse({"error": reason}, status=status)


def _said(person: Person, status: int = 200) -> JsonResponse:
    """Ответ + кука. Пароль и отпечаток наружу не уходят никогда."""
    res = JsonResponse({"id": person.id, "name": person.name, "role": person.role}, status=status)
    res.set_cookie(
        COOKIE,
        signing.dumps({"id": person.id}, salt=SALT),
        max_age=DAYS * 24 * 3600,
        httponly=True,                       # ни один скрипт на странице её не прочитает
        secure=True,                         # только по https
        samesite="Lax",
        domain=settings.SESSION_COOKIE_DOMAIN or None,  # .flamingo.plus — общая для сайта и api
        path="/",
    )
    return res


def _who(request: HttpRequest) -> Person | None:
    raw = request.COOKIES.get(COOKIE)
    if not raw:
        return None
    try:
        data = signing.loads(raw, salt=SALT, max_age=DAYS * 24 * 3600)
    except signing.BadSignature:
        return None
    return Person.objects.filter(id=data.get("id")).first()


def _body(request: HttpRequest) -> dict:
    try:
        return json.loads(request.body or b"{}")
    except ValueError:
        return {}


@csrf_exempt
def register(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return _no("Этот путь отвечает только на POST.", 405)

    body = _body(request)
    email = str(body.get("email", "")).strip().lower()
    name = " ".join(str(body.get("name", "")).split())[:60]
    role = Person.TEACHER if body.get("role") == Person.TEACHER else Person.STUDENT
    password = str(body.get("password", ""))

    if not EMAIL.match(email):
        return _no("Почта написана не полностью — нужен адрес вида имя@почта.рф.")
    if len(name) < 2:
        return _no("Не сказано, как вас зовут: это имя увидит класс.")
    # Длина честнее сложности: «Xy7!» короче и хуже, чем четыре обычных слова.
    if len(password) < 8:
        return _no("Пароль короче восьми знаков. Длина надёжнее сложности: возьмите четыре слова.")

    person = Person(email=email, name=name, role=role, pass_hash=HASHER.hash(password))
    try:
        person.save(force_insert=True)
    except IntegrityError:
        # 🔴 Ловим гонку, а не только «уже занято»: два запроса могли прийти разом,
        # и проверка «есть ли такая почта» до вставки их обоих пропустила бы.
        return _no("Такая почта уже занята. Если это вы — войдите.", 409)
    return _said(person)


@csrf_exempt
def login(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return _no("Этот путь отвечает только на POST.", 405)

    body = _body(request)
    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))
    ip = guard.who_from(request)

    # 🔴 Проверка ДО того, как считать отпечаток: иначе запертый вход всё равно
    # съедает 140 мс на попытку, и запрет перестаёт быть запретом для машины.
    wait = guard.locked_for(email, ip)
    if wait:
        return _no(
            f"Слишком много попыток. Попробуйте через {wait} мин. "
            f"Если это не вы пробовали — пароль всё ещё цел, но лучше его сменить.",
            429,
        )

    person = Person.objects.filter(email=email).first()
    # 🔴 Один и тот же отказ на «нет такой почты» и «пароль не тот»: разные ответы
    # превращают вход в способ узнать, кто у нас зарегистрирован.
    wrong = _no("Почта или пароль не подошли.", 401)
    if person is None:
        try:
            HASHER.verify(EMPTY_HASH, password)
        except Exception:
            pass
        guard.missed(email, ip)
        return wrong
    try:
        HASHER.verify(person.pass_hash, password)
    except VerifyMismatchError:
        guard.missed(email, ip)
        return wrong
    except Exception:
        guard.missed(email, ip)
        return wrong

    guard.hit(email, ip)

    # Настройки argon2 со временем крепчают. Если отпечаток сделан по старым —
    # перезаписываем на новые прямо сейчас, пока пароль в руках и его можно хешировать.
    if HASHER.check_needs_rehash(person.pass_hash):
        person.pass_hash = HASHER.hash(password)
        person.save(update_fields=["pass_hash"])

    return _said(person)


@csrf_exempt
def me(request: HttpRequest) -> JsonResponse:
    if request.method == "DELETE":
        res = JsonResponse({"ok": True})
        res.delete_cookie(COOKIE, domain=settings.SESSION_COOKIE_DOMAIN or None, path="/")
        return res
    if request.method != "GET":
        return _no("Этот путь отвечает на GET и DELETE.", 405)

    person = _who(request)
    if person is None:
        return JsonResponse({"person": None})
    return JsonResponse({"person": {"id": person.id, "name": person.name, "role": person.role}})


# ── Забыли пароль ─────────────────────────────────────────────────────────────


def _key_hash(key: str) -> str:
    """Быстрый SHA-256, и этого достаточно: ключ случайный на 32 байта."""
    return hashlib.sha256(key.encode()).hexdigest()


#: Один и тот же ответ, есть такая почта или нет. Иначе форма «забыли пароль»
#: становится способом проверить, зарегистрирован ли человек у нас.
SENT = "Если такая почта у нас есть, письмо со ссылкой уже ушло. Ссылка живёт час."


@csrf_exempt
def forgot(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return _no("Этот путь отвечает только на POST.", 405)

    email = str(_body(request).get("email", "")).strip().lower()
    ip = guard.who_from(request)

    # Считаем и здесь: иначе этой формой засыпают чужой ящик письмами от нас.
    wait = guard.locked_for(f"забыл:{email}", f"забыл:{ip}")
    if wait:
        return _no(f"Слишком много запросов. Попробуйте через {wait} мин.", 429)
    guard.missed(f"забыл:{email}", f"забыл:{ip}")

    if not EMAIL.match(email):
        return _no("Почта написана не полностью — нужен адрес вида имя@почта.рф.")

    person = Person.objects.filter(email=email).first()
    if person is not None:
        key = secrets.token_urlsafe(32)
        Reset.objects.create(token_hash=_key_hash(key), person=person)
        send_reset(person.email, person.name, f"{SITE}/новый-пароль?ключ={key}")
    return JsonResponse({"ok": True, "said": SENT})


@csrf_exempt
def reset(request: HttpRequest) -> JsonResponse:
    """Смена пароля по ключу из письма. Ключ одноразовый и живёт час."""
    if request.method != "POST":
        return _no("Этот путь отвечает только на POST.", 405)

    body = _body(request)
    key = str(body.get("key", ""))
    password = str(body.get("password", ""))

    if len(password) < 8:
        return _no("Пароль короче восьми знаков. Длина надёжнее сложности: возьмите четыре слова.")

    row = Reset.objects.filter(token_hash=_key_hash(key)).select_related("person").first()
    stale = row is None or row.used_at is not None or row.made_at < timezone.now() - RESET_LIFE
    if stale:
        return _no(
            "Ссылка больше не работает: она живёт час и срабатывает один раз. "
            "Попросите новую на экране входа.",
            410,
        )

    person = row.person
    person.pass_hash = HASHER.hash(password)
    person.save(update_fields=["pass_hash"])

    row.used_at = timezone.now()
    row.save(update_fields=["used_at"])
    # 🔴 Гасим и все остальные ключи этого человека: если писем было заказано
    # несколько, старые ссылки не должны пережить смену пароля.
    Reset.objects.filter(person=person, used_at__isnull=True).update(used_at=timezone.now())
    # 🔴 Снимаем запрет И по почте, И по адресу того, кто сейчас меняет пароль.
    # Только по почте — и человек, сам же исчерпавший пять попыток, меняет пароль
    # и всё равно стоит под запертой дверью двадцать минут. Поймано проходом.
    guard.hit(person.email, guard.who_from(request))

    return _said(person)
