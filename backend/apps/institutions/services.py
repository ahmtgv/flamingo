"""Business logic for the institutions domain. Resolvers stay thin and call these.

Authorization (CLAUDE.md §5/§6): an admin manages **only their own institution**;
every mutation/query is scoped via :func:`_admin_for`. Onboarding is back-office
(MVP): platform staff create the institution and seed the first active admin
(:func:`add_admin`, not exposed via GraphQL); that admin then invites members
(pending → admin approves via :func:`update_membership`). Reviews live in the
future engagement app and are intentionally absent here.
"""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import StudentProfile, TeacherProfile, User
from common.enums import MembershipRole, MembershipStatus
from common.exceptions import NotFound, PermissionDenied

from .models import Group, GroupMembership, GroupTeacher, Institution, InstitutionMembership


def _val(x):
    """Accept either a (Strawberry) enum member or its raw value."""
    return x.value if hasattr(x, "value") else x


# --- permission helpers -----------------------------------------------------
def _require_staff(user) -> None:
    """Back-office (platform) only — institution creation/onboarding."""
    if not getattr(user, "is_staff", False):
        raise PermissionDenied("Only platform staff can do this")


def _get_institution(institution_id) -> Institution:
    institution = Institution.objects.filter(id=institution_id).first()
    if institution is None:
        raise NotFound("Institution not found")
    return institution


def _is_active_admin(user, institution) -> bool:
    user_id = getattr(user, "id", None)
    if user_id is None:
        return False
    return InstitutionMembership.objects.filter(
        user_id=user_id,
        institution=institution,
        role=MembershipRole.ADMIN.value,
        status=MembershipStatus.ACTIVE.value,
    ).exists()


def _admin_for(user, institution_id) -> Institution:
    """Return the institution if the caller may administer it (its active admin,
    or platform staff). Raises NotFound/PermissionDenied otherwise."""
    institution = _get_institution(institution_id)
    if getattr(user, "is_staff", False) or _is_active_admin(user, institution):
        return institution
    raise PermissionDenied("Not an admin of this institution")


def _admin_group(user, group_id) -> Group:
    group = Group.objects.filter(id=group_id).select_related("institution").first()
    if group is None:
        raise NotFound("Group not found")
    _admin_for(user, group.institution_id)
    return group


# --- onboarding (back-office; not exposed via GraphQL) -----------------------
@transaction.atomic
def add_admin(user, *, institution_id, admin_user_id) -> InstitutionMembership:
    """Seed an active admin for an institution. Bootstraps onboarding before any
    admin exists; staff-only."""
    _require_staff(user)
    institution = _get_institution(institution_id)
    admin = User.objects.filter(id=admin_user_id).first()
    if admin is None:
        raise NotFound("User not found")
    membership, _ = InstitutionMembership.objects.update_or_create(
        user=admin,
        institution=institution,
        defaults={
            "role": MembershipRole.ADMIN.value,
            "status": MembershipStatus.ACTIVE.value,
            "joined_at": timezone.now(),
        },
    )
    return membership


# --- institutions -----------------------------------------------------------
@transaction.atomic
def create_institution(
    user, *, name, address="", website="", subdomain=None, logo_key="", default_locale="ru"
) -> Institution:
    _require_staff(user)
    return Institution.objects.create(
        name=name,
        address=address or "",
        website=website or "",
        subdomain=subdomain or None,
        logo_key=logo_key or "",
        default_locale=default_locale or "ru",
    )


@transaction.atomic
def update_institution(user, institution_id, **fields) -> Institution:
    institution = _admin_for(user, institution_id)
    for key in ("name", "address", "website", "subdomain", "logo_key", "default_locale"):
        if fields.get(key) is not None:
            setattr(institution, key, fields[key])
    institution.save()
    return institution


def update_branding(user, institution_id, branding: dict) -> Institution:
    institution = _admin_for(user, institution_id)
    institution.branding = branding or {}
    institution.save(update_fields=["branding", "updated_at"])
    return institution


# --- memberships ------------------------------------------------------------
@transaction.atomic
def invite_member(user, *, institution_id, email, role, group_id=None) -> InstitutionMembership:
    institution = _admin_for(user, institution_id)
    invited = User.objects.filter(email=email).first()
    if invited is None:
        raise NotFound("No user with that email")
    role_val = _val(role)
    membership, created = InstitutionMembership.objects.get_or_create(
        user=invited, institution=institution, defaults={"role": role_val}
    )
    if not created:
        membership.role = role_val
        membership.save(update_fields=["role", "updated_at"])
    if group_id is not None and role_val == MembershipRole.STUDENT.value:
        group = _admin_group(user, group_id)
        profile = StudentProfile.objects.filter(user=invited).first()
        if profile is not None:
            GroupMembership.objects.get_or_create(group=group, student=profile)
    return membership


@transaction.atomic
def update_membership(user, membership_id, *, role=None, status=None) -> InstitutionMembership:
    membership = (
        InstitutionMembership.objects.filter(id=membership_id).select_related("institution").first()
    )
    if membership is None:
        raise NotFound("Membership not found")
    _admin_for(user, membership.institution_id)
    if role is not None:
        membership.role = _val(role)
    if status is not None:
        new_status = _val(status)
        membership.status = new_status
        if new_status == MembershipStatus.ACTIVE.value and membership.joined_at is None:
            membership.joined_at = timezone.now()
    membership.save()
    return membership


def remove_member(user, membership_id) -> bool:
    membership = (
        InstitutionMembership.objects.filter(id=membership_id).select_related("institution").first()
    )
    if membership is None:
        raise NotFound("Membership not found")
    _admin_for(user, membership.institution_id)
    membership.delete()
    return True


# --- groups -----------------------------------------------------------------
@transaction.atomic
def create_group(user, *, institution_id, name, level="") -> Group:
    institution = _admin_for(user, institution_id)
    return Group.objects.create(institution=institution, name=name, level=level or "")


@transaction.atomic
def update_group(user, group_id, *, name=None, level=None) -> Group:
    group = _admin_group(user, group_id)
    if name is not None:
        group.name = name
    if level is not None:
        group.level = level
    group.save()
    return group


@transaction.atomic
def add_students_to_group(user, group_id, student_ids) -> Group:
    group = _admin_group(user, group_id)
    for sid in student_ids:
        profile = StudentProfile.objects.filter(user_id=sid).first()
        if profile is None:
            raise NotFound("Student not found")
        GroupMembership.objects.get_or_create(group=group, student=profile)
    return group


@transaction.atomic
def remove_student_from_group(user, group_id, student_id) -> Group:
    group = _admin_group(user, group_id)
    GroupMembership.objects.filter(group=group, student_id=student_id).delete()
    return group


@transaction.atomic
def assign_teacher(user, group_id, teacher_id, subject) -> GroupTeacher:
    group = _admin_group(user, group_id)
    teacher = TeacherProfile.objects.filter(user_id=teacher_id).first()
    if teacher is None:
        raise NotFound("Teacher not found")
    group_teacher, _ = GroupTeacher.objects.get_or_create(
        group=group, teacher=teacher, subject=subject
    )
    return group_teacher


# --- queries ----------------------------------------------------------------
def get_institution(user, institution_id) -> Institution | None:
    institution = Institution.objects.filter(id=institution_id).first()
    if institution is None:
        return None
    if getattr(user, "is_staff", False) or _is_active_admin(user, institution):
        return institution
    return None


def list_groups(user, institution_id) -> list[Group]:
    institution = _admin_for(user, institution_id)
    return list(Group.objects.filter(institution=institution).order_by("name"))


def get_group(user, group_id) -> Group | None:
    group = Group.objects.filter(id=group_id).select_related("institution").first()
    if group is None:
        return None
    if getattr(user, "is_staff", False) or _is_active_admin(user, group.institution):
        return group
    return None


def institution_members(user, institution_id, role=None) -> list[InstitutionMembership]:
    institution = _admin_for(user, institution_id)
    qs = InstitutionMembership.objects.filter(institution=institution).select_related("user")
    if role is not None:
        qs = qs.filter(role=_val(role))
    return list(qs)
