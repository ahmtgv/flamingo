"""Lesson speech: an in-memory stream, and nothing else (CLAUDE.md §2.2, PROMPT_13 §4.1).

The owner's rule, verbatim: *«речь обрабатывается потоком в памяти ради саммари: файла на
диске нет, в БД нет, после сборки буфер очищается»*. This module is that buffer, and every
choice in it is that sentence:

* **Process memory only.** Not a table, not a file, not Redis, not the Django cache. A cache
  is a store — it has a key you can read back, a TTL somebody can raise, and a persistence
  setting somebody can flip. A plain dict in the worker's own memory cannot be any of those.
* **It is dropped on assembly.** ``drain`` returns the points and clears them in the same
  breath; there is no read that leaves the buffer intact, so no caller can accidentally keep
  it alive by forgetting to clean up.
* **It is bounded.** ``MAX_POINTS`` per session, oldest evicted. An unbounded buffer is a
  transcript that has not admitted it yet.
* **It holds points, never a transcript.** A point is one short assembled line with its
  speaker and its moment. Nothing here reconstructs who said what, word for word, over the
  whole lesson — and nothing here survives the request that built the summary.

What is deliberately NOT here: a producer. Recognition itself belongs next to the media, in a
self-hosted recogniser subscribing to the LiveKit room — not on a client, and not behind a
GraphQL mutation. A mutation that accepted lines of recognised speech would be a verbatim
transcript pipe with a friendlier name, and the first thing anyone would do with it is log it.
Until that recogniser exists the buffer simply stays empty and the summary assembles from the
board, the test, the chat and the plan, which is what §4.2 keeps anyway.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass

#: Per session. Roughly one point a minute over a long lesson, with headroom.
MAX_POINTS = 200

#: Per point. A summary line, not a paragraph of speech.
MAX_TEXT = 400


@dataclass(frozen=True)
class SpeechPoint:
    """One assembled point: who, when, and the line. Immutable so it cannot be edited in
    place while it waits — a buffer with a mutable payload invites a second use."""

    speaker_id: str
    at_offset_sec: int
    text: str


_lock = threading.Lock()
_buffers: dict[str, list[SpeechPoint]] = {}


def note(session_id, point: SpeechPoint) -> None:
    """Add a point for this session. Silently bounded; never raises on overflow."""
    text = point.text.strip()[:MAX_TEXT]
    if not text:
        return
    key = str(session_id)
    with _lock:
        buffer = _buffers.setdefault(key, [])
        buffer.append(SpeechPoint(point.speaker_id, point.at_offset_sec, text))
        if len(buffer) > MAX_POINTS:
            del buffer[: len(buffer) - MAX_POINTS]


def pending(session_id) -> int:
    """How many points are waiting. For tests and for saying «пока пусто» — not a read of
    the content, deliberately: the only way to see the text is to drain it."""
    with _lock:
        return len(_buffers.get(str(session_id), ()))


def drain(session_id) -> list[SpeechPoint]:
    """Take the points and clear the buffer. The only read there is."""
    with _lock:
        return _buffers.pop(str(session_id), [])


def clear(session_id) -> None:
    """Drop a session's buffer without reading it — the lesson ended, or consent was
    withdrawn, or the summary was assembled without speech."""
    with _lock:
        _buffers.pop(str(session_id), None)


def clear_all() -> None:
    """Process-wide reset (shutdown, tests). Nothing survives it, which is the point."""
    with _lock:
        _buffers.clear()
