"""Homework queries: homework, homeworkSubmissions, mySubmissions, lessonHomework."""

import strawberry

from apps.homework import services
from common.auth import get_current_user, require_user

from .types import Homework, Submission


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
