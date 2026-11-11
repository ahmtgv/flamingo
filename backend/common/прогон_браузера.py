"""Прибор для своего браузера «Источников мира» (`common/браузерная.py`).

Запуск из папки `backend`:

    .venv/bin/python common/прогон_браузера.py

Поднимает пробный сайт на 127.0.0.1, настоящую браузерную на отдельном порту и
проходит путь человека: открыть источник, получить кадр, нажать ссылку,
набрать текст, вернуться назад, закрыть. База отдельная, в /tmp. Нужен хром
(`playwright install chromium`); без него прибор скажет об этом и выйдет с 3.
"""
import os, sys, django, json, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["DB_PATH"] = "/tmp/прогон-браузер.sqlite3"
os.environ["HUB_BROWSER_PORT"] = "8019"
os.environ["HUB_BROWSER_ALLOW_LOCAL"] = "1"
os.environ["HUB_BROWSER_LINGER"] = "20"
os.environ.pop("SESSION_COOKIE_DOMAIN", None)
Path("/tmp/прогон-браузер.sqlite3").unlink(missing_ok=True)
django.setup()

from django.test.utils import setup_test_environment
setup_test_environment()
from django.conf import settings

if not str(settings.DATABASES["default"]["NAME"]).startswith("/tmp/"):
    print("СТОП. Прибор смотрит не в свою базу. Ничего не тронуто.")
    sys.exit(2)

from django.core.management import call_command
call_command("migrate", verbosity=0, interactive=False)
from django.test import Client
from common import views, браузерная

settings.ALLOWED_HOSTS = ["*"]


def убрать_браузерную():
    """Прибор за собой прибирает: пробная браузерная на своём порту гасится."""
    import signal, urllib.request
    try:
        with urllib.request.urlopen("http://127.0.0.1:8019/state", timeout=2) as о:
            os.kill(int(json.loads(о.read())["pid"]), signal.SIGTERM)
            time.sleep(0.5)
    except Exception:
        pass


убрать_браузерную()

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


# ── пробный сайт: запрещает рамку, как настоящие музеи ───────────────────────
ПЕРВАЯ = b"""<!doctype html><meta charset=utf-8><title>one</title>
<body style="margin:0;background:#fff"><a id=a href="/two" style="position:absolute;left:40px;top:40px;display:block;width:200px;height:60px;background:#0a0">go</a>
<input id=i style="position:absolute;left:40px;top:140px;width:300px;height:40px">
<a href="http://127.0.0.1:1/secret" id=in>inner</a>
<img src="http://10.0.0.1/x.png"></body>"""
ВТОРАЯ = b"""<!doctype html><meta charset=utf-8><title>two</title><body style="margin:0;background:#00a"></body>"""


class Сайт(BaseHTTPRequestHandler):
    def log_message(self, *_):
        return

    def do_GET(self):
        тело = ВТОРАЯ if self.path.startswith("/two") else ПЕРВАЯ
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Length", str(len(тело)))
        self.end_headers()
        self.wfile.write(тело)


сайт = ThreadingHTTPServer(("127.0.0.1", 8018), Сайт)
threading.Thread(target=сайт.serve_forever, daemon=True).start()

views.СПИСОК = Path("/tmp/прогон-браузер-каталог.json")
views.СПИСОК.write_text(json.dumps([{"id": "проба", "home": "http://127.0.0.1:8018/", "name": "Проба", "снимок": True}],
                                   ensure_ascii=False), encoding="utf-8")
views._дома.cache_clear()


def вошёл(почта):
    к = Client(secure=True)
    r = к.post("/api/auth/register", json.dumps({"email": почта, "name": "Проба", "role": "student",
                                                  "password": "четыре-слова-подряд"}), content_type="application/json")
    assert r.status_code == 200, r.content
    return к


def шлю(к, путь, тело):
    return к.post(путь, json.dumps(тело), content_type="application/json")


print("\nАдреса: наружу или внутрь")
н = браузерная.наружу
есть(not н("file:///etc/passwd") and not н("ftp://example.com/"), "не http — не открываем")
есть(not н("http://10.0.0.1/") and not н("http://192.168.1.1/") and not н("http://169.254.169.254/latest"),
     "внутренние адреса сети закрыты")
есть(not н("http://[::1]:8000/") or браузерная.СВОИМ_МОЖНО, "свой сервер закрыт (в приборе открыт нарочно)")

print("\nКто может открыть")
гость = Client(secure=True)
есть(шлю(гость, "/api/hub/browser/open", {"id": "проба"}).status_code == 401, "гостю — «сначала войдите»")
есть(гость.get("/api/hub/browser/frame?w=x").status_code == 401, "кадры гостю не идут")
аня = вошёл("a@example.com")
есть(шлю(аня, "/api/hub/browser/open", {"id": "нет-такого"}).status_code == 404, "источника нет в каталоге — отказ")
есть(шлю(аня, "/api/hub/browser/open", {"id": "проба", "дом": "http://evil.example/"}).status_code in (200, 503),
     "адрес из запроса не слушаем — только каталог")

r = шлю(аня, "/api/hub/browser/open", {"id": "проба", "ш": 800, "в": 500})
if r.status_code == 503:
    убрать_браузерную()
    print(f"\n⚠️ хрома нет: {r.json().get('error')} — путь человека не проверен")
    sys.exit(3)
есть(r.status_code == 200 and r.json().get("окно"), f"источник открылся: {r.status_code}")
w = r.json()["окно"]

print("\nПуть человека")
к = аня.get(f"/api/hub/browser/frame?w={w}")
есть(к.status_code == 200 and к.content[:2] == b"\xff\xd8" and len(к.content) > 1000, "пришёл кадр — картинка")
есть(к["X-Hub-Url"].startswith("http://127.0.0.1:8018/"), f"адрес страницы известен: {к['X-Hub-Url']}")
хэш = к["X-Hub-Hash"]
time.sleep(0.4)
к2 = аня.get(f"/api/hub/browser/frame?w={w}&h={хэш}")
есть(к2.status_code == 204, f"ничего не изменилось — кадр не шлём заново ({к2.status_code})")

есть(шлю(аня, "/api/hub/browser/act", {"w": w, "что": "click", "x": 60, "y": 160}).status_code == 200, "нажатие в поле принято")
шлю(аня, "/api/hub/browser/act", {"w": w, "что": "text", "текст": "привет"})
шлю(аня, "/api/hub/browser/act", {"w": w, "что": "key", "клавиша": "Backspace"})
time.sleep(0.4)
к3 = аня.get(f"/api/hub/browser/frame?w={w}&h={хэш}")
есть(к3.status_code == 200 and к3["X-Hub-Hash"] != хэш, "после набора текста кадр другой")

r = шлю(аня, "/api/hub/browser/act", {"w": w, "что": "click", "x": 100, "y": 60})
time.sleep(0.6)
к4 = аня.get(f"/api/hub/browser/frame?w={w}")
есть(к4["X-Hub-Url"].endswith("/two"), f"нажатие по ссылке ведёт дальше: {к4['X-Hub-Url']}")
шлю(аня, "/api/hub/browser/act", {"w": w, "что": "back"})
time.sleep(0.4)
к5 = аня.get(f"/api/hub/browser/frame?w={w}")
есть(not к5["X-Hub-Url"].endswith("/two"), "«назад» возвращает")
есть(шлю(аня, "/api/hub/browser/act", {"w": w, "что": "size", "ш": 5000, "в": 10}).status_code == 200, "размер окна меняется в пределах")
есть(шлю(аня, "/api/hub/browser/act", {"w": w, "что": "нечто"}).status_code == 400, "неизвестное действие — отказ")

print("\nЧужое окно и пределы")
тимур = вошёл("t@example.com")
есть(тимур.get(f"/api/hub/browser/frame?w={w}").status_code == 404, "чужое окно не видно")
есть(шлю(тимур, "/api/hub/browser/act", {"w": w, "что": "click", "x": 1, "y": 1}).status_code == 404, "и не управляется")
окна = [шлю(аня, "/api/hub/browser/open", {"id": "проба"}).json().get("окно") for _ in range(3)]
есть(аня.get(f"/api/hub/browser/frame?w={w}").status_code == 404, "у одного человека окон не больше двух: давнее закрылось")
for i in range(4):
    шлю(вошёл(f"p{i}@example.com"), "/api/hub/browser/open", {"id": "проба"})
r = шлю(вошёл("last@example.com"), "/api/hub/browser/open", {"id": "проба"})
есть(r.status_code == 429, f"все окна заняты — отказ словами ({r.status_code})")
есть(шлю(аня, "/api/hub/browser/act", {"w": окна[-1], "что": "close"}).status_code == 200
     and аня.get(f"/api/hub/browser/frame?w={окна[-1]}").status_code == 404, "закрытое окно закрыто")

убрать_браузерную()
print(f"\n{'❌' if бед else '✅'} бед {бед} · проверок {проверок}")
sys.exit(1 if бед else 0)
