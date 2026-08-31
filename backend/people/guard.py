"""Пять попыток и двадцать минут отдыха.

Решение владельца 31.08. Без этого пароль можно подбирать вечно: argon2id делает
одну попытку дорогой, но не делает дорогим миллион попыток за ночь.
"""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from .models import Tries

TRIES = 5
REST = timedelta(minutes=20)


def who_from(request) -> str:
    """Адрес, откуда пришли. За Cloudflare настоящий адрес приезжает в заголовке,
    а не в REMOTE_ADDR: там будет адрес самого Cloudflare, один на всех."""
    fwd = request.META.get("HTTP_CF_CONNECTING_IP") or request.META.get("HTTP_X_FORWARDED_FOR", "")
    return (fwd.split(",")[0].strip() or request.META.get("REMOTE_ADDR", "?"))[: Tries.KEY_MAX]


def locked_for(*keys: str) -> int:
    """Сколько минут ждать. 0 — можно пробовать."""
    now = timezone.now()
    left = 0
    for row in Tries.objects.filter(key__in=[k for k in keys if k]):
        if row.until and row.until > now:
            left = max(left, int((row.until - now).total_seconds() // 60) + 1)
    return left


def missed(*keys: str) -> None:
    """Попытка не удалась. Пятая запирает."""
    now = timezone.now()
    for key in keys:
        if not key:
            continue
        row, _ = Tries.objects.get_or_create(pk=key[: Tries.KEY_MAX])
        if row.until and row.until <= now:
            row.fails = 0  # отдых кончился — счёт с нуля
            row.until = None
        row.fails += 1
        if row.fails >= TRIES:
            row.until = now + REST
            row.fails = 0
        row.save()


def hit(*keys: str) -> None:
    """Вошли. Счётчик обнуляется, чтобы вчерашние опечатки не копились годами."""
    Tries.objects.filter(key__in=[k for k in keys if k]).delete()
