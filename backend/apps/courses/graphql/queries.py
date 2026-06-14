"""Courses queries: catalog, course, lesson."""

import strawberry

from apps.courses import models, services
from common.auth import get_current_user
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
        qs = services.published_courses(
            level=f.level, subject=f.subject, language=f.language, search=f.search
        )
        page = paginate(qs, first, after)
        return CourseConnection(
            nodes=page.nodes,
            page_info=PageInfo(has_next_page=page.has_next_page, end_cursor=page.end_cursor),
            total_count=page.total_count,
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
    def lesson(self, id: strawberry.ID) -> Lesson | None:
        return models.Lesson.objects.filter(id=id).first()
