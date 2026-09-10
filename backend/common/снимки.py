"""Снимки источников хаба: сходить, взять, привести к одному размеру, положить.

🔴 ЗАЧЕМ ЭТО НА СЕРВЕРЕ, А НЕ В БРАУЗЕРЕ. Со страницы опросить чужой сайт
нельзя: чужой сервер не отвечает браузеру на запрос с нашего домена (CORS), а
картинку, взятую по ссылке прямо у источника, каждый посетитель титульной
скачивал бы сам — и был бы виден тридцати шести чужим серверам. Аудитория —
школьники. Поэтому за снимками ходит сервер, раз в сутки, и отдаёт СВОИ файлы.

🔴 ЧТО ИМЕННО БЕРЁМ. `og:image` — это картинка, которую сайт сам объявил своей
витриной: её показывают мессенджеры и соцсети, когда кто-то делится ссылкой.
Мы делаем ровно то же, что делает любой мессенджер, и рядом с картинкой всегда
стоит имя источника. Если сайт такой картинки не объявил — пробуем
`twitter:image` и `link rel=image_src`, а не лезем угадывать по вёрстке.

🔴 СТАРЫЙ СНИМОК НЕ УДАЛЯЕТСЯ, ЕСЛИ НОВЫЙ НЕ ВЗЯЛСЯ. Сайт может лежать час, а
витрина не должна из-за этого сереть. Пишем только по факту удачи, и пишем
через временный файл с переименованием: оборванная запись не оставит половину
картинки, которую потом отдадут человеку.

🔴 ВЕЖЛИВОСТЬ НЕ УКРАШЕНИЕ. Свой User-Agent с адресом сайта, пауза между
запросами, срок ожидания и потолок на размер: чужой сервер должен видеть, кто
пришёл, и не должен от нас страдать.
"""
from __future__ import annotations

import io
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

#: Кто мы. Чужой сервер имеет право знать, кто к нему пришёл, и куда написать.
# 🔴 ТОЛЬКО ЛАТИНИЦА. Заголовки http живут в latin-1, и кириллица в User-Agent
#: роняет запрос ещё до отправки — `UnicodeEncodeError` на каждом источнике.
#: Поймано прибором, а не на боевом сервере.
ЛИЦО = "FlamingoHub/1.0 (+https://flamingo.plus; lesson source preview)"

#: Сколько ждём ответа. Больше — и суточный обход растягивается на часы.
СРОК = int(os.getenv("ХАБ_СРОК", "15"))

#: Потолки. Страницу читаем ради одного тега, картинку — ради одного превью.
СТРАНИЦА_МАКС = 2 * 1024 * 1024
КАРТИНКА_МАКС = 12 * 1024 * 1024

#: Пауза между источниками.
ПАУЗА = float(os.getenv("ХАБ_ПАУЗА", "1.5"))

#: Размер превью. 640×360 — это 240×132 на экране с запасом на двойную плотность.
ШИРИНА, ВЫСОТА = 640, 360
КАЧЕСТВО = 82

#: Куда кладём. Внутри MEDIA_ROOT, отдельной папкой: чужие картинки не должны
#: лежать вперемешку с пособиями преподавателей.
ПАПКА = "хаб"

ОПИСЬ = "опись.json"


class НеВышло(Exception):
    """Не получилось — со словами, которые попадут в журнал обхода."""


class _Метки(HTMLParser):
    """Ищем объявленную сайтом витрину. Больше ничего из страницы не берём."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.og: str | None = None
        self.tw: str | None = None
        self.link: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "meta":
            имя = (a.get("property") or a.get("name") or "").lower()
            что = a.get("content", "").strip()
            if не_пусто(что):
                if имя in ("og:image", "og:image:url", "og:image:secure_url") and not self.og:
                    self.og = что
                elif имя in ("twitter:image", "twitter:image:src") and not self.tw:
                    self.tw = что
        elif tag == "link" and "image_src" in (a.get("rel") or "").lower():
            if не_пусто(a.get("href", "")) and not self.link:
                self.link = a.get("href", "").strip()


def не_пусто(s: str) -> bool:
    return bool(s and s.strip())


def _достать(адрес: str, потолок: int) -> tuple[bytes, str]:
    """Сходить по адресу. Возвращает (тело, тип содержимого) или бросает НеВышло."""
    запрос = urllib.request.Request(адрес, headers={
        "User-Agent": ЛИЦО,
        "Accept": "text/html,application/xhtml+xml,image/*;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru,en;q=0.8",
    })
    try:
        with urllib.request.urlopen(запрос, timeout=СРОК) as ответ:
            тип = (ответ.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            # Читаем с потолком, а не целиком: чужой сервер может отдать гигабайт.
            тело = ответ.read(потолок + 1)
    except urllib.error.HTTPError as e:
        raise НеВышло(f"ответил {e.code}") from None
    except urllib.error.URLError as e:
        raise НеВышло(f"не открылся ({e.reason})") from None
    except Exception as e:                                   # noqa: BLE001
        raise НеВышло(f"сорвался ({type(e).__name__})") from None
    if len(тело) > потолок:
        raise НеВышло(f"больше {потолок // 1024} КБ — не берём")
    return тело, тип


def найти_витрину(страница: bytes, адрес: str) -> str:
    """Из html достаём адрес картинки, которую сайт объявил своей витриной."""
    try:
        текст = страница.decode("utf-8", errors="replace")
    except Exception:                                        # noqa: BLE001
        raise НеВышло("страница не читается") from None
    м = _Метки()
    try:
        м.feed(текст)
    except Exception:                                        # noqa: BLE001
        pass                                                 # битую разметку дочитываем как есть
    нашли = м.og or м.tw or м.link
    if not нашли:
        raise НеВышло("сайт не объявил витрину (нет og:image)")
    return urllib.parse.urljoin(адрес, нашли.strip())


def привести(сырое: bytes) -> tuple[bytes, int, int]:
    """Любая картинка → jpeg 640×360, обрезанный по центру, без EXIF."""
    try:
        from PIL import Image, ImageOps
    except ImportError:                                      # pragma: no cover
        raise НеВышло("нет Pillow: pip install -r requirements.txt") from None
    try:
        им = Image.open(io.BytesIO(сырое))
        им = ImageOps.exif_transpose(им)
        им = им.convert("RGB")
        # `fit` обрезает по центру до нужного отношения — вписывать в поля нельзя:
        # шесть плиток с разными полями читаются как поломка вёрстки.
        им = ImageOps.fit(им, (ШИРИНА, ВЫСОТА), method=Image.LANCZOS, centering=(0.5, 0.5))
    except НеВышло:
        raise
    except Exception as e:                                   # noqa: BLE001
        raise НеВышло(f"картинка не открылась ({type(e).__name__})") from None
    буфер = io.BytesIO()
    им.save(буфер, "JPEG", quality=КАЧЕСТВО, optimize=True, progressive=True)
    return буфер.getvalue(), ШИРИНА, ВЫСОТА


@dataclass
class Итог:
    id: str
    вышло: bool
    словами: str
    источник: str = ""
    байт: int = 0


def куда(корень: Path) -> Path:
    п = Path(корень) / ПАПКА
    п.mkdir(parents=True, exist_ok=True)
    return п


def прочесть_опись(корень: Path) -> dict:
    ф = куда(корень) / ОПИСЬ
    if not ф.exists():
        return {}
    try:
        return json.loads(ф.read_text(encoding="utf-8"))
    except Exception:                                        # noqa: BLE001
        return {}


def записать_опись(корень: Path, опись: dict) -> None:
    ф = куда(корень) / ОПИСЬ
    врем = ф.with_suffix(".json.врем")
    врем.write_text(json.dumps(опись, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    os.replace(врем, ф)


def свежий(запись: dict | None, часов: int) -> bool:
    """Снимок моложе указанного срока — второй раз за ним не ходим."""
    if not запись or not запись.get("взято"):
        return False
    try:
        было = datetime.fromisoformat(str(запись["взято"]).replace("Z", "+00:00"))
    except ValueError:
        return False
    return (datetime.now(timezone.utc) - было).total_seconds() < часов * 3600


def обновить_один(корень: Path, id: str, дом: str) -> Итог:
    """Один источник: страница → витрина → картинка → файл. Ошибка не роняет обход."""
    if not id or not всё_буквы(id):
        return Итог(id, False, "имя источника не годится в имя файла")
    try:
        страница, _ = _достать(дом, СТРАНИЦА_МАКС)
        витрина = найти_витрину(страница, дом)
        сырое, тип = _достать(витрина, КАРТИНКА_МАКС)
        if тип and not тип.startswith("image/"):
            raise НеВышло(f"по адресу витрины лежит не картинка ({тип})")
        готовое, _, _ = привести(сырое)
    except НеВышло as e:
        return Итог(id, False, str(e))
    файл = куда(корень) / f"{id}.jpg"
    врем = файл.with_suffix(".jpg.врем")
    врем.write_bytes(готовое)
    os.replace(врем, файл)
    return Итог(id, True, "взят", источник=витрина, байт=len(готовое))


def всё_буквы(id: str) -> bool:
    """Имя источника идёт в имя файла и в адрес — пускаем только простое."""
    return bool(id) and all(c.isalnum() or c in "-_" for c in id) and not id.startswith("-")
