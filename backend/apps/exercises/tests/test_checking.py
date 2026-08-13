"""Answer checking and BKT — pure functions, no database (R4.1).

These are the quiet bugs: a learner who typed the right answer and was told otherwise stops
trusting the product, and nobody files a ticket about it. Everything here is about being
right for the person answering, not about being convenient to implement.
"""

import pytest

from apps.exercises.checking import (
    AUTO_CHECKED,
    DICTATION_PASS,
    MASTERED_AT,
    P_GUESS_CHOICE,
    P_GUESS_TYPED,
    P_INIT,
    TEACHER_CHECKED,
    bkt_update,
    check,
    guess_rate,
    levenshtein,
    normalise,
    similarity,
)
from common.enums import ExerciseKind


# --- normalisation ----------------------------------------------------------------------
def test_case_spacing_and_trailing_punctuation_are_not_mistakes():
    assert normalise("  The   Bill. ") == "the bill"
    assert normalise("Is it far from here?") == "is it far from here"


def test_a_curly_apostrophe_is_the_same_apostrophe():
    """A phone keyboard types ’ and a laptop types ' — the learner did not get it wrong."""
    assert normalise("don’t") == normalise("don't")


def test_a_contraction_and_its_long_form_are_one_answer():
    assert normalise("I do not know") == normalise("I don't know")
    assert normalise("It is far") == normalise("It's far")


# --- the objective kinds -------------------------------------------------------------------
def test_a_single_choice_is_checked_by_index():
    assert check(ExerciseKind.CHOICE, {"correct": 1}, {"choice": 1}) is True
    assert check(ExerciseKind.CHOICE, {"correct": 1}, {"choice": 0}) is False
    assert check(ExerciseKind.CHOICE, {"correct": 1}, {}) is False


def test_a_multiple_choice_ignores_the_order_they_were_ticked_in():
    key = {"correct": [0, 2]}
    assert check(ExerciseKind.CHOICE, key, {"choices": [2, 0]}) is True
    assert check(ExerciseKind.CHOICE, key, {"choices": [0]}) is False


def test_a_gap_accepts_every_answer_the_author_listed():
    key = {"accepted": ["the bill", "a bill"]}
    assert check(ExerciseKind.CLOZE, key, {"text": "A Bill"}) is True
    assert check(ExerciseKind.CLOZE, key, {"text": "the check"}) is False


def test_word_order_is_the_one_place_order_is_the_whole_point():
    key = {"order": ["how", "do", "I", "get", "there"]}
    assert (
        check(ExerciseKind.WORD_ORDER, key, {"order": ["How", "do", "i", "get", "there"]}) is True
    )
    assert (
        check(ExerciseKind.WORD_ORDER, key, {"order": ["how", "I", "do", "get", "there"]}) is False
    )


def test_matching_compares_pairs_not_position():
    key = {"pairs": {"menu": "меню", "bill": "счёт"}}
    assert check(ExerciseKind.MATCH, key, {"pairs": {"bill": "счёт", "menu": "меню"}}) is True
    assert check(ExerciseKind.MATCH, key, {"pairs": {"menu": "счёт", "bill": "меню"}}) is False


def test_a_dictation_survives_one_slip_but_not_a_rewrite():
    """§3 type 7: one letter wrong in a long sentence is not a zero."""
    key = {"text": "Turn left at the station"}
    assert check(ExerciseKind.DICTATION, key, {"text": "Turn left at the statian"}) is True
    assert check(ExerciseKind.DICTATION, key, {"text": "Go right at the bank"}) is False
    assert 0 < DICTATION_PASS < 1


def test_pronunciation_is_judged_on_the_device_and_only_the_verdict_arrives():
    """§4.5: the audio never leaves the device, so what the server sees is already a verdict —
    there is nothing audio-shaped to store, and nothing to store it in."""
    assert check(ExerciseKind.PRONUNCIATION, {}, {"matched": True}) is True
    assert check(ExerciseKind.PRONUNCIATION, {}, {"matched": False}) is False


# --- what a machine must not judge -----------------------------------------------------------
@pytest.mark.parametrize("kind", sorted(TEACHER_CHECKED, key=lambda k: k.value))
def test_the_open_kinds_are_left_for_a_person(kind):
    """A machine guessing at a monologue is worse than silence — None means «not mine»."""
    assert check(kind, {"accepted": ["anything"]}, {"text": "anything"}) is None


def test_every_kind_is_either_auto_or_a_persons_job():
    assert AUTO_CHECKED | TEACHER_CHECKED == set(ExerciseKind)
    assert not (AUTO_CHECKED & TEACHER_CHECKED)


# --- distance ----------------------------------------------------------------------------------
def test_levenshtein_and_similarity_agree_on_the_easy_cases():
    assert levenshtein("kitten", "sitting") == 3
    assert levenshtein("", "abc") == 3
    assert similarity("abc", "abc") == 1.0
    assert similarity("", "") == 1.0
    assert similarity("abc", "xyz") == 0.0


# --- BKT ------------------------------------------------------------------------------------
def test_a_right_answer_raises_the_estimate_and_a_wrong_one_lowers_it():
    up = bkt_update(P_INIT, True)
    down = bkt_update(P_INIT, False)
    assert up > P_INIT > down


def test_typing_the_answer_says_more_than_picking_one_of_four():
    """A guessed multiple choice is weak evidence; a typed answer is not (§7.3)."""
    typed = bkt_update(P_INIT, True, p_guess=P_GUESS_TYPED)
    picked = bkt_update(P_INIT, True, p_guess=P_GUESS_CHOICE)
    assert typed > picked
    assert guess_rate(ExerciseKind.CHOICE) == P_GUESS_CHOICE
    assert guess_rate(ExerciseKind.CLOZE) == P_GUESS_TYPED


def test_mastery_is_reachable_by_answering_and_never_leaves_the_unit_interval():
    p = P_INIT
    for _ in range(12):
        p = bkt_update(p, True)
        assert 0.0 <= p <= 1.0
    assert p >= MASTERED_AT


def test_one_slip_does_not_undo_a_learned_skill():
    """Slip is modelled precisely so a single mistake is not treated as forgetting."""
    p = P_INIT
    for _ in range(12):
        p = bkt_update(p, True)
    after_slip = bkt_update(p, False)
    assert after_slip < p
    assert after_slip > 0.5, "one bad answer must not erase a dozen good ones"
