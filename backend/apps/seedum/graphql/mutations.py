"""SEduM mutations: reportAttention (aggregate-only), UBP backup, dismissRecommendation."""

from __future__ import annotations

import datetime as dt

import strawberry

from apps.seedum import services
from common.auth import require_user

from .types import Recommendation, UbpBackup


@strawberry.input
class AttentionInput:
    # Aggregate ONLY — no frames/landmarks/raw signals ever (CLAUDE.md §2/§7).
    # studentId is intentionally absent: it is derived from the authenticated user.
    session_id: strawberry.ID
    bucket_start: dt.datetime
    avg_attention: int


@strawberry.input
class UbpBackupInput:
    encrypted_blob: str  # base64 of the client-side-encrypted blob (opaque to server)
    key_hint: str | None = None


@strawberry.type
class SeedumMutation:
    @strawberry.mutation
    def report_attention(self, info: strawberry.Info, input: AttentionInput) -> bool:
        return services.record_attention(
            require_user(info),
            session_id=input.session_id,
            bucket_start=input.bucket_start,
            avg_attention=input.avg_attention,
        )

    @strawberry.mutation
    def backup_ubp(self, info: strawberry.Info, input: UbpBackupInput) -> UbpBackup:
        backup = services.backup_ubp(
            require_user(info), encrypted_blob=input.encrypted_blob, key_hint=input.key_hint or ""
        )
        return UbpBackup(
            encrypted_blob=services.ubp_blob_b64(backup),
            key_hint=backup.key_hint or None,
            updated_at=backup.updated_at,
        )

    @strawberry.mutation
    def delete_ubp_backup(self, info: strawberry.Info) -> bool:
        return services.delete_ubp_backup(require_user(info))

    @strawberry.mutation
    def dismiss_recommendation(self, info: strawberry.Info, id: strawberry.ID) -> Recommendation:
        return services.dismiss_recommendation(require_user(info), id)
