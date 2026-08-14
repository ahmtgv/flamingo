"""Spaced repetition (R4.4 — spec §7.2/§7.3).

Three groups of tests, and the third is the one that matters most:

* the queue and the review — whose card it is, and what the server refuses to believe;
* streaks and milestones — one person's own past, and nothing else;
* 🔴 **no leaderboards** — checked against the schema and the source, not against memory.
  The owner's rule is that children are never compared with each other. A rule like that
  survives exactly as long as something fails when it is broken.
"""

import ast
import datetime as dt
import re
from datetime import date
from pathlib import Path

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.exercises import repetition
from apps.exercises.models import EarnedAchievement, LexicalItem, SrsCard, StudyStreak
from common.enums import AchievementKey, CardState, LexicalSource, PartOfSpeech, Role
from common.exceptions import NotFound, PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


def make_pupil(email="p@example.com", first="Аня"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name=first,
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2010, 1, 1),
        consent_152fz=True,
    )


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Ирина",
        last_name="Соколова",
        role=Role.TEACHER,
        specialty="English",
        consent_152fz=True,
    )


def a_word(lemma="crossroads", sense="oewn-1") -> LexicalItem:
    """Words are shared: two learners can perfectly well be studying the same one, and the
    unique (source, sense_id) constraint says so."""
    existing = LexicalItem.objects.filter(sense_id=sense).first()
    if existing is not None:
        return existing
    return LexicalItem.objects.create(
        lemma=lemma,
        pos=PartOfSpeech.NOUN.value,
        sense_id=sense,
        translation_ru="перекрёсток",
        source=LexicalSource.WORDNET.value,
        license="CC BY 4.0",
        attribution="Princeton WordNet · Open English WordNet team",
    )


def a_card(user, word=None, **over) -> SrsCard:
    fields = {
        "student": user.student_profile,
        "item": word or a_word(),
        "state": CardState.NEW.value,
        "due_at": timezone.now(),
    }
    fields.update(over)
    return SrsCard.objects.create(**fields)


def a_review(user, card, **over):
    payload = {
        "rating": "good",
        "stability": 2.3,
        "difficulty": 5.0,
        "due_at": timezone.now() + dt.timedelta(days=1),
        "state": CardState.LEARNING.value,
    }
    payload.update(over)
    return repetition.review(user, card.id, **payload)


# --- the queue ------------------------------------------------------------------------------
def test_the_queue_is_the_callers_own_and_takes_no_student_id():
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    a_card(anya)

    assert len(repetition.due_cards(anya)) == 1
    assert repetition.due_cards(boris) == []


def test_a_card_that_is_not_due_yet_is_not_in_the_queue():
    anya = make_pupil()
    a_card(anya, due_at=timezone.now() + dt.timedelta(days=3))
    assert repetition.due_cards(anya) == []


def test_a_teacher_has_no_queue_here():
    teacher = make_teacher()
    with pytest.raises(PermissionDenied):
        repetition.due_cards(teacher)


def test_the_batch_is_bounded_so_the_screen_is_startable():
    """A queue of four hundred is a queue nobody starts."""
    anya = make_pupil()
    for i in range(30):
        a_card(anya, word=a_word(f"word{i}", f"oewn-{i}"))

    assert len(repetition.due_cards(anya)) == repetition.DEFAULT_BATCH
    assert len(repetition.due_cards(anya, limit=5)) == 5
    assert len(repetition.due_cards(anya, limit=10_000)) == 30  # clamped, not unbounded


# --- the review ------------------------------------------------------------------------------
def test_a_review_stores_the_clients_schedule_and_counts_the_history_itself():
    """`reps` and `lapses` are the record's own history — a history a client can rewrite is
    not a history."""
    anya = make_pupil()
    card = a_card(anya)
    due = timezone.now() + dt.timedelta(days=4)

    updated = a_review(anya, card, stability=6.5, difficulty=4.2, due_at=due, state="review")

    assert updated.stability == 6.5
    assert updated.state == CardState.REVIEW.value
    assert updated.reps == 1
    assert updated.lapses == 0
    assert updated.last_review_at is not None


def test_forgetting_a_word_counts_a_lapse():
    anya = make_pupil()
    card = a_card(anya)
    a_review(anya, card, rating="again", state="relearning")
    card.refresh_from_db()
    assert card.lapses == 1
    assert card.reps == 1


def test_somebody_elses_card_is_not_found_rather_than_refused():
    """A refusal that confirms the card exists is already a leak."""
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    card = a_card(anya)

    with pytest.raises(NotFound):
        a_review(boris, card)


def test_an_absurd_schedule_is_clamped_rather_than_believed():
    """The server does not run FSRS, but it does know that a hundred-year interval and a
    negative stability did not come from a scheduler."""
    anya = make_pupil()
    card = a_card(anya)

    updated = a_review(
        anya,
        card,
        stability=10**9,
        difficulty=-50,
        due_at=timezone.now() + dt.timedelta(days=365 * 500),
    )

    assert updated.stability == repetition.MAX_STABILITY_DAYS
    # Not 0: a card WITH stability must have a difficulty, or the scheduler cannot read it
    # back — see test_clamping_cannot_mint_a_memory_state_the_scheduler_cannot_read.
    assert updated.difficulty == repetition.MIN_DIFFICULTY
    assert updated.due_at <= timezone.now() + repetition.MAX_INTERVAL


def test_a_due_date_in_the_distant_past_cannot_starve_the_queue():
    anya = make_pupil()
    card = a_card(anya)
    updated = a_review(anya, card, due_at=timezone.now() - dt.timedelta(days=900))
    assert updated.due_at >= timezone.now() - dt.timedelta(days=1, minutes=1)


def test_nonsense_is_refused_outright():
    anya = make_pupil()
    card = a_card(anya)
    with pytest.raises(ValidationError):
        a_review(anya, card, rating="brilliant")
    with pytest.raises(ValidationError):
        a_review(anya, card, state="marinating")
    with pytest.raises(ValidationError):
        a_review(anya, card, stability=float("nan"))


# --- streak: one person, their own past --------------------------------------------------------
def test_two_reviews_on_the_same_day_are_one_day():
    anya = make_pupil()
    card_a, card_b = a_card(anya), a_card(anya, word=a_word("ahead", "oewn-2"))
    a_review(anya, card_a)
    a_review(anya, card_b)

    streak = StudyStreak.objects.get(student=anya.student_profile)
    assert streak.current_days == 1
    assert streak.total_reviews == 2


def test_a_day_missed_starts_the_streak_over_but_the_personal_best_stays():
    """The only benchmark is who this learner was before."""
    anya = make_pupil()
    card = a_card(anya)
    streak, _ = StudyStreak.objects.get_or_create(student=anya.student_profile)
    StudyStreak.objects.filter(id=streak.id).update(
        current_days=9,
        longest_days=9,
        last_day=timezone.localtime().date() - dt.timedelta(days=4),
    )

    a_review(anya, card)

    streak.refresh_from_db()
    assert streak.current_days == 1
    assert streak.longest_days == 9


def test_a_day_in_a_row_extends_the_streak():
    anya = make_pupil()
    card = a_card(anya)
    streak, _ = StudyStreak.objects.get_or_create(student=anya.student_profile)
    StudyStreak.objects.filter(id=streak.id).update(
        current_days=6, longest_days=6, last_day=timezone.localtime().date() - dt.timedelta(days=1)
    )

    a_review(anya, card)

    streak.refresh_from_db()
    assert streak.current_days == 7
    assert streak.longest_days == 7


# --- milestones ----------------------------------------------------------------------------------
def test_every_milestone_is_a_fact_about_one_persons_own_history():
    """Pure, and its signature is the proof: four numbers, all of them the same learner's."""
    assert repetition.earned_keys(words=0, mastered=0, streak_days=0, reviews=0) == set()
    assert AchievementKey.FIRST_WORD.value in repetition.earned_keys(
        words=1, mastered=0, streak_days=1, reviews=1
    )
    assert AchievementKey.STREAK_7.value in repetition.earned_keys(
        words=1, mastered=0, streak_days=7, reviews=7
    )
    assert AchievementKey.TEN_MASTERED.value in repetition.earned_keys(
        words=20, mastered=10, streak_days=1, reviews=40
    )


def test_a_milestone_is_earned_once_and_kept():
    anya = make_pupil()
    card = a_card(anya)
    a_review(anya, card)
    a_review(anya, card)

    keys = list(
        EarnedAchievement.objects.filter(student=anya.student_profile).values_list("key", flat=True)
    )
    assert keys.count(AchievementKey.FIRST_WORD.value) == 1


def test_mastery_is_a_number_not_a_feeling():
    anya = make_pupil()
    card = a_card(anya)
    a_review(anya, card, stability=repetition.MASTERED_STABILITY_DAYS + 1, state="review")

    assert repetition.progress(anya)["mastered"] == 1
    assert AchievementKey.FIRST_MASTERED.value in {a.key for a in repetition.achievements(anya)}


def test_progress_is_one_learners_numbers_and_nobody_elses():
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    a_card(anya)
    a_card(boris)
    a_card(boris, word=a_word("ahead", "oewn-2"))

    assert repetition.progress(anya)["total"] == 1
    assert repetition.progress(boris)["total"] == 2


# --- 🔴 the owner's rule, as a gate ------------------------------------------------------------
def test_the_schema_offers_no_leaderboard_and_no_other_childs_progress():
    """Owner decision: no leaderboards, no comparing children with each other.

    Checked against the published contract, because that is what a future client would reach
    for. Any query that ranks learners, or that accepts somebody else's id and returns their
    progress, fails here.
    """
    from api.schema import schema

    sdl = schema.as_str()
    query_block = re.search(r"type Query \{(.*?)\n\}", sdl, re.S).group(1)

    banned = ("leaderboard", "topLearners", "ranking", "rankings", "classProgress")
    for name in banned:
        assert name.lower() not in query_block.lower(), f"{name} is in the contract"

    # The three repetition reads exist and none of them takes an id.
    for field in ("myRepetitionQueue", "myRepetitionProgress", "myAchievements"):
        line = next(line for line in query_block.splitlines() if field in line)
        assert "studentId" not in line and "userId" not in line, line


def test_the_repetition_module_never_reads_more_than_one_learner_at_a_time():
    """A «top streaks» screen would need a new function, not a new argument — this test is
    what makes that true. Executable code only, so prose cannot satisfy it."""
    tree = ast.parse(Path(repetition.__file__).read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Module | ast.ClassDef | ast.FunctionDef):
            body = node.body
            if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
                node.body = body[1:]
    code = ast.unparse(tree)

    for smell in (
        "order_by('-current_days'",
        "order_by('-longest_days'",
        "order_by('-total_reviews'",
    ):
        assert smell not in code, f"the module ranks learners: {smell}"
    # Every queryset in here is filtered by a single student.
    assert "StudyStreak.objects.all()" not in code
    assert "EarnedAchievement.objects.all()" not in code


def test_the_hand_written_contract_has_no_leaderboard_type_either():
    """The SDL leads the live schema, so this is where a leaderboard would come BACK from.

    It had one — `LeaderboardEntry` + `leaderboard(groupId:)` — inherited from the original
    contract. The owner decision of 2026-08-13 removes it, and the type is deleted rather
    than left unimplemented: a shape in the contract is an invitation.
    """
    sdl = (Path(__file__).resolve().parents[4] / "docs" / "flamingo_schema.graphql").read_text(
        encoding="utf-8"
    )
    # Comments explaining the removal are allowed; a declaration or a field is not.
    code = "\n".join(line for line in sdl.splitlines() if not line.lstrip().startswith("#"))
    assert "LeaderboardEntry" not in code
    assert "leaderboard(" not in code
    assert "UserAchievement" not in code


def test_clamping_cannot_mint_a_memory_state_the_scheduler_cannot_read():
    """Found by the frontend: FSRS state is a PAIR, and `(stability > 0, difficulty == 0)`
    throws when the client reads the card back — taking the review screen down with it.

    Clamping the two independently is how a fence ends up building the thing it was meant to
    keep out, so the pair is repaired rather than each value on its own.
    """
    anya = make_pupil()
    card = a_card(anya)

    updated = a_review(anya, card, stability=8.0, difficulty=-3, state="review")

    assert updated.stability > 0
    assert updated.difficulty >= repetition.MIN_DIFFICULTY


def test_an_untouched_card_may_still_be_all_zeros():
    """The one legal way to have no difficulty: nobody has answered the word yet."""
    anya = make_pupil()
    card = a_card(anya)
    assert (card.stability, card.difficulty) == (0.0, 0.0)
