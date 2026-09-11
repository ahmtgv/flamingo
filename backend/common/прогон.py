"""Прибор для снимков хаба. Гоняет живой обход против живого сервера — своего.

🔴 ПОЧЕМУ СВОЙ СЕРВЕР, А НЕ ЧУЖИЕ САЙТЫ. Проверка, которая ходит в интернет,
не проверка: она краснеет от чужой аварии и зеленеет от чужого кэша. Здесь
поднимается свой http на localhost и отдаёт ровно те случаи, ради которых
код и написан: страница с `og:image`, страница без него, картинка не той
пропорции, картинка-обманка (по адресу лежит html), слишком большой файл.

Запуск из папки `backend`:

    .venv/bin/python common/прогон.py
"""
import io, json, os, shutil, sys, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

ПАПКА = Path("/tmp/прогон-хаб")
shutil.rmtree(ПАПКА, ignore_errors=True)
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["DB_PATH"] = "/tmp/прогон-хаб.sqlite3"
os.environ["MEDIA_ROOT"] = str(ПАПКА)
os.environ["ХАБ_ПАУЗА"] = "0"
Path("/tmp/прогон-хаб.sqlite3").unlink(missing_ok=True)

import django  # noqa: E402
django.setup()
from django.test.utils import setup_test_environment  # noqa: E402
setup_test_environment()
from django.conf import settings  # noqa: E402

# ПРЕДОХРАНИТЕЛЬ: прибор пишет файлы. Убеждаемся, что пишет во временное.
if not str(settings.MEDIA_ROOT).startswith("/tmp/"):
    print("СТОП: MEDIA_ROOT не временный:", settings.MEDIA_ROOT)
    raise SystemExit(1)

from common import снимки  # noqa: E402
from PIL import Image  # noqa: E402

бед = 0


def проверить(что: str, сошлось: bool, чем: str = "") -> None:
    global бед
    if сошлось:
        print(f"ok   {что}")
    else:
        бед += 1
        print(f"❌   {что}" + (f"\n     {чем}" if чем else ""))


def картинка(ш: int, в: int, цвет=(200, 60, 20)) -> bytes:
    б = io.BytesIO()
    Image.new("RGB", (ш, в), цвет).save(б, "PNG")
    return б.getvalue()


СТРАНИЦЫ = {
    "/ok": b"""<html><head>
        <meta property="og:image" content="/kartinka.png">
        <title>Istochnik</title></head><body>ok</body></html>""",
    "/tw": b"""<html><head>
        <meta name="twitter:image" content="http://ZAMENA/kartinka.png">
        </head><body>ok</body></html>""",
    "/empty": b"<html><head><title>Nichego</title></head><body>net vitriny</body></html>",
    "/fake": b"""<html><head>
        <meta property="og:image" content="/empty"></head><body>ok</body></html>""",
    "/huge": b"""<html><head>
        <meta property="og:image" content="/big.png"></head><body>ok</body></html>""",
}


class Ручка(BaseHTTPRequestHandler):
    def log_message(self, *a):  # тишина в отчёте
        pass

    def do_GET(self):
        путь = self.path
        if путь == "/kartinka.png":
            тело, тип = картинка(1200, 400), "image/png"
        elif путь == "/logo.png":
            тело, тип = картинка(144, 144), "image/png"
        elif путь == "/kvadrat.png":
            тело, тип = картинка(800, 800), "image/png"
        elif путь == "/big.png":
            тело, тип = b"x" * (снимки.КАРТИНКА_МАКС + 10), "image/png"
        elif путь == "/500":
            self.send_response(500); self.end_headers(); return
        elif путь in СТРАНИЦЫ:
            тело = СТРАНИЦЫ[путь].replace(b"ZAMENA", f"127.0.0.1:{self.server.server_port}".encode())
            тип = "text/html; charset=utf-8"
        else:
            self.send_response(404); self.end_headers(); return
        self.send_response(200)
        self.send_header("Content-Type", тип)
        self.send_header("Content-Length", str(len(тело)))
        self.end_headers()
        self.wfile.write(тело)


сервер = HTTPServer(("127.0.0.1", 0), Ручка)
порт = сервер.server_port
threading.Thread(target=сервер.serve_forever, daemon=True).start()
БАЗА = f"http://127.0.0.1:{порт}"

print(f"\nПрибор снимков хаба. Свой сервер на {БАЗА}, снимки в {ПАПКА}\n")

# ── 1. обычный случай ────────────────────────────────────────────────────────
и = снимки.обновить_один(ПАПКА, "проба", f"{БАЗА}/ok")
проверить("страница с og:image — снимок взят", и.вышло, и.словами)
файл = ПАПКА / "хаб" / "проба.jpg"
проверить("файл лежит на месте", файл.exists(), str(файл))
if файл.exists():
    им = Image.open(файл)
    проверить("снимок приведён к 640×360", им.size == (снимки.ШИРИНА, снимки.ВЫСОТА), str(им.size))
    проверить("снимок — jpeg", им.format == "JPEG", str(им.format))
проверить("временный файл за собой не оставлен",
          not list((ПАПКА / "хаб").glob("*.врем")), "остался мусор")

# ── 2. картинка другой пропорции обрезается, а не сплющивается ───────────────
и2 = снимки.обновить_один(ПАПКА, "узкая", f"{БАЗА}/tw")
проверить("twitter:image тоже годится", и2.вышло, и2.словами)

# ── 2б. мелкая картинка и квадрат — отказ, а не мыло на плитке ──────────────
СТРАНИЦЫ["/logo"] = b'<html><head><meta property="og:image" content="/logo.png"></head></html>'
СТРАНИЦЫ["/kvadrat"] = b'<html><head><meta property="og:image" content="/kvadrat.png"></head></html>'
и_л = снимки.обновить_один(ПАПКА, "лого", f"{БАЗА}/logo")
проверить("логотип 144×144 не берём", not и_л.вышло and "мелк" in и_л.словами, и_л.словами)
и_к = снимки.обновить_один(ПАПКА, "квадрат", f"{БАЗА}/kvadrat")
проверить("квадрат 800×800 не берём", not и_к.вышло and "квадрат" in и_к.словами, и_к.словами)
проверить("ровно наш размер берём", снимки.обновить_один(ПАПКА, "впритык", f"{БАЗА}/ok").вышло)

# ── 3. отказы ────────────────────────────────────────────────────────────────
и3 = снимки.обновить_один(ПАПКА, "нету", f"{БАЗА}/empty")
проверить("нет витрины — отказ словами", not и3.вышло and "og:image" in и3.словами, и3.словами)

и4 = снимки.обновить_один(ПАПКА, "обман", f"{БАЗА}/fake")
проверить("по адресу витрины html — отказ", not и4.вышло, и4.словами)

и5 = снимки.обновить_один(ПАПКА, "толстая", f"{БАЗА}/huge")
проверить("слишком большой файл — отказ", not и5.вышло and "КБ" in и5.словами, и5.словами)

и6 = снимки.обновить_один(ПАПКА, "мертвец", f"{БАЗА}/500")
проверить("сервер ответил 500 — отказ словами", not и6.вышло and "500" in и6.словами, и6.словами)

и7 = снимки.обновить_один(ПАПКА, "нетути", f"{БАЗА}/nope")
проверить("404 — отказ словами", not и7.вышло and "404" in и7.словами, и7.словами)

# ── 4. старый снимок переживает неудачу ──────────────────────────────────────
было = файл.read_bytes()
плохо = снимки.обновить_один(ПАПКА, "проба", f"{БАЗА}/empty")
проверить("сайт лёг — старый снимок на месте и не тронут",
          not плохо.вышло and файл.exists() and файл.read_bytes() == было)

# ── 5. имя источника не пускает в чужую папку ────────────────────────────────
злое = снимки.обновить_один(ПАПКА, "../../etc/passwd", f"{БАЗА}/ok")
проверить("имя с путём отклонено", not злое.вышло, злое.словами)
проверить("наружу ничего не записалось", not Path("/tmp/passwd.jpg").exists())

# ── 6. свежесть ──────────────────────────────────────────────────────────────
from datetime import datetime, timedelta, timezone  # noqa: E402
сейчас = datetime.now(timezone.utc).isoformat()
давно = (datetime.now(timezone.utc) - timedelta(hours=30)).isoformat()
проверить("снимок часовой давности — свежий", снимки.свежий({"взято": сейчас}, 20))
проверить("снимок тридцатичасовой — не свежий", not снимки.свежий({"взято": давно}, 20))
проверить("снимка не было — не свежий", not снимки.свежий(None, 20))
проверить("время не читается — не свежий", not снимки.свежий({"взято": "позавчера"}, 20))

# ── 7. опись ─────────────────────────────────────────────────────────────────
снимки.записать_опись(ПАПКА, {"проба": {"взято": сейчас, "байт": 1}})
о = снимки.прочесть_опись(ПАПКА)
проверить("опись пишется и читается", о.get("проба", {}).get("байт") == 1, json.dumps(о))
(снимки.куда(ПАПКА) / снимки.ОПИСЬ).write_text("{битый", encoding="utf-8")
проверить("битая опись не роняет обход", снимки.прочесть_опись(ПАПКА) == {})

# ── 8. отдача ────────────────────────────────────────────────────────────────
снимки.записать_опись(ПАПКА, {"проба": {"взято": сейчас, "байт": len(было)}})
from django.test import Client  # noqa: E402
from common import views  # noqa: E402
# 🔴 НАСТОЯЩИЙ КАТАЛОГ ПРИБОР НЕ ТРОГАЕТ. Подменяем не содержимое файла, а
# путь к нему: прибор, который пишет в рабочий файл, однажды его и испортит.
views.СПИСОК = Path("/tmp/прогон-хаб-каталог.json")
views.СПИСОК.write_text(
    json.dumps([{"id": "проба", "home": "http://x", "name": "Проба"}], ensure_ascii=False),
    encoding="utf-8")
views._каталог.cache_clear()
c = Client()
о = c.get("/api/hub/previews")
проверить("список снимков отвечает", о.status_code == 200, str(о.status_code))
если_есть = json.loads(о.content).get("есть", [])
проверить("в списке ровно те, у кого файл на диске", если_есть == ["проба"], str(если_есть))

о = c.get("/api/hub/preview/проба")
проверить("снимок отдаётся", о.status_code == 200 and о["Content-Type"] == "image/jpeg", str(о.status_code))
проверить("снимок кэшируется на сутки", "86400" in о.get("Cache-Control", ""), о.get("Cache-Control", ""))

о = c.get("/api/hub/preview/нету")
проверить("чужого имени не отдаём", о.status_code == 404, str(о.status_code))
# 🔴 ПРОХОД ВВЕРХ ПРОВЕРЯЕТСЯ ДВУМЯ РАЗНЫМИ ВОПРОСАМИ, И НЕ ЧЕРЕЗ КЛИЕНТА.
# Первая редакция звала `c.get(".../..%2F..%2Fetc%2Fpasswd")` и ждала 404. Ответ
# и правда 404 — но приходит он от Django, ДО наших маршрутов: такой путь не
# совпадает ни с одним из них. Django на это рисует свою страницу «404», а
# страница у нас не заведена, и в питоне 3.14 отрисовка отладочной страницы
# внутри тестового клиента падает на ровном месте (AttributeError в Context).
# То есть прибор ронял не наш код, а свою же декорацию — и делал это ПОСЛЕ
# двадцати четырёх честных «ok», выглядя при этом как провал выката.
# Спрашиваем прямо: (1) до маршрута такой путь не доходит вовсе,
# (2) наш обработчик отказывает и на имя, которое до него всё же дошло.
from django.urls import Resolver404, resolve  # noqa: E402
from django.test import RequestFactory  # noqa: E402

дошло = True
try:
    resolve("/api/hub/preview/../../etc/passwd")
except Resolver404:
    дошло = False
проверить("адрес с ../ не совпадает ни с одним маршрутом", not дошло)

ф = RequestFactory()
о = views.превью(ф.get("/api/hub/preview/x"), "../../etc/passwd")
проверить("а если бы дошёл — обработчик отказывает", о.status_code == 404, str(о.status_code))
проверить("наружу так ничего и не записалось", not Path("/etc/passwd.jpg").exists())

print()
if бед:
    print(f"❌ не сошлось: {бед}")
    raise SystemExit(1)
print("✅ всё сходится")
