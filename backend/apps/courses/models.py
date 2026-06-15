"""Learning-content models: COURSE, SECTION, LESSON, MATERIAL, ENROLLMENT (ERD §3.2)."""

from django.db import models

from common.enums import (
    AccessStatus,
    CourseLevel,
    CourseStatus,
    EnrollmentStatus,
    LessonStatus,
    MaterialType,
    choices,
)
from common.models import BaseModel, SoftDeleteModel


def default_lesson_options() -> dict:
    return {"camera": True, "screen": True, "chat": True, "homework": False}


class Course(SoftDeleteModel):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    level = models.CharField(max_length=12, choices=choices(CourseLevel))
    subject = models.CharField(max_length=120)
    language = models.CharField(max_length=8, default="ru")
    owner = models.ForeignKey(
        "accounts.TeacherProfile", related_name="courses", on_delete=models.CASCADE
    )
    status = models.CharField(
        max_length=12, choices=choices(CourseStatus), default=CourseStatus.DRAFT.value
    )
    cover_key = models.CharField(max_length=512, blank=True, default="")
    # Payment-readiness seam (see courses/access.py + CLAUDE.md "Future: Payments").
    # price is in integer minor units (kopecks); null = free. currency is ISO-4217;
    # null when free. No pricing/gating logic exists yet — these are integration points.
    price = models.PositiveIntegerField(null=True, blank=True)
    currency = models.CharField(max_length=3, null=True, blank=True)
    # Institutional delivery (Option A): an optional owning institution and a single
    # optional target group. Nullable/additive — B2C courses leave both null. Group→
    # course access is decided in courses/access.py: can_access_course (one place).
    institution = models.ForeignKey(
        "institutions.Institution",
        related_name="courses",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    group = models.ForeignKey(
        "institutions.Group",
        related_name="courses",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    def __str__(self) -> str:
        return self.title


class Section(BaseModel):
    course = models.ForeignKey(Course, related_name="sections", on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    cover_key = models.CharField(max_length=512, blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]


class Lesson(SoftDeleteModel):
    section = models.ForeignKey(Section, related_name="lessons", on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    duration_min = models.PositiveIntegerField(default=0)
    options = models.JSONField(default=default_lesson_options)
    schedule_rule = models.JSONField(null=True, blank=True)
    status = models.CharField(
        max_length=12, choices=choices(LessonStatus), default=LessonStatus.DRAFT.value
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]


class Material(BaseModel):
    lesson = models.ForeignKey(
        Lesson, related_name="materials", null=True, blank=True, on_delete=models.CASCADE
    )
    course = models.ForeignKey(
        Course, related_name="materials", null=True, blank=True, on_delete=models.CASCADE
    )
    type = models.CharField(max_length=8, choices=choices(MaterialType))
    title = models.CharField(max_length=200)
    file_key = models.CharField(max_length=512, blank=True, default="")
    url = models.URLField(blank=True, default="")
    body = models.TextField(blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]


class Enrollment(BaseModel):
    student = models.ForeignKey(
        "accounts.StudentProfile", related_name="enrollments", on_delete=models.CASCADE
    )
    course = models.ForeignKey(Course, related_name="enrollments", on_delete=models.CASCADE)
    status = models.CharField(
        max_length=12, choices=choices(EnrollmentStatus), default=EnrollmentStatus.ACTIVE.value
    )
    # Payment-gating seam (see courses/access.py). Default ACTIVE = open/free.
    access_status = models.CharField(
        max_length=16, choices=choices(AccessStatus), default=AccessStatus.ACTIVE.value
    )
    progress_pct = models.PositiveIntegerField(default=0)
    # Per-lesson view tracking backing progress_pct (MVP; keeps markLessonViewed idempotent).
    viewed_lesson_ids = models.JSONField(default=list)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "course"], name="uniq_enrollment")
        ]
