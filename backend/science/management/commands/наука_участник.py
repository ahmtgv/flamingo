"""Выдать ссылку добровольцу исследования внимания.

    .venv/bin/python manage.py наука_участник "мама"
    .venv/bin/python manage.py наука_участник "семья Ивановых" --сколько 4

Пометка видна только здесь и в `наука_список` — на страницу она не уходит.
Ссылку можно переслать человеку как есть: она и есть его пропуск.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from science.models import Volunteer

САЙТ = "https://flamingo.plus"


class Command(BaseCommand):
    help = "Завести добровольца исследования и напечатать его ссылку"

    def add_arguments(self, parser) -> None:
        parser.add_argument("пометка", help="кто это — для нас, не для страницы")
        parser.add_argument("--сколько", type=int, default=1, help="сколько ссылок с этой пометкой")

    def handle(self, *args, **opts) -> None:
        сколько = opts["сколько"]
        if not 1 <= сколько <= 50:
            raise CommandError("За раз — от 1 до 50 ссылок.")
        пометка = " ".join(str(opts["пометка"]).split())[:120]
        for i in range(сколько):
            метка = пометка if сколько == 1 else f"{пометка} · {i + 1}"
            в = Volunteer.objects.create(label=метка)
            self.stdout.write(f"{метка}: {САЙТ}/наука/{в.code}")
