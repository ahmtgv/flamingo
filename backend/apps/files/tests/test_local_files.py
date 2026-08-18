"""Маршрут `/local-files/` — тот, которого не было, и границы, которые он держит.

🔴 Продукт отдавал клиенту адрес `/local-files/<key>` из `common/storage.py` в десктопном
профиле, а маршрута под него не существовало: внутри приложения загрузка файла уходила в 404,
а всё уже загруженное не открывалось. Комментарий в коде утверждал обратное.
"""

from __future__ import annotations

import pytest
from django.test import Client

from common import storage

pytestmark = pytest.mark.django_db


@pytest.fixture
def desktop(settings, tmp_path):
    settings.STORAGE_BACKEND = "local"
    settings.LOCAL_STORAGE_ROOT = str(tmp_path)
    return Client()


def test_a_file_can_be_put_and_read_back(desktop):
    """Ровно то, ради чего маршрут существует: положили — открылось."""
    put = desktop.put("/local-files/materials/a.txt", b"\xd0\xbf\xd1\x80\xd0\xb8")
    assert put.status_code == 200
    got = desktop.get("/local-files/materials/a.txt")
    assert got.status_code == 200
    assert b"".join(got.streaming_content) == b"\xd0\xbf\xd1\x80\xd0\xb8"


def test_the_address_the_product_hands_out_is_the_address_that_answers(desktop):
    """⚠️ Проверяем СТЫК, а не свою догадку о нём: берём адрес у самого продукта.

    Именно здесь и была дыра — половины написаны каждая по-своему и не встретились.
    """
    url = storage.presign_put("materials/b.txt", "text/plain")
    assert desktop.put(url, b"ok").status_code == 200
    assert desktop.get(storage.presign_get("materials/b.txt")).status_code == 200


def test_a_key_that_climbs_out_of_the_root_is_refused(desktop):
    assert desktop.get("/local-files/../../etc/passwd").status_code == 404
    assert desktop.put("/local-files/../escape.txt", b"x").status_code == 404


def test_nothing_is_served_when_files_live_in_s3(settings, tmp_path):
    """🔴 На боевом сервере маршрут обязан молчать: файлы там ходят по подписанным ссылкам,
    и вторая дверь к тем же объектам мимо подписи — это обход защиты продукта."""
    settings.STORAGE_BACKEND = "s3"
    settings.LOCAL_STORAGE_ROOT = str(tmp_path)
    (tmp_path / "secret.txt").write_bytes(b"secret")
    assert Client().get("/local-files/secret.txt").status_code == 404


def test_only_the_loopback_is_let_near_the_disk(desktop, tmp_path):
    """Настройке `ALLOWED_HOSTS` в вопросе доступа к диску не доверяем — проверяем сами."""
    (tmp_path / "c.txt").write_bytes(b"x")
    assert desktop.get("/local-files/c.txt", REMOTE_ADDR="192.168.1.50").status_code == 404
    assert desktop.get("/local-files/c.txt", REMOTE_ADDR="127.0.0.1").status_code == 200
