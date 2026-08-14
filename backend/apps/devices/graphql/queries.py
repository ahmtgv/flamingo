"""Device reads. The caller's own machines, and nothing else."""

from __future__ import annotations

import strawberry
from django.utils import timezone

from apps.devices import services
from apps.meetingpoint.services import HEARTBEAT_WINDOW
from common.auth import require_user

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
