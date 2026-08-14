"""The gate must bite at the API, not in the UI (RND_01_JURISDICTION.md §6.3).

Guidelines cl. 14/40 attach the prohibition to *use*, and cl. 14 is explicit that a
provider's contractual carve-out does not protect the deployer. So the test that matters is
not "is the button hidden" but "does the server refuse, and does it store nothing".
"""

from datetime import date

import pytest
from django.test import override_settings
from django.utils import timezone

from apps.accounts import services as accounts
from apps.compliance import services as audit
from apps.compliance.models import PolicyDecisionLog
from apps.courses import services as courses
from apps.institutions.models import Institution, InstitutionMembership
from apps.scheduling.models import LessonSession
from apps.seedum import services as seedum
from apps.seedum.models import AttentionMetric
from common.compliance import reset_audit_throttle
from common.enums import Jurisdiction, JurisdictionSource, MembershipRole, MembershipStatus, Role
from common.exceptions import PermissionDenied

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _clean_audit_state():
    reset_audit_throttle()
    audit.reset_version_cache()
    yield
    reset_audit_throttle()
    audit.reset_version_cache()


def _classroom(jurisdiction: str | None):
    """A teacher, a published course, a live session, and an enrolled pupil — optionally all
    inside an institution with the given jurisdiction."""
    teacher = accounts.register_user(
        email="t@example.com",
        password="strongpass1!",
        first_name="Т",
        last_name="У",
        role=Role.TEACHER,
        specialty="Математика",
    )
    student = accounts.register_user(
        email="s@example.com",
        password="strongpass1!",
        first_name="С",
        last_name="У",
        role=Role.STUDENT,
        birth_date=date(2010, 1, 1),
        consent_152fz=True,
    )
    # D2 step 3: attention analysis is off by default and the server enforces it. This test is
    # about a pupil who turned it on — the jurisdiction gate is what it is measuring, not consent.
    student.consent_attention = True
    student.save(update_fields=["consent_attention"])
    course = courses.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    section = courses.create_section(teacher, course.id, title="Раздел 1")
    lesson = courses.create_lesson(teacher, section.id, title="Урок 1", duration_min=40)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    courses.enroll(student, course.id)
    session = LessonSession.objects.create(lesson=lesson, start_at=timezone.now())

    if jurisdiction is not None:
        inst = Institution.objects.create(
            name="School",
            jurisdiction=jurisdiction,
            jurisdiction_source=JurisdictionSource.CONTRACT.value,
        )
        for user in (teacher, student):
            InstitutionMembership.objects.create(
                user=user,
                institution=inst,
                role=MembershipRole.STUDENT.value,
                status=MembershipStatus.ACTIVE.value,
            )
    return student, session


@override_settings(DEPLOYMENT_JURISDICTION="ru", POLICY_AUDIT_THROTTLE_SECONDS=0)
def test_eu_tenant_cannot_report_attention():
    """An EU institution's pupil is refused even on the RF circuit, and NOTHING is written.

    This is the art. 5(1)(f) line: the output would function as "attention", which cl. 255
    names as prohibited and cl. 248 forbids renaming out of. On-device processing does not
    cure it, so the ingress itself has to refuse.
    """
    student, session = _classroom(Jurisdiction.EU.value)

    with pytest.raises(PermissionDenied):
        seedum.record_attention(
            student, session_id=session.id, bucket_start=timezone.now(), avg_attention=88
        )

    assert AttentionMetric.objects.count() == 0, "a refused call must persist nothing"

    # …and the refusal is on the record. It survives because the gate runs before the write
    # transaction: inside it, the raise would roll the evidence back with the exception.
    # (That the ledger *cannot* hold a measurement is pinned structurally by
    # test_policy.test_audit_rows_carry_no_measurements — the schema, not a string scan.)
    row = PolicyDecisionLog.objects.get()
    assert row.feature == "cmf_attention"
    assert row.jurisdiction == Jurisdiction.EU.value
    assert row.allowed is False


@override_settings(DEPLOYMENT_JURISDICTION="ru")
def test_ru_tenant_still_reports_attention():
    """The other half of the guarantee: the RF profile is unchanged — same call, same row."""
    student, session = _classroom(Jurisdiction.RU.value)

    assert seedum.record_attention(
        student, session_id=session.id, bucket_start=timezone.now(), avg_attention=88
    )
    metric = AttentionMetric.objects.get()
    assert metric.avg_attention == 88
    assert PolicyDecisionLog.objects.count() == 0  # permitted calls are not logged


@override_settings(DEPLOYMENT_JURISDICTION="ru")
def test_b2c_pupil_without_an_institution_follows_the_circuit():
    """No institution means the deployment circuit decides — on the RF circuit, it works."""
    student, session = _classroom(None)
    assert seedum.record_attention(
        student, session_id=session.id, bucket_start=timezone.now(), avg_attention=71
    )
    assert AttentionMetric.objects.get().avg_attention == 71


@override_settings(DEPLOYMENT_JURISDICTION="eu")
def test_eu_circuit_blocks_attention_for_everyone():
    """Deploying into the EU circuit turns the feature off wholesale — the level-4 answer to
    "is it really disabled" is a deployment that cannot run it at all."""
    student, session = _classroom(None)
    with pytest.raises(PermissionDenied):
        seedum.record_attention(
            student, session_id=session.id, bucket_start=timezone.now(), avg_attention=50
        )
    assert AttentionMetric.objects.count() == 0
