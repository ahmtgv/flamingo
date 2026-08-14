"""Signalling reads: the relay credential and the shape of the measurement."""

from __future__ import annotations

import strawberry

from apps.signalling import services
from common.auth import require_user
from common.compliance.policy import require_feature
from common.turn import credentials_for

from .types import TurnCredentials, UplinkProbe


@strawberry.type
class SignallingQuery:
    @strawberry.field
    def turn_credentials(self, info: strawberry.Info) -> TurnCredentials:
        """A relay credential for the caller: expires within the hour, mints no account.

        Gated on `webrtc_signalling` like the handshake itself — a regime that will not have
        children's media relayed through the operator turns off one key, not two.
        """
        user = require_user(info)
        require_feature(user, services.FEATURE_SIGNALLING)
        creds = credentials_for(str(user.id))
        return TurnCredentials(
            urls=creds.urls,
            username=creds.username,
            credential=creds.credential,
            ttl_seconds=creds.ttl_seconds,
            configured=creds.configured,
        )

    @strawberry.field
    def uplink_probe(self, info: strawberry.Info) -> UplinkProbe:
        """The measurement's own parameters, served rather than hardcoded twice."""
        from apps.devices import uplink

        require_user(info)
        return UplinkProbe(
            seconds=uplink.PROBE_SECONDS,
            required_for_two=uplink.REQUIRED_MBPS[2],
            required_for_four=uplink.REQUIRED_MBPS[4],
            required_for_eight=uplink.REQUIRED_MBPS[8],
        )
