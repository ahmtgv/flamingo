"""Short-lived TURN credentials (Р5.1).

TURN is the relay that makes a lesson reach the 20–40% of real networks — school Wi-Fi,
mobile operators, corporate internet — that will not pass a direct peer connection
(`R5_DESKTOP_HOST_BUDGET.md` §1). Without it those pupils simply do not connect.

The credentials are the standard coturn REST scheme (`use-auth-secret`): a username that is
an expiry timestamp, and a password that is an HMAC of it under a shared secret. That means:

* **no per-user accounts on the TURN server** — nothing to provision, nothing to clean up,
  and no second place where a person's identity is written down;
* **they expire by themselves.** A credential read out of a browser's memory is dead within
  the hour, so a leak is a nuisance rather than an open relay;
* **the secret never leaves this process.** What the client gets is one HMAC and no way to
  mint another.

The relay forwards packets and stores nothing. That is worth stating plainly because it is
what keeps TURN outside the storage rule: there is no recording here to forbid.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import time
from dataclasses import dataclass

from django.conf import settings

#: An hour is long enough for a lesson to start late and short enough that a leaked
#: credential is worthless by the time anybody notices it leaked.
DEFAULT_TTL_SECONDS = 3600


@dataclass(frozen=True)
class TurnCredentials:
    urls: list[str]
    username: str
    credential: str
    ttl_seconds: int

    @property
    def configured(self) -> bool:
        """False when no TURN server is set up. The caller says so out loud rather than
        handing out a credential for nowhere — a lesson that silently has no relay fails
        for the pupils whose network needed one, which is the hardest failure to diagnose."""
        return bool(self.urls)


def credentials_for(identity: str, *, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> TurnCredentials:
    """Mint a credential for one person, valid for `ttl_seconds`.

    `identity` is only there to make a relay log readable; coturn does not check it. It is
    the caller's user id, which the relay already sees in the packets it forwards.
    """
    cfg = getattr(settings, "TURN", {})
    urls = [u.strip() for u in (cfg.get("urls") or "").split(",") if u.strip()]
    secret = cfg.get("secret") or ""
    ttl = max(60, min(int(ttl_seconds or DEFAULT_TTL_SECONDS), 86_400))

    expiry = int(time.time()) + ttl
    username = f"{expiry}:{identity}"
    if not secret:
        # No secret configured — dev, or a deployment that has not set TURN up yet. Return an
        # unusable credential rather than one signed with something that is not the secret:
        # a credential that looks valid and is not costs an hour of debugging the wrong thing.
        return TurnCredentials(urls=urls, username=username, credential="", ttl_seconds=ttl)

    digest = hmac.new(secret.encode("utf-8"), username.encode("utf-8"), hashlib.sha1).digest()
    return TurnCredentials(
        urls=urls,
        username=username,
        credential=base64.b64encode(digest).decode("ascii"),
        ttl_seconds=ttl,
    )
