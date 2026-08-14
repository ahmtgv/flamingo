"""Signalling writes — one, and it writes nothing."""

from __future__ import annotations

import strawberry

from apps.signalling import services
from common.auth import require_user
from common.enums import SignalKind


@strawberry.type
class SignallingMutation:
    @strawberry.mutation
    def send_signal(
        self,
        info: strawberry.Info,
        session_id: strawberry.ID,
        to_peer: strawberry.ID,
        kind: SignalKind,
        payload: str,
    ) -> bool:
        """Pass one handshake message to one peer of this lesson.

        Returns a boolean and not the signal: there is nothing to give back. The message goes
        to the addressee's own channel and to no store — see apps/signalling/services.py for
        why an SDP must not outlive the call it set up.
        """
        services.send(
            require_user(info),
            session_id=session_id,
            to_peer=to_peer,
            kind=kind,
            payload=payload,
        )
        return True
