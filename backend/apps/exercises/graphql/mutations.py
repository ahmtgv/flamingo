"""Exercise writes."""

from __future__ import annotations

import strawberry
from strawberry.scalars import JSON

from apps.exercises import services
from common.auth import require_user
from common.enums import AttemptContext

from .types import Attempt, HomeworkHandIn


@strawberry.type
class ExercisesMutation:
    @strawberry.mutation
    def answer_exercise(
        self,
        info: strawberry.Info,
        exercise_id: strawberry.ID,
        response: JSON,
        context: AttemptContext = AttemptContext.PRACTICE,
        session_id: strawberry.ID | None = None,
        latency_ms: int = 0,
        hints_used: int = 0,
    ) -> Attempt:
        """Record one answer. Append-only — a second try is a second row."""
        return Attempt.of(
            services.record_attempt(
                require_user(info),
                exercise_id,
                response=response or {},
                context=context,
                session_id=session_id,
                latency_ms=latency_ms,
                hints_used=hints_used,
            )
        )

    @strawberry.mutation
    def hand_in_exercise_set(self, info: strawberry.Info, set_id: strawberry.ID) -> HomeworkHandIn:
        """Hand in homework: the objective kinds are marked, the open ones wait for a person."""
        submission, summary = services.submit_homework_set(require_user(info), set_id)
        return HomeworkHandIn(
            submission_id=strawberry.ID(str(submission.id)),
            score=submission.score,
            auto_checked=summary["auto"],
            awaiting_teacher=summary["pending"],
        )

    @strawberry.mutation
    def count_live_as_classwork(
        self, info: strawberry.Info, set_id: strawberry.ID, student_id: strawberry.ID
    ) -> strawberry.ID:
        """A live lesson reaches the journal only when the teacher decides it should."""
        submission = services.count_live_as_classwork(require_user(info), set_id, student_id)
        return strawberry.ID(str(submission.id))
