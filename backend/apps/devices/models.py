"""A teacher's machine, and how it becomes trusted (Р5.0 — PROMPT_14, OWNER_SCOPE §19.4).

The pilot hosts the lesson from the teacher's laptop, so that laptop needs a key. Owner
decision 14.08: **the app never asks for a password.** It shows a six-character code; the
teacher opens the site in a real browser — where the address bar and the padlock are visible —
signs in the way they always do, and types the code. The app then exchanges the code for a
machine key.

Three things follow, and they are the shape of this module rather than notes about it:

* **No password crosses the app's boundary, ever.** There is no field here for one, no
  mutation that takes one, and the fallback «войти по почте и паролю» is a *web* login — the
  same server login everyone else uses (§19.4). `test_devices.py` asserts the absence.
* **The machine key is stored as a hash**, like a password would be. The server can check a
  key and can revoke it; it cannot read one back. The plaintext is returned exactly once, to
  the machine that asked, and then it exists only in that machine's OS keychain.
* **A pairing code is one-time and short-lived.** Ten minutes, one use. A code read off a
  screen across a room, or left in a chat log, is dead long before anyone tries it — and the
  code alone is not enough anyway: claiming needs the secret only the asking app holds.
"""

from django.db import models

from common.enums import ConnectionType, DevicePlatform, choices
from common.models import BaseModel


class Device(BaseModel):
    """One machine bound to one account.

    Revocation is a column, not a delete: «украденный ноутбук» (§19.4 п.3) has to stop
    working while the record of it having existed stays — otherwise a person cannot tell
    whether they already dealt with it.
    """

    owner = models.ForeignKey("accounts.User", related_name="devices", on_delete=models.CASCADE)
    #: What the machine calls itself — «MacBook Ирины». For telling two of them apart in the
    #: revoke list, and for nothing else.
    name = models.CharField(max_length=120)
    platform = models.CharField(
        max_length=12, choices=choices(DevicePlatform), default=DevicePlatform.OTHER.value
    )
    app_version = models.CharField(max_length=32, blank=True, default="")
    #: The heartbeat. Presence at the meeting point is derived from this — see
    #: apps/meetingpoint/services.py, which owns the «is the host online» question.
    last_seen_at = models.DateTimeField(null=True, blank=True)
    # Р5.1 — the last uplink measurement, which is state OF THIS MACHINE and belongs on its
    # row. What the numbers mean is `apps/devices/uplink.py`; the row only remembers them.
    uplink_mbps = models.FloatField(null=True, blank=True)
    uplink_measured_at = models.DateTimeField(null=True, blank=True)
    #: How the last lesson's media actually got there. Shown because it explains what the
    #: teacher is feeling: RELAY means the network refused a direct path.
    connection_type = models.CharField(
        max_length=8, choices=choices(ConnectionType), default=ConnectionType.UNKNOWN.value
    )
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-last_seen_at", "-created_at"]
        indexes = [models.Index(fields=["owner", "revoked_at"])]

    @property
    def is_revoked(self) -> bool:
        return self.revoked_at is not None

    def __str__(self) -> str:
        return f"{self.name} ({self.platform})"


class PairingCode(BaseModel):
    """The six characters on the app's screen, and the secret only the app knows.

    Two credentials, deliberately. The **code** proves that a human at a signed-in browser
    approved this pairing. The **secret** proves that the machine collecting the key is the
    one that asked for it — so somebody who reads the code over a shoulder still cannot walk
    away with a key.

    Neither is stored in the clear: a database dump is not a set of usable credentials.
    """

    #: Shown to the person. Unique among live codes; short, because it is typed by hand.
    code = models.CharField(max_length=12, unique=True, db_index=True)
    #: sha256 of the secret the app holds. The server checks, it does not read.
    secret_hash = models.CharField(max_length=64)
    #: What the app says it is, carried through to the Device on confirmation.
    device_name = models.CharField(max_length=120)
    platform = models.CharField(
        max_length=12, choices=choices(DevicePlatform), default=DevicePlatform.OTHER.value
    )
    app_version = models.CharField(max_length=32, blank=True, default="")
    expires_at = models.DateTimeField()
    #: Set when the person confirmed it in the browser.
    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmed_by = models.ForeignKey(
        "accounts.User",
        related_name="pairing_confirmations",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    device = models.ForeignKey(
        Device, related_name="pairing_codes", null=True, blank=True, on_delete=models.SET_NULL
    )
    #: Set when the app collected the key. One use — a second claim finds nothing.
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["expires_at", "consumed_at"])]

    def __str__(self) -> str:
        return self.code


class DeviceToken(BaseModel):
    """The machine's key — as a hash.

    The plaintext leaves the server exactly once, in the reply to the claim, and lives after
    that only in the machine's OS keychain (PROMPT_14 §2.2.2). There is deliberately no query
    that returns it: a key you can read back is a key that ends up in a screenshot.
    """

    device = models.ForeignKey(Device, related_name="tokens", on_delete=models.CASCADE)
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["device", "revoked_at"])]
