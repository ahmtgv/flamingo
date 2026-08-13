"""Root GraphQL schema. Each app contributes a Query/Mutation mixin that is
composed here. As modules land (courses, scheduling, ...), add their mixins and
the Subscription type. Keep `docs/flamingo_schema.graphql` in sync via
`python manage.py export_schema api.schema`.
"""

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
from apps.exercises.graphql.mutations import ExercisesMutation
from apps.exercises.graphql.queries import ExercisesQuery
from apps.files.graphql.mutations import FilesMutation
from apps.homework.graphql.mutations import HomeworkMutation
from apps.homework.graphql.queries import HomeworkQuery
from apps.institutions.graphql.mutations import InstitutionsMutation
from apps.institutions.graphql.queries import InstitutionsQuery
from apps.scheduling.graphql.mutations import SchedulingMutation
from apps.scheduling.graphql.queries import SchedulingQuery
from apps.scheduling.graphql.subscriptions import SchedulingSubscription
from apps.seedum.graphql.mutations import SeedumMutation
from apps.seedum.graphql.queries import SeedumQuery
from apps.seedum.graphql.subscriptions import SeedumSubscription
from apps.summaries.graphql.mutations import SummariesMutation
from apps.summaries.graphql.queries import SummariesQuery
from apps.summaries.graphql.subscriptions import SummariesSubscription


@strawberry.type
class Query(
    AccountsQuery,
    CoursesQuery,
    SchedulingQuery,
    HomeworkQuery,
    InstitutionsQuery,
    SeedumQuery,
    ChatQuery,
    BoardQuery,
    ExercisesQuery,
    SummariesQuery,
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
):
    pass


@strawberry.type
class Subscription(
    SeedumSubscription,
    ChatSubscription,
    SchedulingSubscription,
    BoardSubscription,
    SummariesSubscription,
):
    pass


schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)
