"""GraphQL types for SEduM (CMF). Names mirror the SDL contract."""

from __future__ import annotations

import datetime as dt

import strawberry
import strawberry_django
from strawberry import auto
from strawberry.scalars import JSON

from apps.seedum import models
from common.enums import InsightKind, RecommendationKind


@strawberry.type
class AttentionMetric:
    id: strawberry.ID
    session_id: strawberry.ID
    student_id: strawberry.ID
    bucket_start: dt.datetime
    avg_attention: int  # engagement composite (persisted)
    # Per-bucket aggregate sub-metrics — LIVE-ONLY (built from the channel payload; not persisted).
    gaze_on_screen: int | None = None
    eye_openness: int | None = None
    head_yaw: int | None = None
    head_pitch: int | None = None
    alertness: int | None = None


@strawberry.type
class AttentionPoint:
    at: dt.datetime
    value: int


@strawberry.type
class AttentionSummary:
    average_attention: int
    peak: int
    low: int
    points: list[AttentionPoint]


@strawberry.type
class SubjectAttention:
    subject: str
    average_attention: int


@strawberry.type
class DailyAttention:
    weekday: int
    average_attention: int


@strawberry.type
class Insight:
    kind: InsightKind
    text: str


@strawberry.type
class AttentionAnalytics:
    average_attention: int
    by_subject: list[SubjectAttention]
    by_weekday: list[DailyAttention]
    insights: list[Insight]


@strawberry_django.type(models.Recommendation)
class Recommendation:
    id: auto
    title: auto
    body: auto
    dismissed: auto
    created_at: auto

    @strawberry_django.field
    def kind(self) -> RecommendationKind:
        return RecommendationKind(self.kind)

    @strawberry_django.field
    def payload(self) -> JSON:
        return self.payload or {}


@strawberry.type
class UbpBackup:
    encrypted_blob: str
    key_hint: str | None
    updated_at: dt.datetime
