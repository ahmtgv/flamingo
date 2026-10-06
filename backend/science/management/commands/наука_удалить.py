"""Удалить всё, что записано от добровольца, — по его просьбе.

    .venv/bin/python manage.py наука_удалить <код>            # показать, что будет удалено
    .venv/bin/python manage.py наука_удалить <код> --да-удалить  # удалить

🔴 БЕЗ ФЛАГА НИЧЕГО НЕ УДАЛЯЕТСЯ. Удаление необратимо: папка записей уходит
целиком, строки в базе — тоже. Поэтому сначала команда только показывает, что
найдено, и удаляет лишь со вторым, явным словом. В согласии обещано: «можно
попросить удалить всё» — эта команда и есть обещанное.

Уже сделанные выгрузки (`выгрузки/*.tgz`) команда не трогает: в них записи
этого человека остаются, и их нужно удалить отдельно — команда напомнит.
"""
from __future__ import annotations

import shutil

from django.core.management.base import BaseCommand, CommandError

from science.models import Run, Volunteer
from science.хранилище import CODE, корень, папка_добровольца

МБ = 1024 * 1024


class Command(BaseCommand):
    help = "Удалить записи и согласие добровольца исследования"

    def add_arguments(self, parser) -> None:
        parser.add_argument("код", help="код из ссылки добровольца")
        parser.add_argument("--да-удалить", action="store_true", help="действительно удалить")

    def handle(self, *args, **opts) -> None:
        код = opts["код"]
        if not CODE.match(код):
            raise CommandError("Это не код добровольца: 12 знаков из ссылки flamingo.plus/наука/<код>.")
        в = Volunteer.objects.filter(code=код).first()
        папка = папка_добровольца(код)
        байт = sum(f.stat().st_size for f in папка.rglob("*") if f.is_file()) if папка.exists() else 0
        проверок = Run.objects.filter(volunteer=в).count() if в else 0
        if not в and not папка.exists():
            raise CommandError("Такого добровольца нет ни в базе, ни на диске.")
        self.stdout.write(
            f"{код} · {в.label if в else 'нет в базе'} · проверок {проверок} · на диске {байт / МБ:.1f} МБ в {папка}"
        )
        if not opts["да_удалить"]:
            self.stdout.write("Ничего не удалено. Чтобы удалить, повторите с --да-удалить")
            return
        if папка.exists():
            shutil.rmtree(папка)
        if в:
            в.delete()  # проверки уходят вместе с ним (CASCADE)
        self.stdout.write(f"Удалено: {код}.")
        выгрузки = sorted((корень() / "выгрузки").glob("*.tgz")) if (корень() / "выгрузки").exists() else []
        if выгрузки:
            self.stdout.write("⚠️ Его записи остались в прежних выгрузках — удалите их отдельно или соберите заново:")
            for f in выгрузки:
                self.stdout.write(f"   {f}")
