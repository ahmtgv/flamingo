"""How big a group this channel can carry (Р5.1, OWNER_SCOPE §19.3).

Pure arithmetic over the numbers in `R5_DESKTOP_HOST_BUDGET.md` §3, kept in one module so
the app, the settings screen and the status strip cannot each round it differently.

The measurement itself runs on the teacher's machine, over the same path the media will take
— a data channel through the TURN relay — and takes twelve seconds. There is deliberately no
upload endpoint on the API for it: a byte sink that accepts twelve seconds of anything is the
shape of the thing §2.1 exists to forbid, even when what it accepts is noise.

**The verdict never blocks anything.** Owner decision 14.08: «предупреждаем, не запрещаем».
The teacher is told what the channel is good for and decides; they know what the lesson is
and who the children are, and a product that refuses to start a lesson over a bandwidth
estimate has taken a decision that was not its to take.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

from common.enums import UplinkVerdict

#: Outbound Mbit/s the teacher needs for a group of N, in the Р5.1 video mode (student sees
#: the teacher and themselves). Straight from the budget §3 — do not re-derive them here.
REQUIRED_MBPS: dict[int, float] = {2: 1.1, 4: 2.4, 8: 4.3}

#: Below this even a pair breaks up. Slightly under the two-person figure, because a channel
#: that measures exactly at the requirement has nothing left for a bad minute.
FLOOR_MBPS = 0.9

#: The measurement itself: twelve seconds, per the phase brief.
PROBE_SECONDS = 12

#: «Замер повторяется автоматически за пять минут до занятия» (§19.3).
MEASURE_BEFORE_LESSON = dt.timedelta(minutes=5)

#: A measurement older than this tells you about a different evening.
MEASUREMENT_STALE_AFTER = dt.timedelta(hours=12)


@dataclass(frozen=True)
class Assessment:
    """What a measurement means. Numbers and a verdict — never a sentence.

    The words a teacher reads are composed on the client from `verdict` and `group_size`,
    like every other piece of Russian in this product.
    """

    mbps: float
    verdict: UplinkVerdict
    #: The largest group this channel carries. 0 when it carries none.
    group_size: int
    #: What a group of eight would need, so the screen can say how far off it is.
    required_for_eight: float = REQUIRED_MBPS[8]


def assess(mbps: float | None) -> Assessment:
    """Turn Mbit/s into a group size and a verdict.

    Rounding is deliberately downward at every step: a channel that measured 4.29 does not
    get told it can carry eight. The cost of being optimistic here is a lesson breaking up
    in front of children.
    """
    if mbps is None:
        return Assessment(mbps=0.0, verdict=UplinkVerdict.UNKNOWN, group_size=0)

    value = float(mbps)
    if value != value or value < 0:  # NaN or nonsense
        return Assessment(mbps=0.0, verdict=UplinkVerdict.UNKNOWN, group_size=0)

    if value < FLOOR_MBPS:
        return Assessment(mbps=value, verdict=UplinkVerdict.TOO_WEAK, group_size=0)

    group = 0
    for size in sorted(REQUIRED_MBPS):
        if value >= REQUIRED_MBPS[size]:
            group = size
    if group == 0:
        # Between the floor and the two-person requirement: a pair, and only just.
        return Assessment(mbps=value, verdict=UplinkVerdict.TIGHT, group_size=2)

    if group >= 8:
        # Headroom, not just the number: a channel sitting exactly on 4.3 has none.
        comfortable = value >= REQUIRED_MBPS[8] * 1.5
        return Assessment(
            mbps=value,
            verdict=UplinkVerdict.COMFORTABLE if comfortable else UplinkVerdict.WORKABLE,
            group_size=8,
        )
    if group == 2:
        return Assessment(mbps=value, verdict=UplinkVerdict.TIGHT, group_size=2)
    return Assessment(mbps=value, verdict=UplinkVerdict.WORKABLE, group_size=group)


def is_stale(measured_at: dt.datetime | None, *, now: dt.datetime | None = None) -> bool:
    """A measurement from this morning says nothing about this evening's Wi-Fi."""
    if measured_at is None:
        return True
    moment = now or dt.datetime.now(dt.UTC)
    return moment - measured_at > MEASUREMENT_STALE_AFTER


def due_at(next_lesson_start: dt.datetime | None) -> dt.datetime | None:
    """When the machine should measure again — five minutes before the next lesson.

    One place, so the app and the server agree about it rather than each keeping their own
    five minutes that drift apart.
    """
    if next_lesson_start is None:
        return None
    return next_lesson_start - MEASURE_BEFORE_LESSON
