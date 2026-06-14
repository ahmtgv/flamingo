"""Lightweight offset-based cursor pagination for `*Connection` GraphQL types."""

from __future__ import annotations

import base64
from dataclasses import dataclass

_PREFIX = "offset:"


def encode_cursor(offset: int) -> str:
    return base64.urlsafe_b64encode(f"{_PREFIX}{offset}".encode()).decode()


def decode_cursor(cursor: str | None) -> int:
    if not cursor:
        return 0
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        return max(0, int(raw.removeprefix(_PREFIX)))
    except (ValueError, UnicodeDecodeError):
        return 0


@dataclass
class Page:
    nodes: list
    total_count: int
    has_next_page: bool
    end_cursor: str | None


def paginate(queryset, first: int, after: str | None) -> Page:
    """Slice a queryset into a connection page (first/after over a stable order)."""
    first = max(1, min(first, 100))
    start = decode_cursor(after)
    total = queryset.count()
    nodes = list(queryset[start : start + first])
    end = start + len(nodes)
    return Page(
        nodes=nodes,
        total_count=total,
        has_next_page=end < total,
        end_cursor=encode_cursor(end) if nodes else None,
    )
