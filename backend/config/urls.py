from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from strawberry.django.views import GraphQLView

from api.schema import schema

# JWT bearer auth (no cookies) -> CSRF is not applicable to the API endpoint.
urlpatterns = [
    path("graphql/", csrf_exempt(GraphQLView.as_view(schema=schema))),
]
