"""Root GraphQL schema. Each app contributes a Query/Mutation mixin that is
composed here. As modules land (courses, scheduling, ...), add their mixins and
the Subscription type. Keep `docs/flamingo_schema.graphql` in sync via
`python manage.py export_schema api.schema`.
"""

import logging

import strawberry

from apps.accounts.graphql.mutations import AccountsMutation
from apps.accounts.graphql.queries import AccountsQuery
from apps.board.graphql.mutations import BoardMutation
from apps.board.graphql.queries import BoardQuery
from apps.board.graphql.subscriptions import BoardSubscription
from apps.chat.graphql.mutations import ChatMutation
from apps.chat.graphql.queries import ChatQuery
from apps.chat.graphql.subscriptions import ChatSubscription
from apps.courses.graphql.mutations import CoursesMutation
from apps.courses.graphql.queries import CoursesQuery
from apps.devices.graphql.mutations import DevicesMutation
from apps.devices.graphql.queries import DevicesQuery
from apps.exercises.graphql.mutations import ExercisesMutation
from apps.exercises.graphql.queries import ExercisesQuery
from apps.exercises.graphql.subscriptions import DictionarySubscription
from apps.files.graphql.mutations import FilesMutation
from apps.files.graphql.queries import FilesQuery
from apps.homework.graphql.mutations import HomeworkMutation
from apps.homework.graphql.queries import HomeworkQuery
from apps.institutions.graphql.mutations import InstitutionsMutation
from apps.institutions.graphql.queries import InstitutionsQuery
from apps.meetingpoint.graphql.mutations import MeetingPointMutation
from apps.meetingpoint.graphql.queries import MeetingPointQuery
from apps.meetingpoint.graphql.subscriptions import MeetingPointSubscription
from apps.oversight.graphql.mutations import OversightMutation
from apps.oversight.graphql.queries import OversightQuery
from apps.scheduling.graphql.mutations import SchedulingMutation
from apps.scheduling.graphql.queries import SchedulingQuery
from apps.scheduling.graphql.subscriptions import SchedulingSubscription
from apps.seedum.graphql.mutations import SeedumMutation
from apps.seedum.graphql.queries import SeedumQuery
from apps.seedum.graphql.subscriptions import SeedumSubscription
from apps.signalling.graphql.mutations import SignallingMutation
from apps.signalling.graphql.queries import SignallingQuery
from apps.signalling.graphql.subscriptions import SignallingSubscription
from apps.summaries.graphql.mutations import SummariesMutation
from apps.summaries.graphql.queries import SummariesQuery
from apps.summaries.graphql.subscriptions import SummariesSubscription
from common.exceptions import FlamingoError


@strawberry.type
class Query(
    AccountsQuery,
    CoursesQuery,
    SchedulingQuery,
    HomeworkQuery,
    InstitutionsQuery,
    SeedumQuery,
    FilesQuery,
    ChatQuery,
    BoardQuery,
    ExercisesQuery,
    SummariesQuery,
    DevicesQuery,
    MeetingPointQuery,
    SignallingQuery,
    OversightQuery,
):
    pass


@strawberry.type
class Mutation(
    AccountsMutation,
    CoursesMutation,
    SchedulingMutation,
    HomeworkMutation,
    InstitutionsMutation,
    SeedumMutation,
    FilesMutation,
    ChatMutation,
    BoardMutation,
    ExercisesMutation,
    SummariesMutation,
    DevicesMutation,
    MeetingPointMutation,
    SignallingMutation,
    OversightMutation,
):
    pass


@strawberry.type
class Subscription(
    SeedumSubscription,
    ChatSubscription,
    SchedulingSubscription,
    BoardSubscription,
    SummariesSubscription,
    DictionarySubscription,
    MeetingPointSubscription,
    SignallingSubscription,
):
    pass


logger = logging.getLogger(__name__)


class FlamingoSchema(strawberry.Schema):
    """Схема, которая отличает ожидаемое состояние от поломки.

    🔴 ЛОГ ТОНУЛ В ОЖИДАЕМОМ (наряд 37 §4.2, найдено 18.08). Приложение опрашивает связывание
    каждые две секунды, и на каждый опрос сервер писал ПОЛНУЮ ТРАССИРОВКУ «This code has not
    been confirmed yet» — то есть нормальное «код ещё не подтвердили» выглядело как авария.

    Этот шум 18.08 **скрыл настоящую причину поломки входа**: её нашли, только заглушив
    приложение. Ожидаемое состояние, записанное как ошибка, — это не лишние байты, это
    выключенный лог: в нём перестают искать.

    Отсюда разделение. `FlamingoError` и его потомки (отказ в правах, «не найдено», «так
    нельзя») — это ОТВЕТ продукта человеку, они уходят одной строкой уровня INFO. Всё
    остальное — по-прежнему с трассировкой: неожиданное обязано быть видно.
    """

    def process_errors(self, errors, execution_context=None) -> None:
        unexpected = []
        for error in errors:
            original = getattr(error, "original_error", None)
            if isinstance(original, FlamingoError):
                logger.info("отказ продукта: %s", error.message)
                continue
            unexpected.append(error)
        if unexpected:
            super().process_errors(unexpected, execution_context)


schema = FlamingoSchema(query=Query, mutation=Mutation, subscription=Subscription)
