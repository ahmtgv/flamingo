"""Браузерная «Источников мира»: настоящий хром на сервере (`common/браузерная.py`).

    .venv/bin/python manage.py хаб_браузер

Запускать руками не нужно: сайт поднимает её сам при первой надобности, а
оставшись без дела, она уходит сама. Команда — для проверки и для службы
systemd, если захочется держать браузерную отдельной службой.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from common import браузерная


class Command(BaseCommand):
    help = "Поднять браузерную хаба на 127.0.0.1 (порт HUB_BROWSER_PORT, по умолчанию 8011)"

    def handle(self, *args, **о) -> None:
        браузерная.служить()
