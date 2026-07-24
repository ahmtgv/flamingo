"""Homework queries: homework, homeworkSubmissions, mySubmissions, lessonHomework,
plus the composite teacherDashboard (atlas sheet 03)."""

import datetime as dt
from typing import TYPE_CHECKING, Annotated

import strawberry
from django.utils import timezone

from apps.courses import services as courses_services
from apps.homework import services
from apps.scheduling import services as scheduling_services
from common.auth import get_current_user, require_user

from .types import Homework, Submission

if TYPE_CHECKING:
    from apps.courses.graphql.types import Course
    from apps.scheduling.graphql.types import LessonSession


@strawberry.type
class TeacherDashboard:
    """The teacher's "what needs me right now?" dashboard (atlas 03). Matches the forward-contract
    SDL type; classAttentionAverage stays null on the dashboard (owner decision: attention analytics
    live post-lesson / in settings, never on the dashboard)."""

    courses: list[Annotated["Course", strawberry.lazy("apps.courses.graphql.types")]]
    upcoming_sessions: list[
        Annotated["LessonSession", strawberry.lazy("apps.scheduling.graphql.types")]
    ]
    pending_submissions: list[Submission]
    student_count: int
    new_students_this_week: int
    class_attention_average: int | None


@strawberry.type
class HomeworkQuery:
    @strawberry.field
    def homework(self, info: strawberry.Info, id: strawberry.ID) -> Homework | None:
        return services.get_homework(get_current_user(info), id)

    @strawberry.field
    def homework_submissions(
        self, info: strawberry.Info, homework_id: strawberry.ID
    ) -> list[Submission]:
        """Teacher grading list for a homework (owner only)."""
        return services.homework_submissions(require_user(info), homework_id)

    @strawberry.field
    def my_submissions(
        self, info: strawberry.Info, course_id: strawberry.ID | None = None
    ) -> list[Submission]:
        """The signed-in student's own submissions."""
        return services.my_submissions(require_user(info), course_id)

    @strawberry.field
    def lesson_homework(self, info: strawberry.Info, lesson_id: strawberry.ID) -> list[Homework]:
        """Homework on a lesson: published for students, all for the owning teacher."""
        return services.lesson_homework(get_current_user(info), lesson_id)

    @strawberry.field
    def teacher_dashboard(self, info: strawberry.Info) -> TeacherDashboard:
        """Composite teacher dashboard (atlas 03). Every part is owner-scoped in its service —
        a teacher sees only their own courses / today's sessions / grading queue / students."""
        user = require_user(info)
        now = timezone.now()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + dt.timedelta(days=1)
        week_ago = now - dt.timedelta(days=7)
        return TeacherDashboard(
            courses=courses_services.teacher_courses(user),
            upcoming_sessions=scheduling_services.my_schedule(user, start, end),
            pending_submissions=services.teacher_pending_submissions(user),
            student_count=courses_services.teacher_student_count(user),
            new_students_this_week=courses_services.teacher_new_students_this_week(user, week_ago),
            class_attention_average=None,
        )
