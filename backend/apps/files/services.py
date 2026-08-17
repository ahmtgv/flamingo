"""Files module — presigned uploads (Option A: modelless; keys live on the consumers per the
ERD). Authorization model:

  * requestUpload: a per-purpose ROLE gate + an OWNER-NAMESPACED key (`<prefix>/<userId>/…`),
    so a forged key can't target another user's namespace. Content-Type is gated here and
    SIGNED into the PUT URL.
  * bind time (the consuming mutation, e.g. submitHomework): `assert_caller_key` (the key is in
    the caller's own namespace) + `validate_uploaded` (the object exists and is within the
    per-purpose size/type limit — what the presigned PUT couldn't enforce pre-upload).
  * download: each `fileUrl`/`avatarUrl` resolver authorizes the VIEWER before calling
    `storage.presign_get` (per-resolver auth — see the consumers).

No file bytes pass through GraphQL; this module only ever produces/validates keys + URLs.
"""

from __future__ import annotations

import datetime as dt
import uuid
from dataclasses import dataclass

from django.utils import timezone
from django.utils.text import get_valid_filename

from common import storage
from common.enums import Role, UploadPurpose
from common.exceptions import PermissionDenied, ValidationError

_MB = 1024 * 1024
_IMAGE = ("image/jpeg", "image/png", "image/webp")
# Documents accepted for submissions / materials / verification (+ images).
_DOC = (*_IMAGE, "application/pdf", "text/plain")

# 🔴 Видео в материалах — решение владельца 15.08 (OWNER_SCOPE §22). Это ИСПРАВЛЕНИЕ, а не
# расширение белого списка §2.2.
#
# Инвариант «не храним видео и аудио урока» — про ЗАПИСЬ ЗАНЯТИЯ, которую делает система:
# нет кода записи, нет ручки, принимающей поток, нет цели загрузки с именем recording. Учебный
# ролик, который преподаватель прикрепил сам, — это пункт 2 белого списка («прикреплённые
# материалы»), и запрещать его было нечем. Слишком широкая трактовка снимается здесь; сам
# запрет остаётся ровно там, где стоял, и его стережёт `test_privacy.py`.
_VIDEO = ("video/mp4", "video/webm", "video/quicktime")

# Потолок из §22. Ограничение дисковое, не юридическое: VPS на 20–40 ГБ.
#
# ⚠️ Это же число стоит в `infra/prod/Caddyfile` (`request_body max_size`). Разойдись они — и
# файл между двумя порогами загружался бы пять минут и умирал на 413 без объяснения, то есть
# ровно тем поведением, из-за которого правка и делается.
_MATERIAL_MAX = 500 * _MB


@dataclass(frozen=True)
class Policy:
    roles: tuple[Role, ...] | None  # None = any authenticated user
    prefix: str  # key namespace (owner id is appended after it)
    max_size: int  # bytes — enforced at bind time via head()
    content_types: tuple[str, ...]  # allowed Content-Type values


PURPOSE_POLICY: dict[UploadPurpose, Policy] = {
    UploadPurpose.AVATAR: Policy(None, "avatar", 5 * _MB, _IMAGE),
    UploadPurpose.SUBMISSION: Policy((Role.STUDENT,), "submission", 25 * _MB, _DOC),
    UploadPurpose.MATERIAL: Policy((Role.TEACHER,), "material", _MATERIAL_MAX, (*_DOC, *_VIDEO)),
    UploadPurpose.COVER: Policy((Role.TEACHER,), "cover", 5 * _MB, _IMAGE),
    UploadPurpose.INSTITUTION_LOGO: Policy((Role.ADMIN,), "institution/logo", 5 * _MB, _IMAGE),
    UploadPurpose.VERIFICATION: Policy((Role.TEACHER,), "verification", 25 * _MB, _DOC),
    # Роли не ограничиваем: на доску пишет и ученик, когда преподаватель её открыл
    # (`openForStudents`). Право писать на ЭТУ доску проверяется при добавлении элемента —
    # здесь проверять роль значило бы завести второе, расходящееся правило.
    UploadPurpose.BOARD_IMAGE: Policy(None, "board", 10 * _MB, _IMAGE),
}


def _owner_prefix(policy: Policy, user_id) -> str:
    return f"{policy.prefix}/{user_id}/"


def request_upload(user, *, filename: str, content_type: str, purpose: UploadPurpose):
    """Role-gate + content-type-gate, mint an owner-namespaced key, return a presigned PUT.

    Returns ``(upload_url, file_key, expires_at)``.
    """
    policy = PURPOSE_POLICY[purpose]
    if policy.roles is not None and user.role not in {r.value for r in policy.roles}:
        raise PermissionDenied("Not allowed to upload for this purpose")
    if content_type not in policy.content_types:
        raise ValidationError("Content type not allowed for this purpose")

    safe = get_valid_filename(filename) or "file"
    file_key = f"{_owner_prefix(policy, user.id)}{uuid.uuid4().hex}/{safe}"
    upload_url = storage.presign_put(file_key, content_type, ttl=storage.PUT_TTL)
    expires_at = timezone.now() + dt.timedelta(seconds=storage.PUT_TTL)
    return upload_url, file_key, expires_at


def assert_caller_key(user, key: str, purpose: UploadPurpose) -> None:
    """Bind-time: the key MUST be in the caller's own namespace for this purpose. Stops a user
    binding someone else's (or a forged) key to their own resource."""
    if not key.startswith(_owner_prefix(PURPOSE_POLICY[purpose], user.id)):
        raise PermissionDenied("File key is not in your upload namespace")


def validate_uploaded(key: str, purpose: UploadPurpose) -> None:
    """Bind-time: the object exists and is within the per-purpose size/type limit (what the
    presigned PUT couldn't enforce before upload)."""
    policy = PURPOSE_POLICY[purpose]
    meta = storage.head(key)
    if meta is None:
        raise ValidationError("Uploaded file not found")
    if meta["size"] > policy.max_size:
        raise ValidationError("File is too large")
    if meta["content_type"] and meta["content_type"] not in policy.content_types:
        raise ValidationError("File type not allowed")
