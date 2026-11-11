"""Свой браузер «Источников мира» — настоящий хром на сервере.

🔴 ЗАЧЕМ (владелец, 11.11.2026). Часть источников запрещает показывать себя
внутри чужой страницы: рамка у человека пустая, и сделать с этим на его стороне
ничего нельзя. Здесь сайт открывает наш сервер — обычным браузером, как открыл
бы человек, — а человеку идёт картинка окна. Его нажатия, прокрутка и клавиши
уезжают сюда и выполняются в этом окне. Чужой код при этом у человека не
исполняется вовсе и нашего адреса не касается: к нему приходят только кадры.

🔴 ЭТО ОТДЕЛЬНЫЙ ПРОЦЕСС, А НЕ ЧАСТЬ САЙТА. Сайт отвечает короткими запросами
из нескольких рабочих процессов, а окно браузера должно жить между запросами и
принадлежать одному потоку (так устроен Playwright). Поэтому браузерная —
маленькая служба на `127.0.0.1`: наружу она не видна, с ней говорит только наш
же сайт (`common/views.py`), и он же поднимает её при первой надобности.

🔴 ВСЁ, ЧТО ДЕЛАЕТ ХРОМ, ДЕЛАЕТ ОДИН ПОТОК. Запросы приходят в своих потоках и
кладут работу в очередь; поток-хозяин выполняет её по одной. Кадр — это десятая
доля секунды, так что очередь не копится, а гонок нет по построению.

🔴 ВНУТРЬ НАШЕЙ СЕТИ ЭТОТ БРАУЗЕР НЕ ХОДИТ. Он стоит на сервере, и ссылка вида
`http://127.0.0.1:8000/…` открыла бы ему то, что снаружи закрыто. Каждый запрос
страницы проверяется: адрес должен вести наружу, в открытую сеть.

Чисел здесь немного, и все — про то, чтобы не уронить сервер уроков:
окон разом — `ОКОН`, у одного человека — `ОКОН_У_ОДНОГО`, окно без дела
закрывается через `ПРОСТОЙ` секунд, пустая служба гасит хром и уходит сама.
"""
from __future__ import annotations

import hashlib
import ipaddress
import json
import os
import queue
import secrets
import socket
import threading
import time
from concurrent.futures import Future
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlsplit

from . import браузер

ПОРТ = int(os.getenv("HUB_BROWSER_PORT", "8011"))
ОКОН = int(os.getenv("HUB_BROWSER_MAX", "4"))
ОКОН_У_ОДНОГО = int(os.getenv("HUB_BROWSER_PER_PERSON", "2"))
ПРОСТОЙ = int(os.getenv("HUB_BROWSER_IDLE", "120"))
#: Сколько служба живёт без единого окна. Хром — сотни мегабайт; держать его
#: ради никого незачем, а поднять заново — три секунды.
ПУСТАЯ_ЖИВЁТ = int(os.getenv("HUB_BROWSER_LINGER", "600"))
#: Только для прибора: пустить к своему же пробному серверу на 127.0.0.1.
СВОИМ_МОЖНО = os.getenv("HUB_BROWSER_ALLOW_LOCAL") == "1"

МИН_Ш, МАКС_Ш = 480, 1440
МИН_В, МАКС_В = 320, 900
#: 🔴 СРОК КОРОТКИЙ, И ЖДЁМ ТОЛЬКО НАЧАЛА ОТВЕТА (`commit`), А НЕ ЗАГРУЗКИ.
#: Хром у всех окон один, и поток у него один: пока он ждёт медленный сайт,
#: кадров не получает никто. Дорисовку страницы человек увидит кадрами.
СРОК_СТРАНИЦЫ = 8_000
КАЧЕСТВО = 60

#: Клавиши, которые передаются как клавиши; остальное — как набранный текст.
КЛАВИШИ = {
    "Enter", "Backspace", "Delete", "Tab", "Escape", "ArrowLeft", "ArrowRight",
    "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown", " ",
}


class Отказ(Exception):
    """Отказ со словами и кодом ответа."""

    def __init__(self, слова: str, код: int = 400) -> None:
        super().__init__(слова)
        self.код = код


_снаружи: dict[str, bool] = {}


def наружу(адрес: str) -> bool:
    """Ведёт ли адрес в открытую сеть. Всё остальное браузерная не открывает."""
    try:
        ч = urlsplit(адрес)
    except ValueError:
        return False
    if ч.scheme in ("data", "blob", "about"):
        return True                      # это не поход в сеть
    if ч.scheme not in ("http", "https") or not ч.hostname:
        return False
    хост = ч.hostname.lower()
    if хост in _снаружи:
        return _снаружи[хост]
    try:
        адреса = {а[4][0] for а in socket.getaddrinfo(хост, None)}
    except OSError:
        return False                     # не знаем, куда ведёт, — не идём
    итог = bool(адреса)
    for а in адреса:
        ip = ipaddress.ip_address(а.split("%")[0])
        if (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
                or ip.is_multicast or ip.is_unspecified):
            итог = СВОИМ_МОЖНО and ip.is_loopback
            break
    if len(_снаружи) > 5000:
        _снаружи.clear()
    _снаружи[хост] = итог
    return итог


class Окно:
    def __init__(self, хозяин: str, контекст, страница) -> None:
        self.хозяин = хозяин
        self.контекст = контекст
        self.страница = страница
        self.тронуто = time.monotonic()
        self.кадр: bytes = b""
        self.хэш = ""
        self.снято = 0.0


class Браузерная:
    """Хром и его окна. Все методы с подчёркиванием зовёт только поток-хозяин."""

    def __init__(self) -> None:
        self.дела: "queue.Queue[tuple]" = queue.Queue()
        self.окна: dict[str, Окно] = {}
        self._пв = None
        self._бр = None
        self.пусто_с = time.monotonic()
        self.конец = threading.Event()

    # ── поток-хозяин ────────────────────────────────────────────────────────
    def работать(self) -> None:
        while not self.конец.is_set():
            try:
                дело, доводы, итог = self.дела.get(timeout=5)
            except queue.Empty:
                self._прибрать()
                continue
            try:
                итог.set_result(дело(*доводы))
            except Exception as e:                           # noqa: BLE001
                итог.set_exception(e)
            self._прибрать()
        self._погасить()

    def сделать(self, дело, *доводы, срок: float = 25):
        итог: Future = Future()
        self.дела.put((дело, доводы, итог))
        return итог.result(timeout=срок)

    def _поднять(self) -> None:
        if self._бр is not None:
            return
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            raise Отказ("На сервере не установлен браузер (playwright).", 503) from None
        self._пв = sync_playwright().start()
        пуск = {"args": ["--disable-dev-shm-usage"]}
        if браузер.ХРОМ:
            пуск["executable_path"] = браузер.ХРОМ
        try:
            self._бр = self._пв.chromium.launch(**пуск)
        except Exception as e:                               # noqa: BLE001
            self._пв.stop()
            self._пв = None
            raise Отказ(f"Браузер на сервере не запустился ({type(e).__name__}).", 503) from None

    def _погасить(self) -> None:
        for ключ in list(self.окна):
            self._закрыть(ключ)
        try:
            if self._бр:
                self._бр.close()
        except Exception:                                    # noqa: BLE001
            pass
        try:
            if self._пв:
                self._пв.stop()
        except Exception:                                    # noqa: BLE001
            pass
        self._бр = self._пв = None

    def _прибрать(self) -> None:
        сейчас = time.monotonic()
        for ключ, о in list(self.окна.items()):
            if сейчас - о.тронуто > ПРОСТОЙ:
                self._закрыть(ключ)
        if self.окна:
            self.пусто_с = сейчас
        elif сейчас - self.пусто_с > ПУСТАЯ_ЖИВЁТ:
            self.конец.set()

    def _закрыть(self, ключ: str) -> None:
        о = self.окна.pop(ключ, None)
        if о is None:
            return
        try:
            о.контекст.close()
        except Exception:                                    # noqa: BLE001
            pass

    def _окно(self, ключ: str, хозяин: str) -> Окно:
        о = self.окна.get(ключ)
        # Чужое окно и несуществующее отвечают одинаково: «такого нет».
        if о is None or о.хозяин != хозяин:
            raise Отказ("Окно закрыто — откройте источник заново.", 404)
        о.тронуто = time.monotonic()
        return о

    # ── дела ────────────────────────────────────────────────────────────────
    def открыть(self, хозяин: str, дом: str, ш: int, в: int) -> dict:
        if not наружу(дом):
            raise Отказ("Этот адрес браузер не открывает.", 400)
        self._поднять()
        свои = [к for к, о in self.окна.items() if о.хозяин == хозяин]
        # У одного человека окон немного: лишнее закрывается, самое давнее.
        while len(свои) >= ОКОН_У_ОДНОГО:
            давнее = min(свои, key=lambda к: self.окна[к].тронуто)
            self._закрыть(давнее)
            свои.remove(давнее)
        if len(self.окна) >= ОКОН:
            raise Отказ("Сейчас все окна браузера заняты другими. Попробуйте через минуту "
                        "или откройте источник в новой вкладке.", 429)
        контекст = self._бр.new_context(
            viewport={"width": _в_пределах(ш, МИН_Ш, МАКС_Ш), "height": _в_пределах(в, МИН_В, МАКС_В)},
            device_scale_factor=1,
            locale="ru-RU",
            accept_downloads=False,
        )
        контекст.set_default_timeout(СРОК_СТРАНИЦЫ)
        # Мы представляемся — как и обход снимков (`common/браузер.py`).
        контекст.set_extra_http_headers({"Accept-Language": "ru,en;q=0.8", "X-Requested-By": браузер.ХВОСТ})
        контекст.route("**/*", lambda путь: путь.continue_() if наружу(путь.request.url) else путь.abort())
        страница = контекст.new_page()

        # Ссылка «в новом окне» открывается в этом же: второго окна у человека нет.
        def новое(п) -> None:
            try:
                адрес = п.url
                п.close()
                if адрес and адрес != "about:blank" and наружу(адрес):
                    страница.goto(адрес, wait_until="commit")
            except Exception:                                # noqa: BLE001
                pass
        контекст.on("page", lambda п: новое(п) if п is not страница else None)

        ключ = secrets.token_urlsafe(18)
        self.окна[ключ] = Окно(хозяин, контекст, страница)
        try:
            страница.goto(дом, wait_until="commit")
        except Exception:                                    # noqa: BLE001
            pass                    # что успело нарисоваться, то и покажем; кадр скажет сам
        return {"окно": ключ}

    def кадр(self, ключ: str, хозяин: str, знаю: str) -> tuple[bytes | None, str, str]:
        о = self._окно(ключ, хозяин)
        сейчас = time.monotonic()
        if not о.кадр or сейчас - о.снято > 0.25:
            try:
                о.кадр = о.страница.screenshot(type="jpeg", quality=КАЧЕСТВО, full_page=False, timeout=4000)
            except Exception:                                # noqa: BLE001
                if not о.кадр:
                    raise Отказ("Страница не отвечает.", 504) from None
            о.хэш = hashlib.blake2b(о.кадр, digest_size=8).hexdigest()
            о.снято = сейчас
        return (None if знаю == о.хэш else о.кадр), о.хэш, о.страница.url

    def действие(self, ключ: str, хозяин: str, д: dict) -> dict:
        о = self._окно(ключ, хозяин)
        с = о.страница
        что = str(д.get("что", ""))
        x, y = _число(д.get("x")), _число(д.get("y"))
        try:
            if что == "click":
                с.mouse.click(x, y)
            elif что == "drag":
                x1, y1 = _число(д.get("x1")), _число(д.get("y1"))
                с.mouse.move(x, y)
                с.mouse.down()
                с.mouse.move(x1, y1, steps=8)
                с.mouse.up()
            elif что == "wheel":
                с.mouse.move(x, y)
                с.mouse.wheel(_число(д.get("dx"), 4000), _число(д.get("dy"), 4000))
            elif что == "key":
                клавиша = str(д.get("клавиша", ""))
                if клавиша in КЛАВИШИ:
                    с.keyboard.press("Space" if клавиша == " " else клавиша)
            elif что == "text":
                с.keyboard.insert_text(str(д.get("текст", ""))[:500])
            elif что == "back":
                с.go_back(wait_until="commit")
            elif что == "forward":
                с.go_forward(wait_until="commit")
            elif что == "reload":
                с.reload(wait_until="commit")
            elif что == "size":
                с.set_viewport_size({"width": _в_пределах(д.get("ш"), МИН_Ш, МАКС_Ш),
                                     "height": _в_пределах(д.get("в"), МИН_В, МАКС_В)})
            else:
                raise Отказ("Такого действия нет.", 400)
        except Отказ:
            raise
        except Exception:                                    # noqa: BLE001
            pass      # страница могла уйти по ссылке посреди действия — кадр покажет, что вышло
        о.снято = 0.0                 # следующий кадр — свежий
        return {"адрес": с.url}

    def закрыть(self, ключ: str, хозяин: str) -> dict:
        if ключ in self.окна and self.окна[ключ].хозяин == хозяин:
            self._закрыть(ключ)
        return {"закрыто": True}

    def состояние(self) -> dict:
        return {"окон": len(self.окна), "можно": ОКОН, "pid": os.getpid()}


def _число(v, край: float = 10_000) -> float:
    try:
        ч = float(v)
    except (TypeError, ValueError):
        return 0.0
    return max(-край, min(край, ч))


def _в_пределах(v, низ: int, верх: int) -> int:
    try:
        ч = int(float(v))
    except (TypeError, ValueError):
        ч = верх
    return max(низ, min(верх, ч))


def служить(порт: int = ПОРТ) -> None:
    """Поднять службу и работать, пока есть для кого. Порт занят — значит служба
    уже есть: молча выходим, двух браузерных не бывает."""
    б = Браузерная()

    class Дверь(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *_):                           # noqa: D401
            return

        def _ответ(self, код: int, тело: bytes, тип: str, ещё: dict | None = None) -> None:
            self.send_response(код)
            self.send_header("Content-Type", тип)
            self.send_header("Content-Length", str(len(тело)))
            for к, з in (ещё or {}).items():
                self.send_header(к, з)
            self.end_headers()
            self.wfile.write(тело)

        def _слова(self, код: int, д: dict) -> None:
            self._ответ(код, json.dumps(д, ensure_ascii=False).encode(), "application/json")

        def _через(self, дело, *доводы):
            try:
                return б.сделать(дело, *доводы)
            except Отказ as e:
                self._слова(e.код, {"error": str(e)})
            except Exception as e:                           # noqa: BLE001
                self._слова(500, {"error": f"Браузер сорвался ({type(e).__name__})."})
            return None

        def do_GET(self) -> None:                            # noqa: N802
            ч = urlsplit(self.path)
            п = {к: з[0] for к, з in parse_qs(ч.query).items()}
            if ч.path == "/state":
                return self._слова(200, б.состояние())
            if ч.path == "/frame":
                итог = self._через(б.кадр, п.get("окно", ""), п.get("хозяин", ""), п.get("знаю", ""))
                if итог is None:
                    return
                кадр, хэш, адрес = итог
                ещё = {"X-Hub-Hash": хэш, "X-Hub-Url": quote(адрес, safe=":/?&=%#.-_~")[:2000]}
                if кадр is None:
                    return self._ответ(204, b"", "image/jpeg", ещё)
                return self._ответ(200, кадр, "image/jpeg", ещё)
            self._слова(404, {"error": "нет такого"})

        def do_POST(self) -> None:                           # noqa: N802
            try:
                д = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
            except ValueError:
                д = {}
            хозяин = str(д.get("хозяин", ""))
            if self.path == "/open":
                итог = self._через(б.открыть, хозяин, str(д.get("дом", "")), д.get("ш"), д.get("в"))
            elif self.path == "/act":
                итог = self._через(б.действие, str(д.get("окно", "")), хозяин, д)
            elif self.path == "/close":
                итог = self._через(б.закрыть, str(д.get("окно", "")), хозяин)
            else:
                return self._слова(404, {"error": "нет такого"})
            if итог is not None:
                self._слова(200, итог)

    try:
        сервер = ThreadingHTTPServer(("127.0.0.1", порт), Дверь)
    except OSError:
        return
    сервер.daemon_threads = True
    threading.Thread(target=сервер.serve_forever, daemon=True).start()
    try:
        б.работать()
    finally:
        сервер.shutdown()
