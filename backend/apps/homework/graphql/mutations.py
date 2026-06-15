"""Homework mutations. Inputs map to thin service calls (logic + permissions there)."""

from __future__ import annotations

import datetime as dt

import strawberry

from apps.homework import services
from common.auth import require_user
from common.enums import HomeworkType

from .types import Homework, Submission


@strawberry.input
class HomeworkInput:
    title: str
    type: HomeworkType
    description: str | None = None
    due_at: dt.datetime | None = None
    allow_redo: bool = False
    lesson_id: strawberry.ID | None = None
    course_id: strawberry.ID | None = None
    # optional target group for institutional delivery (Option A).
    group_id: strawberry.ID | None = None


@strawberry.input
class SubmitHomeworkInput:
    homework_id: strawberry.ID
    content_text: str | None = None
    file_keys: list[str] | None = None


@strawberry.input
class GradeInput:
    submission_id: strawberry.ID
    score: int
    comment: str | None = None
    allow_redo: bool | None = None


@strawberry.type
class HomeworkMutation:
    @strawberry.mutation
    def create_homework(self, info: strawberry.Info, input: HomeworkInput) -> Homework:
        return services.create_homework(
            require_user(info),
            title=input.title,
            type=input.type,
            lesson_id=input.lesson_id,
            course_id=input.course_id,
            group_id=input.group_id,
            description=input.description or "",
            due_at=input.due_at,
            allow_redo=input.allow_redo,
        )

    @strawberry.mutation
    def update_homework(
        self, info: strawberry.Info, id: strawberry.ID, input: HomeworkInput
    ) -> Homework:
        return services.update_homework(
            require_user(info),
            id,
            title=input.title,
            type=input.type,
            description=input.description,
            due_at=input.due_at,
            allow_redo=input.allow_redo,
        )

    @strawberry.mutation
    def publish_homework(self, info: strawberry.Info, id: strawberry.ID) -> Homework:
        return services.publish_homework(require_user(info), id)

    @strawberry.mutation
    def delete_homework(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        return services.delete_homework(require_user(info), id)

    @strawberry.mutation
    def submit_homework(self, info: strawberry.Info, input: SubmitHomeworkInput) -> Submission:
        return services.submit_homework(
            require_user(info),
            homework_id=input.homework_id,
            content_text=input.content_text or "",
            file_keys=input.file_keys,
        )

    @strawberry.mutation
    def grade_submission(self, info: strawberry.Info, input: GradeInput) -> Submission:
        return services.grade_submission(
            require_user(info),
            submission_id=input.submission_id,
            score=input.score,
            comment=input.comment or "",
            allow_redo=input.allow_redo,
        )
