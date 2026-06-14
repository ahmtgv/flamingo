"""Scheduling models: LESSON_SESSION (concrete occurrence) + ATTENDANCE (ERD §3.2/§3.4)."""

from django.db import models

from common.enums import AttendanceStatus, SessionStatus, choices
from common.models import BaseModel


class LessonSession(BaseModel):
    lesson = models.ForeignKey("courses.Lesson", related_name="sessions", on_delete=models.CASCADE)
    # group FK is added with the institutions module.
    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=12, choices=choices(SessionStatus), default=SessionStatus.SCHEDULED.value
    )
    recording_key = models.CharField(max_length=512, blank=True, default="")

    class Meta:
        ordering = ["start_at"]


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
