"""Object storage — the ONLY place that talks to a blob store.

Presigned URLs let the browser upload/download bytes DIRECTLY to storage — no file bytes ever
transit Django/GraphQL (CLAUDE.md §5). Endpoint/creds come from ``settings.S3`` so the same
code targets native MinIO in dev and Yandex Object Storage (RF) in prod (152-FZ).

`presign_put` signs the Content-Type (the client must send a matching header). A presigned PUT
cannot cap object size before upload — callers enforce size/type at BIND time via `head()`.

**Two backends, one interface** (Р5.2, ADR-001). The server keeps S3; the desktop sidecar has
no object store, so files live beside the SQLite cabinet in the folder the teacher chose. The
choice is `settings.STORAGE_BACKEND` — configuration, never an `if` at a call site, and never
a hardcoded «на десктопе всё локально» (OWNER_SCOPE §18, requirement (г)).

Dropping boto3 on the desktop is not cosmetic: botocore is 21 MB of the sidecar, and the
desktop profile has no use for a single line of it.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from django.conf import settings

# Capability-token TTLs — kept short (presigned URLs are bearer credentials).
PUT_TTL = 600  # 10 min — upload window
GET_TTL = 300  # 5 min — download window


def backend() -> str:
    """`"s3"` on the server, `"local"` inside the desktop sidecar."""
    return getattr(settings, "STORAGE_BACKEND", "s3")


def _local_root() -> Path:
    root = Path(getattr(settings, "LOCAL_STORAGE_ROOT", "") or "/tmp/flamingo-files")
    root.mkdir(parents=True, exist_ok=True)
    return root


def _local_path(key: str) -> Path:
    """Resolve a key under the storage root, refusing anything that climbs out of it.

    A key reaches this from a database column, and a column is only as trustworthy as
    everything that ever wrote to it. `../` in a key must not become a path on the teacher's
    disk.
    """
    root = _local_root().resolve()
    path = (root / key).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Object key escapes the storage root")
    return path


def _client():
    # boto3 is imported HERE and not at module scope so the desktop profile never loads it.
    # botocore is 21 MB of a 118 MB sidecar, and a laptop has no object store to talk to —
    # `test_desktop_runtime.py` asserts the absence rather than trusting this comment.
    import boto3
    from botocore.client import Config

    s3 = settings.S3
    return boto3.client(
        "s3",
        endpoint_url=s3["endpoint"] or None,
        aws_access_key_id=s3["access_key"] or None,
        aws_secret_access_key=s3["secret_key"] or None,
        region_name=s3.get("region") or "us-east-1",
        config=Config(signature_version="s3v4"),
    )


def presign_put(key: str, content_type: str, ttl: int = PUT_TTL) -> str:
    """Presigned PUT URL. Content-Type is signed → the client must send it verbatim."""
    if backend() == "local":
        # The sidecar serves its own loopback upload route; there is nothing to sign when the
        # only party that can reach the address is the app on this machine.
        return f"/local-files/{key}"
    return _client().generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.S3["bucket"], "Key": key, "ContentType": content_type},
        ExpiresIn=ttl,
    )


def presign_get(key: str, ttl: int = GET_TTL) -> str:
    """Presigned GET URL. Authorization is the caller's job — only hand this to a viewer who
    is allowed to read this key (per-resolver auth on every fileUrl)."""
    if backend() == "local":
        return f"/local-files/{key}"
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3["bucket"], "Key": key},
        ExpiresIn=ttl,
    )


def head(key: str) -> dict | None:
    """``{"size", "content_type"}`` for an uploaded object, or None if it doesn't exist.
    Used at bind time to enforce size/type limits the presigned PUT couldn't."""
    if backend() == "local":
        try:
            path = _local_path(key)
        except ValueError:
            return None
        if not path.is_file():
            return None
        return {"size": path.stat().st_size, "content_type": ""}

    from botocore.exceptions import ClientError

    try:
        r = _client().head_object(Bucket=settings.S3["bucket"], Key=key)
    except ClientError:
        return None
    return {"size": r["ContentLength"], "content_type": r.get("ContentType", "")}


def copy(src_key: str, dst_key: str) -> bool:
    """Copy an object within the store. Returns False when the source is not there.

    This is what makes the pupil's mirror a COPY rather than a pointer (PROMPT_14 Р5.2, red
    debt). A mirror that stored the teacher's object key would keep working right up to the
    day the cabinet moved onto their laptop — and would then fail silently: the record is
    there, the file does not open. Copying now costs a few megabytes and removes a failure
    that could only ever be discovered by a child who lost their work.
    """
    if backend() == "local":
        try:
            source = _local_path(src_key)
            target = _local_path(dst_key)
        except ValueError:
            # A key that climbs out of the root is not «missing», it is wrong — but the
            # caller's safe move is the same one: leave the attachment out. Raising here would
            # take a whole mirrored work down with it.
            return False
        if not source.is_file():
            return False
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        return True
    from botocore.exceptions import ClientError

    bucket = settings.S3["bucket"]
    try:
        _client().copy_object(
            Bucket=bucket, Key=dst_key, CopySource={"Bucket": bucket, "Key": src_key}
        )
    except ClientError:
        return False
    return True


def read_bytes(key: str) -> bytes | None:
    """The object itself, for putting inside a cabinet file (Р5.5).

    A backup that carries rows but not bytes restores a submission whose attachment does not
    open — the same silent failure the mirror's red debt was about, one layer up. So the
    export reads the bytes and the archive carries them.
    """
    if backend() == "local":
        try:
            path = _local_path(key)
        except ValueError:
            return None
        return path.read_bytes() if path.is_file() else None

    from botocore.exceptions import ClientError

    try:
        return _client().get_object(Bucket=settings.S3["bucket"], Key=key)["Body"].read()
    except ClientError:
        return None


def write_bytes(key: str, data: bytes) -> bool:
    """Put an object back where its row expects to find it (Р5.5 restore)."""
    if backend() == "local":
        try:
            path = _local_path(key)
        except ValueError:
            return False
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return True

    from botocore.exceptions import ClientError

    try:
        _client().put_object(Bucket=settings.S3["bucket"], Key=key, Body=data)
        return True
    except ClientError:
        return False
