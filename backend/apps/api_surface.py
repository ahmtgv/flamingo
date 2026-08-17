"""Кто вызывает каждую операцию API со стороны продукта.

🔴 ПЯТЬ ДЕФЕКТОВ ИЗ ДВЕНАДЦАТИ, найденных аудитом 17.08, — это резолвер без вызывающего.
Самый дорогой: `hostHeartbeat` существовал с первого дня, не вызывался ниоткуда, и из-за
этого преподаватель числился офлайн всегда, а живой урок закрывался сам через десять минут.

Ни один из 1160 зелёных тестов этого не поймал, и не мог: серверные тесты зовут сервис
напрямую (`heartbeat_for(device)`), минуя ровно то место, где обрыв — границу «продукт
просит сервер». Тест на резолвер проверяет, что он умеет ответить; он никогда не спросит,
задаёт ли кто-нибудь вопрос.

Отсюда проверка: **у каждой операции спросить, кто её зовёт из фронта.** Список собирается
механически, как `device_operations`, и ловит осиротевшую мутацию в тот день, когда её
написали, а не через три недели на живом уроке.

⚠️ Осиротевшая операция — не всегда дефект. Бывает задел под следующую фазу и бывает
операция для внешнего клиента. Поэтому здесь не запрет, а **список с объяснением**: каждая
сирота либо подключена, либо названа вслух в `KNOWN_ORPHANS` с причиной.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
FRONTEND = BACKEND.parent.parent / "frontend/src"


def _camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(part.title() for part in rest)


def _field_name(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str:
    """Имя поля в схеме: `@strawberry.mutation(name="foo")` побеждает имя функции."""
    for decorator in node.decorator_list:
        if isinstance(decorator, ast.Call):
            for kw in decorator.keywords:
                if kw.arg == "name" and isinstance(kw.value, ast.Constant):
                    return str(kw.value.value)
    return _camel(node.name)


def _is_graphql_field(node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
    for decorator in node.decorator_list:
        target = decorator.func if isinstance(decorator, ast.Call) else decorator
        text = ast.unparse(target)
        if text.startswith("strawberry.") and any(
            kind in text for kind in ("field", "mutation", "subscription")
        ):
            return True
    return False


def server_operations() -> dict[str, str]:
    """Все операции схемы: имя → файл, где объявлена."""
    found: dict[str, str] = {}
    for path in sorted(BACKEND.glob("*/graphql/*.py")):
        if path.name not in {"queries.py", "mutations.py", "subscriptions.py"}:
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef) and _is_graphql_field(node):
                found[_field_name(node)] = str(path.relative_to(BACKEND.parent))
    return found


def frontend_operations() -> set[str]:
    """Что продукт действительно спрашивает.

    ⚠️ ДВУХ ШАГОВ, А НЕ ОДНОГО. Наличия документа `.graphql` мало: codegen сделает по нему
    хук, а хук может не вызывать никто — ровно случай `myMirror`, где зеркало ученика
    пишется, документ описан, и ни один экран его не читает. Поэтому операция считается
    спрошенной, только если И документ есть, И сгенерированный по нему хук где-то вызван.

    Смотрим на ПОЛЕ внутри документа, а не на имя документа: имя произвольно (`ThisDevice`),
    а поле — то самое, что уйдёт на сервер.
    """
    code = "".join(
        p.read_text(encoding="utf-8")
        for p in FRONTEND.rglob("*.ts*")
        if ".test." not in p.name and "generated" not in p.name
    )

    asked: set[str] = set()
    # ⚠️ Скалярное поле без аргументов и без набора — тоже поле. Первая версия требовала
    # `(` или `{` после имени и потому не видела `mutation Logout { logout }`: операция
    # была подключена, а сторож считал её сиротой. Проверка, которая врёт в свою сторону,
    # опаснее отсутствующей — ей верят.
    field = re.compile(r"^\s{2,4}(\w+)\s*[({\n]", re.M)
    header = re.compile(r"^(query|mutation|subscription)\s+(\w+)", re.M)

    for path in FRONTEND.rglob("*.graphql"):
        text = path.read_text(encoding="utf-8")
        for block in re.split(r"^(?=query|mutation|subscription)", text, flags=re.M):
            if not block.strip():
                continue
            head = header.match(block)
            if head is None:
                continue
            kind, doc_name = head.group(1), head.group(2)
            suffix = {"query": "Query", "mutation": "Mutation", "subscription": "Subscription"}[
                kind
            ]
            # Хук из codegen: `useHostHeartbeatMutation`, плюс ленивый вариант у запросов
            # и прямое использование документа (`ThisDeviceDocument`) в обход хука.
            used = any(
                token in code
                for token in (
                    f"use{doc_name}{suffix}",
                    f"useLazy{doc_name}Query",
                    f"{doc_name}Document",
                )
            )
            if not used:
                continue
            body = block.split("{", 1)[-1]
            for match in field.finditer(body):
                asked.add(match.group(1))
    return asked


def orphans() -> dict[str, str]:
    """Операции, которых продукт не просит. Имя → где объявлена."""
    asked = frontend_operations()
    return {name: where for name, where in server_operations().items() if name not in asked}
