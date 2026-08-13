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
already carries files, presigned reads and licence attribution — and it keeps this app clear
of anything shaped like stored lesson media (§2.2 / test_storage_policy).
"""

from django.db import models

from common.enums import (
    AttemptContext,
    ExerciseKind,
    ExerciseMode,
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
