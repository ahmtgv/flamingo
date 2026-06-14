"""Scheduling queries: mySchedule (role-aware), session."""

import datetime as dt

import strawberry

from apps.scheduling import services
from common.auth import require_user

from .types import LessonSession


@strawberry.type
class SchedulingQuery:
    @strawberry.field
    def my_schedule(
        self, info: strawberry.Info, from_: dt.datetime, to: dt.datetime
    ) -> list[LessonSession]:
        # `from_` -> GraphQL `from` (Strawberry strips the trailing underscore).
        return services.my_schedule(require_user(info), from_, to)

    @strawberry.field
    def session(self, info: strawberry.Info, id: strawberry.ID) -> LessonSession | None:
        return services.get_session(require_user(info), id)
