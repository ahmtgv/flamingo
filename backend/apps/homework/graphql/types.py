"""GraphQL types for the homework domain.

Type names mirror the SDL contract (Homework, Submission, …) like the courses
module. The SDL ``group`` field on Homework is intentionally omitted until the
institutions module lands; FE operations select only live-implemented fields.
"""

from __future__ import annotations

import strawberry
import strawberry_django
from strawberry import auto

from apps.accounts.graphql.types import StudentProfileType, UserType
from apps.courses.graphql.types import Course, Lesson
from apps.homework import models, services
from common.auth import get_current_user
from common.enums import HomeworkType, SubmissionStatus


@strawberry.type
class SubmissionStats:
    total: int
    submitted: int
    graded: int
    late: int


@strawberry_django.type(models.SubmissionFile)
class SubmissionFile:
    id: auto
    name: auto

    @strawberry_django.field
    def file_url(self) -> str:
        # Presigned GET arrives with the files module; expose the key path for now.
        return f"/files/{self.file_key}"


@strawberry_django.type(models.Submission)
class Submission:
    id: auto
    attempt: auto
    content_text: auto
    submitted_at: auto
    score: auto
    comment: auto
    graded_at: auto

    @strawberry_django.field
    def status(self) -> SubmissionStatus:
        return SubmissionStatus(self.status)

    @strawberry_django.field
    def homework(self) -> Homework:
        return self.homework

    @strawberry_django.field
    def student(self) -> StudentProfileType:
        return self.student

    @strawberry_django.field
    def graded_by(self) -> UserType | None:
        return self.graded_by

    @strawberry_django.field
    def files(self) -> list[SubmissionFile]:
        return list(self.files.all())


@strawberry_django.type(models.Homework)
class Homework:
    id: auto
    title: auto
    description: auto
    due_at: auto
    allow_redo: auto
    published_at: auto
    created_at: auto

    @strawberry_django.field
    def type(self) -> HomeworkType:
        return HomeworkType(self.type)

    @strawberry_django.field
    def course(self) -> Course | None:
        return self.course

    @strawberry_django.field
    def lesson(self) -> Lesson | None:
        return self.lesson

    @strawberry_django.field
    def created_by(self) -> UserType:
        return self.created_by

    @strawberry_django.field
    def viewer_submission(self, info: strawberry.Info) -> Submission | None:
        return services.viewer_submission(get_current_user(info), self)

    @strawberry_django.field
    def submissions(self, info: strawberry.Info) -> list[Submission]:
        # The grading list is owner-only; other viewers see an empty list.
        user = get_current_user(info)
        course = services._homework_course(self)
        if course.owner_id == getattr(user, "id", None):
            return list(self.submissions.select_related("student__user", "graded_by"))
        return []

    @strawberry_django.field
    def submission_stats(self, info: strawberry.Info) -> SubmissionStats:
        # Aggregate counts are owner-only; other viewers get zeros.
        user = get_current_user(info)
        course = services._homework_course(self)
        if course.owner_id != getattr(user, "id", None):
            return SubmissionStats(total=0, submitted=0, graded=0, late=0)
        return SubmissionStats(**services.submission_stats(self))
