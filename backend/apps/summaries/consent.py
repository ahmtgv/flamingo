"""May this person's speech be turned into a summary point?

Two gates, and both must say yes:

1. **The jurisdiction**, via the one PDP (`lesson_transcription` in ``matrix.json``). No
   country ``if`` lives here — this module asks, it does not decide.
2. **The speaker.** Consent is per speaker, not per lesson: the summary is read by the whole
   group, so a line derived from a child's speech needs *that child's* consent, and a minor's
   consent is not complete without their guardian's 152-FZ one.

A refusal is silent by design — the speaker is simply not a source. The summary still gets
assembled from the board, the test, the chat and the plan, and it says on its face that
speech points were left out (``LessonSummary.speech_omitted``) so nobody is left guessing why
a summary looks thin.
"""

from __future__ import annotations

from common.compliance.policy import is_feature_allowed
from common.enums import AgeBand, GuardianshipStatus, Role

FEATURE = "lesson_transcription"


def jurisdiction_allows_speech(subject) -> bool:
    """Whether this tenant's regime permits processing lesson speech at all."""
    return is_feature_allowed(subject, FEATURE).allowed


def _is_minor(user) -> bool:
    if getattr(user, "role", None) != Role.STUDENT.value:
        return False
    profile = getattr(user, "student_profile", None)
    if profile is None:
        return False
    return profile.age_band in (AgeBand.JUNIOR.value, AgeBand.TEEN.value)


def _guardian_consent_present(user) -> bool:
    from apps.accounts.models import Guardianship

    return Guardianship.objects.filter(
        child_user=user,
        status=GuardianshipStatus.ACTIVE.value,
        consent_152fz=True,
    ).exists()


def speaker_consented(user) -> bool:
    """The speaker's own consent (+ a guardian's, for a minor)."""
    if user is None or not getattr(user, "consent_speech", False):
        return False
    if _is_minor(user):
        return _guardian_consent_present(user)
    return True


def may_use_speech_of(user, *, tenant=None) -> bool:
    """The whole question, asked in one call. `tenant` defaults to the speaker themself."""
    return jurisdiction_allows_speech(tenant if tenant is not None else user) and speaker_consented(
        user
    )
