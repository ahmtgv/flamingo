"""Root GraphQL schema. Each app contributes a Query/Mutation mixin that is
composed here. As modules land (courses, scheduling, ...), add their mixins and
the Subscription type. Keep `docs/flamingo_schema.graphql` in sync via
`python manage.py export_schema api.schema`.
"""

import strawberry

from apps.accounts.graphql.mutations import AccountsMutation
from apps.accounts.graphql.queries import AccountsQuery
from apps.courses.graphql.mutations import CoursesMutation
from apps.courses.graphql.queries import CoursesQuery
from apps.homework.graphql.mutations import HomeworkMutation
from apps.homework.graphql.queries import HomeworkQuery
from apps.institutions.graphql.mutations import InstitutionsMutation
from apps.institutions.graphql.queries import InstitutionsQuery
from apps.scheduling.graphql.mutations import SchedulingMutation
from apps.scheduling.graphql.queries import SchedulingQuery


@strawberry.type
class Query(AccountsQuery, CoursesQuery, SchedulingQuery, HomeworkQuery, InstitutionsQuery):
    pass


@strawberry.type
class Mutation(
    AccountsMutation, CoursesMutation, SchedulingMutation, HomeworkMutation, InstitutionsMutation
):
    pass


schema = strawberry.Schema(query=Query, mutation=Mutation)
