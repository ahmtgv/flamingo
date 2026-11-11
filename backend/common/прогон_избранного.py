"""Прибор для избранного «Источников мира» и для проверки рамок.

Запуск из папки `backend`:

    .venv/bin/python common/прогон_избранного.py

Отдельная база в /tmp, боевые данные не трогает и трогать не может.
"""
import os, sys, django, json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["DB_PATH"] = "/tmp/прогон-избранное.sqlite3"
os.environ["MEDIA_ROOT"] = "/tmp/прогон-избранное-файлы"
os.environ.pop("SESSION_COOKIE_DOMAIN", None)
Path("/tmp/прогон-избранное.sqlite3").unlink(missing_ok=True)
django.setup()

from django.test.utils import setup_test_environment
setup_test_environment()

from django.conf import settings

db = str(settings.DATABASES["default"]["NAME"])
if not db.startswith("/tmp/"):
    print(f"СТОП. Прибор смотрит не в свою базу: {db}. Ожидался путь в /tmp. Ничего не тронуто.")
    sys.exit(2)

from django.core.management import call_command
call_command("migrate", verbosity=0, interactive=False)

from django.test import Client
from common import views, рамки
from people.models import Person, Star

settings.ALLOWED_HOSTS = ["*"]
settings.MEDIA_ROOT = "/tmp/прогон-избранное-файлы"

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


def вошёл(почта, имя):
    к = Client(secure=True)
    r = к.post("/api/auth/register", json.dumps({"email": почта, "name": имя, "role": "student",
                                                  "password": "четыре-слова-подряд"}),
               content_type="application/json")
    assert r.status_code == 200, r.content
    return к


def положить(к, список):
    return к.put("/api/hub/stars", json.dumps({"избранное": список}), content_type="application/json")


print("\nИзбранное")
гость = Client(secure=True)
есть(гость.get("/api/hub/stars").status_code == 401, "гостю — «сначала войдите»")
есть(положить(гость, ["met"]).status_code == 401, "гость ничего не кладёт")

каталог = sorted(views._все_источники())
есть(len(каталог) > 40 and "met" in каталог, f"каталог читается: {len(каталог)} источников")

аня = вошёл("a@example.com", "Аня")
есть(аня.get("/api/hub/stars").json() == {"избранное": []}, "у нового человека избранное пусто")
r = положить(аня, ["met", "apod", "met", "нет-такого", 7, "hubble"])
есть(r.status_code == 200 and r.json()["избранное"] == ["met", "apod", "hubble"],
     f"кладётся в порядке добавления, без повторов и чужих имён: {r.json()}")
есть(аня.get("/api/hub/stars").json()["избранное"] == ["met", "apod", "hubble"], "читается тем же списком")
r = положить(аня, ["hubble"])
есть(аня.get("/api/hub/stars").json()["избранное"] == ["hubble"], "новый список заменяет старый целиком")
есть(положить(аня, "met").status_code == 400, "не список — отказ")
есть(аня.post("/api/hub/stars", "{}", content_type="application/json").status_code == 405, "другим способом — отказ")

тимур = вошёл("t@example.com", "Тимур")
положить(тимур, ["apod"])
есть(аня.get("/api/hub/stars").json()["избранное"] == ["hubble"]
     and тимур.get("/api/hub/stars").json()["избранное"] == ["apod"], "у каждого своё избранное")
r = положить(аня, каталог * 5)
есть(len(r.json()["избранное"]) == len(каталог), "длинный список с повторами сводится к каталогу")
Person.objects.get(email="a@example.com").delete()
есть(not Star.objects.exclude(person__email="t@example.com").exists(), "ушёл человек — ушло и его избранное")

print("\nРамки: что сайт объявил о показе внутри чужой страницы")
п = рамки.по_заголовкам
есть(п("", "")[0] == "можно", "ничего не объявлено — можно")
есть(п("SAMEORIGIN", "")[0] == "нельзя", "X-Frame-Options: SAMEORIGIN — нельзя")
есть(п("deny", "")[0] == "нельзя", "X-Frame-Options: DENY — нельзя")
есть(п("SAMEORIGIN", "default-src 'self'; frame-ancestors 'self' https://metropolitan.sharepoint.com")[0] == "нельзя",
     "как у Метрополитен-музея — нельзя")
есть(п("", "frame-ancestors 'none'")[0] == "нельзя", "frame-ancestors 'none' — нельзя")
есть(п("SAMEORIGIN", "frame-ancestors *")[0] == "можно", "frame-ancestors * главнее X-Frame-Options — можно")
есть(п("", "frame-ancestors https://flamingo.plus")[0] == "можно", "нас назвали по имени — можно")
есть(п("", "script-src 'self'")[0] == "можно", "CSP без frame-ancestors — можно")

корень = Path(settings.MEDIA_ROOT)
рамки.записать(корень, {"met": {"рамка": "нельзя", "почему": "проба"}, "apod": {"рамка": "можно", "почему": ""}})
есть(рамки.прочесть(корень)["met"]["рамка"] == "нельзя", "итог проверки пишется и читается")
о = гость.get("/api/hub/previews").json()
есть(о.get("без_рамки") == ["met"], f"витрина узнаёт, кто запрещает рамку: {о.get('без_рамки')}")

print("\nИзменения — только со своих страниц")
settings.CORS_ALLOWED_ORIGINS = ["https://flamingo.plus"]
def с(откуда):
    ш = {"HTTP_ORIGIN": откуда} if откуда else {}
    return тимур.put("/api/hub/stars", json.dumps({"избранное": ["apod"]}), content_type="application/json", **ш).status_code
есть(с("https://flamingo.plus") == 200, "со своей страницы — можно")
есть(с("https://hub.flamingo.plus") == 403, "со страницы посредника — нельзя")
есть(с("https://evil.example") == 403 and с("null") == 403, "с чужой страницы — нельзя")
есть(с(None) == 200, "не из браузера (без Origin) — как раньше")
есть(тимур.get("/api/hub/stars", HTTP_ORIGIN="https://hub.flamingo.plus").status_code == 200,
     "чтение не трогаем: его держит CORS")

print(f"\n{'❌' if бед else '✅'} бед {бед} · проверок {проверок}")
sys.exit(1 if бед else 0)
