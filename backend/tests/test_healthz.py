"""`/healthz` отдаёт отпечаток — и НЕ отдаёт коммит.

Проверка написана против двух способов её обмануть: показать коммит открыто и промолчать
так, чтобы молчание сошло за согласие.
"""

from __future__ import annotations

import hashlib
import hmac
import json

import pytest
from django.test import Client, override_settings

from common import health

COMMIT = "89c5cd4cc2b5a77e7e058eef74c6576b116e2680"


@pytest.fixture
def stamped(tmp_path):
    """Дерево с отпечатком сборки — как внутри образа."""
    (tmp_path / "BUILD_COMMIT").write_text(COMMIT + "\n")
    health.build_fingerprint.cache_clear()
    with override_settings(BASE_DIR=tmp_path, SECRET_KEY="k" * 50):
        yield tmp_path
    health.build_fingerprint.cache_clear()


def test_the_domain_answers_with_a_fingerprint_and_never_with_the_commit(stamped):
    body = json.loads(Client().get("/healthz").content)

    expected = hmac.new(b"k" * 50, COMMIT.encode(), hashlib.sha256).hexdigest()
    assert body["build"] == expected
    # 🔒 Главное: коммита в ответе нет ни целиком, ни куском.
    raw = json.dumps(body)
    assert COMMIT not in raw
    assert COMMIT[:12] not in raw


def test_another_key_gives_another_fingerprint(stamped):
    # Иначе отпечаток доказывал бы только код, но не то, что это НАШ сервер.
    first = json.loads(Client().get("/healthz").content)["build"]
    health.build_fingerprint.cache_clear()
    with override_settings(SECRET_KEY="z" * 50):
        second = json.loads(Client().get("/healthz").content)["build"]
    assert first != second


def test_no_stamp_is_said_out_loud_not_hidden_as_empty(tmp_path):
    health.build_fingerprint.cache_clear()
    with override_settings(BASE_DIR=tmp_path, SECRET_KEY="k" * 50):
        body = json.loads(Client().get("/healthz").content)
    health.build_fingerprint.cache_clear()
    # `null`, а не "": ворота обязаны отличать «не назвался» от «не тот».
    assert body["build"] is None
    assert body["ok"] is True


def test_the_path_does_not_touch_the_database(stamped):
    # Без `django_db` — обращение к базе уронило бы этот тест. Здоровье, зависящее от базы,
    # превращает «БД легла» в «домен молчит», и ворота ставят неверный диагноз.
    assert Client().get("/healthz").status_code == 200


def test_the_answer_is_never_cached(stamped):
    assert Client().get("/healthz")["Cache-Control"] == "no-store"
