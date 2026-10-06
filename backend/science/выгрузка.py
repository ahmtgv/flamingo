"""Упаковка записей исследования в один архив — общая для команды и кабинета.

`manage.py наука_выгрузка` пишет архив в файл на сервере; кабинет владельца
отдаёт тот же архив прямо в браузер, потоком, не складывая его на диск: архив
со всеми видео — гигабайты, и второй его экземпляр на сервере не нужен.

🔴 ЧИТАЕТ ДИСК, А НЕ БАЗУ. Папка каждой проверки описывает себя сама
(`meta.json`), поэтому архив полон, даже если база когда-нибудь разойдётся с
диском. База нужна только для пометок «кто это» (`участники.json`).
"""
from __future__ import annotations

import io
import json
import tarfile
from collections.abc import Iterator
from datetime import date
from pathlib import Path

from .models import Volunteer
from .хранилище import корень

#: Видео и звук — тяжёлое: без них архив меньше в разы, а для разбора движка хватает кадров.
ТЯЖЁЛОЕ = ("video-", "audio-")


def участники() -> dict:
    return {
        в.code: {"пометка": в.label, "имя": в.name, "согласие": в.consent, "анкета": в.profile,
                 "по_общей_ссылке": bool(в.invite_id)}
        for в in Volunteer.objects.all()
    }


def упаковать(tar: tarfile.TarFile, *, без_видео: bool = False, с: date | None = None) -> Iterator[int]:
    """Кладёт в `tar` участников и записи. Отдаёт счёт проверок после каждого
    файла — чтобы поток успевал выталкивать накопленное."""
    сводка = json.dumps(участники(), ensure_ascii=False, indent=1).encode()
    инфо = tarfile.TarInfo("наука/участники.json")
    инфо.size = len(сводка)
    tar.addfile(инфо, io.BytesIO(сводка))
    проверок = 0
    yield проверок
    root = корень()
    if not root.exists():
        return
    for папка_в in sorted(p for p in root.iterdir() if p.is_dir() and p.name != "выгрузки"):
        vj = папка_в / "volunteer.json"
        if vj.exists():
            tar.add(vj, arcname=f"наука/{папка_в.name}/volunteer.json")
        for папка_р in sorted(p for p in папка_в.iterdir() if p.is_dir()):
            meta = папка_р / "meta.json"
            if с and meta.exists():
                начата = str(json.loads(meta.read_text("utf-8")).get("начата", ""))[:10]
                if начата and начата < с.isoformat():
                    continue
            проверок += 1
            for f in sorted(папка_р.iterdir()):
                if f.name.startswith("."):
                    continue
                if без_видео and f.name.startswith(ТЯЖЁЛОЕ):
                    continue
                tar.add(f, arcname=f"наука/{папка_в.name}/{папка_р.name}/{f.name}")
                yield проверок


class _Ведро(io.RawIOBase):
    """Куда tarfile пишет сжатое; поток забирает накопленное после каждого файла."""

    def __init__(self) -> None:
        self.куски: list[bytes] = []

    def writable(self) -> bool:
        return True

    def write(self, b) -> int:  # type: ignore[override]
        self.куски.append(bytes(b))
        return len(b)

    def забрать(self) -> bytes:
        готово = b"".join(self.куски)
        self.куски.clear()
        return готово


def поток(*, без_видео: bool = False) -> Iterator[bytes]:
    """Архив .tgz кусками — для StreamingHttpResponse. Память — не больше
    одного файла записи (кусок видео — до 24 МБ)."""
    ведро = _Ведро()
    with tarfile.open(fileobj=ведро, mode="w|gz") as tar:
        for _ in упаковать(tar, без_видео=без_видео):
            кусок = ведро.забрать()
            if кусок:
                yield кусок
    кусок = ведро.забрать()
    if кусок:
        yield кусок


def в_файл(путь: Path, *, без_видео: bool = False, с: date | None = None) -> int:
    """Архив в файл на сервере (команда `наука_выгрузка`). → сколько проверок."""
    проверок = 0
    with tarfile.open(путь, "w:gz") as tar:
        for проверок in упаковать(tar, без_видео=без_видео, с=с):
            pass
    return проверок
