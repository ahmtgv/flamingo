"""Bringing two peers together, and then getting out of the way (Р5.1).

Signalling is the only thing the server does for a lesson's media. Two browsers behind two
routers cannot find each other; this passes them each other's addresses and codec offers, and
after that the packets go peer to peer, or through TURN when a network refuses. **No media
ever crosses this module**, and there is no model in this app at all.

That last part is the design, not an omission:

* an SDP carries IP addresses and codec detail — a routing message that outlives the call it
  routed is a record of who was where, kept for nobody's benefit;
* a signal is meaningless a second after it arrives. Storing one would mean deciding how long
  to keep it, who may read it and what to do on a restore — four questions with no good
  answers about a thing that does not need to exist.

So `apps/signalling` has `services.py`, a GraphQL layer and no `models.py`. `test_signalling.py`
asserts the absence, because «мы просто не стали писать модель» is not a guarantee.

**Who may signal whom.** A peer is a user id, and both ends must be participants of the same
session — checked per call against the lesson's own access rule, exactly like everything
else. A signal addressed to somebody outside the session goes nowhere.
"""

from __future__ import annotations

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.courses.access import can_access_course
from apps.scheduling.models import LessonSession
from common.compliance.policy import require_feature
from common.enums import SignalKind
from common.exceptions import NotFound, ValidationError

FEATURE_SIGNALLING = "webrtc_signalling"

#: An SDP for a handful of tracks is a few kilobytes. Anything an order of magnitude larger is
#: not a handshake, and the relay is not a transport for it.
MAX_PAYLOAD = 64_000


def session_or_deny(user, session_id) -> LessonSession:
    """The lesson's own access rule, and no second one for media."""
    session = (
        LessonSession.objects.filter(id=session_id)
        .select_related("lesson__section__course__owner")
        .first()
    )
    if session is None:
        raise NotFound("Session not found")
    if not can_access_course(user, session.lesson.section.course):
        raise NotFound("Session not found")
    return session


def _is_participant(user, session: LessonSession) -> bool:
    """A peer must be someone who could open this lesson. `can_access_course` already answers
    that for the caller; for the *addressee* we ask the same question about them."""
    return can_access_course(user, session.lesson.section.course)


def send(user, *, session_id, to_peer: str, kind: SignalKind, payload: str) -> dict:
    """Pass one handshake message to one peer in this lesson. Nothing is written down."""
    session = session_or_deny(user, session_id)
    require_feature(session.lesson.section.course.owner.user, FEATURE_SIGNALLING)

    payload = payload or ""
    if len(payload) > MAX_PAYLOAD:
        raise ValidationError("Signal payload is too large to be a handshake")

    from apps.accounts.models import User

    peer = User.objects.filter(id=to_peer, is_active=True).first()
    if peer is None or not _is_participant(peer, session):
        # «Нет такого» rather than «нельзя»: who else is in a lesson is not something a
        # probe should be able to enumerate.
        raise NotFound("Peer not found in this session")

    message = {
        "type": "signal.message",
        "session_id": str(session.id),
        "from_peer": str(user.id),
        "to_peer": str(peer.id),
        "kind": kind.value,
        "payload": payload,
    }
    layer = get_channel_layer()
    if layer is not None:
        # Addressed to the RECIPIENT's own channel group, not to the room: a handshake is
        # between two people, and broadcasting it to the class would hand everybody else's
        # network addresses to everybody.
        async_to_sync(layer.group_send)(f"signal_{session.id}_{peer.id}", message)
    return message
