"""Собрать записи исследования в один архив — для анализа.

    .venv/bin/python manage.py наука_выгрузка                 # всё
    .venv/bin/python manage.py наука_выгрузка --без-видео      # без видео и звука: в разы меньше
    .venv/bin/python manage.py наука_выгрузка --с 2026-10-10   # проверки с этого дня

Архив кладётся рядом с записями, в папку `выгрузки`, и команда печатает, как
забрать его на мак одной строкой `scp`. В архив попадает и `участники.json`:
кто есть кто по нашим пометкам — без него записи не связать с людьми.

🔴 ЧИТАЕТ ДИСК, А НЕ БАЗУ. Папка каждой проверки описывает себя сама
(`meta.json`), поэтому архив полон, даже если база когда-нибудь разойдётся с
диском. База нужна только для пометок «кто это».
"""
from __future__ import annotations

import io
import json
import tarfile
from datetime import date, datetime, timezone as tz
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from science.models import Volunteer
from science.хранилище import корень

МБ = 1024 * 1024
ТЯЖЁЛОЕ = ("video-", "audio-")


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

        участники = {
            в.code: {"пометка": в.label, "имя": в.name, "согласие": в.consent, "анкета": в.profile,
                     "по_общей_ссылке": bool(в.invite_id)}
            for в in Volunteer.objects.all()
        }
        проверок = 0
        with tarfile.open(архив, "w:gz") as tar:
            сводка = json.dumps(участники, ensure_ascii=False, indent=1).encode()
            инфо = tarfile.TarInfo("наука/участники.json")
            инфо.size = len(сводка)
            tar.addfile(инфо, io.BytesIO(сводка))
            for папка_в in sorted(p for p in root.iterdir() if p.is_dir() and p.name != "выгрузки"):
                vj = папка_в / "volunteer.json"
                if vj.exists():
                    tar.add(vj, arcname=f"наука/{папка_в.name}/volunteer.json")
                for папка_р in sorted(p for p in папка_в.iterdir() if p.is_dir()):
                    meta = папка_р / "meta.json"
                    if с and meta.exists():
                        начата = str(json.loads(meta.read_text("utf-8")).get("начата", ""))[:10]
                        if начата and начата < с.isoformat():
                            continue
                    проверок += 1
                    for f in sorted(папка_р.iterdir()):
                        if f.name.startswith("."):
                            continue
                        if без_видео and f.name.startswith(ТЯЖЁЛОЕ):
                            continue
                        tar.add(f, arcname=f"наука/{папка_в.name}/{папка_р.name}/{f.name}")

        размер = архив.stat().st_size / МБ
        self.stdout.write(f"Готово: {архив} · {размер:.1f} МБ · проверок {проверок}")
        self.stdout.write("Забрать на мак (выполнить на маке, не на сервере):")
        self.stdout.write(f"  scp root@<сервер>:{архив} ~/Downloads/")
