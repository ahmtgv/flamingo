"""Persistence for the jurisdiction gate's evidence trail.

The decision logic lives in ``common.compliance``; this module only writes down what it
decided. Keeping the two apart is what lets the PDP stay a pure, importable function.
"""

from __future__ import annotations

from common.compliance import matrix_sha256, policy_version

from .models import PolicyChangeLog, PolicyDecisionLog

# Per-process guard: the running matrix version is checked once, not on every refusal.
_version_recorded = False


def log_decision(decision) -> PolicyDecisionLog:
    """Append one refusal. Never raises past the caller's control flow."""
    ensure_policy_version_recorded()
    tenant_id = decision.tenant_id or None
    return PolicyDecisionLog.objects.create(
        tenant_kind=decision.tenant_kind,
        tenant_id=tenant_id,
        feature=decision.feature,
        allowed=decision.allowed,
        reason=decision.reason,
        jurisdiction=decision.jurisdiction.value,
        jurisdiction_source=decision.source.value,
        policy_version=decision.policy_version,
    )


def ensure_policy_version_recorded(observed_by: str = "runtime") -> PolicyChangeLog | None:
    """Record the running policy version+hash the first time it is seen.

    Idempotent: the unique constraint makes a repeat a no-op, so concurrent workers cannot
    produce duplicates.
    """
    global _version_recorded
    if _version_recorded:
        return None
    row, _ = PolicyChangeLog.objects.get_or_create(
        policy_version=policy_version(),
        matrix_sha256=matrix_sha256(),
        defaults={"observed_by": observed_by},
    )
    _version_recorded = True
    return row


def reset_version_cache() -> None:
    """Forget that the version was recorded (tests, and after a matrix reload)."""
    global _version_recorded
    _version_recorded = False
