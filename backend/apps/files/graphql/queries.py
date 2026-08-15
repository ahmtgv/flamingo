"""Files queries — политика загрузки, чтобы клиент говорил правила до попытки, а не после."""

from __future__ import annotations

import strawberry

from apps.files.services import PURPOSE_POLICY
from common.auth import require_user
from common.enums import UploadPurpose

from .types import UploadPolicy


@strawberry.type
class FilesQuery:
    @strawberry.field
    def upload_policy(self, info: strawberry.Info, purpose: UploadPurpose) -> UploadPolicy:
        """Потолок и допустимые типы для цели загрузки.

        Требует входа, но НИЧЕГО не решает о правах: политика — это правила продукта, а не
        чьи-то данные. Роль по-прежнему проверяется в `request_upload`, и знание потолка не
        приближает к чужому файлу ни на шаг.
        """
        require_user(info)
        policy = PURPOSE_POLICY[purpose]
        return UploadPolicy(
            purpose=purpose,
            max_bytes=policy.max_size,
            content_types=list(policy.content_types),
        )
