"""Courses queries: catalog, course, lesson."""

import strawberry

from apps.courses import models, services, subject, tasks_progress
from apps.courses.access import can_access_course
from common.auth import get_current_user, require_user
from common.enums import CourseFormat, CourseLevel, CourseStatus
from common.pagination import paginate

from .types import (
    Course,
    CourseConnection,
    Lesson,
    PageInfo,
    SubjectCabinet,
    SubjectMaterial,
    SubjectProgress,
    SubjectTask,
)


@strawberry.input
class CourseFilter:
    level: CourseLevel | None = None
    # Вторая ось аудитории (решение владельца 15.08): по ней ищут «курсы» и «повышение
    # квалификации», и без неё они неотличимы от школьной программы того же класса.
    format: CourseFormat | None = None
    subject: str | None = None
    language: str | None = None
    search: str | None = None


@strawberry.type
class CoursesQuery:
    @strawberry.field
    def catalog(
        self,
        filter: CourseFilter | None = None,
        first: int = 20,
        after: str | None = None,
    ) -> CourseConnection:
        f = filter or CourseFilter()
        kwargs = {
            "level": f.level,
            "format": f.format,
            "subject": f.subject,
            "language": f.language,
            "search": f.search,
        }
        qs = services.published_courses(**kwargs)
        page = paginate(qs, first, after)
        return CourseConnection(
            nodes=page.nodes,
            page_info=PageInfo(has_next_page=page.has_next_page, end_cursor=page.end_cursor),
            total_count=page.total_count,
            subject_count=services.published_subject_count(**kwargs),
        )

    @strawberry.field
    def course(self, info: strawberry.Info, id: strawberry.ID) -> Course | None:
        course = models.Course.objects.filter(id=id).first()
        if course is None:
            return None
        # Drafts/archived are visible only to their owner; published to everyone.
        if course.status != CourseStatus.PUBLISHED.value:
            user = get_current_user(info)
            if user is None or course.owner_id != user.id:
                return None
        return course

    @strawberry.field
    def lesson(self, info: strawberry.Info, id: strawberry.ID) -> Lesson | None:
        # Lesson CONTENT is enrollment-controlled (A-C1): routed through the single
        # can_access_course chokepoint (owner / institutional group / ACTIVE enrollment).
        # Denial convention matches `course` above: None, never an object leak.
        obj = models.Lesson.objects.select_related("section__course").filter(id=id).first()
        if obj is None:
            return None
        if not can_access_course(get_current_user(info), obj.section.course):
            return None
        return obj

    @strawberry.field
    def my_courses(self, info: strawberry.Info) -> list[Course]:
        """The signed-in teacher's own courses (incl. drafts)."""
        return services.teacher_courses(require_user(info))

    @strawberry.field
    def subject_cabinet(self, info: strawberry.Info, course_id: strawberry.ID) -> SubjectCabinet:
        """Atlas sheet 01 for one subject, as this viewer sees it.

        Access goes through can_access_course: a course the caller has no relation to comes
        back as NotFound rather than confirming it exists.
        """
        return SubjectCabinet.of(subject.subject_cabinet(get_current_user(info), course_id))

    @strawberry.field
    def my_saved_items(
        self, info: strawberry.Info, course_id: strawberry.ID | None = None
    ) -> list[SubjectMaterial]:
        """The caller's OWN saved items (never anyone else's — the query takes no user id)."""
        rows = subject.my_saved_items(get_current_user(info), course_id)
        return [
            SubjectMaterial(
                id=strawberry.ID(str(row.id)),
                title=row.title or (row.material.title if row.material_id else ""),
                subtitle=None,
                type=None,
                url=row.url or (row.material.url if row.material_id else None) or None,
                from_label=row.source_name or None,
                lesson_id=strawberry.ID(str(row.lesson_id)) if row.lesson_id else None,
                saved_id=strawberry.ID(str(row.id)),
                note=row.note or None,
                saved_kind=None,
            )
            for row in rows
        ]

    @strawberry.field
    def subject_tasks(self, info: strawberry.Info, course_id: strawberry.ID) -> list[SubjectTask]:
        """Atlas sheet 01, «Задания» (teacher: «На проверке»).

        A retake shows the NEW mark; every attempt stays in the database and `attempts` says
        how many there were. Same access chokepoint as the rest of the cabinet.
        """
        return [
            SubjectTask.of(row)
            for row in tasks_progress.subject_tasks(get_current_user(info), course_id)
        ]

    @strawberry.field
    def subject_progress(self, info: strawberry.Info, course_id: strawberry.ID) -> SubjectProgress:
        """Atlas sheet 01, «Прогресс»: mastery per topic — never one blended percentage, and
        for a learner never a comparison with anyone but their own past."""
        return SubjectProgress.of(
            tasks_progress.subject_progress(get_current_user(info), course_id)
        )
