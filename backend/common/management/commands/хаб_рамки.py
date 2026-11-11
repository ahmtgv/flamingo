"""Какие источники хаба пускают показывать себя в рамке, а какие нет.

    .venv/bin/python manage.py хаб_рамки
    .venv/bin/python manage.py хаб_рамки --только met,hermitage

Ходит по каталогу, читает заголовки ответа, печатает таблицу и кладёт итог в
`MEDIA_ROOT/хаб/рамки.json`. Ничего не обходит: только читает объявленное.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from common import рамки, снимки

СПИСОК = Path(__file__).resolve().parent.parent.parent / "хаб-источники.json"


class Command(BaseCommand):
    help = "Проверить, какие источники хаба разрешают показ внутри рамки"

    def add_arguments(self, parser) -> None:
        parser.add_argument("--только", default="", help="список id через запятую")

    def handle(self, *args, **о) -> None:
        каталог = json.loads(СПИСОК.read_text(encoding="utf-8"))
        только = {x.strip() for x in str(о["только"]).split(",") if x.strip()}
        if только:
            каталог = [и for и in каталог if и["id"] in только]
        корень = Path(settings.MEDIA_ROOT)
        итог = рамки.прочесть(корень)
        счёт = {рамки.МОЖНО: 0, рамки.НЕЛЬЗЯ: 0, рамки.НЕИЗВЕСТНО: 0}
        for н, и in enumerate(каталог):
            if н and снимки.ПАУЗА:
                time.sleep(снимки.ПАУЗА)
            что, почему = рамки.проверить(и["home"])
            счёт[что] += 1
            знак = {"можно": "✔", "нельзя": "✖", "неизвестно": "?"}[что]
            self.stdout.write(f"{знак} {и['id']:14} {что:10} {почему}")
            # Неизвестное не затирает прошлое знание: сайт мог просто лежать.
            if что != рамки.НЕИЗВЕСТНО or и["id"] not in итог:
                итог[и["id"]] = {"рамка": что, "почему": почему}
        рамки.записать(корень, итог)
        self.stdout.write("")
        self.stdout.write(f"в рамке можно: {счёт['можно']}, нельзя: {счёт['нельзя']}, "
                          f"не узнали: {счёт['неизвестно']}")
