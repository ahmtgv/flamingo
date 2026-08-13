"""Answer checking and mastery maths — pure functions, no ORM.

Kept separate because this is where the quiet bugs live. Whether «Do not» equals «don't» is
not a database question, and a learner who typed the right answer and was told otherwise
stops trusting the product immediately.

Two things the English spec (§3) insists on and this module implements:

* **Normalisation before comparison.** Case, punctuation, doubled spaces and the
  contraction/expansion pair are noise, not error. A test that fails on «Don't» when the key
  says «do not» is testing typing, not English.
* **Dictation is scored by distance, not equality** (§3, type 7). One letter wrong in a
  fifteen-word sentence is not a zero.
"""

from __future__ import annotations

import re
import unicodedata

from common.enums import ExerciseKind

#: Kinds a machine can mark on its own (spec §3: 1–8 and 11).
AUTO_CHECKED = frozenset(
    {
        ExerciseKind.VOCAB_CARD,
        ExerciseKind.CLOZE,
        ExerciseKind.CHOICE,
        ExerciseKind.WORD_ORDER,
        ExerciseKind.MATCH,
        ExerciseKind.LISTENING,
        ExerciseKind.DICTATION,
        ExerciseKind.PRONUNCIATION,
        ExerciseKind.TRANSFORM,
    }
)
#: Kinds only a person can judge (§3: 9, 10, 12). A machine guessing here would be worse
#: than silence, so they stay for the teacher.
TEACHER_CHECKED = frozenset({ExerciseKind.SPEAKING, ExerciseKind.WRITING, ExerciseKind.ROLEPLAY})

#: How close a dictation has to be. 0.9 lets one slip through a short sentence, not a rewrite.
DICTATION_PASS = 0.9

_CONTRACTIONS = {
    "do not": "don't",
    "does not": "doesn't",
    "did not": "didn't",
    "is not": "isn't",
    "are not": "aren't",
    "was not": "wasn't",
    "were not": "weren't",
    "cannot": "can't",
    "can not": "can't",
    "will not": "won't",
    "i am": "i'm",
    "it is": "it's",
    "there is": "there's",
    "i have": "i've",
    "i would": "i'd",
}


def normalise(text: str) -> str:
    """Down to what was actually meant: lower case, straight apostrophes, one space, no
    trailing punctuation, contractions folded to one spelling."""
    value = unicodedata.normalize("NFKC", (text or "")).strip().lower()
    value = value.replace("’", "'").replace("`", "'")
    value = re.sub(r"[.!?;:,]+$", "", value)
    value = re.sub(r"\s+", " ", value)
    for long_form, short in _CONTRACTIONS.items():
        value = re.sub(rf"\b{re.escape(long_form)}\b", short, value)
    return value


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        current = [i]
        for j, cb in enumerate(b, start=1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (ca != cb)))
        previous = current
    return previous[-1]


def similarity(a: str, b: str) -> float:
    """1.0 for identical, 0.0 for nothing in common."""
    longest = max(len(a), len(b))
    if longest == 0:
        return 1.0
    return 1 - levenshtein(a, b) / longest


def check(kind: ExerciseKind, answer_key: dict, response: dict) -> bool | None:
    """Is this answer right? `None` means «not for a machine to say».

    The key shapes are per kind and deliberately small:
    * CHOICE / LISTENING → ``{"correct": 1}`` (index) or ``{"correct": [0, 2]}``
    * CLOZE / VOCAB_CARD / TRANSFORM → ``{"accepted": ["a bill", "the bill"]}``
    * WORD_ORDER → ``{"order": ["how", "do", "i", "get", "there"]}``
    * MATCH → ``{"pairs": {"menu": "меню"}}``
    * DICTATION → ``{"text": "..."}`` scored by distance
    * PRONUNCIATION → the device sends its own verdict; nothing audio-shaped is stored
    """
    if kind in TEACHER_CHECKED:
        return None

    if kind in (ExerciseKind.CHOICE, ExerciseKind.LISTENING):
        expected = answer_key.get("correct")
        picked = response.get("choice")
        if expected is None:
            # An exercise with no key is not a wrong answer — it is an unfinished exercise,
            # and it must not blow up in the face of the person answering it.
            return None
        if isinstance(expected, list):
            return sorted(map(int, response.get("choices", []))) == sorted(map(int, expected))
        return picked is not None and int(picked) == int(expected)

    if kind in (ExerciseKind.CLOZE, ExerciseKind.VOCAB_CARD, ExerciseKind.TRANSFORM):
        accepted = [normalise(x) for x in answer_key.get("accepted", [])]
        return normalise(str(response.get("text", ""))) in accepted

    if kind is ExerciseKind.WORD_ORDER:
        expected = [normalise(w) for w in answer_key.get("order", [])]
        given = [normalise(w) for w in response.get("order", [])]
        return bool(expected) and given == expected

    if kind is ExerciseKind.MATCH:
        pairs = {normalise(k): normalise(v) for k, v in (answer_key.get("pairs") or {}).items()}
        given = {normalise(k): normalise(v) for k, v in (response.get("pairs") or {}).items()}
        return bool(pairs) and given == pairs

    if kind is ExerciseKind.DICTATION:
        return (
            similarity(
                normalise(answer_key.get("text", "")), normalise(str(response.get("text", "")))
            )
            >= DICTATION_PASS
        )

    if kind is ExerciseKind.PRONUNCIATION:
        # The comparison happens on the device (§4.5) — the audio never leaves it and nothing
        # audio-shaped is stored. What arrives is the verdict the device already reached.
        return bool(response.get("matched"))

    return None


# --- BKT (§7.3) ---------------------------------------------------------------------------
#: Corbett & Anderson (1995), fixed parameters. Not learned: fitting on twenty attempts
#: produces confident nonsense, and the spec sets ≥500 attempts as the threshold for moving
#: to a fitted model.
P_INIT = 0.25
P_TRANSIT = 0.15
P_SLIP = 0.10
#: Guessing a four-option question is far easier than typing the answer.
P_GUESS_CHOICE = 0.20
P_GUESS_TYPED = 0.05
MASTERED_AT = 0.95
#: Certainty is never exactly 1: at 1.0 the Bayesian update is unfalsifiable and a learner
#: who has forgotten something can never show it. Capping just below keeps evidence able to
#: move the estimate in both directions, always.
P_CEILING = 0.999


def guess_rate(kind: ExerciseKind) -> float:
    return (
        P_GUESS_CHOICE
        if kind in (ExerciseKind.CHOICE, ExerciseKind.LISTENING, ExerciseKind.MATCH)
        else P_GUESS_TYPED
    )


def bkt_update(p_known: float, correct: bool, *, p_guess: float = P_GUESS_TYPED) -> float:
    """One Bayesian step: what the answer says about knowing, then the chance of learning."""
    prior = min(max(p_known, 0.0), 1.0)
    if correct:
        numerator = prior * (1 - P_SLIP)
        denominator = numerator + (1 - prior) * p_guess
    else:
        numerator = prior * P_SLIP
        denominator = numerator + (1 - prior) * (1 - p_guess)
    posterior = prior if denominator == 0 else numerator / denominator
    learned = posterior + (1 - posterior) * P_TRANSIT
    return round(min(learned, P_CEILING), 6)
