"""Файлы пособий: что берём, куда кладём, где отказываем.

🔴 Три границы, и каждая стоит на своём основании, а не на вкусе.

1. ЧТО БЕРЁМ. Список разрешённого, а не список запрещённого. Запрещать по
   списку — значит проиграть первому же расширению, о котором не подумали.
   Из списка НАМЕРЕННО выброшены `.svg` и `.html`: и то и другое — исполняемая
   разметка, и отданная браузеру со своего домена она получает права нашей
   страницы, то есть чужой файл сможет читать куки урока. Картинка — png/jpg/webp.

2. СКОЛЬКО. Один файл — до 64 МБ, всё вместе у преподавателя — до 5 ГБ.
   Числа не с потолка: на сервере 69 ГБ свободных, это десяток преподавателей
   с запасом. Меняются переменными окружения, а не правкой кода.

3. ВИДЕО НЕ ХРАНИМ. Час записи — гигабайты, раздача без CDN упирается в канал
   на третьем зрителе. Видео приходит ссылкой, и об этом сказано словами
   в отказе, а не молчанием.
"""
from __future__ import annotations

import os
import uuid
from pathlib import Path

from django.conf import settings

#: расширение → (вид, тип содержимого)
ALLOWED = {
    ".pdf":  ("doc", "application/pdf"),
    ".doc":  ("doc", "application/msword"),
    ".docx": ("doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ".ppt":  ("doc", "application/vnd.ms-powerpoint"),
    ".pptx": ("doc", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    ".xls":  ("doc", "application/vnd.ms-excel"),
    ".xlsx": ("doc", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    ".odt":  ("doc", "application/vnd.oasis.opendocument.text"),
    ".odp":  ("doc", "application/vnd.oasis.opendocument.presentation"),
    ".txt":  ("doc", "text/plain; charset=utf-8"),
    ".md":   ("doc", "text/plain; charset=utf-8"),
    ".csv":  ("doc", "text/plain; charset=utf-8"),
    ".png":  ("image", "image/png"),
    ".jpg":  ("image", "image/jpeg"),
    ".jpeg": ("image", "image/jpeg"),
    ".webp": ("image", "image/webp"),
    ".gif":  ("image", "image/gif"),
}

#: То, что люди приносят чаще всего и чему у нас есть готовый ответ словами.
ВИДЕО = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".wmv", ".flv"}

ONE_MAX = int(os.getenv("MATERIAL_MAX_MB", "64")) * 1024 * 1024
ALL_MAX = int(os.getenv("MATERIALS_MAX_GB", "5")) * 1024 * 1024 * 1024


class Отказ(Exception):
    """Отказ со словами: их же увидит человек (ПРАВИЛА 6.4)."""


def разобрать(имя: str) -> tuple[str, str, str]:
    """Имя файла → (вид, тип содержимого, расширение). Не подошло — Отказ словами."""
    ext = Path(имя).suffix.lower()
    if ext in ВИДЕО:
        raise Отказ(
            "Видео мы у себя не храним: час записи — это гигабайты, и класс "
            "начнёт ждать загрузку вместо урока. Положите видео ссылкой — "
            "она откроется на доске так же."
        )
    if ext not in ALLOWED:
        raise Отказ(
            f"Файлы «{ext or 'без расширения'}» мы не принимаем. Берём документы "
            "(pdf, doc, docx, ppt, pptx, xls, xlsx, odt, odp, txt, md, csv) и "
            "картинки (png, jpg, webp, gif). Остальное — ссылкой."
        )
    kind, mime = ALLOWED[ext]
    return kind, mime, ext


def куда(lesson_id: str, ext: str) -> tuple[str, Path]:
    """Путь внутри хранилища и полный путь на диске.

    🔴 Имя на диске СВОЁ, случайное. Исходное имя человека живёт только в базе:
    так `../../etc/passwd`, невидимые символы и одинаковые имена от двух
    преподавателей перестают быть вопросом вовсе."""
    rel = f"materials/{lesson_id}/{uuid.uuid4().hex}{ext}"
    full = Path(settings.MEDIA_ROOT) / rel
    full.parent.mkdir(parents=True, exist_ok=True)
    return rel, full


def сохранить(файл, lesson_id: str) -> tuple[str, str, str, int]:
    """Кладёт файл на диск. Отдаёт (вид, имя, путь, размер)."""
    имя = " ".join(str(файл.name).split())[:200]
    kind, _mime, ext = разобрать(имя)
    if файл.size > ONE_MAX:
        raise Отказ(
            f"Файл «{имя}» весит {файл.size // (1024 * 1024)} МБ, а больше "
            f"{ONE_MAX // (1024 * 1024)} МБ мы не берём. Учебник целиком лучше "
            "положить ссылкой, а к уроку — только нужные страницы."
        )
    rel, full = куда(lesson_id, ext)
    written = 0
    with open(full, "wb") as out:
        for chunk in файл.chunks():
            written += len(chunk)
            if written > ONE_MAX:      # размер из заголовка мог соврать
                out.close()
                full.unlink(missing_ok=True)
                raise Отказ("Файл оказался больше, чем сказано в заголовке. Не приняли.")
            out.write(chunk)
    return kind, имя, rel, written


def тип(path: str) -> str:
    return ALLOWED.get(Path(path).suffix.lower(), ("doc", "application/octet-stream"))[1]
