"""Files mutations. Thin: validate auth, delegate to services (role gate + key + presign)."""

from __future__ import annotations

import strawberry

from apps.files import services
from common.auth import require_user

from .types import UploadRequestInput, UploadTicket


@strawberry.type
class FilesMutation:
    @strawberry.mutation
    def request_upload(self, info: strawberry.Info, input: UploadRequestInput) -> UploadTicket:
        user = require_user(info)
        upload_url, file_key, expires_at = services.request_upload(
            user,
            filename=input.filename,
            content_type=input.content_type,
            purpose=input.purpose,
        )
        return UploadTicket(upload_url=upload_url, file_key=file_key, expires_at=expires_at)
