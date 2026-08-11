"""Jurisdiction gate (docs/rnd/RND_01_JURISDICTION.md).

Import the decision point from here; do not reach into the submodules from call sites.
"""

from .jurisdiction import Resolution, deployment_contour, resolve_jurisdiction
from .policy import (
    ALLOWED_BY_POLICY,
    DENIED_BY_JURISDICTION_POLICY,
    DENIED_UNKNOWN_JURISDICTION,
    DENIED_UNREGISTERED_FEATURE,
    DENIED_UNVERIFIED_SOURCE,
    Decision,
    feature_spec,
    is_feature_allowed,
    matrix_sha256,
    policy_version,
    registered_features,
    reload_matrix,
    require_feature,
    reset_audit_throttle,
)

__all__ = [
    "ALLOWED_BY_POLICY",
    "DENIED_BY_JURISDICTION_POLICY",
    "DENIED_UNKNOWN_JURISDICTION",
    "DENIED_UNREGISTERED_FEATURE",
    "DENIED_UNVERIFIED_SOURCE",
    "Decision",
    "Resolution",
    "deployment_contour",
    "feature_spec",
    "is_feature_allowed",
    "matrix_sha256",
    "policy_version",
    "registered_features",
    "reload_matrix",
    "require_feature",
    "reset_audit_throttle",
    "resolve_jurisdiction",
]
