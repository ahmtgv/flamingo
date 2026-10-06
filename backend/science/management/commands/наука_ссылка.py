"""Общая ссылка исследования — одна на всех (решение владельца 06.10).

    .venv/bin/python manage.py наука_ссылка            # показать действующую (нет — завести)
    .venv/bin/python manage.py наука_ссылка --новая    # завести новую, прежние погасить

Кто открыл ссылку впервые, называет себя и получает свой код — записи разных
людей не смешиваются. Если ссылка ушла не туда, `--новая` закрывает вход по
старой; кто уже вошёл, остаётся со своим кодом и своими записями.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from science.models import Invite

САЙТ = "https://flamingo.plus"


class Command(BaseCommand):
    help = "Показать или сменить общую ссылку исследования"

    def add_arguments(self, parser) -> None:
        parser.add_argument("--новая", action="store_true", help="завести новую ссылку, прежние погасить")

    def handle(self, *args, **opts) -> None:
        with transaction.atomic():
            if opts["новая"]:
                погашено = Invite.objects.filter(active=True).update(active=False)
                if погашено:
                    self.stdout.write(f"Прежних ссылок погашено: {погашено}. По ним больше не войти.")
                п = Invite.objects.create()
            else:
                п = Invite.objects.filter(active=True).first() or Invite.objects.create()
        пришло = п.volunteers.count()
        self.stdout.write(f"Ссылка для всех: {САЙТ}/наука/вход-{п.token}")
        self.stdout.write(f"По ней вошло людей: {пришло}")
