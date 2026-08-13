"""Exercise writes."""

from __future__ import annotations

import datetime as dt

import strawberry
from strawberry.scalars import JSON

from apps.exercises import dictionary, repetition, services
from common.auth import require_user
from common.enums import AttemptContext, CardDirection, CardState, ReviewRating

from .types import Attempt, DueCard, HomeworkHandIn, SrsCard, WordShown


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

    # --- dictionary (R4.3) ---------------------------------------------------------------
    @strawberry.mutation
    def add_word_to_my_list(
        self,
        info: strawberry.Info,
        item_id: strawberry.ID,
        direction: CardDirection = CardDirection.RECOGNITION,
    ) -> SrsCard:
        """«В мои слова» — which means: into the repetition queue, due now. Idempotent, so a
        stray second press cannot reset a card you have been reviewing for weeks."""
        return SrsCard.of(
            dictionary.add_to_my_words(require_user(info), item_id, direction=direction.value)
        )

    @strawberry.mutation
    def put_word_on_board(
        self, info: strawberry.Info, lesson_id: strawberry.ID, item_id: strawberry.ID
    ) -> strawberry.ID:
        """«На доску» — through the board's own service, so the teacher's switch still rules."""
        element = dictionary.put_on_board(require_user(info), lesson_id, item_id)
        return strawberry.ID(str(element.id))

    @strawberry.mutation
    def show_word_to_class(
        self, info: strawberry.Info, session_id: strawberry.ID, item_id: strawberry.ID
    ) -> WordShown:
        """«Показать всем», teacher only. A gesture: broadcast, stored nowhere."""
        item = dictionary.show_to_class(require_user(info), session_id, item_id)
        return WordShown(
            session_id=strawberry.ID(str(session_id)),
            item_id=strawberry.ID(str(item.id)),
            lemma=item.lemma,
        )

    # --- repetition (R4.4) ---------------------------------------------------------------
    @strawberry.mutation
    def review_word(
        self,
        info: strawberry.Info,
        card_id: strawberry.ID,
        rating: ReviewRating,
        stability: float,
        difficulty: float,
        due_at: dt.datetime,
        state: CardState,
        learning_steps: int = 0,
    ) -> DueCard:
        """Record one review.

        FSRS ran on the client (`ts-fsrs`, MIT — spec §7.3 names it, and it is JavaScript);
        this call is the record of it. The server does not trust WHOSE card it is or whether
        the numbers are sane, and it counts `reps`/`lapses` itself — a history a client can
        rewrite is not a history.
        """
        return DueCard.of(
            repetition.review(
                require_user(info),
                card_id,
                rating=rating.value,
                stability=stability,
                difficulty=difficulty,
                due_at=due_at,
                state=state.value,
                learning_steps=learning_steps,
            )
        )
