"""Мусор на входе: отказать словами, но не упасть и не проглотить (промпт 30 §3.6).

🔴 НАЙДЕНО RnD-ЗАХОДОМ 18.08. Прогнал по созданию курса заведомый мусор и получил ОБЕ беды
сразу: на пятитысячезначном имени и на нулевом байте сервер **падал** ошибкой базы
(`DataError`), а пустое имя и имя из одних пробелов — **проглатывал**, заводя курс, который
встал бы пустой строкой в каталоге.

Ни то, ни другое человек объяснить не может: в первом случае он видит общий отказ, во втором
— молча получает безымянный курс.
"""

from __future__ import annotations

import pytest

from common.exceptions import ValidationError
from common.text_input import clean_text


def clean(value, **kw):
    return clean_text(value, field="Название", max_length=200, **kw)


class TestItRefusesInWords:
    def test_too_long_says_how_much_is_extra(self):
        with pytest.raises(ValidationError) as refusal:
            clean("я" * 5000)
        said = str(refusal.value)
        assert "5000" in said and "200" in said, "отказ без чисел — человеку нечего сократить"
        assert "4800" in said, "не сказано, НА СКОЛЬКО сократить"

    def test_a_nul_byte_is_refused_here_and_not_by_the_database(self):
        # PostgreSQL такое поле не принимает вовсе и роняет запрос; отказываем раньше.
        with pytest.raises(ValidationError):
            clean("курс\x00")

    def test_empty_and_whitespace_only_are_refused(self):
        for junk in ("", "   ", "\t\t", None):
            with pytest.raises(ValidationError):
                clean(junk)


class TestItDoesNotMistakeLiveTextForGarbage:
    """⚠️ Половина, которую легко потерять: сторож не должен резать живой текст."""

    def test_emoji_and_right_to_left_pass_untouched(self):
        assert clean("🐦‍🔥 Курс 🎓") == "🐦‍🔥 Курс 🎓"
        assert clean("שלום כיתה") == "שלום כיתה"

    def test_edges_are_trimmed_because_a_name_is_a_name(self):
        assert clean("  Алгебра  ") == "Алгебра"

    def test_a_pasted_line_break_is_folded_not_refused(self):
        # Перенос в однострочном поле — почти всегда след вставки из документа, а не ошибка.
        assert clean("Алгебра\nи начала анализа") == "Алгебра и начала анализа"

    def test_exactly_at_the_limit_is_allowed(self):
        assert len(clean("я" * 200)) == 200

    def test_an_optional_field_may_be_empty(self):
        assert clean("", required=False) == ""
