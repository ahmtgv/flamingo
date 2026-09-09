"""Прибор для пропуска в комнату. Гоняет живой Django, а не мои представления о нём.

Заведён 08.09, когда владелец решил: пропуск выдаёт сервер, а не функция Cloudflare.
До этого дня путь `/api/room/token` на сервере не звал никто, и потому не был проверен
ничем — а именно ему предстоит стать единственным входом в урок.

Проверяется то, что отличает новый пропуск от старого:
  · код обязан принадлежать настоящему занятию (прежде годилась любая строка вида);
  · имя вошедшего берётся из учётной записи, а не из тела запроса;
  · гость по ссылке входит по-прежнему — это продукт, а не дыра;
  · пустой `LIVEKIT_API_KEY` — отказ словами, а не токен, который облако отклонит.

Запуск из папки `backend`:

    .venv/bin/python room/прогон.py

Работает на отдельной базе в /tmp: боевые данные не трогает и трогать не может.
"""
import os, sys, django, json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["DB_PATH"] = "/tmp/прогон-комната.sqlite3"
os.environ.setdefault("SECRET_KEY", "прибор-комнаты")
Path("/tmp/прогон-комната.sqlite3").unlink(missing_ok=True)
django.setup()

# `django.test.Client` стучится на хост `testserver`; в боевых настройках его нет.
from django.test.utils import setup_test_environment
setup_test_environment()

from django.conf import settings

# 🔴 ПРЕДОХРАНИТЕЛЬ, тот же, что у прибора занятий: до первой записи убеждаемся,
# что база временная. Прибор заводит и удаляет людей и занятия.
db = str(settings.DATABASES["default"]["NAME"])
if not db.startswith("/tmp/"):
    print(f"СТОП. Прибор смотрит не в свою базу: {db}. Ничего не тронуто.")
    sys.exit(2)

from django.core.management import call_command
call_command("migrate", verbosity=0, interactive=False)

from django.core import signing
from django.test import Client
from datetime import date, time

from people.models import Person
from people.session import COOKIE, SALT
from study.models import Lesson

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
    c = Client()
    c.cookies[COOKIE] = signing.dumps({"id": str(person.id)}, salt=SALT)
    return c

def проси(c, room, name="Гость"):
    o = c.post("/api/room/token", data=json.dumps({"room": room, "name": name}),
               content_type="application/json")
    try:
        тело = json.loads(o.content)
    except Exception:
        тело = {"error": "(не JSON)"}
    return o.status_code, тело

# 🔴 Ключи подставляем прямо в настройки: настоящих у прибора нет и быть не должно,
# а проверяем мы не криптографию, а поведение. Подпись проверяет сам LiveKit.
settings.LIVEKIT = {"url": "wss://проба", "api_key": "ключ", "api_secret": "секрет"}

учитель = Person.objects.create(email="u@example.com", name="Мария Петровна", role="teacher")
урок = Lesson.objects.create(teacher=учитель, title="Алгебра", on=date(2026, 9, 10),
                             at=time(10, 0), minutes=45, code="abcd-efgh-jkmn")
гость = Client()

раздел("Код: что вообще принимается")
код, тело = проси(гость, "не-код")
да("строка не того вида — отказ словами", код == 400 and "error" in тело, тело)
да("и в отказе сказано, чего ждали", "три группы" in тело.get("error", ""), тело)

код, тело = проси(гость, "zzzz-zzzz-zzzz")
да("код вида верного, но занятия нет — 404", код == 404, f"{код} {тело}")
да("отказ не подтверждает, что комната есть", "нельзя" not in тело.get("error", "").lower(), тело)
да("и говорит, что делать", "ссылк" in тело.get("error", "").lower(), тело)

раздел("Гость по ссылке — входит, это продукт")
код, тело = проси(гость, "abcd-efgh-jkmn", name="Аня")
да("пропуск выдан", код == 200, f"{код} {тело}")
да("имя — как назвался", тело.get("name") == "Аня", тело)
да("опознаватель есть и он не имя", bool(тело.get("identity")) and тело.get("identity") != "Аня", тело)
да("адрес медиасервера отдан", тело.get("url") == "wss://проба", тело)
первый = тело.get("identity")
код, тело = проси(гость, "abcd-efgh-jkmn", name="Аня")
да("второй Ане — другой опознаватель", тело.get("identity") != первый, тело)

код, тело = проси(гость, "")
да("без имени и без кода — отказ про код", код == 400, f"{код} {тело}")
код, тело = проси(гость, "abcd-efgh-jkmn", name="   ")
да("пустое имя у гостя — отказ словами", код == 400 and "зовут" in тело.get("error", ""), тело)

раздел("Вошедший — имя из учётной записи, а не из запроса")
код, тело = проси(кто(учитель), "abcd-efgh-jkmn", name="Кто угодно")
да("пропуск выдан", код == 200, f"{код} {тело}")
да("имя взято из записи, а не из тела", тело.get("name") == "Мария Петровна", тело)

раздел("Код в верхнем регистре и с пробелами — та же комната")
код, тело = проси(гость, "  ABCD-EFGH-JKMN  ", name="Аня")
да("приведён к нижнему и найден", код == 200, f"{код} {тело}")

раздел("Медиасервер не настроен — отказ словами, а не мёртвый пропуск")
целые = settings.LIVEKIT
for чего, набор in [
    ("нет адреса", {"url": "", "api_key": "ключ", "api_secret": "секрет"}),
    ("нет секрета", {"url": "wss://проба", "api_key": "ключ", "api_secret": ""}),
    ("нет КЛЮЧА — та самая мина", {"url": "wss://проба", "api_key": "", "api_secret": "секрет"}),
]:
    settings.LIVEKIT = набор
    код, тело = проси(гость, "abcd-efgh-jkmn", name="Аня")
    да(f"{чего}: 503 со словами, токена нет",
       код == 503 and "token" not in тело and "LIVEKIT" in тело.get("error", ""), f"{код} {тело}")
    о = гость.get("/api/room/healthz")
    да(f"{чего}: здоровье говорит livekit:false", json.loads(о.content).get("livekit") is False, о.content)
settings.LIVEKIT = целые
о = гость.get("/api/room/healthz")
да("все три на месте — здоровье говорит livekit:true", json.loads(о.content).get("livekit") is True, о.content)

раздел("Чужие методы")
о = гость.get("/api/room/token")
да("GET на выдачу пропуска — 405", о.status_code == 405, о.status_code)

раздел("Снятое занятие пропуск не даёт")
урок.delete()
код, тело = проси(гость, "abcd-efgh-jkmn", name="Аня")
да("урок сняли — комнаты больше нет", код == 404, f"{код} {тело}")

print(f"\n{'❌ НЕ СХОДИТСЯ' if плохо else '✅ всё сходится'} · проверок {всего}"
      + (f", из них плохо {плохо}" if плохо else ""))
sys.exit(1 if плохо else 0)
