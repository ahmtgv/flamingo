"""Tests for the jurisdiction gate as a COMPLIANCE ARTIFACT (RND_01_JURISDICTION.md §6.4).

These are not ordinary unit tests. Each one pins a rule the product would have to defend to
a regulator, so a failure here means the legal position changed, not that a helper broke.
"""

from datetime import date

import pytest
from django.test import override_settings

from apps.accounts import services as accounts
from apps.compliance import services as audit
from apps.compliance.models import PolicyChangeLog, PolicyDecisionLog
from apps.institutions.models import Institution, InstitutionMembership
from common.compliance import (
    DENIED_BY_JURISDICTION_POLICY,
    DENIED_UNKNOWN_JURISDICTION,
    DENIED_UNREGISTERED_FEATURE,
    DENIED_UNVERIFIED_SOURCE,
    is_feature_allowed,
    policy_version,
    registered_features,
    require_feature,
    reset_audit_throttle,
    resolve_jurisdiction,
)
from common.enums import Jurisdiction, JurisdictionSource, MembershipRole, MembershipStatus, Role
from common.exceptions import PermissionDenied

pytestmark = pytest.mark.django_db

CMF = "cmf_attention"
SELFREPORT = "selfreport_state"


@pytest.fixture(autouse=True)
def _clean_audit_state():
    """The PDP throttles repeated refusals per process — reset it so tests see their writes."""
    reset_audit_throttle()
    audit.reset_version_cache()
    yield
    reset_audit_throttle()
    audit.reset_version_cache()


def make_student(email="s@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Саша",
        last_name="Иванов",
        role=Role.STUDENT,
        birth_date=date(2010, 1, 1),
    )


def institution(jurisdiction: str, source: str, name="Гимназия") -> Institution:
    return Institution.objects.create(
        name=name, jurisdiction=jurisdiction, jurisdiction_source=source
    )


def join(user, inst, status=MembershipStatus.ACTIVE):
    return InstitutionMembership.objects.create(
        user=user, institution=inst, role=MembershipRole.STUDENT.value, status=status.value
    )


# --- fail-closed ---------------------------------------------------------------------------
@override_settings(DEPLOYMENT_JURISDICTION="")
def test_unknown_jurisdiction_defaults_to_restricted():
    """Red line 7: an unknown regime never enables a restricted feature. With no deployment
    contour and no tenant declaration there is nothing to rely on, so everything is off —
    including the feature that is legal in both regimes we model."""
    user = make_student()
    for feature in registered_features():
        decision = is_feature_allowed(user, feature)
        assert not decision.allowed, feature
        assert decision.jurisdiction is Jurisdiction.UNKNOWN
        assert decision.reason == DENIED_UNKNOWN_JURISDICTION


@override_settings(DEPLOYMENT_JURISDICTION="ru")
def test_unregistered_feature_is_denied():
    """A key nobody registered is denied, not waved through: an unlisted feature has no
    reviewed legal basis, so 'we never thought about it' must not read as 'it is fine'."""
    decision = is_feature_allowed(make_student(), "some_future_module")
    assert not decision.allowed
    assert decision.reason == DENIED_UNREGISTERED_FEATURE


@override_settings(DEPLOYMENT_JURISDICTION="not-a-real-jurisdiction")
def test_misconfigured_contour_fails_closed():
    decision = is_feature_allowed(make_student(), CMF)
    assert not decision.allowed
    assert decision.jurisdiction is Jurisdiction.UNKNOWN


def test_policy_matrix_covers_all_registered_features():
    """Every registered feature carries the fields the gate and the audit trail rely on."""
    from common.compliance import feature_spec

    assert registered_features(), "the matrix must not be empty"
    for feature in registered_features():
        spec = feature_spec(feature)
        assert spec["default_state"] == "disabled", f"{feature}: default must be fail-closed"
        assert spec["legal_basis_ref"], f"{feature}: needs a legal basis reference"
        assert set(spec["jurisdiction_policy"]) <= {j.value for j in Jurisdiction}
        for state in spec["jurisdiction_policy"].values():
            assert state in ("enabled", "disabled"), f"{feature}: bad state {state!r}"
        # Every regime the product actually serves must be decided explicitly, not by default.
        assert {"ru", "eu"} <= set(spec["jurisdiction_policy"]), feature


# --- the two regimes -----------------------------------------------------------------------
@override_settings(DEPLOYMENT_JURISDICTION="ru")
def test_ru_contour_enables_the_camera_feature():
    """The RF profile runs with everything on (owner's decision, 2026-08-07) — this is the
    test that proves the gate did not silently change RF behaviour."""
    decision = is_feature_allowed(make_student(), CMF)
    assert decision.allowed
    assert decision.jurisdiction is Jurisdiction.RU
    assert decision.source is JurisdictionSource.DEPLOYMENT


@override_settings(DEPLOYMENT_JURISDICTION="ru")
def test_eu_institution_blocks_camera_but_keeps_self_report():
    """AI Act art. 5(1)(f): the camera-derived feature is off for an EU tenant even on the RF
    circuit, while the self-report module — not based on biometric data (cl. 251/265) — stays
    available. This is the whole point of splitting the two modules."""
    user = make_student()
    join(user, institution(Jurisdiction.EU.value, JurisdictionSource.CONTRACT.value))

    blocked = is_feature_allowed(user, CMF)
    assert not blocked.allowed
    assert blocked.reason == DENIED_BY_JURISDICTION_POLICY
    assert blocked.jurisdiction is Jurisdiction.EU

    assert is_feature_allowed(user, SELFREPORT).allowed


@override_settings(DEPLOYMENT_JURISDICTION="ru")
def test_face_emotion_recognition_is_denied_in_every_regime():
    """Red line 2, made machine-checkable: the matrix refuses it in RU as well as EU."""
    user = make_student()
    assert not is_feature_allowed(user, "face_emotion_recognition").allowed
    join(user, institution(Jurisdiction.RU.value, JurisdictionSource.CONTRACT.value))
    assert not is_feature_allowed(user, "face_emotion_recognition").allowed


# --- §6.2 asymmetry ------------------------------------------------------------------------
@override_settings(DEPLOYMENT_JURISDICTION="ru")
def test_unverified_claim_can_raise_strictness():
    """Any signal may tighten: a merely self-declared EU tenant is treated as EU."""
    user = make_student()
    join(user, institution(Jurisdiction.EU.value, JurisdictionSource.SELF_DECLARED.value))
    decision = is_feature_allowed(user, CMF)
    assert not decision.allowed
    assert decision.jurisdiction is Jurisdiction.EU


@override_settings(DEPLOYMENT_JURISDICTION="eu")
def test_unverified_claim_cannot_lower_strictness():
    """…but only evidence may loosen. A tenant that merely claims RU on the EU circuit stays
    under the EU profile; with a contract on file, it does not."""
    user = make_student()
    inst = institution(Jurisdiction.RU.value, JurisdictionSource.SELF_DECLARED.value)
    join(user, inst)
    assert not is_feature_allowed(user, CMF).allowed

    inst.jurisdiction_source = JurisdictionSource.CONTRACT.value
    inst.save(update_fields=["jurisdiction_source"])
    verified = is_feature_allowed(user, CMF)
    assert verified.allowed and verified.jurisdiction is Jurisdiction.RU


@override_settings(DEPLOYMENT_JURISDICTION="ru")
def test_a_matching_unverified_claim_does_not_weaken_the_contour():
    """An INFERRED "we are in RU" on the RU circuit adds no information. It must not replace
    the circuit's own (verified) provenance and thereby lock the tenant out."""
    user = make_student()
    join(user, institution(Jurisdiction.RU.value, JurisdictionSource.INFERRED.value))
    decision = is_feature_allowed(user, CMF)
    assert decision.allowed
    assert decision.source is JurisdictionSource.DEPLOYMENT

    user2 = make_student("b2c@example.com")  # same for a B2C self-declaration
    user2.jurisdiction = Jurisdiction.RU.value
    user2.jurisdiction_source = JurisdictionSource.INFERRED.value
    user2.save(update_fields=["jurisdiction", "jurisdiction_source"])
    assert is_feature_allowed(user2, CMF).allowed


@override_settings(DEPLOYMENT_JURISDICTION="")
def test_a_claim_alone_never_establishes_a_jurisdiction():
    """With no deployment circuit to lean on, a self-declared regime is not knowledge: the
    tenant resolves to UNKNOWN and even the otherwise-permitted module stays off."""
    user = make_student()
    join(user, institution(Jurisdiction.RU.value, JurisdictionSource.SELF_DECLARED.value))
    decision = is_feature_allowed(user, CMF)
    assert not decision.allowed
    assert decision.reason == DENIED_UNKNOWN_JURISDICTION
    assert not is_feature_allowed(user, SELFREPORT).allowed


@override_settings(DEPLOYMENT_JURISDICTION="ru")
def test_restricted_feature_refuses_an_unverified_source(monkeypatch):
    """§6.2: a restricted feature enables only on an established jurisdiction.

    Today's two-regime matrix cannot express this case (EU disables everything restricted),
    so the guard is exercised against a synthetic policy — it protects the matrix we will
    have once a third, permissive regime is added.
    """
    from common.compliance import policy as policy_module

    synthetic = {
        "policy_version": "test-synthetic",
        "_sha256": "0" * 64,
        "verified_sources": ["contract", "kyc_verified", "deployment"],
        "features": {
            "synthetic_feature": {
                "default_state": "disabled",
                "requires_verified_jurisdiction": True,
                "jurisdiction_policy": {"ru": "enabled", "eu": "enabled"},
                "legal_basis_ref": "synthetic",
            }
        },
    }
    monkeypatch.setattr(policy_module, "_matrix", lambda: synthetic)

    user = make_student()
    join(user, institution(Jurisdiction.EU.value, JurisdictionSource.SELF_DECLARED.value))
    decision = is_feature_allowed(user, "synthetic_feature")
    assert not decision.allowed
    assert decision.reason == DENIED_UNVERIFIED_SOURCE


@override_settings(DEPLOYMENT_JURISDICTION="ru")
def test_conflicting_institutions_resolve_to_unknown():
    """Two tenants in different regimes is a conflict, and a conflict is strictest — we do
    not get to pick the convenient one."""
    user = make_student()
    join(user, institution(Jurisdiction.RU.value, JurisdictionSource.CONTRACT.value, "РФ школа"))
    join(user, institution(Jurisdiction.EU.value, JurisdictionSource.CONTRACT.value, "EU school"))
    resolution = resolve_jurisdiction(user)
    assert resolution.jurisdiction is Jurisdiction.UNKNOWN
    assert not is_feature_allowed(user, CMF).allowed


@override_settings(DEPLOYMENT_JURISDICTION="eu")
def test_pending_membership_does_not_carry_jurisdiction():
    """Only ACTIVE memberships speak for a tenant; a pending invite is not a relationship."""
    user = make_student()
    join(
        user,
        institution(Jurisdiction.RU.value, JurisdictionSource.CONTRACT.value),
        status=MembershipStatus.PENDING,
    )
    assert resolve_jurisdiction(user).jurisdiction is Jurisdiction.EU  # contour, not the invite


@override_settings(DEPLOYMENT_JURISDICTION="ru")
def test_institution_can_be_resolved_directly():
    inst = institution(Jurisdiction.EU.value, JurisdictionSource.CONTRACT.value)
    resolution = resolve_jurisdiction(inst)
    assert resolution.jurisdiction is Jurisdiction.EU
    assert resolution.tenant_kind == "institution" and resolution.tenant_id == str(inst.id)


# --- refusal is an API-level error, not a hidden control -------------------------------------
@override_settings(DEPLOYMENT_JURISDICTION="eu")
def test_require_feature_raises_for_a_blocked_tenant():
    with pytest.raises(PermissionDenied):
        require_feature(make_student(), CMF)


# --- audit trail ------------------------------------------------------------------------------
@override_settings(DEPLOYMENT_JURISDICTION="eu", POLICY_AUDIT_THROTTLE_SECONDS=0)
def test_refusals_are_logged_and_allowed_calls_are_not():
    user = make_student()
    is_feature_allowed(user, CMF)  # refused → evidence
    is_feature_allowed(user, SELFREPORT)  # allowed → no row (buckets would flood the table)

    rows = list(PolicyDecisionLog.objects.all())
    assert len(rows) == 1
    row = rows[0]
    assert row.feature == CMF and row.allowed is False
    assert row.jurisdiction == Jurisdiction.EU.value
    assert row.policy_version == policy_version()


@override_settings(DEPLOYMENT_JURISDICTION="eu", POLICY_AUDIT_THROTTLE_SECONDS=3600)
def test_identical_refusals_are_throttled():
    user = make_student()
    for _ in range(5):
        is_feature_allowed(user, CMF)
    assert PolicyDecisionLog.objects.count() == 1


@override_settings(DEPLOYMENT_JURISDICTION="eu", POLICY_AUDIT_THROTTLE_SECONDS=0)
def test_decision_log_is_append_only():
    is_feature_allowed(make_student(), CMF)
    row = PolicyDecisionLog.objects.get()
    row.reason = "rewritten"
    with pytest.raises(RuntimeError):
        row.save()
    with pytest.raises(RuntimeError):
        row.delete()


@override_settings(DEPLOYMENT_JURISDICTION="eu", POLICY_AUDIT_THROTTLE_SECONDS=0)
def test_running_policy_version_is_recorded_once():
    is_feature_allowed(make_student(), CMF)
    change = PolicyChangeLog.objects.get()
    assert change.policy_version == policy_version()
    assert len(change.matrix_sha256) == 64

    audit.reset_version_cache()
    audit.ensure_policy_version_recorded()  # same version+hash → still one row
    assert PolicyChangeLog.objects.count() == 1


def test_audit_rows_carry_no_measurements():
    """§6.4: never log the values whose processing is the thing under scrutiny. The ledger
    records which feature was refused to whom — never what was measured."""
    fields = {f.name for f in PolicyDecisionLog._meta.get_fields()}
    forbidden = {
        "avg_attention",
        "attention",
        "gaze_on_screen",
        "eye_openness",
        "head_yaw",
        "head_pitch",
        "alertness",
        "score",
        "emotion",
        "mood",
        "payload",
    }
    assert not (fields & forbidden), fields & forbidden
