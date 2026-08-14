"""Learning-content models: COURSE, SECTION, LESSON, MATERIAL, ENROLLMENT (ERD §3.2)."""

from django.db import models

from common.enums import (
    AccessStatus,
    CourseLevel,
    CourseStatus,
    EnrollmentStatus,
    GradingScale,
    LessonKind,
    LessonStatus,
    MaterialType,
    SavedItemKind,
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
    # Owner decision 2026-08-13: both scales ship. A school subject shows the five-point mark
    # a parent recognises; a standalone course shows percent. This is a DISPLAY property —
    # `Submission.score` stays one number, and topic mastery is computed in internal
    # fractions so the coarser scale cannot blur the analytics.
    grading_scale = models.CharField(
        max_length=12, choices=choices(GradingScale), blank=True, default=""
    )

    @property
    def scale(self) -> GradingScale:
        """The scale to enter and show marks in. Declared wins; otherwise the course's own
        nature decides — a course with an institution behind it is a school subject."""
        if self.grading_scale:
            return GradingScale(self.grading_scale)
        return GradingScale.FIVE_POINT if self.institution_id else GradingScale.PERCENT

    class Meta:
        # A-H2: catalog + course query filter by status (hot); owner/group are FKs (auto-indexed).
        indexes = [models.Index(fields=["status"])]

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
    # Owner decision 2026-08-12 (atlas 01): a telescope lesson stays a lesson in the
    # programme, but doing it opens the instrument's own page. The kind is the seam for the
    # shared ExternalDevice abstraction — device_key names WHICH instrument, so a new device
    # is data, not a new branch in the code.
    kind = models.CharField(
        max_length=20, choices=choices(LessonKind), default=LessonKind.STANDARD.value
    )
    device_key = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ["order"]
        # A-H2: lesson lists / published filters hit status; section is a FK (auto-indexed).
        indexes = [models.Index(fields=["status"])]


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
    # A saved board is a material of the lesson (§4.2 п.2) — this is the join that puts
    # «доска прошлого урока» where a learner already looks for the lesson's things.
    board_snapshot = models.ForeignKey(
        "board.BoardSnapshot",
        related_name="materials",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    # A sent summary is a material of the lesson too (§4.2 п.1) — «саммари останется в
    # материалах урока и у вас, и у учеников». A pointer, never a copy: the summary keeps
    # being the one authoritative text.
    summary = models.ForeignKey(
        "summaries.LessonSummary",
        related_name="materials",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    # Licence travels with the asset (R4.3). Open bases are the only ones we pull inside the
    # product, and an open licence is still a licence: CC BY wants a name, Tatoeba audio is
    # per-line, Common Voice is CC0. Empty means "ours" — a teacher's own upload.
    license = models.CharField(max_length=64, blank=True, default="")
    attribution = models.CharField(max_length=300, blank=True, default="")
    source_url = models.URLField(max_length=1000, blank=True, default="")
    # 🔴 Граница §20.5.2 как колонка: «выдал → стало общим и лежит у ученика; не выдал → своё».
    # Существование материала ничего не выдаёт — выдаёт АКТ, и вот его отметка. Пока она
    # пуста, материал живёт только у преподавателя, и в зеркало ему попасть нечем.
    shared_at = models.DateTimeField(null=True, blank=True)

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
        # A-H2: can_access_course + my_schedule filter a student's enrollments by access_status
        # (the ACTIVE gate). student/course are FKs (auto-indexed); this composite serves the
        # "this student's active enrollments" lookup.
        indexes = [models.Index(fields=["student", "access_status"])]


class SavedItem(BaseModel):
    """Something a learner kept for themselves — the "мои сохранённые" half of the materials
    tab (atlas sheet 01).

    Kept deliberately separate from MATERIAL: the sheet is explicit that a teacher's
    authority must not be mixed with a learner's own finds. A row is either a pointer to a
    course material or an external source discovered in the sources hub, never a copy of the
    content itself (licences travel with the link, not with us).
    """

    user = models.ForeignKey("accounts.User", related_name="saved_items", on_delete=models.CASCADE)
    # Which subject it was saved under; null = saved outside any course.
    course = models.ForeignKey(
        Course, related_name="saved_items", null=True, blank=True, on_delete=models.CASCADE
    )
    lesson = models.ForeignKey(
        Lesson, related_name="saved_items", null=True, blank=True, on_delete=models.SET_NULL
    )
    material = models.ForeignKey(
        "courses.Material", related_name="saved_by", null=True, blank=True, on_delete=models.CASCADE
    )
    # An external find: title + url only (never the content — see the class docstring).
    title = models.CharField(max_length=200, blank=True, default="")
    url = models.URLField(max_length=1000, blank=True, default="")
    source_name = models.CharField(max_length=120, blank=True, default="")  # e.g. "NASA"
    kind = models.CharField(
        max_length=16, choices=choices(SavedItemKind), default=SavedItemKind.SAVED.value
    )
    note = models.TextField(blank=True, default="")

    class Meta:
        indexes = [models.Index(fields=["user", "course"])]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "material"],
                condition=models.Q(material__isnull=False),
                name="uniq_saved_material_per_user",
            )
        ]

    def __str__(self) -> str:
        return self.title or (self.material.title if self.material_id else str(self.id))
