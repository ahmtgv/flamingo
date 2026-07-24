"""Courses mutations. Inputs map to thin service calls (logic + permissions there)."""

from __future__ import annotations

import strawberry
from strawberry.scalars import JSON

from apps.courses import services
from common.auth import require_user
from common.enums import CourseLevel, MaterialType

from .types import Course, Enrollment, Lesson, Material, Section


@strawberry.input
class CourseInput:
    title: str
    level: CourseLevel
    subject: str
    description: str | None = None
    language: str = "ru"
    institution_id: strawberry.ID | None = None
    group_id: strawberry.ID | None = None
    cover_key: str | None = None


@strawberry.input
class SectionInput:
    title: str
    description: str | None = None
    cover_key: str | None = None


@strawberry.input
class LessonOptionsInput:
    camera: bool = True
    screen: bool = True
    chat: bool = True
    homework: bool = False


@strawberry.input
class LessonInput:
    title: str
    duration_min: int
    description: str | None = None
    options: LessonOptionsInput | None = None
    schedule_rule: JSON | None = None


@strawberry.input
class MaterialInput:
    type: MaterialType
    title: str
    lesson_id: strawberry.ID | None = None
    course_id: strawberry.ID | None = None
    file_key: str | None = None
    url: str | None = None
    body: str | None = None


def _options_dict(opts: LessonOptionsInput | None) -> dict | None:
    if opts is None:
        return None
    return {
        "camera": opts.camera,
        "screen": opts.screen,
        "chat": opts.chat,
        "homework": opts.homework,
    }


@strawberry.type
class CoursesMutation:
    # --- courses
    @strawberry.mutation
    def create_course(self, info: strawberry.Info, input: CourseInput) -> Course:
        return services.create_course(
            require_user(info),
            title=input.title,
            subject=input.subject,
            level=input.level,
            description=input.description or "",
            language=input.language,
            cover_key=input.cover_key or "",
            institution_id=input.institution_id,
            group_id=input.group_id,
        )

    @strawberry.mutation
    def update_course(self, info: strawberry.Info, id: strawberry.ID, input: CourseInput) -> Course:
        return services.update_course(
            require_user(info),
            id,
            title=input.title,
            subject=input.subject,
            level=input.level,
            description=input.description,
            language=input.language,
            cover_key=input.cover_key,
            institution_id=input.institution_id,
            group_id=input.group_id,
        )

    @strawberry.mutation
    def publish_course(self, info: strawberry.Info, id: strawberry.ID) -> Course:
        return services.publish_course(require_user(info), id)

    @strawberry.mutation
    def unpublish_course(self, info: strawberry.Info, id: strawberry.ID) -> Course:
        return services.unpublish_course(require_user(info), id)

    @strawberry.mutation
    def archive_course(self, info: strawberry.Info, id: strawberry.ID) -> Course:
        return services.archive_course(require_user(info), id)

    @strawberry.mutation
    def delete_course(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        return services.delete_course(require_user(info), id)

    # --- sections
    @strawberry.mutation
    def create_section(
        self, info: strawberry.Info, course_id: strawberry.ID, input: SectionInput
    ) -> Section:
        return services.create_section(
            require_user(info),
            course_id,
            title=input.title,
            description=input.description or "",
            cover_key=input.cover_key or "",
        )

    @strawberry.mutation
    def update_section(
        self, info: strawberry.Info, id: strawberry.ID, input: SectionInput
    ) -> Section:
        return services.update_section(
            require_user(info),
            id,
            title=input.title,
            description=input.description,
            cover_key=input.cover_key,
        )

    @strawberry.mutation
    def delete_section(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        return services.delete_section(require_user(info), id)

    @strawberry.mutation
    def reorder_sections(
        self, info: strawberry.Info, course_id: strawberry.ID, ordered_ids: list[strawberry.ID]
    ) -> list[Section]:
        return services.reorder_sections(require_user(info), course_id, ordered_ids)

    # --- lessons
    @strawberry.mutation
    def create_lesson(
        self, info: strawberry.Info, section_id: strawberry.ID, input: LessonInput
    ) -> Lesson:
        return services.create_lesson(
            require_user(info),
            section_id,
            title=input.title,
            description=input.description or "",
            duration_min=input.duration_min,
            options=_options_dict(input.options),
            schedule_rule=input.schedule_rule,
        )

    @strawberry.mutation
    def update_lesson(self, info: strawberry.Info, id: strawberry.ID, input: LessonInput) -> Lesson:
        return services.update_lesson(
            require_user(info),
            id,
            title=input.title,
            description=input.description,
            duration_min=input.duration_min,
            options=_options_dict(input.options),
            schedule_rule=input.schedule_rule,
        )

    @strawberry.mutation
    def publish_lesson(self, info: strawberry.Info, id: strawberry.ID) -> Lesson:
        return services.publish_lesson(require_user(info), id)

    @strawberry.mutation
    def delete_lesson(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        return services.delete_lesson(require_user(info), id)

    @strawberry.mutation
    def reorder_lessons(
        self, info: strawberry.Info, section_id: strawberry.ID, ordered_ids: list[strawberry.ID]
    ) -> list[Lesson]:
        return services.reorder_lessons(require_user(info), section_id, ordered_ids)

    # --- materials
    @strawberry.mutation
    def add_material(self, info: strawberry.Info, input: MaterialInput) -> Material:
        return services.add_material(
            require_user(info),
            type=input.type,
            title=input.title,
            lesson_id=input.lesson_id,
            course_id=input.course_id,
            file_key=input.file_key or "",
            url=input.url or "",
            body=input.body or "",
        )

    @strawberry.mutation
    def delete_material(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        return services.delete_material(require_user(info), id)

    # --- enrollment & progress
    @strawberry.mutation
    def enroll(self, info: strawberry.Info, course_id: strawberry.ID) -> Enrollment:
        return services.enroll(require_user(info), course_id)

    @strawberry.mutation
    def unenroll(self, info: strawberry.Info, course_id: strawberry.ID) -> bool:
        return services.unenroll(require_user(info), course_id)

    @strawberry.mutation
    def mark_lesson_viewed(self, info: strawberry.Info, lesson_id: strawberry.ID) -> Enrollment:
        return services.mark_lesson_viewed(require_user(info), lesson_id)
