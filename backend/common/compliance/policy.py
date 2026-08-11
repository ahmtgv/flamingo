"""Policy Decision Point — the single place that answers "may this tenant use this feature?".

Modelled on ``courses.access.can_access_course``: one chokepoint, asked by everyone,
re-implemented by nobody. A jurisdictional ``if`` anywhere else in the codebase is a bug,
because a rule that lives in two places is a rule that will diverge in one of them.

Three properties make this defensible to a regulator (docs/rnd/RND_01_JURISDICTION.md §6.3):

* **Fail-closed.** Unregistered feature, unknown jurisdiction, unparseable data, or a regime
  the matrix does not mention → denied. There is no code path where absence of information
  results in a feature being on.
* **Policy-as-code.** The answer comes from ``matrix.json`` (reviewed, versioned, hashed),
  not from branches scattered through resolvers.
* **Server-side.** Callers get a refusal from the API. Hiding a control in the UI is not a
  control at all — Guidelines cl. 14/40 attach the prohibition to *use*, and a client flag
  is a devtools toggle away.
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from django.conf import settings

from common.enums import Jurisdiction, JurisdictionSource
from common.exceptions import PermissionDenied

from .jurisdiction import Resolution, resolve_jurisdiction

MATRIX_PATH = Path(__file__).with_name("matrix.json")

# Decision reasons. Stable machine-readable strings: they are written to the audit log and
# read back years later, so they are part of the compliance contract, not debug text.
ALLOWED_BY_POLICY = "allowed_by_policy"
DENIED_UNREGISTERED_FEATURE = "denied_unregistered_feature"
DENIED_UNKNOWN_JURISDICTION = "denied_unknown_jurisdiction"
DENIED_UNVERIFIED_SOURCE = "denied_unverified_jurisdiction_source"
DENIED_BY_JURISDICTION_POLICY = "denied_by_jurisdiction_policy"


@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason: str
    feature: str
    jurisdiction: Jurisdiction
    source: JurisdictionSource
    policy_version: str
    tenant_kind: str
    tenant_id: str | None


@lru_cache(maxsize=1)
def _matrix() -> dict:
    raw = MATRIX_PATH.read_text(encoding="utf-8")
    data = json.loads(raw)
    data["_sha256"] = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return data


def reload_matrix() -> None:
    """Drop the cached matrix (deploy-time reload; also used by tests)."""
    _matrix.cache_clear()


def policy_version() -> str:
    return str(_matrix()["policy_version"])


def matrix_sha256() -> str:
    return str(_matrix()["_sha256"])


def registered_features() -> tuple[str, ...]:
    return tuple(sorted(_matrix()["features"]))


def feature_spec(feature: str) -> dict | None:
    return _matrix()["features"].get(feature)


def is_feature_allowed(subject, feature: str) -> Decision:
    """Decide, and record the refusal if there is one.

    ``subject`` is a User (the usual case), an Institution, or None. The jurisdiction is
    taken from the tenant, never from the request.
    """
    matrix = _matrix()
    version = str(matrix["policy_version"])
    spec = matrix["features"].get(feature)

    if spec is None:
        # An unknown key must never be treated as "no restrictions known".
        resolution = resolve_jurisdiction(subject)
        return _finish(_decide(False, DENIED_UNREGISTERED_FEATURE, feature, resolution, version))

    resolution = resolve_jurisdiction(subject)
    verified_sources = {JurisdictionSource(v) for v in matrix.get("verified_sources", [])}

    if resolution.jurisdiction is Jurisdiction.UNKNOWN:
        return _finish(_decide(False, DENIED_UNKNOWN_JURISDICTION, feature, resolution, version))

    state = spec.get("jurisdiction_policy", {}).get(
        resolution.jurisdiction.value, spec.get("default_state", "disabled")
    )
    if state != "enabled":
        return _finish(_decide(False, DENIED_BY_JURISDICTION_POLICY, feature, resolution, version))

    # The provenance check gates ENABLING, so it runs after the policy lookup: a tenant the
    # matrix refuses anyway is refused for that reason, not for a paperwork one.
    if spec.get("requires_verified_jurisdiction") and resolution.source not in verified_sources:
        return _finish(_decide(False, DENIED_UNVERIFIED_SOURCE, feature, resolution, version))

    return _finish(_decide(True, ALLOWED_BY_POLICY, feature, resolution, version))


def require_feature(subject, feature: str) -> Decision:
    """``is_feature_allowed`` for call sites that should abort. Raises PermissionDenied.

    The message is deliberately terse: a caller learns the feature is unavailable in their
    jurisdiction, not how the gate is wired.
    """
    decision = is_feature_allowed(subject, feature)
    if not decision.allowed:
        raise PermissionDenied(f"Feature '{feature}' is not available in this jurisdiction")
    return decision


def _decide(
    allowed: bool, reason: str, feature: str, resolution: Resolution, version: str
) -> Decision:
    return Decision(
        allowed=allowed,
        reason=reason,
        feature=feature,
        jurisdiction=resolution.jurisdiction,
        source=resolution.source,
        policy_version=version,
        tenant_kind=resolution.tenant_kind,
        tenant_id=resolution.tenant_id,
    )


# --- audit -------------------------------------------------------------------------------
# Refusals are the evidential events: they are what proves a feature was unavailable at a
# given moment. Allowed calls are not logged — attention buckets arrive every few seconds
# per pupil, and a row per bucket would be write amplification, not evidence (the matrix
# version plus the tenant's jurisdiction record already establish what was permitted).
# Repeated identical refusals are throttled per process for the same reason.

_last_logged: dict[tuple, float] = {}


def _finish(decision: Decision) -> Decision:
    if not decision.allowed:
        _audit(decision)
    return decision


def _audit(decision: Decision) -> None:
    window = float(getattr(settings, "POLICY_AUDIT_THROTTLE_SECONDS", 3600))
    key = (
        decision.tenant_kind,
        decision.tenant_id,
        decision.feature,
        decision.reason,
        decision.policy_version,
    )
    now = time.monotonic()
    previous = _last_logged.get(key)
    if previous is not None and window > 0 and (now - previous) < window:
        return
    _last_logged[key] = now

    from apps.compliance import services  # lazy: keeps common/ importable without the app

    services.log_decision(decision)


def reset_audit_throttle() -> None:
    """Forget the throttle window (tests; also useful after a policy reload)."""
    _last_logged.clear()
