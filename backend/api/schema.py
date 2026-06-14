"""Root GraphQL schema. Each app contributes a Query/Mutation mixin that is
composed here. As modules land (courses, scheduling, ...), add their mixins and
the Subscription type. Keep `docs/flamingo_schema.graphql` in sync via
`python manage.py export_schema api.schema`.
"""

import strawberry

from apps.accounts.graphql.mutations import AccountsMutation
from apps.accounts.graphql.queries import AccountsQuery


@strawberry.type
class Query(AccountsQuery):
    pass


@strawberry.type
class Mutation(AccountsMutation):
    pass


schema = strawberry.Schema(query=Query, mutation=Mutation)
