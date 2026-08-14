"""GraphQL types for signalling (Р5.1).

Nothing here is persisted and nothing here is a model. A `Signal` exists for the length of a
subscription frame, which is exactly as long as it is useful.
"""

from __future__ import annotations

import strawberry

from common.enums import ConnectionType, SignalKind, UplinkVerdict


@strawberry.type
class Signal:
    """One step of a handshake, in flight."""

    session_id: strawberry.ID
    from_peer: strawberry.ID
    to_peer: strawberry.ID
    kind: SignalKind
    #: The SDP or ICE candidate, opaque to us. We route it; we do not read it and we do not
    #: keep it.
    payload: str


@strawberry.type
class TurnCredentials:
    """A short-lived relay credential (common/turn.py).

    Minted per person, dead within the hour, and the secret behind it never leaves the
    server. `configured` is false when no relay is set up — said out loud, because a lesson
    that silently has no relay fails only for the pupils whose network needed one, and that
    is the hardest failure to diagnose.
    """

    urls: list[str]
    username: str
    credential: str
    ttl_seconds: int
    configured: bool


@strawberry.type
class UplinkAssessment:
    """What a measurement means — numbers and a verdict, never a sentence.

    The Russian a teacher reads is composed on the client from `verdict` and `groupSize`,
    like every other string in this product. 🔴 It never blocks a lesson (§19.3).
    """

    mbps: float
    verdict: UplinkVerdict
    #: The largest group this channel carries; 0 when it carries none.
    group_size: int
    #: What eight would need, so the screen can say how far off it is.
    required_for_eight: float
    #: True when the last measurement is old enough to be about a different evening.
    stale: bool
    connection_type: ConnectionType

    @classmethod
    def of(cls, assessment, *, stale: bool, connection_type: ConnectionType) -> UplinkAssessment:
        return cls(
            mbps=assessment.mbps,
            verdict=assessment.verdict,
            group_size=assessment.group_size,
            required_for_eight=assessment.required_for_eight,
            stale=stale,
            connection_type=connection_type,
        )


@strawberry.type
class UplinkProbe:
    """How to run the measurement, so the app and the server agree on the shape of it.

    The probe runs over a data channel through the relay — the same path the media will take
    — for `seconds`. There is deliberately no upload endpoint on the API: a byte sink that
    accepts twelve seconds of anything is the shape of the thing §2.1 forbids, even when what
    it accepts is noise.
    """

    seconds: int
    #: Mbit/s needed for 2 / 4 / 8 participants, from R5_DESKTOP_HOST_BUDGET.md §3.
    required_for_two: float
    required_for_four: float
    required_for_eight: float
