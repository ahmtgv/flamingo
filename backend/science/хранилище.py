"""Где и как лежат записи исследования.

    SCIENCE_ROOT/
      <код добровольца>/
        volunteer.json                 согласие и анкета
        <id проверки>/
          meta.json                    вид, протокол, условия, устройство, итог
          video-000000.webm …          видео со звуком, кусками по ~5 секунд
          frames-000000.fr.gz …        точки лица, мимика, поворот и решения движка
          events-000000.ndjson …       подсказки, ответы, вопросы, смена окна
          audio-000000.webm …          отдельные фразы (запись голоса учителя)

🔴 КУСОК ПИШЕТСЯ ЦЕЛИКОМ ИЛИ НЕ ПИШЕТСЯ ВОВСЕ. Сначала во временный файл рядом,
потом `os.replace` — подмена имени атомарна. Оборванная связь не оставит
полкуска под настоящим именем, а повтор того же куска просто заменит его:
страница может слать кусок снова и снова, пока не услышит «принято».

🔴 ПУТЬ СОБИРАЕТСЯ ТОЛЬКО ИЗ ПРОВЕРЕННЫХ ЧАСТЕЙ. Код — из нашего алфавита,
id проверки — uuid, вид — из списка, номер — число. Ни одна буква из запроса
не попадает в путь без проверки: `../../etc` здесь просто не во что подставить.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import tempfile
from pathlib import Path

from django.conf import settings

#: вид куска → как назвать файл по типу содержимого
ВИДЫ = {"video", "frames", "events", "audio"}
CODE = re.compile(r"^[a-hjkmnp-z2-9]{12}$")
RUN = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

MB = 1024 * 1024
GB = 1024 * MB


def _число(имя: str, по_умолчанию: int) -> int:
    сырое = (os.getenv(имя) or "").strip()
    return int(сырое) if сырое.isdigit() else по_умолчанию


#: Один кусок — до 24 МБ: пять секунд видео весят около мегабайта, запас на
#: камеры с высоким битрейтом и на медленную связь, которая копит куски.
КУСОК_МАКС = _число("SCIENCE_CHUNK_MAX_MB", 24) * MB
#: Одна проверка — до 600 МБ (пять минут — обычно 30–60 МБ).
ПРОВЕРКА_МАКС = _число("SCIENCE_RUN_MAX_MB", 600) * MB
#: Один доброволец — до 20 ГБ: сотни проверок.
ДОБРОВОЛЕЦ_МАКС = _число("SCIENCE_VOLUNTEER_MAX_GB", 20) * GB
#: Сколько места оставить на диске нетронутым: база и пособия важнее записей.
ЗАПАС = _число("SCIENCE_FREE_MIN_GB", 3) * GB


class Отказ(Exception):
    """Отказ со словами: их же увидит человек (ПРАВИЛА 6.4)."""


def корень() -> Path:
    return Path(getattr(settings, "SCIENCE_ROOT", "/var/lib/flamingo/science"))


def папка_добровольца(код: str) -> Path:
    if not CODE.match(код):
        raise Отказ("Ссылка повреждена.")
    return корень() / код


def папка_проверки(код: str, run_id: str) -> Path:
    if not RUN.match(run_id):
        raise Отказ("Такой проверки нет.")
    return папка_добровольца(код) / run_id


def расширение(вид: str, тип: str) -> str:
    """Расширение файла куска по его виду и типу содержимого."""
    тип = (тип or "").split(";")[0].strip().lower()
    if вид == "frames":
        return "fr.gz"
    if вид == "events":
        return "ndjson"
    if тип in ("video/webm", "audio/webm"):
        return "webm"
    if тип in ("video/mp4", "audio/mp4"):
        return "mp4"
    if тип == "audio/ogg":
        return "ogg"
    return "bin"


def имя_куска(вид: str, n: int, тип: str) -> str:
    if вид not in ВИДЫ:
        raise Отказ("Такого вида записи мы не принимаем.")
    if not 0 <= n < 1_000_000:
        raise Отказ("Номер куска вне пределов.")
    return f"{вид}-{n:06d}.{расширение(вид, тип)}"


def свободно() -> int:
    п = корень()
    п.mkdir(parents=True, exist_ok=True)
    return shutil.disk_usage(п).free


def записать_кусок(папка: Path, имя: str, поток, длина: int | None, предел: int) -> tuple[int, int]:
    """Пишет кусок из потока запроса. → (сколько байт теперь, сколько было раньше).

    `предел` — сколько ещё можно записать в эту проверку с учётом прежней
    версии этого же куска. Тело длиннее предела не дочитывается до конца:
    отказываем, как только перевалили, а не после гигабайта в никуда.
    """
    if длина is not None and длина > КУСОК_МАКС:
        raise Отказ("Кусок записи слишком большой.")
    if свободно() < ЗАПАС:
        raise Отказ("На сервере кончается место — запись остановлена. Мы уже знаем.")
    папка.mkdir(parents=True, exist_ok=True)
    цель = папка / имя
    было = цель.stat().st_size if цель.exists() else 0
    fd, tmp = tempfile.mkstemp(dir=папка, prefix=".кусок-")
    всего = 0
    try:
        with os.fdopen(fd, "wb") as f:
            while True:
                часть = поток.read(256 * 1024)
                if not часть:
                    break
                всего += len(часть)
                if всего > КУСОК_МАКС:
                    raise Отказ("Кусок записи слишком большой.")
                if всего - было > предел:
                    raise Отказ("Запись этой проверки слишком большая.")
                f.write(часть)
        if всего == 0:
            raise Отказ("Пустой кусок.")
        os.replace(tmp, цель)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise
    return всего, было


def записать_json(путь: Path, данные: dict) -> None:
    """JSON рядом с записями — атомарно, как и куски."""
    путь.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=путь.parent, prefix=".meta-")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(данные, f, ensure_ascii=False, indent=1, default=str)
        os.replace(tmp, путь)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise
