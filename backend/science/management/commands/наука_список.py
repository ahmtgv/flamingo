"""Кто участвует в исследовании и сколько записано.

    .venv/bin/python manage.py наука_список
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db.models import Count, Sum

from science.models import Run, Volunteer
from science.хранилище import корень, свободно

МБ = 1024 * 1024


class Command(BaseCommand):
    help = "Добровольцы, их проверки и место на диске"

    def handle(self, *args, **opts) -> None:
        всего_байт = 0
        for в in Volunteer.objects.order_by("created"):
            р = Run.objects.filter(volunteer=в)
            итог = р.aggregate(байт=Sum("bytes"), штук=Count("id"))
            # Остановленные сами — отдельно: запись есть, но проверка не пройдена.
            итоги = [x for x in р.filter(finished__isnull=False).values_list("summary", flat=True)]
            остановлено = sum(1 for x in итоги if isinstance(x, dict) and x.get("прервано"))
            закончено = len(итоги) - остановлено
            байт = итог["байт"] or 0
            всего_байт += байт
            виды = ", ".join(f"{x['kind']}×{x['n']}" for x in р.values("kind").annotate(n=Count("id")).order_by("kind"))
            согласие = "согласие есть" if в.consent else "согласия ещё нет"
            self.stdout.write(
                f"{в.code}  {в.label or в.name or '—':<24} {согласие:<17} проверок {итог['штук']} "
                f"(закончено {закончено}{f', остановлено {остановлено}' if остановлено else ''}) · {байт / МБ:.1f} МБ · {виды or '—'}"
            )
        self.stdout.write(f"\nВсего записано: {всего_байт / МБ:.1f} МБ в {корень()}")
        self.stdout.write(f"Свободно на диске: {свободно() / МБ / 1024:.1f} ГБ")
