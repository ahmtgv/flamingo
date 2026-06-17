"""Object-storage client (S3-compatible). The ONLY place that talks to S3.

Presigned URLs let the browser upload/download bytes DIRECTLY to storage — no file bytes ever
transit Django/GraphQL (CLAUDE.md §5). Endpoint/creds come from ``settings.S3`` so the same
code targets native MinIO in dev and Yandex Object Storage (RF) in prod (152-FZ).

`presign_put` signs the Content-Type (the client must send a matching header). A presigned PUT
cannot cap object size before upload — callers enforce size/type at BIND time via `head()`.
"""

from __future__ import annotations

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from django.conf import settings

# Capability-token TTLs — kept short (presigned URLs are bearer credentials).
PUT_TTL = 600  # 10 min — upload window
GET_TTL = 300  # 5 min — download window


def _client():
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
    return _client().generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.S3["bucket"], "Key": key, "ContentType": content_type},
        ExpiresIn=ttl,
    )


def presign_get(key: str, ttl: int = GET_TTL) -> str:
    """Presigned GET URL. Authorization is the caller's job — only hand this to a viewer who
    is allowed to read this key (per-resolver auth on every fileUrl)."""
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3["bucket"], "Key": key},
        ExpiresIn=ttl,
    )


def head(key: str) -> dict | None:
    """``{"size", "content_type"}`` for an uploaded object, or None if it doesn't exist.
    Used at bind time to enforce size/type limits the presigned PUT couldn't."""
    try:
        r = _client().head_object(Bucket=settings.S3["bucket"], Key=key)
    except ClientError:
        return None
    return {"size": r["ContentLength"], "content_type": r.get("ContentType", "")}
