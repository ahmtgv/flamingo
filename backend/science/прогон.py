"""Прибор для приёма записей исследования. Гоняет живой Django на временной базе.

Каждая проверка отвечает на вопрос «что будет, если страница (или кто-то
вместо неё) сделает так?» — и особенно «если сделает так с ЧУЖОЙ проверкой».

Запуск из папки `backend`:

    .venv/bin/python science/прогон.py

Отдельная база и отдельная папка записей в /tmp: боевые не трогает и тронуть
не может — предохранитель ниже останавливает прогон до первой записи.
"""
import io, json, os, re, shutil, sys, tarfile
from pathlib import Path

import django

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

ПАПКА = Path("/tmp/прогон-наука")
shutil.rmtree(ПАПКА, ignore_errors=True)
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["DB_PATH"] = "/tmp/прогон-наука.sqlite3"
os.environ["SCIENCE_ROOT"] = str(ПАПКА)
os.environ["CORS_ALLOWED_ORIGINS"] = "https://flamingo.plus"
# 🔴 ЗАПАС МЕСТА — НЕ ДЛЯ ПРИБОРА. Сервер не пишет записи, если на диске меньше
# 3 ГБ, а прибор пишет свои куски в /tmp, который на сервере — маленький диск в
# памяти (982 МБ, 06.10). Тогда падали 17 проверок разом, хотя записям места
# хватало: на основном диске 27 ГБ. Запас прибора — ноль; сама остановка при
# нехватке места проверяется ниже отдельно, подменой запаса на заведомо больший.
os.environ["SCIENCE_FREE_MIN_GB"] = "0"
Path("/tmp/прогон-наука.sqlite3").unlink(missing_ok=True)
django.setup()

from django.test.utils import setup_test_environment
setup_test_environment()

from django.conf import settings

db = str(settings.DATABASES["default"]["NAME"])
root = str(settings.SCIENCE_ROOT)
if not db.startswith("/tmp/") or not root.startswith("/tmp/"):
    print("СТОП. Прибор смотрит не в свою базу:")
    print(f"  база:    {db}")
    print(f"  записи:  {root}")
    print("Ожидались пути в /tmp. Ничего не тронуто.")
    sys.exit(2)

from django.core.management import call_command
call_command("migrate", verbosity=0, interactive=False)

from django.test import Client

from science import views, хранилище
from science.models import Run, Volunteer

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

c = Client()
def get(путь): return c.get(путь)
def post(путь, тело): return c.post(путь, json.dumps(тело), content_type="application/json")
def put(путь, данные, тип="application/octet-stream"):
    return c.generic("PUT", путь, данные, content_type=тип)

раздел("Ссылка добровольца")

вывод = io.StringIO()
call_command("наука_участник", "мама", stdout=вывод)
строка = вывод.getvalue().strip()
m = re.search(r"https://flamingo\.plus/наука/([a-z2-9]{12})$", строка)
да("команда выдаёт ссылку flamingo.plus/наука/<код>", bool(m), строка)
код = m.group(1) if m else ""
в = Volunteer.objects.get(code=код)
да("пометка «мама» сохранена у нас", в.label == "мама")

вывод = io.StringIO()
call_command("наука_участник", "Ивановы", "--сколько", "3", stdout=вывод)
да("--сколько 3 — три разные ссылки", len(set(re.findall(r"/наука/([a-z2-9]{12})", вывод.getvalue()))) == 3, вывод.getvalue())
чужой = Volunteer.objects.filter(label="Ивановы · 1").first().code

r = get("/api/science/v/zzzzzzzzzzzz")
да("неизвестный код — 404 со словами", r.status_code == 404 and "Ссылка не найдена" in r.json().get("error", ""), r.content)
r = get("/api/science/v/..%2F..%2Fetc")
да("код из чужих знаков — 404", r.status_code == 404)
r = get(f"/api/science/v/{код}")
да("свой код — ответ без пометки «кто это»", r.status_code == 200 and "мама" not in r.content.decode(), r.content)
да("…согласия ещё нет, проверок нет", r.json() == {"имя": None, "согласие": None, "анкета": None, "проверки": []}, r.json())

раздел("Общая ссылка — одна на всех")

вывод = io.StringIO()
call_command("наука_ссылка", stdout=вывод)
м = re.search(r"https://flamingo\.plus/наука/вход-([a-z2-9]{8})", вывод.getvalue())
да("наука_ссылка печатает flamingo.plus/наука/вход-<секрет>", bool(м), вывод.getvalue())
токен = м.group(1) if м else ""
вывод = io.StringIO()
call_command("наука_ссылка", stdout=вывод)
да("повторный вызов — та же ссылка, а не новая", f"вход-{токен}" in вывод.getvalue(), вывод.getvalue())
r = get(f"/api/science/join/{токен}")
да("живая ссылка — 200", r.status_code == 200, r.content)
r = get("/api/science/join/zzzzzzzz")
да("неизвестный секрет — 404 со словами", r.status_code == 404 and "не действует" in r.json()["error"], r.content)
r = get("/api/science/join/..%2F..%2Fetc")
да("секрет из чужих знаков — 404", r.status_code == 404)
r = post(f"/api/science/join/{токен}", {"имя": "   "})
да("без имени не войти — 400 со словами", r.status_code == 400 and "как вас зовут" in r.json()["error"], r.content)
r = post(f"/api/science/join/{токен}", {"имя": "  Мама \n Адели  "})
да("назвался — 201 и свой код", r.status_code == 201 and bool(хранилище.CODE.match(r.json().get("код", ""))), r.content)
код_мамы = r.json().get("код", "")
да("…имя сложено в одну строку", r.json().get("имя") == "Мама Адели", r.json())
r2 = post(f"/api/science/join/{токен}", {"имя": "Мама Адели"})
да("то же имя второй раз — другой код: люди не склеиваются", r2.status_code == 201 and r2.json()["код"] != код_мамы, r2.content)
r = get(f"/api/science/v/{код_мамы}")
да("по своему коду человек видит своё имя", r.status_code == 200 and r.json()["имя"] == "Мама Адели", r.content)
мама = Volunteer.objects.get(code=код_мамы)
да("пометка для нас — то же имя, и видно, по какой ссылке пришёл", мама.label == "Мама Адели" and мама.invite_id == токен)
r = post(f"/api/science/join/{токен}", {"имя": "Я" * 300})
да("длинное имя обрезано до 60 знаков", r.status_code == 201 and len(r.json()["имя"]) == 60)
было = views.НОВЫХ_В_ЧАС
views.НОВЫХ_В_ЧАС = 3
r = post(f"/api/science/join/{токен}", {"имя": "Лишний"})
да("слишком много новых за час — 429 словами", r.status_code == 429 and "за час" in r.json()["error"], r.content)
views.НОВЫХ_В_ЧАС = было
вывод = io.StringIO()
call_command("наука_ссылка", "--новая", stdout=вывод)
новый = re.search(r"вход-([a-z2-9]{8})", вывод.getvalue())
да("--новая — другая ссылка и слова о погашенной", bool(новый) and новый.group(1) != токен and "погашено: 1" in вывод.getvalue(), вывод.getvalue())
r = post(f"/api/science/join/{токен}", {"имя": "Опоздавший"})
да("по погашенной ссылке не войти", r.status_code == 404)
r = get(f"/api/science/v/{код_мамы}")
да("…а кто вошёл раньше, остался со своим кодом", r.status_code == 200)

раздел("Согласие и анкета")

r = post(f"/api/science/v/{код}/runs", {"вид": "взгляд"})
да("без согласия проверку не начать — 403", r.status_code == 403, r.content)
r = post(f"/api/science/v/{код}/consent", {"версия": "1999-01-01"})
да("чужая версия согласия — отказ", r.status_code == 400)
r = post(f"/api/science/v/{код}/consent", {
    "версия": "2026-10-06",
    "анкета": {"возраст": "41", "очки": "иногда", "пароль": "секрет", "заметка": "я" * 900},
})
да("согласие принято", r.status_code == 200 and r.json()["согласие"] == "2026-10-06", r.content)
в.refresh_from_db()
да("в анкету попало только спрошенное — «пароль» отброшен", "пароль" not in в.profile and в.profile.get("возраст") == "41", в.profile)
да("длинная заметка обрезана до 500 знаков", len(в.profile.get("заметка", "")) == 500)
vj = ПАПКА / код / "volunteer.json"
да("volunteer.json лежит рядом с записями", vj.exists() and json.loads(vj.read_text())["согласие"] == "2026-10-06")

r = post(f"/api/science/v/{код_мамы}/profile", {"анкета": {"возраст": "60"}})
да("анкету без согласия не принять — 403", r.status_code == 403, r.content)
r = post(f"/api/science/v/{код}/profile", {"анкета": {"возраст": "42", "очки": "нет", "лишнее": "x"}})
да("анкета отдельно от согласия — принята, лишнее отброшено", r.status_code == 200 and r.json()["анкета"] == {"возраст": "42", "очки": "нет"}, r.content)
в.refresh_from_db()
да("…согласие от анкеты не сбилось", в.consent == "2026-10-06")
да("…и volunteer.json переписан", json.loads(vj.read_text())["анкета"].get("возраст") == "42")

раздел("Проверка: начало")

r = post(f"/api/science/v/{код}/runs", {"вид": "сломать"})
да("неизвестный вид проверки — отказ", r.status_code == 400)
r = post(f"/api/science/v/{код}/runs", {"вид": "настройка", "протокол": "настройка-1"})
да("новая проверка «настройка» принимается", r.status_code == 201, r.content)
Run.objects.filter(id=r.json().get("id")).delete()
r = post(f"/api/science/v/{код}/runs", {
    "вид": "взгляд", "протокол": "взгляд-1",
    "перед": {"сонливость": "3", "свет": "лампа", "спрошено": "2026-10-06T18:40:00.000Z", "лишнее": "x"},
    "устройство": {"браузер": "тест", "экран": [1440, 900]},
})
да("проверка начата — 201 и id", r.status_code == 201 and re.match(хранилище.RUN, r.json().get("id", "")), r.content)
run = r.json()["id"]
meta = ПАПКА / код / run / "meta.json"
да("meta.json записан сразу", meta.exists() and json.loads(meta.read_text())["вид"] == "взгляд")
да("«перед» — только спрошенное, и когда спросили", json.loads(meta.read_text())["перед"] == {"сонливость": "3", "свет": "лампа", "спрошено": "2026-10-06T18:40:00.000Z"}, meta.read_text())

раздел("Куски записи")

база = f"/api/science/v/{код}/runs/{run}"
видео = os.urandom(300_000)
r = put(f"{база}/video/0", видео, "video/webm;codecs=vp8,opus")
да("видео принято", r.status_code == 200 and r.json()["принято"] == "video-000000.webm", r.content)
f = ПАПКА / код / run / "video-000000.webm"
да("…и лежит на диске байт в байт", f.exists() and f.read_bytes() == видео)
r = put(f"{база}/frames/0", b"\x1f\x8b" + os.urandom(1000))
да("кадры — .fr.gz", r.status_code == 200 and r.json()["принято"] == "frames-000000.fr.gz", r.content)
r = put(f"{база}/events/0", "{\"t\":1,\"что\":\"подсказка\"}\n".encode(), "application/x-ndjson")
да("события — .ndjson", r.status_code == 200 and r.json()["принято"] == "events-000000.ndjson", r.content)
r = put(f"{база}/audio/3", os.urandom(5000), "audio/mp4")
да("звук из Safari — .mp4", r.status_code == 200 and r.json()["принято"] == "audio-000003.mp4", r.content)
р = Run.objects.get(id=run)
да("счёт кусков и байт ведётся", р.chunks == 4 and р.bytes == 300_000 + 1002 + len("{\"t\":1,\"что\":\"подсказка\"}\n".encode()) + 5000, (р.chunks, р.bytes))

повтор = os.urandom(200_000)
r = put(f"{база}/video/0", повтор, "video/webm")
р.refresh_from_db()
да("повтор куска заменяет его, а не дублирует", r.status_code == 200 and f.read_bytes() == повтор and р.chunks == 4, (р.chunks,))
да("…и байты пересчитаны по новой длине", р.bytes == 200_000 + 1002 + len("{\"t\":1,\"что\":\"подсказка\"}\n".encode()) + 5000, р.bytes)

r = put(f"{база}/secret/0", b"x")
да("чужой вид куска — отказ", r.status_code == 400)
r = put(f"{база}/video/1000000", b"x")
да("номер вне пределов — отказ", r.status_code == 400)
r = put(f"{база}/video/-1", b"x")
да("отрицательный номер не проходит даже в разбор пути", r.status_code == 404)
r = put(f"{база}/video/5", b"")
да("пустой кусок — отказ", r.status_code == 413 and "Пустой" in r.json()["error"], r.content)
r = c.get(f"{база}/video/0")
да("GET на кусок — 405, отдавать записи наружу некому", r.status_code == 405)

r = put(f"/api/science/v/{чужой}/runs/{run}/video/9", b"chuzhoe")
да("чужой код с моей проверкой — «нет такой проверки»", r.status_code == 404)
да("…и на диске у чужого ничего не появилось", not (ПАПКА / чужой).exists())
r = put(f"/api/science/v/{код}/runs/00000000-0000-0000-0000-000000000000/video/0", b"x")
да("несуществующая проверка — 404", r.status_code == 404)
r = put(f"/api/science/v/{код}/runs/..%2F..%2Fetc/video/0", b"x")
да("id проверки с ../ — 404", r.status_code == 404)

раздел("Два куска разом")

import threading
from django.db import connection
р.refresh_from_db()
до = (р.chunks, р.bytes)
ошибки = []
def залить(n):
    try:
        cc = Client()
        rr = cc.generic("PUT", f"{база}/frames/{n}", os.urandom(2000), content_type="application/octet-stream")
        if rr.status_code != 200:
            ошибки.append(rr.status_code)
    except Exception as e:  # pragma: no cover
        ошибки.append(str(e))
    finally:
        connection.close()
потоки = [threading.Thread(target=залить, args=(100 + i,)) for i in range(8)]
for п in потоки: п.start()
for п in потоки: п.join()
р.refresh_from_db()
да("восемь кусков одновременно — все восемь в счёте", not ошибки and р.chunks == до[0] + 8 and р.bytes == до[1] + 8 * 2000, (ошибки, до, р.chunks, р.bytes))

раздел("Потолки")

было = хранилище.КУСОК_МАКС
хранилище.КУСОК_МАКС = 100_000
r = put(f"{база}/video/7", os.urandom(150_000))
да("кусок больше потолка — 413 словами", r.status_code == 413 and "слишком большой" in r.json()["error"], r.content)
да("…и не оставил ни куска, ни временного файла", not (ПАПКА / код / run / "video-000007.webm").exists()
   and not any(p.name.startswith(".кусок-") for p in (ПАПКА / код / run).iterdir()))
хранилище.КУСОК_МАКС = было

было = views.ПРОВЕРКА_МАКС
р.refresh_from_db()
views.ПРОВЕРКА_МАКС = р.bytes + 50_000
r = put(f"{база}/video/8", os.urandom(40_000))
да("в пределах проверки — принято", r.status_code == 200)
r = put(f"{база}/video/9", os.urandom(40_000))
да("сверх потолка проверки — 413", r.status_code == 413 and "слишком большая" in r.json()["error"], r.content)
r = put(f"{база}/video/8", os.urandom(45_000))
да("замена куска считается по разнице, а не заново", r.status_code == 200, r.content)
views.ПРОВЕРКА_МАКС = было

было = хранилище.ЗАПАС
хранилище.ЗАПАС = 10 ** 18
r = put(f"{база}/video/10", os.urandom(1000))
да("на диске кончается место — запись остановлена словами", r.status_code == 413 and "кончается место" in r.json()["error"], r.content)
хранилище.ЗАПАС = было

было = views.ДОБРОВОЛЕЦ_МАКС
views.ДОБРОВОЛЕЦ_МАКС = 1
r = post(f"/api/science/v/{код}/runs", {"вид": "сон"})
да("у добровольца слишком много записей — новую не начать", r.status_code == 413, r.content)
views.ДОБРОВОЛЕЦ_МАКС = было

раздел("Конец проверки")

r = post(f"{база}/finish", {"итог": {"кадров": 2900, "кусков": 12}})
да("проверка закончена", r.status_code == 200, r.content)
р.refresh_from_db()
первое = р.finished
да("…время конца и итог сохранены", первое is not None and р.summary.get("кадров") == 2900)
да("…и meta.json дописан итогом", json.loads(meta.read_text())["итог"]["кадров"] == 2900)
post(f"{база}/finish", {"итог": {"кадров": 1}})
р.refresh_from_db()
да("повторный «конец» не сдвигает время конца", р.finished == первое)
r = get(f"/api/science/v/{код}")
да("в списке проверок — закончена", r.json()["проверки"][0]["закончена"] is not None, r.json())
да("…и не прервана: дошла до конца", r.json()["проверки"][0]["прервана"] is False, r.json())
r = post(f"/api/science/v/{код}/runs", {"вид": "чтение"})
стоп = r.json()["id"]
post(f"/api/science/v/{код}/runs/{стоп}/finish", {"итог": {"прервано": True, "кусков": 3}})
r = get(f"/api/science/v/{код}")
остановленная = next(п for п in r.json()["проверки"] if п["id"] == стоп)
да("остановленная проверка — «прервана»: запись есть, значка нет", остановленная["прервана"] is True and остановленная["закончена"] is not None, остановленная)
r = post(f"/api/science/v/{чужой}/runs/{run}/finish", {"итог": {}})
да("закончить чужую проверку нельзя — 404", r.status_code == 404)

раздел("Связь с сайтом (CORS)")

r = c.options(f"{база}/video/11", HTTP_ORIGIN="https://flamingo.plus", HTTP_ACCESS_CONTROL_REQUEST_METHOD="PUT",
              HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type")
да("предзапрос с flamingo.plus пропускает PUT", r.status_code == 200 and "PUT" in r.get("Access-Control-Allow-Methods", ""), dict(r.headers))
r = c.options(f"{база}/video/11", HTTP_ORIGIN="https://zloy.example", HTTP_ACCESS_CONTROL_REQUEST_METHOD="PUT")
да("чужому сайту — без разрешения", "Access-Control-Allow-Origin" not in r.headers)

раздел("Выгрузка и список")

вывод = io.StringIO()
call_command("наука_выгрузка", stdout=вывод)
путь = re.search(r"Готово: (\S+\.tgz)", вывод.getvalue())
да("архив собран", bool(путь), вывод.getvalue())
if путь:
    with tarfile.open(путь.group(1)) as t:
        имена = t.getnames()
        участники = json.loads(t.extractfile("наука/участники.json").read())
    да("в архиве участники с пометками", участники.get(код, {}).get("пометка") == "мама", участники)
    да("…согласие, meta и все куски", f"наука/{код}/volunteer.json" in имена
       and f"наука/{код}/{run}/meta.json" in имена and f"наука/{код}/{run}/video-000000.webm" in имена
       and f"наука/{код}/{run}/frames-000000.fr.gz" in имена, имена)
вывод = io.StringIO()
call_command("наука_выгрузка", "--без-видео", stdout=вывод)
путь = re.search(r"Готово: (\S+\.tgz)", вывод.getvalue())
if путь:
    with tarfile.open(путь.group(1)) as t:
        имена = t.getnames()
    да("--без-видео: кадры есть, видео и звука нет", f"наука/{код}/{run}/frames-000000.fr.gz" in имена
       and not any("/video-" in и or "/audio-" in и for и in имена), имена)
else:
    да("--без-видео: архив собран", False, вывод.getvalue())
вывод = io.StringIO()
call_command("наука_выгрузка", "--с", "2999-01-01", stdout=вывод)
да("--с будущего дня — проверок 0", "проверок 0" in вывод.getvalue(), вывод.getvalue())
вывод = io.StringIO()
call_command("наука_список", stdout=вывод)
да("список: мама, согласие есть, пройдена одна, остановлена одна", re.search(rf"{код}\s+мама\s+согласие есть\s+проверок 2 \(закончено 1, остановлено 1\).*взгляд×1, чтение×1", вывод.getvalue()) is not None, вывод.getvalue())

раздел("Удаление по просьбе")

вывод = io.StringIO()
call_command("наука_удалить", код, stdout=вывод)
да("без --да-удалить — только показ, ничего не тронуто", "Ничего не удалено" in вывод.getvalue()
   and (ПАПКА / код).exists() and Volunteer.objects.filter(code=код).exists(), вывод.getvalue())
вывод = io.StringIO()
call_command("наука_удалить", код, "--да-удалить", stdout=вывод)
да("с --да-удалить — нет ни папки, ни строк в базе", not (ПАПКА / код).exists()
   and not Volunteer.objects.filter(code=код).exists() and not Run.objects.filter(volunteer_id=код).exists(), вывод.getvalue())
да("…и напоминает про старые выгрузки", "остались в прежних выгрузках" in вывод.getvalue(), вывод.getvalue())
да("чужой доброволец цел", Volunteer.objects.filter(code=чужой).exists())
try:
    call_command("наука_удалить", "../../etc", stdout=io.StringIO())
    да("код с ../ — отказ", False)
except Exception as e:
    да("код с ../ — отказ", "не код" in str(e), str(e))

print(f"\n{'❌ бед ' + str(плохо) if плохо else '✅ всё сходится'} · проверок {всего}\n")
sys.exit(1 if плохо else 0)
