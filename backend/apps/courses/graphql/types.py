"""GraphQL types for the courses domain.

Type names mirror the SDL contract (Course, Section, …) rather than the *Type
suffix used in accounts — this matches docs/flamingo_schema.graphql and avoids a
clash with the MaterialType enum.
"""

from __future__ import annotations

import datetime as dt

import strawberry
import strawberry_django
from strawberry import auto
from strawberry.scalars import JSON

from apps.accounts.graphql.types import StudentProfileType, TeacherProfileType
from apps.courses import models, services
from apps.institutions.graphql.types import Institution as InstitutionType
from common.auth import get_current_user, require_user
from common.enums import (
    CourseLevel,
    CourseStatus,
    EnrollmentStatus,
    LessonStatus,
    MaterialType,
)


@strawberry.type
class LessonOptions:
    camera: bool
    screen: bool
    chat: bool
    homework: bool


@strawberry.type
class PageInfo:
    has_next_page: bool
    end_cursor: str | None


@strawberry_django.type(models.Material)
class Material:
    id: auto
    title: auto
    url: auto
    body: auto
    order: auto

    @strawberry_django.field
    def type(self) -> MaterialType:
        return MaterialType(self.type)

    @strawberry_django.field
    def file_url(self, info: strawberry.Info) -> str | None:
        # FILE materials only; presigned GET authorized via can_access_course (enrolled +
        # owner). No file → None (no auth gate for TEXT/LINK materials).
        if not self.file_key:
            return None
        return services.material_file_url(require_user(info), self)


@strawberry_django.type(models.Lesson)
class Lesson:
    id: auto
    title: auto
    duration_min: auto
    order: auto

    @strawberry_django.field
    def description(self, info: strawberry.Info) -> str | None:
        # Gated content (A-authz-1): guests/unenrolled see the published title only, never the
        # body. The owner and enrolled students (via can_access_course) see the description.
        return (
            self.description
            if services.lesson_content_visible(get_current_user(info), self)
            else None
        )

    @strawberry_django.field
    def options(self) -> LessonOptions:
        o = self.options or {}
        return LessonOptions(
            camera=o.get("camera", True),
            screen=o.get("screen", True),
            chat=o.get("chat", True),
            homework=o.get("homework", False),
        )

    @strawberry_django.field
    def schedule_rule(self) -> JSON | None:
        return self.schedule_rule

    @strawberry_django.field
    def status(self) -> LessonStatus:
        return LessonStatus(self.status)

    @strawberry_django.field
    def materials(self, info: strawberry.Info) -> list[Material]:
        # Gated content (A-authz-1): only enrolled/owner viewers see materials; [] otherwise.
        return services.visible_materials(get_current_user(info), self)


@strawberry_django.type(models.Section)
class Section:
    id: auto
    title: auto
    description: auto
    order: auto

    @strawberry_django.field
    def cover_url(self) -> str | None:
        return f"/files/{self.cover_key}" if self.cover_key else None

    @strawberry_django.field
    def lessons(self, info: strawberry.Info) -> list[Lesson]:
        # A-authz-2: DRAFT lessons are owner-only; non-owners see published lessons (titles are
        # discovery-safe). Gated content on each lesson (description/materials) is a further gate.
        return services.visible_lessons(get_current_user(info), self)


@strawberry_django.type(models.Enrollment)
class Enrollment:
    id: auto
    progress_pct: auto

    @strawberry_django.field
    def student(self) -> StudentProfileType:
        return self.student

    @strawberry_django.field
    def course(self) -> Course:
        return self.course

    @strawberry_django.field
    def status(self) -> EnrollmentStatus:
        return EnrollmentStatus(self.status)

    @strawberry_django.field
    def enrolled_at(self) -> dt.datetime:
        return self.created_at


@strawberry_django.type(models.Course)
class Course:
    id: auto
    title: auto
    description: auto
    subject: auto
    language: auto
    created_at: auto

    @strawberry_django.field
    def level(self) -> CourseLevel:
        return CourseLevel(self.level)

    @strawberry_django.field
    def status(self) -> CourseStatus:
        return CourseStatus(self.status)

    @strawberry_django.field
    def owner(self) -> TeacherProfileType:
        return self.owner

    @strawberry_django.field
    def institution(self) -> InstitutionType | None:
        return self.institution

    @strawberry_django.field
    def cover_url(self) -> str | None:
        return f"/files/{self.cover_key}" if self.cover_key else None

    @strawberry_django.field
    def sections(self) -> list[Section]:
        return list(self.sections.all())

    @strawberry_django.field
    def lesson_count(self) -> int:
        # Use the catalog annotation when present (A-H1: no per-node COUNT); else fall back
        # (e.g. course detail fetches a single course without the annotation).
        annotated = getattr(self, "_lesson_count", None)
        if annotated is not None:
            return annotated
        return models.Lesson.objects.filter(section__course=self).count()

    @strawberry_django.field
    def enrollment_count(self) -> int:
        annotated = getattr(self, "_enrollment_count", None)
        if annotated is not None:
            return annotated
        return self.enrollments.count()

    @strawberry_django.field
    def rating(self) -> float | None:
        return None  # populated by the engagement module

    @strawberry_django.field
    def viewer_enrollment(self, info: strawberry.Info) -> Enrollment | None:
        return services.viewer_enrollment(get_current_user(info), self)


@strawberry.type
class CourseConnection:
    nodes: list[Course]
    page_info: PageInfo
    total_count: int
    subject_count: int  # distinct subjects in the (filtered) catalog — "N предметов" meta
