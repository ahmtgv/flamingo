"""Как подписка достаёт токен из рукопожатия WebSocket.

🔴 СЕМЬ ПОДПИСОК ИЗ ВОСЬМИ МОЛЧА НЕ РАБОТАЛИ (найдено аудитом 17.08).

Фронт кладёт токен в `connectionParams` под именем **`authToken`**
(`frontend/src/app/apolloClient.ts`), а шесть резолверов читали `token`:

    token = (ws.connection_params or {}).get("token", "")   # ← такого ключа никто не шлёт

Пустая строка → проверка прав не проходит → `return` → **пустой поток без единой ошибки**.
Ни исключения, ни лога: подписка «работает», просто ничего не присылает. Мертвы были
`boardChanged`, `chatMessageReceived`, `channelMessageReceived`, `hostPresenceChanged`,
`projectorFocusChanged`, `wordShown`, `signals` — то есть доска, чат и присутствие
преподавателя во время урока.

⚠️ Работала одна — `seedum`, потому что её писали позже и по факту, а не по памяти.
Имя параметра было вторым источником истины: канонического места не существовало, и
каждый резолвер помнил своё. Теперь место одно — здесь.

`Authorization` принимается вторым именем: так рукопожатие подписывают некоторые клиенты,
и отказывать им было бы изобретением ограничения на ровном месте.
"""

from __future__ import annotations


def token_from_connection_params(params: dict | None) -> str:
    """Токен из параметров рукопожатия, без префикса `Bearer`. Нет — пустая строка."""
    if not params:
        return ""
    raw = params.get("authToken") or params.get("Authorization") or params.get("token") or ""
    return str(raw).removeprefix("Bearer ").strip()
