"""GraphQL types for exercises.

`Exercise` has no `answerKey` and never will: a key on the wire is a test that answers
itself. The field exists on the model, the resolver simply does not expose it, and a test
asserts the absence rather than trusting the reviewer to notice.
"""

from __future__ import annotations

import datetime as dt

import strawberry
from strawberry.scalars import JSON

from common.enums import (
    AttemptContext,
    CardDirection,
    CardState,
    ExerciseKind,
    ExerciseMode,
    LexicalSource,
    PartOfSpeech,
    SkillArea,
)


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


# --- Dictionary (R4.3, atlas sheet 02) ---------------------------------------------------
@strawberry.type
class Attribution:
    """Who to credit and under what — carried on the wire so the CARD shows it.

    The owner's rule is that only open bases go inside the product, and the reviewer's is
    that the licence is visible in the card rather than buried in the code. Both are the same
    requirement seen from two sides: these three strings are the reason we are allowed to
    show the content at all, so they travel with it.
    """

    source: LexicalSource
    license: str
    attribution: str
    source_url: str | None


@strawberry.type
class LexicalExample:
    id: strawberry.ID
    text: str
    translation_ru: str | None
    #: Its own, because a Tatoeba sentence and a WordNet gloss are different rights holders.
    credit: Attribution

    @classmethod
    def of(cls, row) -> LexicalExample:
        return cls(
            id=strawberry.ID(str(row.id)),
            text=row.text,
            translation_ru=row.translation_ru or None,
            credit=Attribution(
                source=LexicalSource(row.source),
                license=row.license,
                attribution=row.attribution,
                source_url=row.source_url or None,
            ),
        )


@strawberry.type
class LexicalItem:
    """One SENSE. The card on the sheet is every sense of a lemma, stacked."""

    id: strawberry.ID
    lemma: str
    pos: PartOfSpeech
    sense_id: str | None
    cefr_level: str | None
    ipa: str | None
    definition_ru: str | None
    translation_ru: str | None
    #: A Material id — the clip itself is fetched the way every other file is.
    pronunciation_id: strawberry.ID | None
    credit: Attribution
    examples: list[LexicalExample]

    @classmethod
    def of(cls, row) -> LexicalItem:
        return cls(
            id=strawberry.ID(str(row.id)),
            lemma=row.lemma,
            pos=PartOfSpeech(row.pos),
            sense_id=row.sense_id or None,
            cefr_level=row.cefr_level or None,
            ipa=row.ipa or None,
            definition_ru=row.definition_ru or None,
            translation_ru=row.translation_ru or None,
            pronunciation_id=(
                strawberry.ID(str(row.pronunciation_id)) if row.pronunciation_id else None
            ),
            credit=Attribution(
                source=LexicalSource(row.source),
                license=row.license,
                attribution=row.attribution,
                source_url=row.source_url or None,
            ),
            examples=[LexicalExample.of(e) for e in row.examples.all()],
        )


@strawberry.type
class ExternalDictionary:
    """A closed dictionary: a LINK, never an import (owner decision 2026-08-12).

    It is served as data so the client renders exactly the list this contract is tested
    against — and so that adding one is visibly a link and not a new source of content.
    """

    key: str
    name: str
    url: str


@strawberry.type
class SrsCard:
    """A word in the caller's own list — which is the repetition queue, not a copy of it."""

    id: strawberry.ID
    item: LexicalItem
    direction: CardDirection
    state: CardState
    due_at: dt.datetime
    reps: int
    lapses: int

    @classmethod
    def of(cls, row) -> SrsCard:
        return cls(
            id=strawberry.ID(str(row.id)),
            item=LexicalItem.of(row.item),
            direction=CardDirection(row.direction),
            state=CardState(row.state),
            due_at=row.due_at,
            reps=row.reps,
            lapses=row.lapses,
        )


@strawberry.type
class WordShown:
    """«Показать всем»: an id and the lemma, nothing else. Stored nowhere."""

    session_id: strawberry.ID
    item_id: strawberry.ID
    lemma: str
