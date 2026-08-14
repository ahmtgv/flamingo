"""Make SQLite's LIKE case-insensitive for Russian (Р5.2, ADR-001).

Found by the spike, not by reading: running the whole suite against SQLite left exactly one
failure — the catalogue search for «биолог» did not find «Биология».

SQLite's built-in `LIKE` folds case for ASCII only. On Postgres `icontains` compiles to
`ILIKE` and matches; on SQLite it compiles to `LIKE`, which quietly does not. Quietly is the
problem: a teacher on the desktop build types a lowercase Russian word into the search box and
gets an empty list, with nothing anywhere saying why.

SQLite lets an application replace `like` with its own implementation, and Python's `str`
already folds case for the whole of Unicode. So the fix is four lines and it makes the desktop
behave like the server rather than making the server behave like the desktop.

Registered from `common.apps.CommonConfig.ready`, so it applies to every SQLite connection —
the tests included. That is deliberate: a difference between what the tests run on and what a
teacher runs on is a difference nobody discovers until a teacher does.
"""

from __future__ import annotations

from django.db.backends.signals import connection_created
from django.dispatch import receiver


def _like(pattern: str | None, value: str | None, escape: str | None = None) -> bool:
    """SQLite's LIKE, case-folded across all of Unicode.

    Only `%` and `_` are special in LIKE. Translating the pattern by hand rather than reaching
    for a regular expression keeps the semantics identical to SQLite's own — a regex would
    quietly give `.` and `*` a meaning they do not have in LIKE.
    """
    if pattern is None or value is None:
        return False

    pattern, value = str(pattern).casefold(), str(value).casefold()
    escape = escape.casefold() if escape else None
    return _matches(pattern, value, escape)


def _matches(pattern: str, value: str, escape: str | None) -> bool:
    """Iterative LIKE matcher with backtracking on `%`."""
    p = v = 0
    star_p = star_v = -1
    while v < len(value):
        literal = False
        if p < len(pattern) and escape and pattern[p] == escape:
            p += 1
            literal = True

        if p < len(pattern) and not literal and pattern[p] == "%":
            star_p, star_v = p, v
            p += 1
            continue
        if (
            p < len(pattern)
            and (literal or pattern[p] != "%")
            and ((not literal and pattern[p] == "_") or pattern[p] == value[v])
        ):
            p += 1
            v += 1
            continue
        if star_p >= 0:
            star_v += 1
            p, v = star_p + 1, star_v
            continue
        return False

    while p < len(pattern) and pattern[p] == "%":
        p += 1
    return p == len(pattern)


@receiver(connection_created)
def register_unicode_like(sender, connection, **kwargs) -> None:
    if connection.vendor != "sqlite":
        return
    # LIKE takes two arguments, or three with an ESCAPE clause — both arities must exist or
    # SQLite falls back to its own for the one we did not replace.
    connection.connection.create_function("like", 2, _like, deterministic=True)
    connection.connection.create_function("like", 3, _like, deterministic=True)
