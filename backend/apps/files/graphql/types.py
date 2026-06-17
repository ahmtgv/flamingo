"""GraphQL types for the files module — match the committed SDL exactly (UploadTicket,
UploadRequestInput, UploadPurpose). Hand-maintained SDL; do NOT regenerate."""

from __future__ import annotations

import datetime as dt

import strawberry

from common.enums import UploadPurpose


@strawberry.type
class UploadTicket:
    upload_url: str  # presigned PUT (client uploads bytes here directly)
    file_key: str  # the key the follow-up mutation stores
    expires_at: dt.datetime


@strawberry.input
class UploadRequestInput:
    filename: str
    content_type: str
    purpose: UploadPurpose
