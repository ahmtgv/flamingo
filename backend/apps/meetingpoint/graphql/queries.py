"""Meeting-point reads — all of them answerable without the teacher's machine."""

from __future__ import annotations

import strawberry

from apps.meetingpoint import mirror, services
from common.auth import require_user
from common.enums import MirrorKind

from .types import MeetingPoint, MeetingPointView, MirroredRecord


@strawberry.type
class MeetingPointQuery:
    @strawberry.field
    def meeting_point(self, info: strawberry.Info, slug: str) -> MeetingPointView:
        """What a person holding the link sees: when the lesson is, whether the host is up,
        whether they may come in — and what works meanwhile."""
        return MeetingPointView.of(services.view_by_slug(require_user(info), slug))

    @strawberry.field
    def meeting_point_by_code(self, info: strawberry.Info, code: str) -> MeetingPointView:
        """The same, reached by the six characters somebody read out over the phone."""
        return MeetingPointView.of(services.view_by_code(require_user(info), code))

    @strawberry.field
    def group_meeting_point(self, info: strawberry.Info, group_id: strawberry.ID) -> MeetingPoint:
        """The teacher's own view: the permanent link, the code, the access mode."""
        user = require_user(info)
        point = services.for_teacher(user, group_id)
        return MeetingPoint.of(point, host_online=services.host_online(point.group))

    @strawberry.field
    def my_mirror(
        self, info: strawberry.Info, kind: MirrorKind | None = None, limit: int = 100
    ) -> list[MirroredRecord]:
        """A pupil's own learning, readable whatever became of the teacher's laptop (Р5.0-Б).

        🔒 The caller's own, always: the query takes no student id, and somebody else's
        mirror is not reachable by asking nicely — the same per-resolver rule as the web.
        """
        return [
            MirroredRecord.of(row)
            for row in mirror.my_mirror(require_user(info), kind=kind, limit=limit)
        ]
