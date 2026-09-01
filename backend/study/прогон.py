"""Прибор для журнала и занятий. Гоняет живой Django, а не мои представления о нём.

Каждая проверка отвечает на вопрос «что будет, если человек сделает так?» —
и особенно на вопрос «что будет, если человек сделает так со ЧУЖИМ».

Запуск из папки `backend`:

    .venv/bin/python study/прогон.py

Работает на отдельной базе в /tmp и на отдельной папке пособий: боевые данные
не трогает и трогать не может. Ни одной проверки «на глазок» здесь нет —
каждая либо сходится, либо печатает, чем именно не сошлась.
"""
import os, sys, django, json, shutil
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

ПАПКА = Path("/tmp/прогон-пособия")
shutil.rmtree(ПАПКА, ignore_errors=True)
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["DB_PATH"] = "/tmp/прогон.sqlite3"
os.environ["MEDIA_ROOT"] = str(ПАПКА)
Path("/tmp/прогон.sqlite3").unlink(missing_ok=True)
django.setup()

# 🔴 `django.test.Client` стучится на хост `testserver`. В боевых настройках
# такого хоста в ALLOWED_HOSTS нет и быть не должно — и Django отвечает на всё
# «Bad Request (400)» html-страницей. Обычно это добавляет `manage.py test`,
# но мы гоняем прибор напрямую, поэтому зовём сами.
from django.test.utils import setup_test_environment
setup_test_environment()

from django.conf import settings

# 🔴 ПРЕДОХРАНИТЕЛЬ. Прибор заводит и удаляет людей, занятия и файлы. Если он
# хоть раз попадёт в боевую базу, он её вычистит. Проверяем ДО первой записи,
# что и база, и папка пособий — временные.
db = str(settings.DATABASES["default"]["NAME"])
media = str(settings.MEDIA_ROOT)
if not db.startswith("/tmp/") or not media.startswith("/tmp/"):
    print("СТОП. Прибор смотрит не в свою базу:")
    print(f"  база:    {db}")
    print(f"  пособия: {media}")
    print("Ожидались пути в /tmp. Ничего не тронуто.")
    sys.exit(2)

from django.core.management import call_command
call_command("migrate", verbosity=0, interactive=False)

from django.core import signing
from django.test import Client
from django.utils import timezone
from datetime import timedelta

from people.models import Person
from people.session import COOKIE, SALT
from study.models import Bond, Invite, Lesson, Material, Visit

всего = плохо = 0
def да(что, условие, ещё=""):
    global всего, плохо
    всего += 1
    if условие:
        print(f"  ✅ {что}")
    else:
        плохо += 1
        print(f"  ❌ {что}" + (f"\n       {ещё}" if ещё else ""))

def раздел(имя):
    print(f"\n{имя}")

def кто(person):
    """Клиент, вошедший этим человеком: кладём ту же куку, что кладёт сервер."""
    c = Client()
    c.cookies[COOKIE] = signing.dumps({"id": person.id}, salt=SALT)
    return c

учитель = Person.objects.create(email="t@x.ru", name="Адель", role="teacher", pass_hash="—")
чужой   = Person.objects.create(email="t2@x.ru", name="Пётр", role="teacher", pass_hash="—")
ученик  = Person.objects.create(email="s@x.ru", name="Аня", role="student", pass_hash="—")
ученик2 = Person.objects.create(email="s2@x.ru", name="Тимур", role="student", pass_hash="—")

У, Ч, С, С2 = кто(учитель), кто(чужой), кто(ученик), кто(ученик2)
гость = Client()

# ── занятия ────────────────────────────────────────────────────────────────
раздел("Занятия:")
r = гость.get("/api/study/lessons")
да("без входа занятий не видно", r.status_code == 401 and "войдите" in r.json()["error"].lower())

r = У.post("/api/study/lessons", json.dumps(
    {"название": "  Алгебра   —  корни ", "дата": "2026-09-03", "время": "14:00", "минут": 45}),
    content_type="application/json")
да("занятие заводится", r.status_code == 201, r.content[:200])
урок = r.json()["урок"]
да("имя приведено в порядок", урок["название"] == "Алгебра — корни", урок["название"])
да("код комнаты выдан вместе с уроком", len(урок["код"]) == 14 and урок["код"].count("-") == 2, урок["код"])

r = С.post("/api/study/lessons", json.dumps(
    {"название": "Своё", "дата": "2026-09-03", "время": "14:00"}), content_type="application/json")
да("ученик занятий не заводит", r.status_code == 403)

for тело, ждём in [
    ({"название": "", "дата": "2026-09-03", "время": "14:00"}, "названия"),
    ({"название": "А", "дата": "03.09.2026", "время": "14:00"}, "днём"),
    ({"название": "А", "дата": "2026-02-31", "время": "14:00"}, "не существует"),
    ({"название": "А", "дата": "2026-09-03", "время": "25:00"}, "часами"),
    ({"название": "А", "дата": "2026-09-03", "время": "14:00", "минут": 1}, "от 5 до 480"),
    ({"название": "А", "дата": "2026-09-03", "время": "14:00", "минут": "много"}, "число минут"),
]:
    r = У.post("/api/study/lessons", json.dumps(тело), content_type="application/json")
    да(f"отказ словами: {ждём}", r.status_code == 400 and ждём in r.json()["error"], r.json())

r = Ч.patch(f"/api/study/lessons/{урок['id']}", json.dumps(
    {"название": "Захвачено", "дата": "2026-09-03", "время": "09:00"}),
    content_type="application/json")
да("чужое занятие не правится и отвечает «не найдено»",
   r.status_code == 404 and "у вас нет" in r.json()["error"], r.json())

r = Ч.delete(f"/api/study/lessons/{урок['id']}")
да("чужое занятие не удаляется", r.status_code == 404 and Lesson.objects.filter(id=урок["id"]).exists())

r = У.patch(f"/api/study/lessons/{урок['id']}", json.dumps(
    {"название": "Алгебра — корни", "дата": "2026-09-03", "время": "15:30", "минут": 60}),
    content_type="application/json")
да("своё занятие правится", r.status_code == 200 and r.json()["урок"]["время"] == "15:30", r.json())
да("код комнаты при правке НЕ меняется", r.json()["урок"]["код"] == урок["код"],
   "иначе разосланная ссылка умирает от правки времени")

# ── пособия ────────────────────────────────────────────────────────────────
раздел("Пособия:")
from django.core.files.uploadedfile import SimpleUploadedFile

r = У.post(f"/api/study/lessons/{урок['id']}/materials",
           {"файл": SimpleUploadedFile("Разбор.pdf", b"%PDF-1.4 ...", "application/pdf")})
да("pdf принимается", r.status_code == 201 and r.json()["пособие"]["вид"] == "doc", r.content[:200])
пос = r.json()["пособие"]

r = У.post(f"/api/study/lessons/{урок['id']}/materials",
           {"файл": SimpleUploadedFile("урок.mp4", b"\x00" * 100, "video/mp4")})
да("видео отказывается СЛОВАМИ и предлагает ссылку",
   r.status_code == 400 and "ссылкой" in r.json()["error"], r.json())

r = У.post(f"/api/study/lessons/{урок['id']}/materials",
           {"файл": SimpleUploadedFile("рисунок.svg", b"<svg onload=alert(1)>", "image/svg+xml")})
да("svg не принимается (исполняемая разметка)", r.status_code == 400, r.json())

r = У.post(f"/api/study/lessons/{урок['id']}/materials",
           {"файл": SimpleUploadedFile("стр.html", b"<script>", "text/html")})
да("html не принимается", r.status_code == 400)

r = У.post(f"/api/study/lessons/{урок['id']}/materials", {"url": "ftp://x/y"})
да("ссылка не по http отказывается", r.status_code == 400 and "http" in r.json()["error"])

r = У.post(f"/api/study/lessons/{урок['id']}/materials",
           {"url": "https://rutube.ru/video/1", "имя": "Опыт Резерфорда"})
да("ссылка на видео принимается", r.status_code == 201 and r.json()["пособие"]["вид"] == "link")

r = Ч.post(f"/api/study/lessons/{урок['id']}/materials", {"url": "https://x.ru"})
да("в чужое занятие пособие не положить", r.status_code == 404)

# файл на диске лежит под своим случайным именем, а не под именем человека
m = Material.objects.get(id=пос["id"])
да("на диске имя своё, случайное", "Разбор" not in m.path and m.path.endswith(".pdf"), m.path)
да("файл правда записан", (ПАПКА / m.path).exists())

раздел("Кто может смотреть файл:")
r = У.get(f"/api/study/file/{пос['id']}")
да("преподаватель видит свой файл", r.status_code == 200)
да("заголовок nosniff стоит", r.headers.get("X-Content-Type-Options") == "nosniff")
да("CSP sandbox стоит", "sandbox" in r.headers.get("Content-Security-Policy", ""))

r = С.get(f"/api/study/file/{пос['id']}")
да("посторонний ученик файла НЕ видит", r.status_code == 404, r.status_code)

# ── приглашение ────────────────────────────────────────────────────────────
раздел("Приглашение ученика:")
r = У.post("/api/study/invites", json.dumps({}), content_type="application/json")
да("ссылка выдана", r.status_code == 201 and "/у/" in r.json()["ссылка"], r.content[:200])
ключ = r.json()["ссылка"].rsplit("/", 1)[1]
да("в базе лежит отпечаток, а не сам ключ",
   not Invite.objects.filter(token_hash=ключ).exists() and Invite.objects.count() == 1)

r = гость.get(f"/api/study/invites/{ключ}")
да("по ссылке видно, кто зовёт", r.status_code == 200 and r.json()["зовёт"] == "Адель")

r = гость.post(f"/api/study/invites/{ключ}")
да("без учётной записи принять нельзя, и сказано почему",
   r.status_code == 401 and "заведите" in r.json()["error"])

r = У.post(f"/api/study/invites/{ключ}")
да("своя же ссылка не принимается собой", r.status_code == 400 and "собственная" in r.json()["error"])

r = С.post(f"/api/study/invites/{ключ}")
да("ученик принят", r.status_code == 200 and r.json()["учитель"] == "Адель", r.content[:200])
да("связь создана", Bond.objects.filter(teacher=учитель, student=ученик).exists())

r = С2.post(f"/api/study/invites/{ключ}")
да("ссылка ОДНОРАЗОВАЯ: второй по ней не пройдёт", r.status_code == 404, r.status_code)
да("второй связи не появилось", not Bond.objects.filter(teacher=учитель, student=ученик2).exists())

# протухание
r = У.post("/api/study/invites", json.dumps({}), content_type="application/json")
ключ2 = r.json()["ссылка"].rsplit("/", 1)[1]
inv = Invite.objects.exclude(used_at__isnull=False).first()
Invite.objects.filter(pk=inv.pk).update(made_at=timezone.now() - timedelta(days=8))
r = гость.get(f"/api/study/invites/{ключ2}")
да("ссылка старше семи дней не работает", r.status_code == 404 and "семь дней" in r.json()["error"])

r = гость.get("/api/study/invites/выдуманный-ключ")
да("выдуманная ссылка отвечает так же, как протухшая", r.status_code == 404)

# почта
r = У.post("/api/study/invites", json.dumps({"почта": "нет-такой@x.ru"}),
           content_type="application/json")
сказано_нет = r.json()["сказать"]
r = У.post("/api/study/invites", json.dumps({"почта": "s@x.ru"}), content_type="application/json")
да("ответ ОДИН И ТОТ ЖЕ для знакомой и незнакомой почты",
   r.json()["сказать"] == сказано_нет, f"{сказано_нет!r} vs {r.json()['сказать']!r}")

r = С.post("/api/study/invites", json.dumps({}), content_type="application/json")
да("ученик не зовёт учеников", r.status_code == 403)

# ── посещения ──────────────────────────────────────────────────────────────
раздел("Посещения:")
код = урок["код"]
r = С.post("/api/study/visits", json.dumps({"код": код}), content_type="application/json")
да("ученик отмечается по коду комнаты", r.status_code == 200 and r.json()["отмечен"] is True, r.content[:200])
r = С.post("/api/study/visits", json.dumps({"код": код}), content_type="application/json")
да("второй вход не даёт второго посещения", Visit.objects.filter(lesson_id=урок["id"]).count() == 1)
r = У.post("/api/study/visits", json.dumps({"код": код}), content_type="application/json")
да("преподаватель себе посещение не ставит", r.json()["отмечен"] is False and "ваш урок" in r.json()["почему"])
r = гость.post("/api/study/visits", json.dumps({"код": код}), content_type="application/json")
да("гость без записи не отмечается и это сказано", r.json()["отмечен"] is False and "учётной" in r.json()["почему"])
r = С.post("/api/study/visits", json.dumps({"код": "pq4m-hk73-xwz2"}), content_type="application/json")
да("комната без занятия — не ошибка", r.status_code == 200 and r.json()["отмечен"] is False)
r = С.post("/api/study/visits", json.dumps({"код": "мусор"}), content_type="application/json")
да("мусор вместо кода — отказ словами", r.status_code == 400)

# ── журнал ─────────────────────────────────────────────────────────────────
раздел("Журнал:")
r = С.get("/api/study/journal")
да("ученику журнала не дают", r.status_code == 403 and "преподаватель" in r.json()["error"])

r = У.get("/api/study/journal?month=2026-09")
ж = r.json()
да("журнал отдаётся", r.status_code == 200, r.content[:200])
да("в журнале один ученик", len(ж["ученики"]) == 1 and ж["ученики"][0]["имя"] == "Аня", ж["ученики"])
да("посещение видно строкой", ж["ученики"][0]["был"] == [True], ж["ученики"][0])
да("уроков за сентябрь один", len(ж["уроки"]) == 1, ж["уроки"])
да("ждущие приглашения показаны", len(ж["ждут"]) == 2, ж["ждут"])

r = Ч.get("/api/study/journal?month=2026-09")
да("чужой журнал пуст, а не чужой", r.json()["ученики"] == [] and r.json()["уроки"] == [])

r = У.get("/api/study/journal?month=2026-10")
да("в другом месяце уроков нет", r.json()["уроки"] == [])
r = У.get("/api/study/journal?month=враньё")
да("кривой месяц не роняет", r.status_code == 200)
r = У.get("/api/study/journal?month=0000-99")
да("невозможный месяц не роняет", r.status_code == 200)

# ── что видит ученик ───────────────────────────────────────────────────────
раздел("Что видит ученик:")
r = С.get("/api/study/lessons?month=2026-09")
да("ученик видит занятие своего преподавателя", len(r.json()["уроки"]) == 1)
r = С2.get("/api/study/lessons?month=2026-09")
да("посторонний ученик занятий не видит", r.json()["уроки"] == [])
r = С.get("/api/study/teachers")
да("свои преподаватели перечислены", [t["имя"] for t in r.json()["преподаватели"]] == ["Адель"])
r = С.get(f"/api/study/file/{пос['id']}")
да("свой ученик файл ВИДИТ", r.status_code == 200, r.status_code)

# ── занятие по коду комнаты ────────────────────────────────────────────────
раздел("Комната знает своё занятие:")
r = У.get(f"/api/study/rooms/{код}")
да("преподаватель получает своё занятие по коду", r.status_code == 200, r.status_code)
да("и знает, что ведёт его", r.json().get("веду") is True, r.json().get("веду"))
да("пособия приезжают вместе с занятием",
   len(r.json()["урок"]["материалы"]) >= 1, r.json()["урок"]["материалы"])

r = С.get(f"/api/study/rooms/{код}")
да("свой ученик занятие тоже видит", r.status_code == 200, r.status_code)
да("но ведущим себя не считает", r.json().get("веду") is False, r.json().get("веду"))

r = С2.get(f"/api/study/rooms/{код}")
да("посторонний получает «нет такого», а не «нельзя»", r.status_code == 404, r.status_code)
r = гость.get(f"/api/study/rooms/{код}")
да("гость без учётной записи — 401", r.status_code == 401, r.status_code)
r = У.get("/api/study/rooms/pq4m-hk73-xwz2")
да("код без занятия — 404 словами", r.status_code == 404 and "error" in r.json(), r.status_code)
r = У.get("/api/study/rooms/враньё")
да("кривой код — отказ словами, а не падение", r.status_code == 400, r.status_code)
r = У.post(f"/api/study/rooms/{код}")
да("чужой метод — 405 со словами", r.status_code == 405 and "error" in r.json(), r.status_code)

# ── уборка ─────────────────────────────────────────────────────────────────
раздел("Уборка:")
путь = ПАПКА / m.path
r = У.delete(f"/api/study/lessons/{урок['id']}")
да("занятие удаляется", r.status_code == 200 and not Lesson.objects.filter(id=урок["id"]).exists())
да("файл пособия ушёл с диска вместе с занятием", not путь.exists(), путь)
да("посещения ушли следом", Visit.objects.count() == 0)

print(f"\n{'✅ всё сходится' if not плохо else f'❌ бед {плохо}'} · проверок {всего}")
sys.exit(1 if плохо else 0)
