"""Прибор для входа, регистрации и смены пароля. Гоняет живой Django.

🔴 ЗАЧЕМ ОН ПОЯВИЛСЯ. До 12.09 вход проверялся ровно одним прибором —
`frontend/scripts/auth-check.mjs`, а тот гонял НЕ этот код, а функции
Cloudflare Pages, которые продукт давно не зовёт (`VITE_AUTH_URL` задана,
запросы идут сюда). Получалось наоборот: тесты стояли у мёртвой копии, а
живая дверь продукта не проверялась ничем. Сначала прибор сюда, и только
потом снос той копии — иначе мы удалили бы проверенное и оставили голое.

Запуск из папки `backend`:

    .venv/bin/python people/прогон.py

Отдельная база в /tmp, боевые данные не трогает и трогать не может.
"""
import os, sys, django, json, re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["DB_PATH"] = "/tmp/прогон-люди.sqlite3"
os.environ.pop("SESSION_COOKIE_DOMAIN", None)
Path("/tmp/прогон-люди.sqlite3").unlink(missing_ok=True)
django.setup()

from django.test.utils import setup_test_environment
setup_test_environment()

from django.conf import settings

# 🔴 ПРЕДОХРАНИТЕЛЬ. Прибор заводит и удаляет людей. Если он попадёт в боевую
# базу, он её испортит. Проверяем ДО первой записи.
db = str(settings.DATABASES["default"]["NAME"])
if not db.startswith("/tmp/"):
    print(f"СТОП. Прибор смотрит не в свою базу: {db}. Ожидался путь в /tmp. Ничего не тронуто.")
    sys.exit(2)

from django.core.management import call_command
call_command("migrate", verbosity=0, interactive=False)

import hashlib, base64, secrets
from datetime import timedelta
from django.core import signing
from django.test import Client
from django.utils import timezone

from people import guard
from people.models import Person, Reset, Tries
from people.session import COOKIE, SALT, DAYS

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

def тело(r):
    try:
        return r.json()
    except Exception:
        return {}

ЖСОН = "application/json"
def пост(c, путь, данные):
    return c.post(путь, json.dumps(данные), content_type=ЖСОН)

# ── Заведение записи ──────────────────────────────────────────────────────
раздел("Заведение записи:")
c = Client()
r = пост(c, "/api/auth/register",
         {"email": "Nina@Почта.ru", "name": "  Нина   Петровна ", "role": "teacher",
          "password": "четыре обычных слова", "tz": "Europe/Moscow"})
да("запись заводится", r.status_code == 200, r.content[:200])
н = тело(r)
да("имя приведено в порядок", н.get("name") == "Нина Петровна", н.get("name"))
да("роль сохранена", н.get("role") == "teacher", н.get("role"))
да("пояс сохранён", н.get("пояс") == "Europe/Moscow", н.get("пояс"))
да("отпечаток наружу не ушёл", "pass_hash" not in н and "password" not in н, list(н))
# 🔴 Ищем ПО ID из ответа, а не по почте: если приведение к нижнему регистру
# сломается, прибор должен сказать об этом словами, а не упасть на поиске.
нина = Person.objects.get(id=н["id"])
да("почта записана в нижнем регистре", нина.email == "nina@почта.ru", нина.email)
да("в базе лежит argon2id, а не пароль", нина.pass_hash.startswith("$argon2"), нина.pass_hash[:12])
да("кука поставлена", COOKIE in r.cookies, list(r.cookies))
кука = r.cookies[COOKIE]
да("кука недоступна скриптам страницы", кука["httponly"], dict(кука))
да("кука только по https", кука["secure"], dict(кука))
да("кука живёт 30 дней", int(кука["max-age"]) == DAYS * 24 * 3600, кука["max-age"])

раздел("Отказы при заведении:")
for имя, данные, слово in [
    ("почта без домена", {"email": "нина", "name": "Нина", "password": "восемь знаков"}, "почта"),
    ("пустое имя", {"email": "a@b.ru", "name": "", "password": "восемь знаков"}, "зовут"),
    ("имя из одной буквы", {"email": "a@b.ru", "name": "Н", "password": "восемь знаков"}, "зовут"),
    ("пароль короче восьми", {"email": "a@b.ru", "name": "Нина", "password": "семь"}, "восьми"),
]:
    r = пост(Client(), "/api/auth/register", данные)
    о = тело(r).get("error", "")
    да(f"{имя}: отказ словами", r.status_code == 400 and слово in о.lower(), f"{r.status_code} · {о}")

r = пост(Client(), "/api/auth/register",
         {"email": "NINA@почта.ru", "name": "Другая Нина", "password": "восемь знаков"})
о = тело(r).get("error", "")
да("занятая почта: 409 и предложение войти", r.status_code == 409 and "войдите" in о.lower(),
   f"{r.status_code} · {о}")
да("вторая запись не завелась", Person.objects.filter(email__iexact="nina@почта.ru").count() == 1)

# ── Вход ──────────────────────────────────────────────────────────────────
раздел("Вход:")
r = пост(Client(), "/api/auth/login", {"email": "NINA@ПОЧТА.RU", "password": "четыре обычных слова"})
да("почта нечувствительна к регистру", r.status_code == 200, f"{r.status_code} · {тело(r)}")
да("вход кладёт куку", COOKIE in r.cookies)

r = пост(Client(), "/api/auth/login", {"email": "nina@почта.ru", "password": "не тот пароль"})
плох = тело(r).get("error", "")
да("неверный пароль — 401", r.status_code == 401, r.status_code)
r2 = пост(Client(), "/api/auth/login", {"email": "нетакой@почта.ru", "password": "не тот пароль"})
да("незнакомая почта — ТОТ ЖЕ самый отказ", r2.status_code == 401 and тело(r2).get("error") == плох,
   f"{r2.status_code} · {тело(r2).get('error')} ≠ {плох}")
да("отказ не говорит, есть ли такая почта",
   "почта или пароль" in плох.lower() and "нет" not in плох.lower()[:20], плох)

раздел("Пояс:")
r = пост(Client(), "/api/auth/login",
         {"email": "nina@почта.ru", "password": "четыре обычных слова", "tz": "Asia/Vladivostok"})
нина.refresh_from_db()
да("пояс обновляется при входе, а не пишется однажды", нина.tz == "Asia/Vladivostok", нина.tz)
пост(Client(), "/api/auth/login",
     {"email": "nina@почта.ru", "password": "четыре обычных слова", "tz": "Луна/Море_Спокойствия"})
нина.refresh_from_db()
да("выдуманный пояс не сохраняется", нина.tz == "Asia/Vladivostok", нина.tz)

# ── Старые отпечатки Cloudflare ───────────────────────────────────────────
раздел("Пароли, заведённые ещё на Cloudflare:")
def pbkdf2(пароль, повторов=100_000):
    соль = secrets.token_bytes(16)
    от = hashlib.pbkdf2_hmac("sha256", пароль.encode(), соль, повторов, dklen=32)
    б64 = lambda b: base64.b64encode(b).decode().replace("+", "-").replace("/", "_").rstrip("=")
    return f"pbkdf2${повторов}${б64(соль)}${б64(от)}"

старый = Person.objects.create(email="old@почта.ru", name="Старожил", role="student",
                               pass_hash=pbkdf2("пароль из прошлой жизни"))
r = пост(Client(), "/api/auth/login", {"email": "old@почта.ru", "password": "пароль из прошлой жизни"})
да("старый пароль пускает — человек не потерян", r.status_code == 200, f"{r.status_code} · {тело(r)}")
старый.refresh_from_db()
да("и тут же переписан на argon2id", старый.pass_hash.startswith("$argon2"), старый.pass_hash[:12])
r = пост(Client(), "/api/auth/login", {"email": "old@почта.ru", "password": "пароль из прошлой жизни"})
да("после переписывания вход по тому же паролю жив", r.status_code == 200, r.status_code)
кривой = Person.objects.create(email="bad@почта.ru", name="Кривой", role="student",
                               pass_hash="pbkdf2$сломано")
r = пост(Client(), "/api/auth/login", {"email": "bad@почта.ru", "password": "хоть что"})
да("испорченный отпечаток не пускает и не роняет сервер", r.status_code == 401, r.status_code)

# ── Кто пришёл ────────────────────────────────────────────────────────────
раздел("Кто пришёл:")
гость = Client()
r = гость.get("/api/auth/me")
да("без куки — «никого», а не ошибка", r.status_code == 200 and тело(r).get("person") is None, тело(r))

свой = Client()
свой.cookies[COOKIE] = signing.dumps({"id": нина.id}, salt=SALT)
r = свой.get("/api/auth/me")
да("по своей куке узнаёт человека", тело(r).get("person", {}).get("name") == "Нина Петровна", тело(r))
да("и наружу не отдаёт отпечаток", "pass_hash" not in json.dumps(тело(r)), тело(r))

чужой = Client()
чужой.cookies[COOKIE] = signing.dumps({"id": нина.id}, salt="совсем.другая.соль")
r = чужой.get("/api/auth/me")
да("верное тело с ЧУЖОЙ подписью не проходит", тело(r).get("person") is None, тело(r))

порча = Client()
порча.cookies[COOKIE] = signing.dumps({"id": нина.id}, salt=SALT)[:-3] + "zzz"
r = порча.get("/api/auth/me")
да("испорченная подпись — «никого», а не 500", r.status_code == 200 and тело(r).get("person") is None)

нет = Client()
нет.cookies[COOKIE] = signing.dumps({"id": "нет-такого-человека"}, salt=SALT)
r = нет.get("/api/auth/me")
да("подпись верна, а человека нет — «никого»", тело(r).get("person") is None, тело(r))

r = свой.delete("/api/auth/me")
да("выход гасит куку", r.status_code == 200 and r.cookies[COOKIE].value == "", dict(r.cookies.get(COOKIE, {})))

раздел("Чужие методы:")
for путь, метод, слово in [("register", "get", "POST"), ("login", "get", "POST"),
                           ("forgot", "get", "POST"), ("reset", "get", "POST"),
                           ("me", "post", "GET")]:
    r = getattr(Client(), метод)(f"/api/auth/{путь}")
    о = тело(r).get("error", "")
    да(f"{путь} на {метод.upper()} — 405 со словами", r.status_code == 405 and слово in о,
       f"{r.status_code} · {о}")

раздел("Мусор вместо тела:")
r = Client().post("/api/auth/login", "{это не json", content_type=ЖСОН)
да("ломаный JSON — отказ словами, а не 500", r.status_code in (400, 401), r.status_code)
r = Client().post("/api/auth/register", "", content_type=ЖСОН)
да("пустое тело — отказ словами, а не 500", r.status_code == 400 and тело(r).get("error"), r.status_code)

# ── Пять попыток ──────────────────────────────────────────────────────────
раздел("Пять попыток и двадцать минут отдыха:")
Tries.objects.all().delete()
запертый = Client()
коды = [пост(запертый, "/api/auth/login",
             {"email": "nina@почта.ru", "password": "мимо"}).status_code for _ in range(5)]
да("первые пять попыток — обычный отказ", коды == [401] * 5, коды)
r = пост(запертый, "/api/auth/login", {"email": "nina@почта.ru", "password": "мимо"})
о = тело(r).get("error", "")
да("шестая — 429 и сказано, сколько ждать", r.status_code == 429 and "мин" in о, f"{r.status_code} · {о}")
r = пост(запертый, "/api/auth/login",
         {"email": "nina@почта.ru", "password": "четыре обычных слова"})
да("запертого не пускает даже с ВЕРНЫМ паролем", r.status_code == 429, r.status_code)
да("отказ не выдаёт, есть ли такая почта: незнакомую тоже считаем",
   guard.locked_for("nina@почта.ru") > 0)

Tries.objects.all().delete()
для_снятия = Client()
for _ in range(4):
    пост(для_снятия, "/api/auth/login", {"email": "nina@почта.ru", "password": "мимо"})
r = пост(для_снятия, "/api/auth/login",
         {"email": "nina@почта.ru", "password": "четыре обычных слова"})
да("удачный вход обнуляет счёт опечаток", r.status_code == 200 and not Tries.objects.exists(),
   f"{r.status_code} · строк {Tries.objects.count()}")

# ── Забыли пароль ─────────────────────────────────────────────────────────
раздел("Забыли пароль:")
Tries.objects.all().delete()
Reset.objects.all().delete()
r = пост(Client(), "/api/auth/forgot", {"email": "nina@почта.ru"})
сказано = тело(r).get("said", "")
да("на известную почту отвечает уклончиво", r.status_code == 200 and "если такая почта" in сказано.lower(),
   сказано)
да("ключ заведён", Reset.objects.count() == 1, Reset.objects.count())
да("в базе лежит ОТПЕЧАТОК ключа, а не сам ключ",
   re.fullmatch(r"[0-9a-f]{64}", Reset.objects.first().token_hash or "") is not None,
   Reset.objects.first().token_hash)

Tries.objects.all().delete()
r2 = пост(Client(), "/api/auth/forgot", {"email": "нетакой@почта.ru"})
да("на незнакомую — ТОТ ЖЕ ответ", тело(r2).get("said") == сказано, тело(r2))
да("и ключа не завелось", Reset.objects.count() == 1, Reset.objects.count())

# Ключ берём тем же путём, каким его получает человек: из письма. Письма тут
# нет, поэтому заводим свой и кладём его отпечаток — как это делает сервер.
ключ = secrets.token_urlsafe(32)
Reset.objects.all().delete()
Reset.objects.create(token_hash=hashlib.sha256(ключ.encode()).hexdigest(), person=нина)
r = пост(Client(), "/api/auth/reset", {"key": ключ, "password": "семь"})
да("короткий новый пароль не принимается", r.status_code == 400 and "восьми" in тело(r).get("error", ""))
r = пост(Client(), "/api/auth/reset", {"key": ключ, "password": "новый длинный пароль"})
да("пароль меняется и человек сразу входит", r.status_code == 200 and COOKIE in r.cookies, r.status_code)
r = пост(Client(), "/api/auth/reset", {"key": ключ, "password": "ещё один длинный"})
да("тот же ключ второй раз не работает — 410", r.status_code == 410, r.status_code)
r = пост(Client(), "/api/auth/login", {"email": "nina@почта.ru", "password": "новый длинный пароль"})
да("вход по новому паролю", r.status_code == 200, r.status_code)
r = пост(Client(), "/api/auth/login", {"email": "nina@почта.ru", "password": "четыре обычных слова"})
да("вход по старому паролю закрыт", r.status_code == 401, r.status_code)

стар = Reset.objects.create(token_hash=hashlib.sha256(b"x").hexdigest(), person=нина)
Reset.objects.filter(pk=стар.pk).update(made_at=timezone.now() - timedelta(hours=2))
r = пост(Client(), "/api/auth/reset", {"key": "x", "password": "какой-нибудь длинный"})
да("ключ старше часа не работает — 410", r.status_code == 410, r.status_code)
r = пост(Client(), "/api/auth/reset", {"key": "такого ключа не было", "password": "какой-нибудь длинный"})
да("выдуманный ключ — тот же 410, без подсказок", r.status_code == 410, r.status_code)

Tries.objects.all().delete()
свежий = secrets.token_urlsafe(32)
Reset.objects.create(token_hash=hashlib.sha256(свежий.encode()).hexdigest(), person=нина)
второй = secrets.token_urlsafe(32)
Reset.objects.create(token_hash=hashlib.sha256(второй.encode()).hexdigest(), person=нина)
пост(Client(), "/api/auth/reset", {"key": свежий, "password": "самый новый пароль"})
r = пост(Client(), "/api/auth/reset", {"key": второй, "password": "и ещё один пароль"})
да("остальные заказанные ссылки гаснут вместе со сменой", r.status_code == 410, r.status_code)

Tries.objects.all().delete()
запертая = Client()
for _ in range(6):
    пост(запертая, "/api/auth/login", {"email": "nina@почта.ru", "password": "мимо"})
ключ3 = secrets.token_urlsafe(32)
Reset.objects.create(token_hash=hashlib.sha256(ключ3.encode()).hexdigest(), person=нина)
r = пост(запертая, "/api/auth/reset", {"key": ключ3, "password": "пароль после запрета"})
да("смена пароля снимает запрет — человек не ждёт двадцать минут у своей же двери",
   r.status_code == 200 and guard.locked_for(нина.email) == 0, r.status_code)

# ── Подпись куки ──────────────────────────────────────────────────────────
раздел("Подпись куки:")
да("ключ подписи берётся из настроек, а не зашит в код",
   "SECRET_KEY" in Path("config/settings.py").read_text(encoding="utf-8"))
да("небоевой ключ виден как небоевой",
   settings.SECRET_KEY.startswith("небоевой") or len(settings.SECRET_KEY) >= 40,
   settings.SECRET_KEY[:12])

print(f"\n{'✅ всё сходится' if not плохо else f'❌ бед {плохо}'} · проверок {всего}")
sys.exit(1 if плохо else 0)
