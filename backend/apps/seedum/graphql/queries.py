"""SEduM queries: attentionAnalytics, sessionAttention, recommendations, ubpBackup."""

import datetime as dt

import strawberry

from apps.seedum import services
from common.auth import get_current_user, require_user
from common.enums import InsightKind

from .types import (
    AttentionAnalytics,
    AttentionPoint,
    AttentionSummary,
    DailyAttention,
    Insight,
    Recommendation,
    SubjectAttention,
    UbpBackup,
)


@strawberry.type
class SeedumQuery:
    @strawberry.field
    def attention_analytics(
        self,
        info: strawberry.Info,
        student_id: strawberry.ID | None = None,
        course_id: strawberry.ID | None = None,
        from_: dt.datetime | None = None,
        to: dt.datetime | None = None,
    ) -> AttentionAnalytics:
        d = services.attention_analytics(
            require_user(info), student_id=student_id, course_id=course_id, from_=from_, to=to
        )
        return AttentionAnalytics(
            average_attention=d["average"],
            by_subject=[
                SubjectAttention(subject=s["subject"], average_attention=s["average"])
                for s in d["by_subject"]
            ],
            by_weekday=[
                DailyAttention(weekday=w["weekday"], average_attention=w["average"])
                for w in d["by_weekday"]
            ],
            insights=[Insight(kind=InsightKind(i["kind"]), text=i["text"]) for i in d["insights"]],
        )

    @strawberry.field
    def session_attention(
        self, info: strawberry.Info, session_id: strawberry.ID
    ) -> AttentionSummary:
        d = services.session_attention(require_user(info), session_id)
        return AttentionSummary(
            average_attention=d["average"],
            peak=d["peak"],
            low=d["low"],
            points=[AttentionPoint(at=p["at"], value=p["value"]) for p in d["points"]],
        )

    @strawberry.field
    def recommendations(self, info: strawberry.Info) -> list[Recommendation]:
        return services.recommendations(require_user(info))

    @strawberry.field
    def ubp_backup(self, info: strawberry.Info) -> UbpBackup | None:
        backup = services.get_ubp_backup(get_current_user(info))
        if backup is None:
            return None
        return UbpBackup(
            encrypted_blob=services.ubp_blob_b64(backup),
            key_hint=backup.key_hint or None,
            updated_at=backup.updated_at,
        )
