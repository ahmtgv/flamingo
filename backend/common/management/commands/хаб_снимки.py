"""Суточный обход источников хаба.

    .venv/bin/python manage.py хаб_снимки              # обычный обход
    .venv/bin/python manage.py хаб_снимки --сила       # не смотреть на свежесть
    .venv/bin/python manage.py хаб_снимки --только hubble,loc
    .venv/bin/python manage.py хаб_снимки --вхолостую  # сходить и рассказать, не записывая

🔴 ОБХОД НИКОГДА НЕ ПАДАЕТ ЦЕЛИКОМ. Один недоступный сайт — это строка в отчёте,
а не конец работы: иначе первый же лежащий музей оставит витрину без снимков.
Код возврата 1 бывает ровно в одном случае — не взялся НИ ОДИН источник: это уже
не «сайт лежит», а «у нас нет сети», и такое таймер должен показать красным.

🔴 СПИСОК ИСТОЧНИКОВ НЕ ДУБЛИРУЕТСЯ РУКАМИ. Он живёт один — в каталоге витрины
(`frontend/src/hub/sources.ts`), а сюда попадает файлом `хаб-источники.json`,
который делает `frontend/scripts/хаб-список.mjs`. Караул `хаб-список` следит,
чтобы файл не разошёлся с каталогом.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from common import снимки

СПИСОК = Path(__file__).resolve().parent.parent.parent / "хаб-источники.json"


class Command(BaseCommand):
    help = "Сходить за превью источников хаба и разложить их в MEDIA_ROOT/хаб"

    def add_arguments(self, parser) -> None:
        parser.add_argument("--сила", action="store_true",
                            help="идти за всеми, даже за свежими")
        parser.add_argument("--только", default="",
                            help="список id через запятую")
        parser.add_argument("--вхолостую", action="store_true",
                            help="сходить и рассказать, ничего не записывая")
        parser.add_argument("--свежесть", type=int, default=20,
                            help="за снимком моложе стольких часов не ходим (по умолчанию 20)")

    def handle(self, *args, **о) -> None:
        if not СПИСОК.exists():
            self.stderr.write(f"нет списка источников: {СПИСОК}")
            raise SystemExit(1)
        каталог = json.loads(СПИСОК.read_text(encoding="utf-8"))
        # 🔴 ЗА ОТКАЗАННЫМИ НЕ ХОДИМ ВОВСЕ. Человек уже посмотрел на их витрину
        # и сказал, что это реклама (`БЕЗ_СНИМКА` в каталоге витрины). Ходить за
        # ней каждые сутки — зря дёргать чужой сервер ради файла, который мы всё
        # равно не покажем.
        отказано = [и["id"] for и in каталог if not и.get("снимок", True)]
        каталог = [и for и in каталог if и.get("снимок", True)]
        только = {x.strip() for x in str(о["только"]).split(",") if x.strip()}
        if только:
            каталог = [и for и in каталог if и["id"] in только]
            if not каталог:
                self.stderr.write("под --только не подошёл ни один источник")
                raise SystemExit(1)

        корень = Path(settings.MEDIA_ROOT)
        опись = снимки.прочесть_опись(корень)
        взяли = пропустили = не_вышло = 0

        for н, и in enumerate(каталог):
            id, дом = и["id"], и["home"]
            if not о["сила"] and снимки.свежий(опись.get(id), о["свежесть"]):
                пропустили += 1
                continue
            if н and снимки.ПАУЗА:
                time.sleep(снимки.ПАУЗА)

            if о["вхолостую"]:
                итог = self._вхолостую(дом, id)
            else:
                итог = снимки.обновить_один(корень, id, дом)

            if итог.вышло:
                взяли += 1
                self.stdout.write(f"✔ {id:10} {итог.байт // 1024:4} КБ  ← {итог.источник}")
                if not о["вхолостую"]:
                    опись[id] = {
                        "взято": _сейчас(),
                        "источник": итог.источник,
                        "байт": итог.байт,
                        "дом": дом,
                    }
            else:
                не_вышло += 1
                # Старый снимок остаётся на месте: сайт лежит, а витрина — нет.
                self.stdout.write(f"✖ {id:10} {итог.словами}")
                if not о["вхолостую"] and id in опись:
                    опись[id]["последняя_беда"] = f"{_сейчас()}: {итог.словами}"

        if not о["вхолостую"]:
            снимки.записать_опись(корень, опись)

        всего = взяли + не_вышло
        self.stdout.write("")
        self.stdout.write(f"взято {взяли}, не вышло {не_вышло}, пропущено по свежести {пропустили}")
        if отказано:
            self.stdout.write(f"отказано человеком (витрина — реклама): {', '.join(отказано)}")
        self.stdout.write(f"снимки лежат в {снимки.куда(корень)}")
        if всего and взяли == 0:
            self.stderr.write("не взялся ни один источник — похоже, у сервера нет сети")
            raise SystemExit(1)

    def _вхолостую(self, дом: str, id: str) -> "снимки.Итог":
        try:
            страница, _ = снимки._достать(дом, снимки.СТРАНИЦА_МАКС)
            витрина = снимки.найти_витрину(страница, дом)
        except снимки.НеВышло as e:
            return снимки.Итог(id, False, str(e))
        return снимки.Итог(id, True, "витрина найдена", источник=витрина, байт=0)


def _сейчас() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
