"""ASGI entrypoint. Serves HTTP (GraphQL). WebSocket/Channels routing for
GraphQL subscriptions is added with the realtime module."""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_asgi_application()
