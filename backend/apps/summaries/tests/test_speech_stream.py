"""The speech buffer, on its own — the module the storage rule is actually about.

These are the properties that make «поток в памяти» true rather than decorative: nothing is
written anywhere, a read empties it, and it cannot grow into a transcript. They are tested
apart from the summary because a future refactor is far more likely to change *how* the
summary is assembled than to change what this buffer is allowed to be.
"""

import ast
from pathlib import Path

import pytest

from apps.summaries import speech_stream
from apps.summaries.speech_stream import SpeechPoint

MODULE = Path(speech_stream.__file__)


@pytest.fixture(autouse=True)
def _clean():
    speech_stream.clear_all()
    yield
    speech_stream.clear_all()


def test_a_read_empties_the_buffer_there_is_no_other_read():
    speech_stream.note("s1", SpeechPoint("u1", 10, "первое"))
    speech_stream.note("s1", SpeechPoint("u1", 20, "второе"))

    assert [p.text for p in speech_stream.drain("s1")] == ["первое", "второе"]
    assert speech_stream.pending("s1") == 0
    assert speech_stream.drain("s1") == []


def test_sessions_do_not_bleed_into_each_other():
    speech_stream.note("s1", SpeechPoint("u1", 1, "урок один"))
    speech_stream.note("s2", SpeechPoint("u2", 1, "урок два"))

    assert [p.text for p in speech_stream.drain("s1")] == ["урок один"]
    assert speech_stream.pending("s2") == 1


def test_it_cannot_grow_into_a_transcript():
    """An unbounded buffer is a transcript that has not admitted it yet."""
    for i in range(speech_stream.MAX_POINTS + 50):
        speech_stream.note("s1", SpeechPoint("u1", i, f"точка {i}"))

    points = speech_stream.drain("s1")
    assert len(points) == speech_stream.MAX_POINTS
    assert points[-1].text == f"точка {speech_stream.MAX_POINTS + 49}"  # oldest evicted


def test_a_point_is_a_line_not_a_paragraph():
    speech_stream.note("s1", SpeechPoint("u1", 0, "а" * (speech_stream.MAX_TEXT + 500)))
    assert len(speech_stream.drain("s1")[0].text) == speech_stream.MAX_TEXT


def test_empty_speech_is_not_a_point():
    speech_stream.note("s1", SpeechPoint("u1", 0, "   "))
    assert speech_stream.pending("s1") == 0


def test_clearing_needs_no_read():
    """Consent withdrawn, lesson ended — the buffer goes without anyone looking at it."""
    speech_stream.note("s1", SpeechPoint("u1", 0, "сказанное"))
    speech_stream.clear("s1")
    assert speech_stream.pending("s1") == 0


def test_a_point_is_immutable_so_it_cannot_be_edited_while_it_waits():
    import dataclasses

    point = SpeechPoint("u1", 0, "исходное")
    with pytest.raises(dataclasses.FrozenInstanceError):
        point.text = "подменённое"


def test_the_module_reaches_for_no_store_at_all():
    """The rule is «ни файла, ни строки в БД» — and a cache is a store too: it has a key you
    can read back, a TTL somebody can raise, and a persistence setting somebody can flip.

    Checked on executable code only, so it cannot be satisfied by rewording the docstring
    (which mentions Redis, files and the database on purpose).
    """
    tree = ast.parse(MODULE.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Module | ast.ClassDef | ast.FunctionDef):
            body = node.body
            if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
                node.body = body[1:]
    code = ast.unparse(tree).lower()

    for forbidden in ("cache", "redis", "open(", "models", "objects", "path(", "channel"):
        assert forbidden not in code, f"the speech buffer reaches for a store: {forbidden!r}"


def test_nothing_here_is_a_django_model():
    """Belt and braces for the grep-based storage gate: no model can be defined in a module
    that never imports django.db."""
    source = MODULE.read_text(encoding="utf-8")
    assert "django.db" not in source
    assert "models.Model" not in source
