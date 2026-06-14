"""Scheduling queries: mySchedule (role-aware), session."""

import datetime as dt
from typing import Annotated

import strawberry

from apps.scheduling import services
from common.auth import require_user

from .types import LessonSession


@strawberry.type
class SchedulingQuery:
    @strawberry.field
    def my_schedule(
        self,
        info: strawberry.Info,
        from_: Annotated[dt.datetime, strawberry.argument(name="from")],
        to: dt.datetime,
    ) -> list[LessonSession]:
        # `from` is a Python keyword; expose the GraphQL arg as `from` (SDL) while
        # the Python param stays `from_`.
        return services.my_schedule(require_user(info), from_, to)

    @strawberry.field
    def session(self, info: strawberry.Info, id: strawberry.ID) -> LessonSession | None:
        return services.get_session(require_user(info), id)
