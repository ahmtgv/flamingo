"""ASGI entrypoint.

HTTP (GraphQL) stays on the Django application so the JWTAuthMiddleware runs.
WebSocket (graphql-ws subscriptions over Channels) is routed to Strawberry's
GraphQL-WS consumer. Subscription resolvers authenticate from the graphql-ws
connection_params (see apps/seedum/graphql/subscriptions.py).
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# HTTP path: the full Django stack (urls.py GraphQLView + JWTAuthMiddleware).
django_asgi_app = get_asgi_application()

# Imports that touch the app registry / schema must come after get_asgi_application().
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from django.urls import re_path  # noqa: E402
from strawberry.channels import GraphQLWSConsumer  # noqa: E402

from api.schema import schema  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": URLRouter([re_path(r"^graphql/?$", GraphQLWSConsumer.as_asgi(schema=schema))]),
    }
)
