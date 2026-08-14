"""GraphQL types for device pairing.

Note what is absent and always will be: any field that carries a password, and any field
that returns a machine key after the one time it is handed over. `test_devices.py` asserts
both against the published schema rather than against anyone's care.
"""

from __future__ import annotations

import datetime as dt

import strawberry

from apps.devices import uplink as uplink_rules
from apps.signalling.graphql.types import UplinkAssessment
from common.enums import ConnectionType, DevicePlatform


@strawberry.type
class Device:
    id: strawberry.ID
    name: str
    platform: DevicePlatform
    app_version: str
    last_seen_at: dt.datetime | None
    #: Derived from the heartbeat — see meetingpoint.services.HEARTBEAT_WINDOW.
    online: bool
    paired_at: dt.datetime
    #: Р5.1 — the last channel measurement, already turned into a verdict and a group size.
    #: Null until the machine has measured once.
    uplink: UplinkAssessment | None

    @classmethod
    def of(cls, row, *, online: bool = False) -> Device:
        assessment = None
        if row.uplink_measured_at is not None:
            assessment = UplinkAssessment.of(
                uplink_rules.assess(row.uplink_mbps),
                stale=uplink_rules.is_stale(row.uplink_measured_at),
                connection_type=ConnectionType(row.connection_type),
            )
        return cls(
            id=strawberry.ID(str(row.id)),
            name=row.name,
            platform=DevicePlatform(row.platform),
            app_version=row.app_version,
            last_seen_at=row.last_seen_at,
            online=online,
            paired_at=row.created_at,
            uplink=assessment,
        )


@strawberry.type
class PairingRequest:
    """What the app gets when it asks to be paired.

    `secret` is the app's half of the credential and is returned exactly once, here. It is
    stored as a hash: the server can check it and can never read it back.
    """

    code: str
    secret: str
    expires_at: dt.datetime


@strawberry.type
class DeviceClaim:
    """The machine key, handed over once.

    After this reply the plaintext exists only in the machine's OS keychain (PROMPT_14
    §2.2.2). There is no query that returns it — a key you can read back is a key that ends
    up in a screenshot.
    """

    device: Device
    token: str
