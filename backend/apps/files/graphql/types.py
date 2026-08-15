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


@strawberry.type
class UploadPolicy:
    """Что можно загрузить — числами, ДО попытки (находка владельца 15.08, п.3).

    🔴 Правила существовали только на сервере и срабатывали после выбора файла: человек
    выбирал ролик, ждал, и получал отказ. Хуже — отказ приходил английской строкой из
    сервиса. Экран обязан сказать потолок и список заранее, и сказать его ЧИСЛОМ СЕРВЕРА.

    Поэтому это запрос, а не константа в клиенте: константа разошлась бы с политикой в первый
    же раз, когда потолок подняли, и разошлась бы молча.
    """

    purpose: UploadPurpose
    max_bytes: int
    content_types: list[str]
