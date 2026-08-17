"""Отметка и усвоение — разные поля. Усвоение НИКОГДА не считается из отметки.

🔴 РЕШЕНИЕ ВЛАДЕЛЬЦА §28.2, и он назвал причину сам: **отметки со временем могут убрать.**
Пока эти две вещи разведены, отмена отметок стоит одну правку экрана. Срастим — отменить
будет нельзя: за отметку будет держаться аналитика, за аналитику отчёты, и «убрать отметки»
превратится в проект на месяц.

Поэтому здесь не проверка поведения, а **сторож границы**: код «Усвоения группы» не имеет
права даже упоминать оценку за работу.

⚠️ Сторож читает ИСХОДНЫЙ ТЕКСТ, а не граф вызовов, и это его предел: спрятать `Submission`
за косвенным вызовом он не заметит. Он ловит прямое сращивание — то, которое случается не
злым умыслом, а «тут же рядом лежит».
"""

from __future__ import annotations

import ast
import inspect
import re
import textwrap

from apps.accounts import start_page


def _code_only(source: str) -> str:
    """Текст функции БЕЗ строк документации и комментариев.

    ⚠️ Первая версия этого сторожа краснела на собственном объяснении: в докстроке написано
    «считаем по ответам, а НЕ по оценкам», и слова «Submission», «score», «оценк» там есть.
    Прибор прочитал объяснение как нарушение — четвёртый случай за двое суток, когда сторож
    ошибается в сторону «всё плохо». Такому верят и правят исправное.
    """
    tree = ast.parse(textwrap.dedent(source))
    body = tree.body[0]
    if isinstance(body, ast.FunctionDef) and ast.get_docstring(body):
        body.body = body.body[1:]  # выкинуть докстроку
    code = ast.unparse(body)
    return re.sub(r"#[^\n]*", "", code)  # и комментарии, если ast их вернёт


def test_group_mastery_never_reads_a_mark():
    source = _code_only(inspect.getsource(start_page._teacher_mastery))

    for forbidden in ("Submission", "submission", "grade", "оценк"):
        assert forbidden not in source, (
            f"«Усвоение группы» тянется к отметке ({forbidden!r}). Это решение владельца §28.2: "
            "две вещи разведены, потому что отметки могут убрать, а усвоение останется."
        )

    # И положительная половина: считает оно именно по объективным ответам.
    assert "Attempt" in source and "is_correct" in source


def test_the_guard_can_actually_catch_a_merge():
    """🔴 Сторож обязан уметь покраснеть — иначе он доказывает лишь собственную бесполезность."""
    merged = 'def f():\n    """док"""\n    return Submission.objects.all()\n'
    assert "Submission" in _code_only(merged)
    # …и не краснеть на объяснении, в котором то же слово стоит в докстроке.
    explained = 'def f():\n    """Не читаем Submission.score."""\n    return 1\n'
    assert "Submission" not in _code_only(explained)


def test_the_mastery_row_carries_no_mark_field():
    """У строки усвоения нет поля под отметку — даже пустого.

    Пустое поле «оценка» в этой строке было бы приглашением его однажды заполнить.
    """
    fields = set(start_page.StartMastery.__dataclass_fields__)

    assert fields == {"lesson_id", "title", "course_title", "mastery_pct", "answers", "struggling"}
