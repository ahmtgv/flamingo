"""Какие GraphQL-операции требуют ключ машины, а не сессию человека.

🔴 РЕГРЕССИЯ 16.08 (промпт 21 §2.2). До §Б0-септ у приложения не было пользовательской
сессии, и `apolloClient` выбирал заголовок ПО НАЛИЧИЮ: есть токен — `Bearer`, нет — `Device`.
Пока токена не бывало никогда, выбор по наличию совпадал с выбором по смыслу. Связывание
начало выдавать сессию — и все запросы, включая `require_device`, пошли как `Bearer`.
Мастер встал на переходе 1→2.

⚠️ Правка открыла тропинку, по которой код раньше не ходил. Это третий такой случай подряд,
поэтому список device-операций **выводится из исходников**, а не пишется руками: рукописный
разойдётся с кодом на первой же новой мутации, и разойдётся молча.

`consenting_user` сюда НЕ входит: те резолверы принимают и человека, и машину, а человек
приоритетнее (см. `apolloClient.ts`).
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

APPS = Path(__file__).resolve().parent.parent

#: Как называется дверь, которая требует именно машину.
DEVICE_DOOR = "require_device"


def _camel(name: str) -> str:
    """`advance_device_setup` → `advanceDeviceSetup` — так strawberry именует поля."""
    head, *rest = name.split("_")
    return head + "".join(part.title() for part in rest)


def _calls_device_door(node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
    return any(
        isinstance(child, ast.Name) and child.id == DEVICE_DOOR for child in ast.walk(node)
    )


def _explicit_name(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str | None:
    """`@strawberry.mutation(name="foo")` побеждает имя функции."""
    for decorator in node.decorator_list:
        if not isinstance(decorator, ast.Call):
            continue
        for kw in decorator.keywords:
            if kw.arg == "name" and isinstance(kw.value, ast.Constant):
                return str(kw.value.value)
    return None


def device_operations() -> list[str]:
    """Имена GraphQL-операций, которым нужен `Authorization: Device`. Отсортированы."""
    found: set[str] = set()
    for path in sorted(APPS.glob("*/graphql/*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef) and _calls_device_door(
                node
            ):
                found.add(_explicit_name(node) or _camel(node.name))
    return sorted(found)


# --- сторона фронта -------------------------------------------------------------------------

TS_PATH = (
    Path(__file__).resolve().parents[3] / "frontend/src/shared/lib/deviceOperations.generated.ts"
)

_HEADER = '''/**
 * СГЕНЕРИРОВАНО. Не править руками.
 *
 * Список операций, которым нужен ключ машины (`Authorization: Device`), а не сессия человека.
 * Источник — резолверы бэкенда, зовущие `require_device`. Пересобрать:
 *
 *   cd backend && .venv/bin/python -m apps.devices.device_operations
 *
 * 🔴 Почему сгенерировано, а не написано: 16.08 `apolloClient` выбирал заголовок по наличию
 * токена. Пока сессии в приложении не бывало, это совпадало с истиной; связывание выдало
 * сессию — и мастер встал на переходе 1→2. Рукописный список разошёлся бы с кодом на первой
 * новой мутации, и разошёлся бы так же молча.
 */
export const DEVICE_OPERATIONS: ReadonlySet<string> = new Set([
'''


def render_ts() -> str:
    lines = "".join(f"  '{name}',\n" for name in device_operations())
    return f"{_HEADER}{lines}]);\n"


def write_ts() -> bool:
    """Записать файл, если он изменился. Возвращает True, если что-то поменялось."""
    new = render_ts()
    old = TS_PATH.read_text(encoding="utf-8") if TS_PATH.exists() else ""
    if new == old:
        return False
    TS_PATH.write_text(new, encoding="utf-8")
    return True


def ts_names() -> list[str]:
    """Что сейчас лежит в сгенерированном файле — для проверки на расхождение."""
    if not TS_PATH.exists():
        return []
    return sorted(re.findall(r"^\s*'([A-Za-z]\w*)',$", TS_PATH.read_text(encoding="utf-8"), re.M))


if __name__ == "__main__":
    changed = write_ts()
    print(("обновлён" if changed else "без изменений") + f": {TS_PATH}")
    for name in device_operations():
        print(" ", name)
