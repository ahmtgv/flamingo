"""Homework & grading models: HOMEWORK, SUBMISSION, SUBMISSION_FILE (ERD §3.4)."""

from django.db import models

from common.enums import HomeworkType, SubmissionStatus, choices
from common.models import BaseModel, SoftDeleteModel


class Homework(SoftDeleteModel):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    type = models.CharField(max_length=8, choices=choices(HomeworkType))
    due_at = models.DateTimeField(null=True, blank=True)
    allow_redo = models.BooleanField(default=False)
    #: 🔴 Свой максимум у задания (решение владельца §28.2). Без него четвёрка из пяти и
    #: четвёрка из ста были неразличимы: `score` — просто число, и «4» ничего не значило,
    #: пока не знаешь, из скольких. Умолчание пятибалльное — школьная норма РФ.
    #: `null` = зачёт/незачёт: числа у такой отметки нет вовсе (см. GradingScale.PASS_FAIL).
    max_score = models.PositiveIntegerField(default=5, null=True, blank=True)
    # Attached to a lesson and/or a course (at least one); optionally targeted at a
    # group for institutional delivery (Option A). All nullable/additive.
    lesson = models.ForeignKey(
        "courses.Lesson", related_name="homework", null=True, blank=True, on_delete=models.CASCADE
    )
    course = models.ForeignKey(
        "courses.Course", related_name="homework", null=True, blank=True, on_delete=models.CASCADE
    )
    group = models.ForeignKey(
        "institutions.Group",
        related_name="homework",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_by = models.ForeignKey(
        "accounts.User", related_name="homework_created", on_delete=models.CASCADE
    )
    published_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return self.title

    @property
    def is_published(self) -> bool:
        return self.published_at is not None


class Submission(BaseModel):
    homework = models.ForeignKey(Homework, related_name="submissions", on_delete=models.CASCADE)
    student = models.ForeignKey(
        "accounts.StudentProfile", related_name="submissions", on_delete=models.CASCADE
    )
    attempt = models.PositiveIntegerField(default=1)
    content_text = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=12, choices=choices(SubmissionStatus), default=SubmissionStatus.SUBMITTED.value
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.PositiveIntegerField(null=True, blank=True)
    comment = models.TextField(blank=True, default="")
    graded_by = models.ForeignKey(
        "accounts.User",
        related_name="submissions_graded",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    graded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["attempt"]
        constraints = [
            models.UniqueConstraint(
                fields=["homework", "student", "attempt"], name="uniq_submission_attempt"
            )
        ]


class SubmissionFile(BaseModel):
    submission = models.ForeignKey(Submission, related_name="files", on_delete=models.CASCADE)
    file_key = models.CharField(max_length=512)
    name = models.CharField(max_length=255)
