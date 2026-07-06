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
    recording_key = models.CharField(max_length=512, blank=True, default="")

    class Meta:
        ordering = ["start_at"]
        # A-H2: my_schedule range-filters start_at; room/live paths filter status.
        indexes = [
            models.Index(fields=["start_at"]),
            models.Index(fields=["status"]),
        ]


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
