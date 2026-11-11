"""Пускает ли источник показывать себя внутри чужой страницы.

🔴 ЗАЧЕМ. «Источники мира» открывают чужой сайт в рамке. Сайт вправе это
запретить — заголовком `X-Frame-Options` или строкой `frame-ancestors` в
`Content-Security-Policy`, — и тогда рамка у человека просто пустая. Браузер
странице об этом не говорит, поэтому узнать заранее можно только отсюда, с
сервера: сходить и прочитать заголовки ответа.

Мы ничего не обходим и не подменяем: только читаем то, что сайт сам о себе
объявил, и запоминаем. Что с этим знанием делать на экране — решает владелец.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from . import снимки

ФАЙЛ = "рамки.json"

МОЖНО, НЕЛЬЗЯ, НЕИЗВЕСТНО = "можно", "нельзя", "неизвестно"

#: Кто мы для чужого сайта: страница, в которую он был бы вставлен.
НАШ_ДОМ = "flamingo.plus"


def по_заголовкам(xfo: str, csp: str) -> tuple[str, str]:
    """Решение по двум заголовкам. Возвращает (итог, причина словами).

    `frame-ancestors` главнее: где он есть, браузер `X-Frame-Options` не слушает.
    """
    предки = None
    for кусок in (csp or "").split(";"):
        слова = кусок.strip().split()
        if слова and слова[0].lower() == "frame-ancestors":
            предки = [с.lower() for с in слова[1:]]
            break
    if предки is not None:
        if "*" in предки or "https:" in предки or any(НАШ_ДОМ in с for с in предки):
            return МОЖНО, "frame-ancestors нас пускает"
        return НЕЛЬЗЯ, "frame-ancestors: " + (" ".join(предки) or "'none'")
    знак = (xfo or "").strip().lower()
    if знак.startswith(("deny", "sameorigin", "allow-from")):
        return НЕЛЬЗЯ, f"X-Frame-Options: {знак.upper()}"
    return МОЖНО, "запрета не объявлено"


def проверить(адрес: str) -> tuple[str, str]:
    """Сходить и прочитать заголовки. Тело не читаем — оно здесь не нужно."""
    запрос = urllib.request.Request(адрес, headers={
        "User-Agent": снимки.ЛИЦО,
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru,en;q=0.8",
    })
    try:
        with urllib.request.urlopen(запрос, timeout=снимки.СРОК) as ответ:
            заголовки = ответ.headers
    except urllib.error.HTTPError as e:
        # Отказ роботу — не ответ на наш вопрос: человеку сайт может открыться.
        return НЕИЗВЕСТНО, f"ответил {e.code}"
    except urllib.error.URLError as e:
        return НЕИЗВЕСТНО, f"не открылся ({e.reason})"
    except Exception as e:                                   # noqa: BLE001
        return НЕИЗВЕСТНО, f"сорвался ({type(e).__name__})"
    return по_заголовкам(заголовки.get("X-Frame-Options") or "",
                         заголовки.get("Content-Security-Policy") or "")


def прочесть(корень: Path) -> dict:
    ф = снимки.куда(корень) / ФАЙЛ
    if not ф.exists():
        return {}
    try:
        return json.loads(ф.read_text(encoding="utf-8"))
    except Exception:                                        # noqa: BLE001
        return {}


def записать(корень: Path, рамки: dict) -> None:
    ф = снимки.куда(корень) / ФАЙЛ
    врем = ф.with_suffix(".json.врем")
    врем.write_text(json.dumps(рамки, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    os.replace(врем, ф)
