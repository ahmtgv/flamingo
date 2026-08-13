"""Exercise reads. Every one goes through the lesson's own access rule."""

from __future__ import annotations

import strawberry

from apps.exercises import dictionary, repetition, services
from common.auth import require_user

from .types import (
    Achievement,
    Attempt,
    DueCard,
    ExerciseLiveRow,
    ExerciseSet,
    ExternalDictionary,
    LexicalItem,
    RepetitionProgress,
    SetProgress,
    SkillMastery,
    SrsCard,
)


@strawberry.type
class ExercisesQuery:
    @strawberry.field
    def lesson_exercise_sets(
        self, info: strawberry.Info, lesson_id: strawberry.ID
    ) -> list[ExerciseSet]:
        user = require_user(info)
        return [
            ExerciseSet.of(row, services.exercises_of(user, row.id))
            for row in services.sets_of_lesson(user, lesson_id)
        ]

    @strawberry.field
    def my_attempts(self, info: strawberry.Info, set_id: strawberry.ID) -> list[Attempt]:
        """The caller's OWN attempts — the query takes no student id."""
        return [Attempt.of(a) for a in services.my_attempts(require_user(info), set_id)]

    @strawberry.field
    def set_progress(self, info: strawberry.Info, set_id: strawberry.ID) -> SetProgress:
        row = services.set_progress(require_user(info), set_id)
        return SetProgress(total=row["total"], answered=row["answered"], correct=row["correct"])

    @strawberry.field
    def exercise_live_picture(
        self, info: strawberry.Info, set_id: strawberry.ID
    ) -> list[ExerciseLiveRow]:
        """The teacher's live view: counts and a spread, never a list of children."""
        return [
            ExerciseLiveRow(
                exercise_id=strawberry.ID(row["exercise_id"]),
                answered=row["answered"],
                group_size=row["group_size"],
                correct=row["correct"],
                spread=row["spread"],
            )
            for row in services.live_picture(require_user(info), set_id)
        ]

    @strawberry.field
    def my_skill_mastery(
        self, info: strawberry.Info, mastered_only: bool = False
    ) -> list[SkillMastery]:
        return [
            SkillMastery.of(row)
            for row in services.mastery_of(require_user(info), mastered_only=mastered_only)
        ]

    # --- dictionary (R4.3) ---------------------------------------------------------------
    @strawberry.field
    def lookup_word(self, info: strawberry.Info, lemma: str) -> list[LexicalItem]:
        """Every sense of a lemma — the card on sheet 02 is the senses, stacked."""
        return [LexicalItem.of(row) for row in dictionary.lookup(require_user(info), lemma)]

    @strawberry.field
    def lesson_words(self, info: strawberry.Info, lesson_id: strawberry.ID) -> list[LexicalItem]:
        """«Слова этого урока» — behind the lesson's own access rule."""
        return [
            LexicalItem.of(row) for row in dictionary.lesson_words(require_user(info), lesson_id)
        ]

    @strawberry.field
    def my_words(self, info: strawberry.Info) -> list[SrsCard]:
        """The caller's own list. Takes no student id, deliberately."""
        return [SrsCard.of(row) for row in dictionary.my_words(require_user(info))]

    @strawberry.field
    def external_dictionaries(self, info: strawberry.Info) -> list[ExternalDictionary]:
        """Closed dictionaries, as LINKS. Nothing here is fetched by our server — the client
        opens them in a new tab (owner decision 2026-08-12)."""
        require_user(info)
        return [ExternalDictionary(**row) for row in dictionary.EXTERNAL_DICTIONARIES]

    # --- repetition (R4.4) ---------------------------------------------------------------
    @strawberry.field
    def my_repetition_queue(self, info: strawberry.Info, limit: int = 20) -> list[DueCard]:
        """What is due for the CALLER. Takes no student id — a learner's queue is theirs."""
        return [DueCard.of(card) for card in repetition.due_cards(require_user(info), limit=limit)]

    @strawberry.field
    def my_repetition_progress(self, info: strawberry.Info) -> RepetitionProgress:
        """🔴 One person's own numbers. There is no query that returns anybody else's, and
        no ordering that would make a table of children."""
        row = repetition.progress(require_user(info))
        return RepetitionProgress(
            total=row["total"],
            due=row["due"],
            learning=row["learning"],
            mastered=row["mastered"],
            reviews=row["reviews"],
            current_streak=row["current_streak"],
            longest_streak=row["longest_streak"],
        )

    @strawberry.field
    def my_achievements(self, info: strawberry.Info) -> list[Achievement]:
        return [Achievement.of(row) for row in repetition.achievements(require_user(info))]
