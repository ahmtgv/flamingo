"""Картинка на доске — КЛЮЧ, а не пять мегабайт в каждом ответе (промпт 28 §1.1).

🔴 ЧТО БЫЛО. `BoardCanvas` читал вставленную картинку `FileReader`-ом и клал её base64 прямо
в `data` элемента, то есть в `JSONField`. Оттуда она уходила подпиской `boardChanged`
**каждому в классе** и лежала в каждом ответе `board(lessonId:)`. Фотография с телефона —
три-четыре мегабайта, в base64 около пяти. Один вставленный снимок клал канал всему классу.

Собственный комментарий модели (`apps/board/models.py`) всё это время говорил прямо: «the
object key of a pasted image. Never a media stream» — замысел был верный, код разошёлся с ним.

⚠️ Тест держит ДВЕ вещи сразу, и вторая не менее важна первой: **старые элементы с base64
продолжают показываться**. Сломать уже нарисованное было бы худшим исходом этой правки.
"""

from __future__ import annotations

import pytest

from apps.board.graphql.types import resolved_data

pytestmark = pytest.mark.django_db


def test_a_key_becomes_a_link_and_the_key_stays():
    """Ключ уезжает в ссылку для показа; сам ключ остаётся — по нему картинку и найдут."""
    out = resolved_data({"key": "board/42/abc/photo.jpg"})

    assert out["key"] == "board/42/abc/photo.jpg"
    assert out["src"], "показывать нечего — картинка не откроется"
    assert "base64" not in out["src"]


def test_an_old_base64_element_is_left_exactly_as_it_is():
    """🔴 Нарисованное до правки обязано продолжать показываться."""
    old = {"src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="}

    assert resolved_data(old) == old, "старую картинку тронули — она перестанет показываться"


def test_nothing_is_invented_for_an_element_without_an_image():
    for data in ({"points": [[1, 2], [3, 4]]}, {}, {"text": "привет"}):
        assert resolved_data(data) == data


def test_the_channel_payload_of_an_image_is_small():
    """Смысл всей правки одним числом: то, что улетает классу, должно быть КОРОТКИМ.

    ⚠️ Порог — не выдуманное ограничение продукта, а граница здравого смысла для сообщения
    в канале: ключ с подписью укладывается в сотни байт, base64 фотографии — в мегабайты.
    """
    import json

    from apps.board.services import _wire

    class FakeAuthor:
        formal_name = "Люция Валерьевна"

    class FakeElement:
        id = "e1"
        kind = "IMAGE"
        author_id = "u1"
        author = FakeAuthor()
        x = y = 0.0
        width = height = 100.0
        data = {"key": "board/42/abc/photo.jpg"}
        revision = 1

    wire = _wire(FakeElement())
    assert wire["data"] == {"key": "board/42/abc/photo.jpg"}
    assert len(json.dumps(wire)) < 1024, "по каналу снова едет что-то большое"
