"""Exercises, attempts and mastery (R4.1 — RND_01_SPEC_ENGLISH §7.2).

The hierarchy is the one the repo already has: Course → Section (= unit) → Lesson, with an
`ExerciseSet` hanging off a lesson. Nothing here invents a `Grade`: the journal stays a view
over `Submission`, exactly as §7.4 requires.

Three rules from §7.4 decide what reaches the journal, and they are the reason `context`
exists at all:

* **Homework** is graded work: on submit the objective kinds are scored automatically into
  `Submission.score`, and the open ones wait for the teacher.
* **A live lesson does not grade by default.** Getting something wrong in class is part of
  learning, not a verdict; the teacher can count it as classwork on purpose.
* **Practice never reaches the journal at all.** It feeds progress and spaced repetition.

A listening or picture asset is a `Material`, not a column here. That reuses the model that
already carries files and presigned reads — and it keeps this app clear of anything shaped
like stored lesson media (§2.2 / test_storage_policy). R4.3 put the licence fields on
`Material` too, so an asset now travels with its own attribution.
"""

from django.db import models

from common.enums import (
    AttemptContext,
    CardDirection,
    CardState,
    ExerciseKind,
    ExerciseMode,
    LexicalSource,
    PartOfSpeech,
    SkillArea,
    choices,
)
from common.models import BaseModel, SoftDeleteModel


class ExerciseSet(SoftDeleteModel):
    lesson = models.ForeignKey(
        "courses.Lesson", related_name="exercise_sets", on_delete=models.CASCADE
    )
    title = models.CharField(max_length=200)
    mode = models.CharField(max_length=10, choices=choices(ExerciseMode))
    #: Set when the mode is HOMEWORK — this is the join to the existing journal.
    homework = models.ForeignKey(
        "homework.Homework",
        related_name="exercise_sets",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self) -> str:
        return self.title


class Exercise(SoftDeleteModel):
    exercise_set = models.ForeignKey(
        ExerciseSet, related_name="exercises", on_delete=models.CASCADE
    )
    kind = models.CharField(max_length=14, choices=choices(ExerciseKind))
    skill = models.CharField(max_length=14, choices=choices(SkillArea))
    cefr_level = models.CharField(max_length=4, blank=True, default="")
    #: e.g. ["grammar.present_simple.3sg"] — what BKT tracks mastery of.
    skill_tags = models.JSONField(default=list, blank=True)
    prompt = models.JSONField(default=dict, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    #: Never sent to a learner — the resolver strips it (see graphql/types.py).
    answer_key = models.JSONField(default=dict, blank=True)
    points = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)
    #: A listening clip or a picture is a lesson Material, not a media column here.
    asset = models.ForeignKey(
        "courses.Material",
        related_name="exercises",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self) -> str:
        return f"{self.kind}:{self.id}"


class Attempt(BaseModel):
    """One answer. **Append-only** — every attempt is kept (§4.2 п.4), and a retake is a new
    row rather than an edit, the same shape the homework journal already uses."""

    exercise = models.ForeignKey(Exercise, related_name="attempts", on_delete=models.CASCADE)
    student = models.ForeignKey(
        "accounts.StudentProfile", related_name="exercise_attempts", on_delete=models.CASCADE
    )
    context = models.CharField(max_length=10, choices=choices(AttemptContext))
    lesson_session = models.ForeignKey(
        "scheduling.LessonSession",
        related_name="exercise_attempts",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    response = models.JSONField(default=dict, blank=True)
    #: None while an open kind waits for the teacher.
    is_correct = models.BooleanField(null=True, blank=True)
    score = models.PositiveIntegerField(default=0)
    latency_ms = models.PositiveIntegerField(default=0)
    hints_used = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["exercise", "created_at"]),
            models.Index(fields=["student", "context"]),
        ]


class SkillMastery(BaseModel):
    """BKT over a skill tag (§7.3): «has this learner got the rule yet?».

    Deliberately NOT the same thing as spaced repetition, which is about items and lives in
    its own model. Mixing the two is the classic confusion the spec calls out.
    """

    student = models.ForeignKey(
        "accounts.StudentProfile", related_name="skill_mastery", on_delete=models.CASCADE
    )
    skill_tag = models.CharField(max_length=120)
    p_known = models.FloatField(default=0.25)
    opportunities = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "skill_tag"], name="uniq_skill_mastery")
        ]
        indexes = [models.Index(fields=["student", "skill_tag"])]


class LexicalItem(BaseModel):
    """One SENSE of one word (R4.3, spec §7.2).

    One row per sense, not per word: `crossroads` the junction and `crossroads` the moment of
    decision are different things to learn, and WordNet already models them as different
    synsets. The card on sheet 02 is every sense of a lemma, stacked.

    **Attribution is structural, not editorial.** `license` and `attribution` are enforced
    non-empty by a database constraint, so an unattributed word physically cannot be stored.
    That is the point of the owner's rule: only open bases go inside the product, and an open
    licence still has conditions — CC BY wants a name. The card renders these fields; they
    are not a comment in the code.

    Pronunciation and pictures are `Material` rows, not media columns here — the same choice
    `Exercise.asset` made, for the same two reasons (§2.2, and files already have a home).
    """

    lemma = models.CharField(max_length=120)
    pos = models.CharField(max_length=12, choices=choices(PartOfSpeech))
    #: The synset id in the source base, e.g. `oewn-03088580-n`. Empty for our own entries.
    sense_id = models.CharField(max_length=64, blank=True, default="")
    cefr_level = models.CharField(max_length=4, blank=True, default="")
    ipa = models.CharField(max_length=120, blank=True, default="")
    definition_ru = models.TextField(blank=True, default="")
    translation_ru = models.CharField(max_length=300, blank=True, default="")
    #: A pronunciation clip / an illustration, as Materials with their own licence fields.
    pronunciation = models.ForeignKey(
        "courses.Material",
        related_name="pronounced_words",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    illustration = models.ForeignKey(
        "courses.Material",
        related_name="illustrated_words",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    source = models.CharField(max_length=16, choices=choices(LexicalSource))
    license = models.CharField(max_length=64)
    attribution = models.CharField(max_length=300)
    source_url = models.URLField(max_length=1000, blank=True, default="")
    #: A word belongs to the language, not to a lesson — but a lesson introduces words, and
    #: «слова этого урока» is a real list on the sheet.
    lessons = models.ManyToManyField("courses.Lesson", related_name="words", blank=True)

    class Meta:
        ordering = ["lemma", "sense_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "sense_id"],
                condition=models.Q(sense_id__gt=""),
                name="uniq_lexical_sense",
            ),
            # An unattributed open-licence item is a licence breach waiting to happen, so it
            # is not merely discouraged — it cannot be written.
            models.CheckConstraint(
                condition=~models.Q(license="") & ~models.Q(attribution=""),
                name="lexical_item_is_attributed",
            ),
        ]
        indexes = [models.Index(fields=["lemma"])]

    def __str__(self) -> str:
        return f"{self.lemma} ({self.pos})"


class LexicalExample(BaseModel):
    """An example sentence for a sense — its own row because it has its own LICENCE.

    A definition comes from WordNet (CC BY 4.0) and a sentence from Tatoeba (CC BY 2.0 FR,
    credit the person who wrote it). Folding the sentence into the item would mean one
    attribution line covering two different rights holders, which is the quiet way licence
    compliance goes wrong.
    """

    item = models.ForeignKey(LexicalItem, related_name="examples", on_delete=models.CASCADE)
    text = models.TextField()
    translation_ru = models.TextField(blank=True, default="")
    source = models.CharField(max_length=16, choices=choices(LexicalSource))
    license = models.CharField(max_length=64)
    attribution = models.CharField(max_length=300)
    source_url = models.URLField(max_length=1000, blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "created_at"]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(license="") & ~models.Q(attribution=""),
                name="lexical_example_is_attributed",
            )
        ]


class SrsCard(BaseModel):
    """One word, one direction, one learner — the spaced-repetition unit (§7.2).

    FSRS state lives here; the scheduler itself arrives with R4.4. «В мои слова» creates the
    card in NEW and due now, which is what putting a word in your own list MEANS — there is
    no separate «saved words» list to keep in sync with the queue.

    Deliberately not `SkillMastery`: that is BKT over a RULE, this is FSRS over an ITEM. The
    spec devotes a table to keeping the two apart (§7.3).
    """

    student = models.ForeignKey(
        "accounts.StudentProfile", related_name="srs_cards", on_delete=models.CASCADE
    )
    item = models.ForeignKey(LexicalItem, related_name="cards", on_delete=models.CASCADE)
    direction = models.CharField(
        max_length=12, choices=choices(CardDirection), default=CardDirection.RECOGNITION.value
    )
    state = models.CharField(max_length=12, choices=choices(CardState), default=CardState.NEW.value)
    stability = models.FloatField(default=0.0)
    difficulty = models.FloatField(default=0.0)
    due_at = models.DateTimeField()
    last_review_at = models.DateTimeField(null=True, blank=True)
    reps = models.PositiveIntegerField(default=0)
    lapses = models.PositiveIntegerField(default=0)
    #: Which FSRS parameter set produced the current schedule — so a future re-fit is a
    #: version bump rather than a silent change of meaning under existing cards.
    params_version = models.CharField(max_length=16, default="fsrs-v1")

    class Meta:
        ordering = ["due_at"]
        constraints = [
            models.UniqueConstraint(fields=["student", "item", "direction"], name="uniq_srs_card")
        ]
        indexes = [models.Index(fields=["student", "due_at"])]

    def __str__(self) -> str:
        return f"{self.item_id}:{self.direction}"
