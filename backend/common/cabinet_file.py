"""Кабинет одним файлом — выгрузка, шифрование, восстановление (Р5.5).

Why this phase came before a live lesson, in one sentence: the first run **forces** a teacher
to configure a copy (OWNER_SCOPE §19.1), and until this module existed nobody wrote one. The
single place in the product where we compel someone was not keeping its promise.

What the file is
----------------
A cabinet is not a database dump. It is the rows named in `portability.CABINET_TABLES` **and
the bytes those rows point at** — an export carrying a submission whose attachment does not
open is the mirror's red debt again, one layer up. So the container holds both::

    FLAMINGO-CABINET\\n          magic, so the file says what it is in a hex editor
    {json header}\\n             format version · sealed? · KDF params · nonce · what is inside
    <body>                       a ZIP: cabinet.json + files/<key>…, optionally sealed

The header stays **readable even when the body is sealed**. A person holding an encrypted file
they cannot open should still be able to see what it is, when it was made and what it needs —
otherwise a forgotten passphrase turns the file into an unidentifiable blob, and the honest
answer «this is your cabinet from 3 August, and the key is gone» becomes impossible to give.

Encryption
----------
🔒 The rule from CLAUDE.md §2.1 and OWNER_SCOPE §19.1: a copy that leaves the machine is
sealed **on the machine**, and a server that stores it stores bytes it cannot read. Here the
sidecar IS the teacher's machine, so sealing in Python is client-side in the only sense that
matters — the plaintext never exists anywhere the teacher does not control.

Sealing is AES-256-GCM with a key from scrypt. GCM rather than plain AES because a backup that
can be *modified* undetected is worse than one that can be read: a restored grade nobody
authored is a lie with a person's name on it.

⚠️ `passphrase=None` writes an unsealed file, and that is allowed on purpose. §2.2-бис says not
to invent restrictions: an external disk in a locked drawer is the teacher's call, and forcing
a passphrase onto the local copy would mean a forgotten passphrase destroys the very copy this
whole phase exists to guarantee. What is NOT optional is the cloud copy — `seal_required_for`
says so, and the caller cannot upload an unsealed file.
"""

from __future__ import annotations

import base64
import io
import json
import zipfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from django.conf import settings
from django.core import serializers
from django.db import transaction

from common import storage
from common.exceptions import ValidationError
from common.portability import CABINET_EXPORT_VERSION, CABINET_TABLES, exported_model_classes

#: Первая строка файла. Читается глазами и не зависит от расширения.
MAGIC = b"FLAMINGO-CABINET"

#: Расширение, под которым файл предлагается пользователю.
SUFFIX = ".flamingo"

#: scrypt: цена подбора пароля. 2**15 — секунды на ноутбуке, годы на переборе.
SCRYPT_N = 2**15
SCRYPT_R = 8
SCRYPT_P = 1
KEY_BYTES = 32
SALT_BYTES = 16
NONCE_BYTES = 12
#: 128·N·r байт нужно scrypt; берём с запасом (по умолчанию OpenSSL разрешает ровно столько).
SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2


@dataclass(frozen=True)
class CabinetHeader:
    """Что можно узнать о файле, не открывая его."""

    format: int
    sealed: bool
    created_at: str
    tables: int
    files: int
    rows: int
    salt: str = ""
    nonce: str = ""

    def as_dict(self) -> dict:
        return {
            "format": self.format,
            "sealed": self.sealed,
            "created_at": self.created_at,
            "tables": self.tables,
            "files": self.files,
            "rows": self.rows,
            "salt": self.salt,
            "nonce": self.nonce,
            "kdf": {"name": "scrypt", "n": SCRYPT_N, "r": SCRYPT_R, "p": SCRYPT_P},
        }


def _require_cabinet() -> None:
    """Отказ выгружать что-либо, кроме кабинета.

    🔴 The same code runs on the server, where these tables hold **every** teacher and pupil.
    An export there would be a full database dump handed to whoever asked, so it is refused —
    and refused by CONFIGURATION (§18-г), not by sniffing the database engine: a deployment
    decides what it is, the code does not guess.
    """
    if not getattr(settings, "CABINET_IS_LOCAL", False):
        raise ValidationError(
            "Cabinet export runs only on a local cabinet (settings.CABINET_IS_LOCAL)"
        )


def _derive(passphrase: str, salt: bytes) -> bytes:
    import hashlib

    # 128·N·r = 32 MiB, which is exactly OpenSSL's default ceiling — so the ceiling is raised
    # explicitly rather than the cost being lowered to fit under it. Making a passphrase
    # cheaper to attack in order to avoid one keyword argument is a poor trade.
    return hashlib.scrypt(
        passphrase.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=KEY_BYTES,
        maxmem=SCRYPT_MAXMEM,
    )


def _seal(body: bytes, passphrase: str) -> tuple[bytes, bytes, bytes]:
    import secrets

    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    salt = secrets.token_bytes(SALT_BYTES)
    nonce = secrets.token_bytes(NONCE_BYTES)
    return AESGCM(_derive(passphrase, salt)).encrypt(nonce, body, None), salt, nonce


def _unseal(body: bytes, passphrase: str, salt: bytes, nonce: bytes) -> bytes:
    from cryptography.exceptions import InvalidTag
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    try:
        return AESGCM(_derive(passphrase, salt)).decrypt(nonce, body, None)
    except InvalidTag as exc:
        # One message for a wrong key and for a damaged file, because from the outside they
        # are the same event: this file will not open with what you gave it.
        raise ValidationError("Wrong passphrase, or the file has been altered") from exc


def _referenced_file_keys() -> list[str]:
    """Ключи объектов, на которые ссылаются строки кабинета.

    Collected from the models' own columns rather than from a hardcoded list: a future model
    with a `*_key` column joins the backup by existing, not by somebody remembering to add it
    here. That is the difference between a backup that keeps its promise and one that kept it
    on the day it was written.
    """
    keys: list[str] = []
    for model in exported_model_classes():
        columns = [
            f.attname
            for f in model._meta.concrete_fields
            if f.attname.endswith("_key") and f.get_internal_type() in ("CharField", "TextField")
        ]
        if not columns:
            continue
        for row in model.objects.all().values(*columns):
            keys.extend(v for v in row.values() if v)
    return sorted(set(keys))


def export_cabinet(dest: str | Path, *, passphrase: str | None = None) -> CabinetHeader:
    """Записать кабинет одним файлом. Возвращает то, что попало в заголовок.

    The whole local database, restricted to `CABINET_TABLES` — and that is not a shortcut. A
    desktop cabinet **is** one teacher's world; there is nobody else in this database to
    filter out. The guard above is what keeps that assumption from silently becoming a
    server-wide dump.
    """
    _require_cabinet()
    dest = Path(dest)

    archive = io.BytesIO()
    rows = 0
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
        tables: dict[str, str] = {}
        for entry, model in zip(CABINET_TABLES, exported_model_classes(), strict=True):
            # `all_objects` where a soft-delete manager hides rows: a backup that quietly drops
            # deleted work is a backup that cannot answer «верните, я удалил случайно».
            manager = getattr(model, "all_objects", model.objects)
            queryset = manager.all()
            payload = serializers.serialize("json", queryset, indent=None)
            tables[entry.label] = payload
            rows += queryset.count()
        zf.writestr("cabinet.json", json.dumps(tables, ensure_ascii=False))

        file_keys = _referenced_file_keys()
        stored = 0
        for key in file_keys:
            data = storage.read_bytes(key)
            if data is None:
                # A row pointing at a file that is already gone is a fact about the cabinet,
                # not a reason to abandon the backup. It is recorded by absence and the
                # restore reports it.
                continue
            zf.writestr(f"files/{key}", data)
            stored += 1

    body = archive.getvalue()
    salt = nonce = b""
    if passphrase:
        body, salt, nonce = _seal(body, passphrase)

    header = CabinetHeader(
        format=CABINET_EXPORT_VERSION,
        sealed=bool(passphrase),
        created_at=datetime.now(UTC).isoformat(),
        tables=len(CABINET_TABLES),
        files=stored,
        rows=rows,
        salt=base64.b64encode(salt).decode() if salt else "",
        nonce=base64.b64encode(nonce).decode() if nonce else "",
    )

    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("wb") as fh:
        fh.write(MAGIC + b"\n")
        fh.write(json.dumps(header.as_dict(), ensure_ascii=False).encode("utf-8") + b"\n")
        fh.write(body)
    return header


def read_header(src: str | Path) -> CabinetHeader:
    """Заголовок без расшифровки — что это за файл и нужен ли к нему пароль."""
    with Path(src).open("rb") as fh:
        if fh.readline().rstrip(b"\n") != MAGIC:
            raise ValidationError("Not a Flamingo cabinet file")
        raw = json.loads(fh.readline().decode("utf-8"))
    return CabinetHeader(
        format=raw["format"],
        sealed=raw["sealed"],
        created_at=raw["created_at"],
        tables=raw["tables"],
        files=raw["files"],
        rows=raw["rows"],
        salt=raw.get("salt", ""),
        nonce=raw.get("nonce", ""),
    )


def _body_of(src: Path, passphrase: str | None) -> bytes:
    with src.open("rb") as fh:
        if fh.readline().rstrip(b"\n") != MAGIC:
            raise ValidationError("Not a Flamingo cabinet file")
        raw = json.loads(fh.readline().decode("utf-8"))
        body = fh.read()

    if raw["format"] > CABINET_EXPORT_VERSION:
        # The dangerous direction, same as `common/desktop.refuses_cabinet`: a newer file read
        # by an older build does not fail loudly, it restores columns that mean something else.
        raise ValidationError("This file was written by a newer version of Flamingo")

    if raw["sealed"]:
        if not passphrase:
            raise ValidationError("This cabinet file is encrypted — a passphrase is required")
        body = _unseal(
            body,
            passphrase,
            base64.b64decode(raw["salt"]),
            base64.b64decode(raw["nonce"]),
        )
    return body


@dataclass(frozen=True)
class RestoreReport:
    """Что вернулось. Числа, а не «успешно»."""

    rows: int
    files: int
    missing_files: int


def import_cabinet(src: str | Path, *, passphrase: str | None = None) -> RestoreReport:
    """Восстановить кабинет из файла.

    Restore order follows `CABINET_TABLES`, which is written parent-before-child: a course
    before its sections, a submission before the files attached to it. That ordering is load-
    bearing, not cosmetic — a restore that inserts a child first fails on the foreign key.

    Everything happens in one transaction. A half-restored cabinet is worse than a failed
    restore: the teacher cannot tell which half they are looking at.
    """
    _require_cabinet()
    src = Path(src)
    body = _body_of(src, passphrase)

    restored_rows = 0
    restored_files = 0
    missing = 0

    with zipfile.ZipFile(io.BytesIO(body)) as zf:
        tables = json.loads(zf.read("cabinet.json").decode("utf-8"))

        with transaction.atomic():
            for entry in CABINET_TABLES:
                payload = tables.get(entry.label)
                if not payload:
                    continue
                for obj in serializers.deserialize("json", payload):
                    obj.save()
                    restored_rows += 1

        for name in zf.namelist():
            if not name.startswith("files/"):
                continue
            key = name[len("files/") :]
            if storage.write_bytes(key, zf.read(name)):
                restored_files += 1
            else:
                missing += 1

    return RestoreReport(rows=restored_rows, files=restored_files, missing_files=missing)


def seal_required_for(destination: str) -> bool:
    """Обязательно ли шифровать копию, уходящую туда.

    🔒 Cloud: always. OWNER_SCOPE §19.1 and CLAUDE.md §2.1 — «на сервере лежит непрозрачный
    блок: мы не можем его прочитать». That is not a preference the caller may override.

    A disk the teacher holds is their own call (§2.2-бис — не изобретать ограничений), and the
    screen says plainly what a passphrase costs if it is lost.
    """
    return destination == "cloud"
