"""Resolve WHICH legal regime a caller falls under.

The tenant is the unit of jurisdiction, never the request: a pupil on a VPN does not move
their school, which is exactly why gating on the tenant (and not on IP) is what makes the
gate hold (docs/rnd/RND_01_JURISDICTION.md §6.1, §6.5).

Order of authority:
  1. the institution the user belongs to (the AI Act attaches to the education institution);
  2. for B2C, the user's own contractual country;
  3. the deployment contour — the operator's own data circuit, configured per deployment.

Nothing here reads an IP address, a locale or a timezone. Those are INFERRED signals and
§6.1 allows them only as anomaly detectors, never as a reason to switch a feature on.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings

from common.enums import Jurisdiction, JurisdictionSource, MembershipStatus

# How strict each regime is. Used only to implement the asymmetry rule (§6.2): an
# unverified claim may move a tenant UP this scale, never down.
_STRICTNESS: dict[Jurisdiction, int] = {
    Jurisdiction.RU: 0,
    Jurisdiction.EU: 10,
    Jurisdiction.UNKNOWN: 20,
}


@dataclass(frozen=True)
class Resolution:
    """Where the answer came from, so a decision can be audited years later."""

    jurisdiction: Jurisdiction
    source: JurisdictionSource
    tenant_kind: str  # "institution" | "user" | "deployment"
    tenant_id: str | None


def _as_jurisdiction(raw: str | None) -> Jurisdiction | None:
    """Parse a stored value. An unrecognised non-empty value is UNKNOWN (strictest), never
    silently ignored — a typo in the data must not open a feature."""
    if not raw:
        return None
    try:
        return Jurisdiction(raw)
    except ValueError:
        return Jurisdiction.UNKNOWN


def _as_source(raw: str | None) -> JurisdictionSource:
    try:
        return JurisdictionSource(raw)
    except ValueError:
        return JurisdictionSource.INFERRED  # unparseable provenance is the weakest one


def deployment_contour() -> Resolution:
    """The jurisdiction of this deployment's data circuit (settings.DEPLOYMENT_JURISDICTION).

    §5(v) requires EU and RU to be separate circuits rather than replicas, so the circuit a
    request is served from is itself a jurisdictional fact — and §6.1 ranks the deployment
    region as the strongest technical criterion. Hence DEPLOYMENT counts as a verified
    source. An unset/unrecognised value resolves to UNKNOWN, i.e. the strictest profile.
    """
    value = _as_jurisdiction(getattr(settings, "DEPLOYMENT_JURISDICTION", "") or None)
    return Resolution(
        jurisdiction=value or Jurisdiction.UNKNOWN,
        source=JurisdictionSource.DEPLOYMENT,
        tenant_kind="deployment",
        tenant_id=None,
    )


def _declared(obj) -> tuple[Jurisdiction | None, JurisdictionSource]:
    return (
        _as_jurisdiction(getattr(obj, "jurisdiction", "") or None),
        _as_source(getattr(obj, "jurisdiction_source", "") or None),
    )


def _institution_of(user) -> tuple[Jurisdiction | None, JurisdictionSource, str | None]:
    """The jurisdiction of the user's ACTIVE institution memberships.

    Two institutions in different regimes is a conflict, and a conflict resolves to UNKNOWN
    (§6.2) — we do not get to pick the convenient one.
    """
    memberships = getattr(user, "institution_memberships", None)
    if memberships is None:
        return None, JurisdictionSource.INFERRED, None
    rows = list(
        memberships.filter(status=MembershipStatus.ACTIVE.value).values_list(
            "institution_id", "institution__jurisdiction", "institution__jurisdiction_source"
        )
    )
    if not rows:
        return None, JurisdictionSource.INFERRED, None
    distinct = {_as_jurisdiction(j) or Jurisdiction.UNKNOWN for _, j, _ in rows}
    if len(distinct) > 1:
        return Jurisdiction.UNKNOWN, JurisdictionSource.INFERRED, str(rows[0][0])
    inst_id, raw_j, raw_src = rows[0]
    return _as_jurisdiction(raw_j), _as_source(raw_src), str(inst_id)


def resolve_jurisdiction(subject) -> Resolution:
    """Resolve the effective regime for a user, an institution, or nobody.

    A verified tenant record wins outright (it is the legal primary key). An unverified
    claim is merged with the deployment contour by taking whichever is STRICTER — that is
    the §6.2 asymmetry: any signal may tighten the profile, only evidence may loosen it.
    """
    from apps.institutions.models import Institution  # lazy: common/ must not import apps/ at load

    contour = deployment_contour()
    if subject is None:
        return contour

    # An Institution passed directly is its own tenant.
    if isinstance(subject, Institution):
        declared, source = _declared(subject)
        kind, tenant_id = "institution", str(getattr(subject, "id", "") or "") or None
    else:
        declared, source, inst_id = _institution_of(subject)
        if declared is not None:
            kind, tenant_id = "institution", inst_id
        else:  # B2C: fall back to the user's own contractual country
            declared, source = _declared(subject)
            kind, tenant_id = "user", str(getattr(subject, "id", "") or "") or None

    if declared is None:  # nothing declared anywhere → the contour decides
        return contour

    verified = source in (JurisdictionSource.CONTRACT, JurisdictionSource.KYC_VERIFIED)
    if verified:
        return Resolution(declared, source, kind, tenant_id)

    # Unverified claim: it may only TIGHTEN relative to the contour. Equal strictness keeps
    # the contour, whose provenance is the stronger of the two (a claim that agrees with the
    # circuit adds no information, and must not downgrade how well-established it is).
    if _STRICTNESS[declared] > _STRICTNESS[contour.jurisdiction]:
        return Resolution(declared, source, kind, tenant_id)
    return contour
