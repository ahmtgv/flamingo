"""Device reads. The caller's own machines, and nothing else."""

from __future__ import annotations

import strawberry
from django.utils import timezone

from apps.devices import services
from apps.meetingpoint.services import HEARTBEAT_WINDOW
from common.auth import require_device, require_user

from .types import Device


@strawberry.type
class DevicesQuery:
    @strawberry.field
    def my_devices(self, info: strawberry.Info) -> list[Device]:
        """«Привязанные машины» with a revoke button next to each (§19.4).

        Takes no user id: whose laptops exist is nobody else's business, and an endpoint that
        accepted one would be an invitation to find out.
        """
        cutoff = timezone.now() - HEARTBEAT_WINDOW
        return [
            Device.of(row, online=row.last_seen_at is not None and row.last_seen_at >= cutoff)
            for row in services.my_devices(require_user(info))
        ]

    @strawberry.field
    def this_device(self, info: strawberry.Info) -> Device:
        """Эта машина — о себе. Аутентификация машиной, не пользователем.

        🔴 Заведено 15.08. Мастер первого запуска обещает на экране: «сделанное сохраняется,
        приложение вернёт на тот же шаг». Обещание было ложным: состояние шага мастер брал из
        `myDevices`, а тот требует ПОЛЬЗОВАТЕЛЬСКОЙ сессии, которой в приложении нет и не будет
        (§19.4). Любой перезапуск возвращал человека на шаг 1.

        Отдаёт ровно одну машину — ту, чьим ключом подписан запрос. Идентификатора не
        принимает: спросить о чужой машине через эту дверь невозможно by construction.
        """
        cutoff = timezone.now() - HEARTBEAT_WINDOW
        device = require_device(info)
        return Device.of(
            device, online=device.last_seen_at is not None and device.last_seen_at >= cutoff
        )
