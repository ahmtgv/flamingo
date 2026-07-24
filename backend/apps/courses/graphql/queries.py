"""Courses queries: catalog, course, lesson."""

import strawberry

from apps.courses import models, services
from apps.courses.access import can_access_course
from common.auth import get_current_user, require_user
from common.enums import CourseLevel, CourseStatus
from common.pagination import paginate

from .types import Course, CourseConnection, Lesson, PageInfo


@strawberry.input
class CourseFilter:
    level: CourseLevel | None = None
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
