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
from apps.courses.subject import LessonProgress
from apps.courses.tasks_progress import TaskState
from apps.institutions.graphql.types import Institution as InstitutionType
from common.auth import get_current_user, require_user
from common.enums import (
    CourseLevel,
    CourseStatus,
    EnrollmentStatus,
    GradingScale,
    LearningProfileKind,
    LessonKind,
    LessonStatus,
    MaterialType,
    SavedItemKind,
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
    # What kind of lesson this is (a device lesson opens the device's page at run time) and
    # which device it opens. Public: the programme is what a learner is shown, and the edit
    # mode has to read back what it just set.
    kind: LessonKind
    device_key: str | None

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
    def viewed_lesson_ids(self) -> list[strawberry.ID]:
        # The viewer's completed-lesson ids (own enrollment via Course.viewer_enrollment).
        # Powers the atlas-04 enrolled projection: per-section done/in-progress/locked +
        # sequential unlock are computed client-side from real completion data.
        return [strawberry.ID(str(x)) for x in (self.viewed_lesson_ids or [])]

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
    updated_at: auto  # atlas-04 owner headrow "обновлён …"

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


# --- Subject cabinet (atlas sheet 01) ---------------------------------------------------------
# Rows carry DATA — the client words "6 из 8 пройдено" and the lesson chips through i18n.


@strawberry.type
class SubjectLesson:
    id: strawberry.ID
    title: str
    subtitle: str | None
    progress: LessonProgress
    kind: LessonKind
    device_key: str | None
    order_label: str
    material_count: int
    has_homework: bool
    session_id: strawberry.ID | None
    session_at: dt.datetime | None
    is_live: bool
    grade: int | None
    completed_by: int | None
    group_size: int | None

    @classmethod
    def of(cls, x) -> SubjectLesson:
        return cls(
            id=strawberry.ID(x.id),
            title=x.title,
            subtitle=x.subtitle,
            progress=x.progress,
            kind=x.kind,
            device_key=x.device_key,
            order_label=x.order_label,
            material_count=x.material_count,
            has_homework=x.has_homework,
            session_id=strawberry.ID(x.session_id) if x.session_id else None,
            session_at=x.session_at,
            is_live=x.is_live,
            grade=x.grade,
            completed_by=x.completed_by,
            group_size=x.group_size,
        )


@strawberry.type
class SubjectSection:
    id: strawberry.ID
    title: str
    done_lessons: int
    total_lessons: int
    lessons: list[SubjectLesson]


@strawberry.type
class SubjectMaterial:
    id: strawberry.ID
    title: str
    subtitle: str | None
    type: MaterialType | None
    url: str | None
    from_label: str | None
    lesson_id: strawberry.ID | None
    saved_id: strawberry.ID | None
    note: str | None
    saved_kind: SavedItemKind | None

    @classmethod
    def of(cls, x) -> SubjectMaterial:
        return cls(
            id=strawberry.ID(x.id),
            title=x.title,
            subtitle=x.subtitle,
            type=x.type,
            url=x.url,
            from_label=x.from_label,
            lesson_id=strawberry.ID(x.lesson_id) if x.lesson_id else None,
            saved_id=strawberry.ID(x.saved_id) if x.saved_id else None,
            note=x.note,
            saved_kind=x.saved_kind,
        )


@strawberry.type
class SubjectSource:
    id: strawberry.ID
    name: str
    source_name: str | None
    url: str | None
    note: str | None
    in_lesson: bool
    saved_id: strawberry.ID | None


@strawberry.type
class SubjectCabinet:
    course_id: strawberry.ID
    title: str
    profile_kind: LearningProfileKind
    institution_name: str | None
    group_name: str | None
    teacher_name: str | None
    teacher_id: strawberry.ID | None
    lesson_count: int
    student_count: int | None
    progress_pct: int
    grading_scale: GradingScale
    sections: list[SubjectSection]
    materials: list[SubjectMaterial]
    saved_materials: list[SubjectMaterial]
    sources: list[SubjectSource]
    next_lesson: SubjectLesson | None

    @classmethod
    def of(cls, page) -> SubjectCabinet:
        return cls(
            course_id=strawberry.ID(page.course_id),
            title=page.title,
            profile_kind=page.profile_kind,
            institution_name=page.institution_name,
            group_name=page.group_name,
            teacher_name=page.teacher_name,
            teacher_id=strawberry.ID(page.teacher_id) if page.teacher_id else None,
            lesson_count=page.lesson_count,
            student_count=page.student_count,
            progress_pct=page.progress_pct,
            grading_scale=page.grading_scale,
            sections=[
                SubjectSection(
                    id=strawberry.ID(s.id),
                    title=s.title,
                    done_lessons=s.done_lessons,
                    total_lessons=s.total_lessons,
                    lessons=[SubjectLesson.of(x) for x in s.lessons],
                )
                for s in page.sections
            ],
            materials=[SubjectMaterial.of(x) for x in page.materials],
            saved_materials=[SubjectMaterial.of(x) for x in page.saved_materials],
            sources=[
                SubjectSource(
                    id=strawberry.ID(x.id),
                    name=x.name,
                    source_name=x.source_name,
                    url=x.url,
                    note=x.note,
                    in_lesson=x.in_lesson,
                    saved_id=strawberry.ID(x.saved_id) if x.saved_id else None,
                )
                for x in page.sources
            ],
            next_lesson=SubjectLesson.of(page.next_lesson) if page.next_lesson else None,
        )


# --- subject cabinet, second half (atlas sheet 01: задания · прогресс) ----------------------
@strawberry.type
class SubjectTask:
    """One row of «Задания» — or, for a teacher, of «На проверке».

    The learner fields carry the LATEST graded attempt (a retake replaces the mark shown),
    while `attempts` says how many there were: nothing is overwritten in the database.
    The teacher fields are counts only — no pupil is named here.
    """

    id: strawberry.ID
    title: str
    lesson_id: strawberry.ID | None
    lesson_label: str | None
    due_at: dt.datetime | None
    state: TaskState
    submitted_at: dt.datetime | None
    score: int | None
    comment: str | None
    attempts: int
    redo_open: bool
    submitted_by: int | None
    group_size: int | None
    graded_count: int | None
    waiting_count: int | None
    stale_count: int | None
    retake_count: int | None

    @classmethod
    def of(cls, x) -> SubjectTask:
        return cls(
            id=strawberry.ID(x.id),
            title=x.title,
            lesson_id=strawberry.ID(x.lesson_id) if x.lesson_id else None,
            lesson_label=x.lesson_label,
            due_at=x.due_at,
            state=x.state,
            submitted_at=x.submitted_at,
            score=x.score,
            comment=x.comment,
            attempts=x.attempts,
            redo_open=x.redo_open,
            submitted_by=x.submitted_by,
            group_size=x.group_size,
            graded_count=x.graded_count,
            waiting_count=x.waiting_count,
            stale_count=x.stale_count,
            retake_count=x.retake_count,
        )


@strawberry.type
class SubjectTopic:
    """Mastery of one topic. `pct` is null when nothing is graded yet — a blank, not a zero."""

    id: strawberry.ID
    title: str
    lesson_from: str | None
    lesson_to: str | None
    is_current: bool
    pct: int | None
    previous_pct: int | None
    weak_count: int | None
    learner_count: int | None

    @classmethod
    def of(cls, x) -> SubjectTopic:
        return cls(
            id=strawberry.ID(x.id),
            title=x.title,
            lesson_from=x.lesson_from,
            lesson_to=x.lesson_to,
            is_current=x.is_current,
            pct=x.pct,
            previous_pct=x.previous_pct,
            weak_count=x.weak_count,
            learner_count=x.learner_count,
        )


@strawberry.type
class SubjectProgress:
    """Mastery per topic. A learner is compared only with their own past; a teacher sees the
    group's mastery and a COUNT of who is struggling, never a per-pupil profile."""

    profile_kind: LearningProfileKind
    topics: list[SubjectTopic]
    overall_pct: int | None
    previous_overall_pct: int | None
    weak_below_pct: int

    @classmethod
    def of(cls, x) -> SubjectProgress:
        return cls(
            profile_kind=x.profile_kind,
            topics=[SubjectTopic.of(t) for t in x.topics],
            overall_pct=x.overall_pct,
            previous_overall_pct=x.previous_overall_pct,
            weak_below_pct=x.weak_below_pct,
        )
