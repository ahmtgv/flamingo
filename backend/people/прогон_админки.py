"""Прибор для админки: права, проверка преподавателя, блокировка, ссылка, журнал.

Запуск из папки `backend`:

    .venv/bin/python people/прогон_админки.py

Отдельная база в /tmp, боевые данные не трогает и трогать не может.
"""
import os, sys, django, json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["DB_PATH"] = "/tmp/прогон-админка.sqlite3"
os.environ.pop("SESSION_COOKIE_DOMAIN", None)
Path("/tmp/прогон-админка.sqlite3").unlink(missing_ok=True)
django.setup()

from django.test.utils import setup_test_environment
setup_test_environment()

from django.conf import settings

# 🔴 ПРЕДОХРАНИТЕЛЬ. Прибор заводит людей. В боевую базу ему нельзя.
db = str(settings.DATABASES["default"]["NAME"])
if not db.startswith("/tmp/"):
    print(f"СТОП. Прибор смотрит не в свою базу: {db}. Ожидался путь в /tmp. Ничего не тронуто.")
    sys.exit(2)

from django.core.management import call_command
call_command("migrate", verbosity=0, interactive=False)

from django.test import Client
from people.models import Deed, Person

settings.SUPER_ADMINS = ["Owner@Example.com"]
settings.ALLOWED_HOSTS = ["*"]

бед = 0
проверок = 0


def есть(условие, что):
    global бед, проверок
    проверок += 1
    if условие:
        print(f"  ✅ {что}")
    else:
        бед += 1
        print(f"  ❌ {что}")


def вошёл(почта, имя, роль, пароль="четыре-слова-подряд"):
    к = Client(secure=True)
    r = к.post("/api/auth/register", json.dumps({"email": почта, "name": имя, "role": роль, "password": пароль}),
               content_type="application/json")
    assert r.status_code == 200, r.content
    return к


def шлю(к, путь, тело=None):
    return к.post(путь, json.dumps(тело or {}), content_type="application/json")


урок = {"название": "Дроби", "дата": "2030-01-10", "время": "10:00", "минут": 45}

print("\nПрава:")
гость = Client(secure=True)
есть(гость.get("/api/admin/summary").status_code == 401, "без входа — 401")
админ = вошёл("owner@example.com", "Владелец", "student")
ученик = вошёл("s@example.com", "Аня", "student")
учитель = вошёл("t@example.com", "Марина", "teacher")
for путь in ("summary", "people?group=wait", "lessons", "log"):
    есть(ученик.get(f"/api/admin/{путь}").status_code == 403, f"ученик на {путь} — 403")
есть(учитель.get("/api/admin/summary").status_code == 403, "учитель не админ — 403")
есть(админ.get("/api/admin/summary").status_code == 200, "админ — 200")
т = Person.objects.get(email="t@example.com")
есть(шлю(ученик, f"/api/admin/people/{т.id}/act", {"действие": "verify"}).status_code == 403, "чужой не может подтвердить")
есть(Person.objects.get(id=т.id).vet == "new", "…и статус при этом не изменился")
я = админ.get("/api/auth/me").json()["person"]
есть(я["админ"] is True and ученик.get("/api/auth/me").json()["person"]["админ"] is False, "«админ» в ответе о себе — только админу")

print("\nПроверка преподавателя:")
есть(т.vet == "new", "новый преподаватель ждёт проверки")
есть(Person.objects.get(email="s@example.com").vet == "ok", "ученику проверка не нужна")
r = учитель.post("/api/study/lessons", json.dumps(урок), content_type="application/json")
есть(r.status_code == 403 and "не подтверждена" in r.json()["error"], "неподтверждённый занятие не заводит — и сказано почему")
старый = Person.objects.create(email="old@example.com", name="Пётр", role="teacher", pass_hash="—")
есть(старый.vet == "ok", "преподаватель, заведённый мимо регистрации (как до миграции), — подтверждён")
ждут = админ.get("/api/admin/people?group=wait").json()["люди"]
есть([п["почта"] for п in ждут] == ["t@example.com"], "в «ждут проверки» — только новый преподаватель")
r = шлю(админ, f"/api/admin/people/{т.id}/act", {"действие": "verify"})
есть(r.status_code == 200 and r.json()["человек"]["проверка"] == "ok", "админ подтвердил")
r = учитель.post("/api/study/lessons", json.dumps(урок), content_type="application/json")
есть(r.status_code == 201, "после подтверждения занятие заводится")
есть(админ.get("/api/admin/people?group=wait").json()["люди"] == [], "из «ждут проверки» ушёл")
есть(шлю(админ, f"/api/admin/people/{т.id}/act", {"действие": "reject"}).json()["человек"]["проверка"] == "no", "отклонить — тоже можно")
есть(учитель.post("/api/study/lessons", json.dumps(урок), content_type="application/json").status_code == 403, "отклонённый занятие не заводит")
шлю(админ, f"/api/admin/people/{т.id}/act", {"действие": "verify"})
у = Person.objects.get(email="s@example.com")
есть(шлю(админ, f"/api/admin/people/{у.id}/act", {"действие": "verify"}).status_code == 400, "ученика «подтвердить» нельзя")

print("\nБлокировка:")
есть(шлю(админ, f"/api/admin/people/{у.id}/act", {"действие": "block"}).status_code == 400, "без причины не блокирует")
r = шлю(админ, f"/api/admin/people/{у.id}/act", {"действие": "block", "слова": "рассылка"})
есть(r.status_code == 200 and r.json()["человек"]["заблокирован"], "заблокирован")
есть(ученик.get("/api/auth/me").json()["person"] is None, "открытый сеанс погас сразу")
r = Client(secure=True).post("/api/auth/login", json.dumps({"email": "s@example.com", "password": "четыре-слова-подряд"}), content_type="application/json")
есть(r.status_code == 403 and "заблокирована" in r.json()["error"], "войти не может — и сказано почему")
r = Client(secure=True).post("/api/auth/login", json.dumps({"email": "s@example.com", "password": "не-тот-пароль-совсем"}), content_type="application/json")
есть(r.status_code == 401, "с чужим паролем о блокировке не говорим")
есть([п["почта"] for п in админ.get("/api/admin/people?group=blocked").json()["люди"]] == ["s@example.com"], "в списке заблокированных")
есть(админ.get("/api/admin/people?group=students").json()["люди"] != [] and all(п["почта"] != "s@example.com" for п in админ.get("/api/admin/people?group=students").json()["люди"]), "из учеников ушёл")
шлю(админ, f"/api/admin/people/{у.id}/act", {"действие": "unblock"})
есть(ученик.get("/api/auth/me").json()["person"] is not None, "разблокирован — сеанс снова жив")
есть(шлю(админ, f"/api/admin/people/{я['id']}/act", {"действие": "block", "слова": "x"}).status_code == 400, "себя заблокировать нельзя")

print("\nПароль и почта:")
r = шлю(админ, f"/api/admin/people/{у.id}/act", {"действие": "reset_link"})
ссылка = r.json().get("ссылка", "")
есть(ссылка.startswith("https://flamingo.plus/новый-пароль?ключ="), "ссылка на смену пароля выдана")
ключ = ссылка.split("ключ=")[1]
r = Client(secure=True).post("/api/auth/reset", json.dumps({"key": ключ, "password": "новый-длинный-пароль"}), content_type="application/json")
есть(r.status_code == 200, "по ссылке пароль меняется")
r = Client(secure=True).post("/api/auth/reset", json.dumps({"key": ключ, "password": "ещё-один-пароль-тут"}), content_type="application/json")
есть(r.status_code == 410, "второй раз ссылка не работает")
есть("pass_hash" not in json.dumps(админ.get(f"/api/admin/people/{у.id}").json()) and "argon2" not in админ.get(f"/api/admin/people/{у.id}").content.decode(), "пароль и его отпечаток наружу не уходят")
есть(шлю(админ, f"/api/admin/people/{у.id}/act", {"действие": "email_ok"}).json()["человек"]["почтаПодтверждена"] is True, "почта подтверждена руками")
есть(шлю(админ, f"/api/admin/people/{у.id}/act", {"действие": "note", "слова": "проверено"}).json()["человек"]["заметка"] == "проверено", "заметка сохранена")

print("\nЖурнал и списки:")
журнал = админ.get("/api/admin/log").json()["журнал"]
что = [з["что"] for з in журнал]
есть(all(д in что for д in ("verify", "reject", "block", "unblock", "reset_link", "email_ok", "note")), "каждое действие в журнале")
есть(all(з["кто"] == "owner@example.com" for з in журнал), "в журнале — кто действовал")
есть(Deed.objects.filter(what="block").first().detail == "рассылка", "причина блокировки записана")
есть(not any("ключ=" in json.dumps(з, ensure_ascii=False) for з in журнал), "ссылки на пароль в журнале нет")
есть(шлю(админ, f"/api/admin/people/{у.id}/act", {"действие": "нечто"}).status_code == 400, "неизвестное действие — отказ")
есть(шлю(админ, "/api/admin/people/нет-такого/act", {"действие": "verify"}).status_code == 404, "нет человека — 404")
с = админ.get("/api/admin/summary").json()
есть(с["учителей"] == 2 and с["учеников"] == 2 and с["ждут"] == 0 and с["уроков"] == 1, f"сводка сходится: {с}")
есть(len(админ.get("/api/admin/lessons").json()["уроки"]) == 1, "уроки видны")
есть(админ.get("/api/admin/people?group=teachers&q=марин").json()["люди"][0]["уроков"] == 1, "поиск по имени и счёт уроков")
Person.objects.get(id=у.id).delete()
есть(Deed.objects.filter(whom__contains="s@example.com").exists(), "журнал пережил удаление человека")

print(f"\n{'❌' if бед else '✅'} бед {бед} · проверок {проверок}")
sys.exit(1 if бед else 0)
