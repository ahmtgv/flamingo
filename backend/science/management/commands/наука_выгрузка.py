"""Собрать записи исследования в один архив — для анализа.

    .venv/bin/python manage.py наука_выгрузка                 # всё
    .venv/bin/python manage.py наука_выгрузка --без-видео      # без видео и звука: в разы меньше
    .venv/bin/python manage.py наука_выгрузка --с 2026-10-10   # проверки с этого дня

Архив кладётся рядом с записями, в папку `выгрузки`, и команда печатает, как
забрать его на мак одной строкой `scp`. В архив попадает и `участники.json`:
кто есть кто по нашим пометкам — без него записи не связать с людьми.

То же самое отдаёт кабинет владельца кнопками «Скачать» — потоком, без файла
на сервере (`science/выгрузка.py`).
"""
from __future__ import annotations

from datetime import date, datetime, timezone as tz

from django.core.management.base import BaseCommand, CommandError

from science.выгрузка import в_файл
from science.хранилище import корень

МБ = 1024 * 1024


class Command(BaseCommand):
    help = "Упаковать записи исследования в архив для анализа"

    def add_arguments(self, parser) -> None:
        parser.add_argument("--без-видео", action="store_true", help="без видео и звука")
        parser.add_argument("--с", default="", help="только проверки, начатые с этого дня (ГГГГ-ММ-ДД)")

    def handle(self, *args, **opts) -> None:
        с: date | None = None
        if opts["с"]:
            try:
                с = date.fromisoformat(opts["с"])
            except ValueError as e:
                raise CommandError("День — в виде ГГГГ-ММ-ДД.") from e
        без_видео = opts["без_видео"]
        root = корень()
        if not root.exists():
            raise CommandError(f"Записей ещё нет: папки {root} не существует.")

        выгрузки = root / "выгрузки"
        выгрузки.mkdir(exist_ok=True)
        метка = datetime.now(tz.utc).strftime("%Y-%m-%d-%H%M")
        архив = выгрузки / f"наука-{метка}{'-без-видео' if без_видео else ''}.tgz"
        проверок = в_файл(архив, без_видео=без_видео, с=с)

        размер = архив.stat().st_size / МБ
        self.stdout.write(f"Готово: {архив} · {размер:.1f} МБ · проверок {проверок}")
        self.stdout.write("Забрать на мак (выполнить на маке, не на сервере):")
        self.stdout.write(f"  scp root@<сервер>:{архив} ~/Downloads/")
