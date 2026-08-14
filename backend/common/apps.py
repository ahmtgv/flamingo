"""`common` as an installed app — so its connection hooks are registered on startup.

The only reason this exists: `common/sqlite_unicode.py` has to be imported before the first
database connection, and an AppConfig's `ready()` is the one place Django guarantees that.
"""

from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "common"

    def ready(self) -> None:
        from common import sqlite_unicode  # noqa: F401  (registers a connection receiver)
