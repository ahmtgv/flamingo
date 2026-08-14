"""Scheduling models: LESSON_SESSION (concrete occurrence) + ATTENDANCE (ERD §3.2/§3.4)."""

from django.db import models

from common.enums import AttendanceStatus, SessionStatus, choices
from common.models import BaseModel


class LessonSession(BaseModel):
    lesson = models.ForeignKey("courses.Lesson", related_name="sessions", on_delete=models.CASCADE)
    # Optional target group for institutional (B2B) scheduling (Option A). Nullable/
    # additive — B2C sessions leave it null.
    group = models.ForeignKey(
        "institutions.Group",
        related_name="sessions",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=12, choices=choices(SessionStatus), default=SessionStatus.SCHEDULED.value
    )
    # Р5.5-В п.2: занятие, которое никто не завершал. Преподаватель закрыл ноутбук — точка
    # встречи видит пропажу heartbeat и закрывает занятие сама, чтобы посещаемость и оценки
    # доехали до ученика. Помечается ЧЕСТНО: в дневнике ученика так и написано, что занятие
    # завершилось само, и длительность не выдумывается — `end_at` ставится по последнему
    # известному признаку жизни, а не по «сейчас».
    closed_automatically = models.BooleanField(default=False)
    # No recording field, deliberately: lesson video and audio are never stored (CLAUDE.md
    # §2.2, owner decision 2026-08-12). A session is an occurrence for attendance and
    # attention buckets — the record of what happened is the summary, not a media file.
    # Enforced by apps/seedum/tests/test_storage_policy.py.

    class Meta:
        ordering = ["start_at"]
        # A-H2: my_schedule range-filters start_at; room/live paths filter status.
        indexes = [
            models.Index(fields=["start_at"]),
            models.Index(fields=["status"]),
        ]


class ProjectorCode(BaseModel):
    """A short code that puts the lesson on a second screen.

    The cast model (masterplan §6.4): the teacher presses «вывести на второй экран», reads a
    short code off their screen and types it on the tablet — no second login, the way a
    Chromecast works. What the code buys is deliberately tiny: a subscriber-only, HIDDEN
    LiveKit token for this session, valid briefly, revoked when the lesson ends.

    It is a credential with a TTL, not lesson content — the same category as REVOKED_TOKEN,
    not something the storage whitelist governs. Nothing about the lesson is kept here.
    """

    session = models.ForeignKey(
        LessonSession, related_name="projector_codes", on_delete=models.CASCADE
    )
    code = models.CharField(max_length=12, unique=True, db_index=True)
    created_by = models.ForeignKey(
        "accounts.User", related_name="projector_codes", on_delete=models.CASCADE
    )
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["session", "revoked_at"])]

    def __str__(self) -> str:
        return f"projector {self.code}"


class Attendance(BaseModel):
    session = models.ForeignKey(LessonSession, related_name="attendances", on_delete=models.CASCADE)
    student = models.ForeignKey(
        "accounts.StudentProfile", related_name="attendances", on_delete=models.CASCADE
    )
    status = models.CharField(
        max_length=12, choices=choices(AttendanceStatus), default=AttendanceStatus.PRESENT.value
    )
    joined_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["session", "student"], name="uniq_attendance")
        ]
