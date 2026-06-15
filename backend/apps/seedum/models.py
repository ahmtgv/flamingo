"""SEduM (CMF) models — aggregates only (ERD §3.5/§6).

Privacy invariant: the server stores ONLY aggregated attention (``avg_attention``
per ~10s bucket) and an opaque, client-encrypted UBP blob. Raw video/audio,
frame-level biometric features and plaintext UBP never reach the server.
"""

from django.db import models

from common.enums import RecommendationKind, choices
from common.models import BaseModel


class AttentionMetric(BaseModel):
    """One aggregated attention value for a (student, session, time-bucket)."""

    lesson_session = models.ForeignKey(
        "scheduling.LessonSession", related_name="attention_metrics", on_delete=models.CASCADE
    )
    student = models.ForeignKey(
        "accounts.StudentProfile", related_name="attention_metrics", on_delete=models.CASCADE
    )
    bucket_start = models.DateTimeField()
    avg_attention = models.PositiveSmallIntegerField()  # 0..100

    class Meta:
        indexes = [models.Index(fields=["student", "bucket_start"])]
        constraints = [
            models.UniqueConstraint(
                fields=["lesson_session", "student", "bucket_start"], name="uniq_attention_bucket"
            )
        ]


class UbpBackup(BaseModel):
    """Opt-in, client-side-encrypted UBP blob. The server stores and returns bytes
    it cannot decrypt (only ``key_hint`` is metadata)."""

    user = models.OneToOneField(
        "accounts.User", related_name="ubp_backup", on_delete=models.CASCADE
    )
    encrypted_blob = models.BinaryField()
    key_hint = models.CharField(max_length=255, blank=True, default="")


class Recommendation(BaseModel):
    user = models.ForeignKey(
        "accounts.User", related_name="recommendations", on_delete=models.CASCADE
    )
    kind = models.CharField(max_length=12, choices=choices(RecommendationKind))
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True, default="")
    payload = models.JSONField(default=dict, blank=True)
    dismissed = models.BooleanField(default=False)
