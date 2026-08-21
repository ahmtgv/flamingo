"""Courses mutations. Inputs map to thin service calls (logic + permissions there)."""

from __future__ import annotations

import strawberry
from strawberry.scalars import JSON

from apps.courses import services, subject
from common.auth import require_user
from common.enums import CourseFormat, CourseLevel, LessonKind, MaterialType, SavedItemKind

from .types import Course, Enrollment, Lesson, Material, Section, SubjectMaterial


@strawberry.input
class CourseInput:
    title: str
    level: CourseLevel
    # Аудитория — два поля, не одно. Умолчание PROGRAM: курс, созданный до появления поля,
    # программой и был, и старый клиент, который его не шлёт, ничего не ломает.
    format: CourseFormat = CourseFormat.PROGRAM
    subject: str
    description: str | None = None
    language: str = "ru"
    institution_id: strawberry.ID | None = None
    group_id: strawberry.ID | None = None
    cover_key: str | None = None
    # --- Ритм занятий (лист «Создание курса и занятия», §50) ---------------------------
    # Заявление преподавателя, а не расписание: сколько идёт занятие, сколько раз в неделю,
    # по каким дням (ISO: 1 — понедельник). Все три необязательны — курс без объявленного
    # ритма законен, и старый клиент, который их не шлёт, ничего не ломает.
    lesson_minutes: int | None = None
    lessons_per_week: int | None = None
    lesson_days: list[int] | None = None


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
    # A telescope lesson stays a lesson in the programme and opens the device's page at run
    # time (sheet 01, owner answer 1). The teacher's edit mode is where that is set.
    kind: LessonKind | None = None
    device_key: str | None = None


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


@strawberry.input
class SaveItemInput:
    """What to keep. Either a material of a course the caller can open, or an external find
    (title + link). Never content — see subject.save_item."""

    course_id: strawberry.ID | None = None
    lesson_id: strawberry.ID | None = None
    material_id: strawberry.ID | None = None
    title: str | None = None
    url: str | None = None
    source_name: str | None = None
    note: str | None = None
    kind: SavedItemKind | None = None


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
            format=input.format,
            description=input.description or "",
            language=input.language,
            cover_key=input.cover_key or "",
            institution_id=input.institution_id,
            group_id=input.group_id,
            lesson_minutes=input.lesson_minutes,
            lessons_per_week=input.lessons_per_week,
            lesson_days=input.lesson_days,
        )

    @strawberry.mutation
    def update_course(self, info: strawberry.Info, id: strawberry.ID, input: CourseInput) -> Course:
        return services.update_course(
            require_user(info),
            id,
            title=input.title,
            subject=input.subject,
            level=input.level,
            format=input.format,
            description=input.description,
            language=input.language,
            cover_key=input.cover_key,
            institution_id=input.institution_id,
            group_id=input.group_id,
            lesson_minutes=input.lesson_minutes,
            lessons_per_week=input.lessons_per_week,
            lesson_days=input.lesson_days,
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
            kind=input.kind,
            device_key=input.device_key,
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
            kind=input.kind,
            device_key=input.device_key,
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

    # --- saved materials (atlas 01 quiet corner) --------------------------------------------
    @strawberry.mutation
    def save_item(self, info: strawberry.Info, input: SaveItemInput) -> SubjectMaterial:
        """Keep a material or an external find in the caller's own list.

        Only a link and a note are stored — never a copy of the content, so licences stay
        with the source (owner req. 12).
        """
        row = subject.save_item(
            require_user(info),
            course_id=input.course_id,
            lesson_id=input.lesson_id,
            material_id=input.material_id,
            title=input.title or "",
            url=input.url or "",
            source_name=input.source_name or "",
            note=input.note or "",
            kind=input.kind or SavedItemKind.SAVED,
        )
        return SubjectMaterial(
            id=strawberry.ID(str(row.id)),
            title=row.title or (row.material.title if row.material_id else ""),
            subtitle=None,
            type=None,
            url=row.url or None,
            from_label=row.source_name or None,
            lesson_id=strawberry.ID(str(row.lesson_id)) if row.lesson_id else None,
            saved_id=strawberry.ID(str(row.id)),
            note=row.note or None,
            saved_kind=SavedItemKind(row.kind),
        )

    @strawberry.mutation
    def remove_saved_item(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        return subject.remove_saved_item(require_user(info), id)
