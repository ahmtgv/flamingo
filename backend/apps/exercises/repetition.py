"""Spaced repetition: the queue, the review, and a learner's own progress (R4.4).

**FSRS runs on the client** (`ts-fsrs`, MIT — spec §7.3 names it, and it is JavaScript). This
module is the other half: it owns the card, decides who may touch it, and refuses a schedule
that could not have come from a scheduler. That split is also where the product is going —
the desktop-host decision (`R5_DESKTOP_HOST_BUDGET.md`) moves computation to the learner's
machine and leaves the server holding the record.

Trusting the client with the *numbers* is safe in a way it would not be for a grade: a
schedule only ever affects the person who owns it, and cheating it means not learning. What
is NOT trusted is whose card it is, or whether the values are sane — both are checked here.

🔴 **No leaderboards, no comparing children with each other** (owner decision). Every read in
this module is scoped to one student and takes no student id: the caller's own progress is
the only progress there is. A «top learners» screen would need a new function, not a new
argument — which is the point.
"""

from __future__ import annotations

import datetime as dt

from django.db import transaction
from django.utils import timezone

from common.enums import AchievementKey, CardState, ReviewRating
from common.exceptions import NotFound, PermissionDenied, ValidationError

from .models import EarnedAchievement, LexicalItem, SrsCard, StudyStreak

#: A card is «выучено» once FSRS thinks it will survive this long without a review. Roughly
#: «I would still know it after a school term» — a number, not a feeling.
MASTERED_STABILITY_DAYS = 60.0

#: Sanity bounds on a client-computed schedule. Not the algorithm — a fence around it.
MAX_STABILITY_DAYS = 365.0 * 10
MAX_DIFFICULTY = 10.0
#: FSRS difficulty lives in [1, 10]. Zero is only legal on a card nobody has answered yet —
#: `(stability > 0, difficulty == 0)` is not a memory state the scheduler can read back, and
#: handing it one throws on the learner's screen. The clamp must not be able to mint that pair.
MIN_DIFFICULTY = 1.0
MAX_INTERVAL = dt.timedelta(days=365 * 10)

#: How many cards a session offers at once. A queue of four hundred is a queue nobody starts.
DEFAULT_BATCH = 20


def _student_or_deny(user):
    profile = getattr(user, "student_profile", None)
    if profile is None:
        raise PermissionDenied("Repetition is a learner's own practice")
    return profile


# --- the queue -------------------------------------------------------------------------------


def due_cards(user, *, limit: int = DEFAULT_BATCH) -> list[SrsCard]:
    """What is due now, oldest first. The caller's own — the query takes no student id."""
    student = _student_or_deny(user)
    limit = max(1, min(int(limit or DEFAULT_BATCH), 100))
    return list(
        SrsCard.objects.filter(student=student, due_at__lte=timezone.now())
        .select_related("item")
        .prefetch_related("item__examples")[:limit]
    )


def progress(user) -> dict:
    """One learner's own numbers. Nothing here can be compared with anybody else's."""
    student = _student_or_deny(user)
    cards = SrsCard.objects.filter(student=student)
    streak, _ = StudyStreak.objects.get_or_create(student=student)
    return {
        "total": cards.count(),
        "due": cards.filter(due_at__lte=timezone.now()).count(),
        "learning": cards.filter(
            state__in=[CardState.LEARNING.value, CardState.RELEARNING.value]
        ).count(),
        "mastered": cards.filter(stability__gte=MASTERED_STABILITY_DAYS).count(),
        "reviews": streak.total_reviews,
        "current_streak": streak.current_days,
        "longest_streak": streak.longest_days,
    }


def achievements(user) -> list[EarnedAchievement]:
    student = _student_or_deny(user)
    return list(EarnedAchievement.objects.filter(student=student))


# --- the review --------------------------------------------------------------------------------


@transaction.atomic
def review(
    user,
    card_id,
    *,
    rating: str,
    stability: float,
    difficulty: float,
    due_at: dt.datetime,
    state: str,
    learning_steps: int = 0,
) -> SrsCard:
    """Record one review. The client scheduled it; the server decides whose it is and clamps.

    `reps` and `lapses` are counted HERE, not taken from the client: they are the history of
    the record, and a history a client can rewrite is not one.
    """
    student = _student_or_deny(user)
    card = SrsCard.objects.filter(id=card_id).select_related("item").first()
    if card is None or card.student_id != student.pk:
        # Not «нельзя» — «нет такой». Somebody else's card is not the caller's business, and
        # a refusal that confirms it exists is already a leak.
        raise NotFound("Card not found")

    rating_value = _rating(rating)
    now = timezone.now()

    card.stability = _clamp(stability, 0.0, MAX_STABILITY_DAYS)
    card.difficulty = _clamp(difficulty, 0.0, MAX_DIFFICULTY)
    if card.stability > 0:
        # Keep the pair coherent — see MIN_DIFFICULTY. Clamping the two independently is how
        # a fence ends up building the thing it was meant to keep out.
        card.difficulty = max(MIN_DIFFICULTY, card.difficulty)
    card.due_at = _sane_due(due_at, now)
    card.state = _state(state)
    card.learning_steps = max(0, min(int(learning_steps or 0), 100))
    card.last_review_at = now
    card.reps += 1
    if rating_value is ReviewRating.AGAIN:
        card.lapses += 1
    card.save()

    _touch_streak(student, now)
    _award(student, now)
    return card


def _rating(value: str) -> ReviewRating:
    try:
        return ReviewRating(value)
    except ValueError as exc:
        raise ValidationError("Unknown rating") from exc


def _state(value: str) -> str:
    try:
        return CardState(value).value
    except ValueError as exc:
        raise ValidationError("Unknown card state") from exc


def _clamp(value: float, low: float, high: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError("Schedule must be numeric") from exc
    if number != number:  # NaN — a fence that lets NaN through is not a fence
        raise ValidationError("Schedule must be numeric")
    return max(low, min(number, high))


def _sane_due(due_at: dt.datetime, now: dt.datetime) -> dt.datetime:
    """A due date in the distant past would starve the queue; one in the far future would
    quietly delete the card. Both are clamped rather than refused — a bad schedule is a bug
    in a scheduler, not a reason to lose the review the learner just did."""
    if due_at is None:
        return now
    if timezone.is_naive(due_at):
        due_at = timezone.make_aware(due_at)
    return max(now - dt.timedelta(days=1), min(due_at, now + MAX_INTERVAL))


# --- streaks and milestones — one person, their own past ------------------------------------------


def _touch_streak(student, now: dt.datetime) -> StudyStreak:
    """Days in a row. Compared only with the same learner's own best."""
    streak, _ = StudyStreak.objects.get_or_create(student=student)
    today = timezone.localtime(now).date()

    if streak.last_day == today:
        pass  # already counted today; a second review does not make a second day
    elif streak.last_day == today - dt.timedelta(days=1):
        streak.current_days += 1
    else:
        streak.current_days = 1

    streak.last_day = today
    streak.longest_days = max(streak.longest_days, streak.current_days)
    streak.total_reviews += 1
    streak.save()
    return streak


def earned_keys(*, words: int, mastered: int, streak_days: int, reviews: int) -> set[str]:
    """Which milestones these numbers deserve. Pure — no database, no other learner.

    Kept as a function of one person's own four numbers so that the rule «only compared with
    who they were» is checkable by reading the signature.
    """
    keys: set[str] = set()
    if words >= 1:
        keys.add(AchievementKey.FIRST_WORD.value)
    if words >= 10:
        keys.add(AchievementKey.TEN_WORDS.value)
    if words >= 50:
        keys.add(AchievementKey.FIFTY_WORDS.value)
    if mastered >= 1:
        keys.add(AchievementKey.FIRST_MASTERED.value)
    if mastered >= 10:
        keys.add(AchievementKey.TEN_MASTERED.value)
    if streak_days >= 3:
        keys.add(AchievementKey.STREAK_3.value)
    if streak_days >= 7:
        keys.add(AchievementKey.STREAK_7.value)
    if streak_days >= 30:
        keys.add(AchievementKey.STREAK_30.value)
    if reviews >= 100:
        keys.add(AchievementKey.HUNDRED_REVIEWS.value)
    return keys


def _award(student, now: dt.datetime) -> list[EarnedAchievement]:
    cards = SrsCard.objects.filter(student=student)
    streak, _ = StudyStreak.objects.get_or_create(student=student)
    deserved = earned_keys(
        words=cards.count(),
        mastered=cards.filter(stability__gte=MASTERED_STABILITY_DAYS).count(),
        streak_days=streak.current_days,
        reviews=streak.total_reviews,
    )
    already = set(EarnedAchievement.objects.filter(student=student).values_list("key", flat=True))
    fresh = [
        EarnedAchievement(student=student, key=key, earned_at=now)
        for key in sorted(deserved - already)
    ]
    EarnedAchievement.objects.bulk_create(fresh, ignore_conflicts=True)
    return fresh


# --- the door from the lesson summary ------------------------------------------------------------


def enqueue_words(student, items: list[LexicalItem], *, now: dt.datetime | None = None) -> int:
    """Put a lesson's new words into one learner's queue, due now.

    Used by the summary when a teacher sends it (R4.2 → R4.4). Idempotent per word, so a
    re-sent summary does not reset a card the learner has already been working on — the same
    reason «в мои слова» is idempotent, and the same failure it prevents.
    """
    when = now or timezone.now()
    created = 0
    for item in items:
        _card, was_new = SrsCard.objects.get_or_create(
            student=student,
            item=item,
            direction=SrsCard._meta.get_field("direction").default,
            defaults={"state": CardState.NEW.value, "due_at": when},
        )
        created += int(was_new)
    return created
