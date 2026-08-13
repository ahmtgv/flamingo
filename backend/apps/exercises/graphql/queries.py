"""Exercise reads. Every one goes through the lesson's own access rule."""

from __future__ import annotations

import strawberry

from apps.exercises import services
from common.auth import require_user

from .types import Attempt, ExerciseLiveRow, ExerciseSet, SetProgress, SkillMastery


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
