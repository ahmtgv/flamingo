"""Meeting-point writes: the access mode, replacing the link, and the host's heartbeat."""

from __future__ import annotations

import strawberry

from apps.meetingpoint import services
from common.auth import require_user
from common.enums import MeetingAccessMode

from .types import HostPresence, MeetingPoint


@strawberry.type
class MeetingPointMutation:
    @strawberry.mutation
    def set_meeting_access(
        self, info: strawberry.Info, group_id: strawberry.ID, mode: MeetingAccessMode
    ) -> MeetingPoint:
        """D3's three modes. The default stays the sheet's until the owner answers §5.1."""
        user = require_user(info)
        point = services.set_access_mode(user, group_id, mode.value)
        return MeetingPoint.of(point, host_online=services.host_online(point.group))

    @strawberry.mutation
    def replace_meeting_link(self, info: strawberry.Info, group_id: strawberry.ID) -> MeetingPoint:
        """«Заменить ссылку». The old slug is remembered so it can say it was replaced."""
        user = require_user(info)
        point = services.replace_link(user, group_id)
        return MeetingPoint.of(point, host_online=services.host_online(point.group))

    @strawberry.mutation
    def host_heartbeat(self, info: strawberry.Info, device_token: str) -> HostPresence:
        """The teacher's machine says it is alive; everyone waiting at the link is told.

        Takes the key as an argument rather than through the auth header: the header path
        belongs with the sidecar (Р5.2), when its shape is known. The same choice
        `redeemProjectorCode` already makes for the same reason.
        """
        device, groups = services.heartbeat(device_token)
        slug = ""
        for group in groups:
            point = services.ensure_meeting_point(group)
            slug = point.slug
            break
        return HostPresence(slug=slug, online=True)
