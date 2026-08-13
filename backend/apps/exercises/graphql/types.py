"""GraphQL types for exercises.

`Exercise` has no `answerKey` and never will: a key on the wire is a test that answers
itself. The field exists on the model, the resolver simply does not expose it, and a test
asserts the absence rather than trusting the reviewer to notice.
"""

from __future__ import annotations

import datetime as dt

import strawberry
from strawberry.scalars import JSON

from common.enums import AttemptContext, ExerciseKind, ExerciseMode, SkillArea


@strawberry.type
class Exercise:
    id: strawberry.ID
    kind: ExerciseKind
    skill: SkillArea
    cefr_level: str | None
    skill_tags: list[str]
    prompt: JSON
    payload: JSON
    points: int
    order: int
    #: A listening clip or picture is a lesson Material — this is its id, not a media blob.
    asset_id: strawberry.ID | None

    @classmethod
    def of(cls, row) -> Exercise:
        return cls(
            id=strawberry.ID(str(row.id)),
            kind=ExerciseKind(row.kind),
            skill=SkillArea(row.skill),
            cefr_level=row.cefr_level or None,
            skill_tags=list(row.skill_tags or []),
            prompt=row.prompt,
            payload=row.payload,
            points=row.points,
            order=row.order,
            asset_id=strawberry.ID(str(row.asset_id)) if row.asset_id else None,
        )


@strawberry.type
class ExerciseSet:
    id: strawberry.ID
    lesson_id: strawberry.ID
    title: str
    mode: ExerciseMode
    homework_id: strawberry.ID | None
    exercises: list[Exercise]

    @classmethod
    def of(cls, row, exercises) -> ExerciseSet:
        return cls(
            id=strawberry.ID(str(row.id)),
            lesson_id=strawberry.ID(str(row.lesson_id)),
            title=row.title,
            mode=ExerciseMode(row.mode),
            homework_id=strawberry.ID(str(row.homework_id)) if row.homework_id else None,
            exercises=[Exercise.of(e) for e in exercises],
        )


@strawberry.type
class Attempt:
    id: strawberry.ID
    exercise_id: strawberry.ID
    context: AttemptContext
    #: null while an open kind waits for the teacher — «not for a machine to say».
    is_correct: bool | None
    score: int
    created_at: dt.datetime

    @classmethod
    def of(cls, row) -> Attempt:
        return cls(
            id=strawberry.ID(str(row.id)),
            exercise_id=strawberry.ID(str(row.exercise_id)),
            context=AttemptContext(row.context),
            is_correct=row.is_correct,
            score=row.score,
            created_at=row.created_at,
        )


@strawberry.type
class ExerciseLiveRow:
    """The teacher's picture of one question — counts and a spread, never who answered what."""

    exercise_id: strawberry.ID
    answered: int
    group_size: int
    correct: int
    #: option index → how many picked it, so «один выбрал come» is sayable without naming them
    spread: JSON


@strawberry.type
class SetProgress:
    total: int
    answered: int
    correct: int


@strawberry.type
class SkillMastery:
    skill_tag: str
    p_known: float
    opportunities: int

    @classmethod
    def of(cls, row) -> SkillMastery:
        return cls(skill_tag=row.skill_tag, p_known=row.p_known, opportunities=row.opportunities)


@strawberry.type
class HomeworkHandIn:
    """What handing in produced: the row in the journal, and what still needs a person."""

    submission_id: strawberry.ID
    score: int | None
    auto_checked: int
    awaiting_teacher: int
