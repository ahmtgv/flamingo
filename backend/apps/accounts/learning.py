"""Learning profiles — the several educations that live inside ONE account.

Owner decision 2026-08-12 (OWNER_SCOPE §15, atlas sheet 00): the account is the core that
accumulates everything about a person; inside it sit separate learning contexts. A
schoolchild who also takes evening courses is a PUPIL (9А, Гимназия №1) *and* a CADET
(English A2) — different timetables, progress and teachers, one human being.

**No new entity.** PROMPT_13 R0.2 asks to check whether the existing relations already carry
this, and they do:

    PUPIL   ← INSTITUTION_MEMBERSHIP(role=STUDENT, status=ACTIVE)
              + GROUP_MEMBERSHIP for the class name
              + ENROLLMENT count in that institution's courses ("3 предмета")
    CADET   ← ENROLLMENT in a course with NO institution (self-paced)
    TEACHER ← INSTITUTION_MEMBERSHIP(role=TEACHER, status=ACTIVE)

So a profile is a *view* over data the platform already keeps, and the only thing worth
persisting is which one the person is currently in (``User.active_learning_profile``).
Storing a profile row instead would duplicate enrolment state and immediately risk drifting
out of sync with it.

The projection carries DATA, never display text: the UI composes "Ученик · 9А" from the kind
plus the group name through i18n, so nothing here hardcodes a Russian string.
"""

from __future__ import annotations

from dataclasses import dataclass

from common.enums import (
    EnrollmentStatus,
    LearningProfileKind,
    MembershipRole,
    MembershipStatus,
    Role,
)
from common.exceptions import NotFound


@dataclass(frozen=True)
class LearningProfile:
    """One learning context of an account. Derived, never stored."""

    id: str  # stable synthetic key: "<kind>:<uuid>"
    kind: LearningProfileKind
    institution_id: str | None = None
    institution_name: str | None = None
    group_name: str | None = None  # the class, e.g. "9А"
    course_id: str | None = None
    course_title: str | None = None
    course_count: int = 0  # subjects being studied in this context
    is_active: bool = False


def _key(kind: LearningProfileKind, obj_id) -> str:
    return f"{kind.value}:{obj_id}"


def _pupil_profiles(user, student_profile) -> list[LearningProfile]:
    """One profile per institution the user attends as a pupil."""
    from apps.courses.models import Enrollment
    from apps.institutions.models import GroupMembership, InstitutionMembership

    memberships = (
        InstitutionMembership.objects.filter(
            user=user,
            role=MembershipRole.STUDENT.value,
            status=MembershipStatus.ACTIVE.value,
        )
        .select_related("institution")
        .order_by("created_at", "id")
    )
    if not memberships:
        return []

    # The class the pupil sits in, per institution (a pupil belongs to one class per school).
    class_by_institution: dict[str, str] = {}
    if student_profile is not None:
        for group_name, institution_id in GroupMembership.objects.filter(
            student=student_profile
        ).values_list("group__name", "group__institution_id"):
            class_by_institution.setdefault(str(institution_id), group_name)

    # "N предметов" = the pupil's active enrolments in that institution's courses.
    subjects: dict[str, int] = {}
    if student_profile is not None:
        for institution_id in Enrollment.objects.filter(
            student=student_profile,
            status=EnrollmentStatus.ACTIVE.value,
            course__institution__isnull=False,
        ).values_list("course__institution_id", flat=True):
            key = str(institution_id)
            subjects[key] = subjects.get(key, 0) + 1

    profiles = []
    for membership in memberships:
        institution_id = str(membership.institution_id)
        profiles.append(
            LearningProfile(
                id=_key(LearningProfileKind.PUPIL, institution_id),
                kind=LearningProfileKind.PUPIL,
                institution_id=institution_id,
                institution_name=membership.institution.name,
                group_name=class_by_institution.get(institution_id),
                course_count=subjects.get(institution_id, 0),
            )
        )
    return profiles


def _cadet_profiles(student_profile) -> list[LearningProfile]:
    """One profile per standalone course: self-paced study that belongs to no institution."""
    from apps.courses.models import Enrollment

    if student_profile is None:
        return []
    enrolments = (
        Enrollment.objects.filter(
            student=student_profile,
            status=EnrollmentStatus.ACTIVE.value,
            course__institution__isnull=True,
        )
        .select_related("course")
        .order_by("created_at", "id")
    )
    return [
        LearningProfile(
            id=_key(LearningProfileKind.CADET, enrolment.course_id),
            kind=LearningProfileKind.CADET,
            course_id=str(enrolment.course_id),
            course_title=enrolment.course.title,
            course_count=1,
        )
        for enrolment in enrolments
    ]


def _teacher_profiles(user) -> list[LearningProfile]:
    from apps.institutions.models import InstitutionMembership

    memberships = (
        InstitutionMembership.objects.filter(
            user=user,
            role=MembershipRole.TEACHER.value,
            status=MembershipStatus.ACTIVE.value,
        )
        .select_related("institution")
        .order_by("created_at", "id")
    )
    return [
        LearningProfile(
            id=_key(LearningProfileKind.TEACHER, membership.institution_id),
            kind=LearningProfileKind.TEACHER,
            institution_id=str(membership.institution_id),
            institution_name=membership.institution.name,
        )
        for membership in memberships
    ]


def learning_profiles(user) -> list[LearningProfile]:
    """Every learning context of this account, with exactly one marked active.

    Self-scoped by construction: it only ever reads the caller's own memberships and
    enrolments, so there is no id to tamper with and nothing to leak about anyone else.
    """
    if user is None or not getattr(user, "is_authenticated", False):
        return []

    student_profile = getattr(user, "student_profile", None)
    profiles = [
        *_pupil_profiles(user, student_profile),
        *_cadet_profiles(student_profile),
        *_teacher_profiles(user),
    ]
    if not profiles:
        return []

    # An unset (or stale) choice falls back to the first profile rather than leaving the
    # account in no context at all — a person who left a school still lands somewhere.
    chosen = user.active_learning_profile or ""
    if chosen not in {profile.id for profile in profiles}:
        chosen = profiles[0].id
    return [profile if profile.id != chosen else _activated(profile) for profile in profiles]


def _activated(profile: LearningProfile) -> LearningProfile:
    return LearningProfile(**{**profile.__dict__, "is_active": True})


def active_learning_profile(user) -> LearningProfile | None:
    """The context the account is currently working in (None when it has no profiles)."""
    for profile in learning_profiles(user):
        if profile.is_active:
            return profile
    return None


def set_active_learning_profile(user, profile_id: str) -> LearningProfile:
    """Switch the account into one of ITS OWN profiles.

    The id is validated against the caller's projected profiles, so an id belonging to
    someone else's school or course cannot be pinned onto this account.
    """
    profiles = learning_profiles(user)
    match = next((profile for profile in profiles if profile.id == profile_id), None)
    if match is None:
        raise NotFound("No such learning profile for this account")

    if user.active_learning_profile != profile_id:
        user.active_learning_profile = profile_id
        user.save(update_fields=["active_learning_profile", "updated_at"])
    return _activated(match)


def default_kind_for(user) -> LearningProfileKind:
    """Fallback kind for an account with no memberships yet (a fresh B2C sign-up)."""
    return (
        LearningProfileKind.TEACHER
        if getattr(user, "role", None) == Role.TEACHER.value
        else LearningProfileKind.CADET
    )
