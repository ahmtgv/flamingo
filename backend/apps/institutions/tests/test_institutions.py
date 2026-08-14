"""Service-level tests for the institutions domain (logic + admin-scoping boundaries)."""

from datetime import date

import pytest

from apps.accounts import services as accounts
from apps.institutions import services
from apps.institutions.models import InstitutionMembership
from common.enums import MembershipRole, MembershipStatus, Role
from common.exceptions import NotFound, PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


def make_admin(email="admin@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Алла",
        last_name="Админова",
        role=Role.ADMIN,
    )


def make_staff(email="staff@example.com"):
    user = make_admin(email)
    user.is_staff = True
    user.save(update_fields=["is_staff"])
    return user


def make_teacher(email="teacher@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Тимур",
        last_name="Учитель",
        role=Role.TEACHER,
        specialty="Математика",
    )


def make_student(email="student@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Стёпа",
        last_name="Ученик",
        role=Role.STUDENT,
        birth_date=date(2009, 1, 1),
        consent_152fz=True,
    )


def institution_with_admin(staff, admin, name="Школа №1"):
    inst = services.create_institution(staff, name=name)
    services.add_admin(staff, institution_id=inst.id, admin_user_id=admin.id)
    return inst


# --- onboarding / authorization ---------------------------------------------
def test_create_institution_requires_staff():
    nonstaff = make_admin("notstaff@example.com")
    with pytest.raises(PermissionDenied):
        services.create_institution(nonstaff, name="Пиратская школа")

    staff = make_staff()
    inst = services.create_institution(staff, name="Школа №1")
    assert inst.status == "active"
    assert inst.branding == {}


def test_admin_scoping_across_institutions():
    staff = make_staff()
    admin_a = make_admin("a@example.com")
    admin_b = make_admin("b@example.com")
    inst_a = institution_with_admin(staff, admin_a, "A")
    institution_with_admin(staff, admin_b, "B")

    # admin A manages A
    group_a = services.create_group(admin_a, institution_id=inst_a.id, name="7А")
    assert group_a.institution_id == inst_a.id
    # admin B cannot create a group in A, nor edit A's group
    with pytest.raises(PermissionDenied):
        services.create_group(admin_b, institution_id=inst_a.id, name="взлом")
    with pytest.raises(PermissionDenied):
        services.update_group(admin_b, group_a.id, name="взлом")


# --- memberships ------------------------------------------------------------
def test_membership_lifecycle():
    staff = make_staff()
    admin = make_admin()
    teacher = make_teacher()
    inst = institution_with_admin(staff, admin)

    membership = services.invite_member(
        admin, institution_id=inst.id, email=teacher.email, role=MembershipRole.TEACHER
    )
    assert membership.status == MembershipStatus.PENDING.value
    assert membership.joined_at is None

    activated = services.update_membership(admin, membership.id, status=MembershipStatus.ACTIVE)
    assert activated.status == MembershipStatus.ACTIVE.value
    assert activated.joined_at is not None

    assert services.remove_member(admin, membership.id) is True


def test_invite_unknown_email_raises():
    staff = make_staff()
    admin = make_admin()
    inst = institution_with_admin(staff, admin)
    with pytest.raises(NotFound):
        services.invite_member(
            admin, institution_id=inst.id, email="ghost@example.com", role=MembershipRole.TEACHER
        )


def test_cannot_remove_own_admin_membership():
    staff = make_staff()
    admin = make_admin()
    inst = institution_with_admin(staff, admin)
    own = InstitutionMembership.objects.get(user=admin, institution=inst)
    with pytest.raises(ValidationError):
        services.remove_member(admin, own.id)
    assert InstitutionMembership.objects.filter(id=own.id).exists()


def test_cannot_remove_last_active_admin():
    staff = make_staff()
    admin = make_admin()
    inst = institution_with_admin(staff, admin)
    own = InstitutionMembership.objects.get(user=admin, institution=inst)
    # even platform staff (a different caller) cannot orphan the institution
    with pytest.raises(ValidationError):
        services.remove_member(staff, own.id)
    assert InstitutionMembership.objects.filter(id=own.id).exists()


def test_remove_member_works_for_others_and_non_last_admin():
    staff = make_staff()
    admin_a = make_admin("a@example.com")
    admin_b = make_admin("b@example.com")
    inst = institution_with_admin(staff, admin_a)
    services.add_admin(staff, institution_id=inst.id, admin_user_id=admin_b.id)  # 2nd active admin
    teacher = make_teacher()
    membership = services.invite_member(
        admin_a, institution_id=inst.id, email=teacher.email, role=MembershipRole.TEACHER
    )

    # a normal member can be removed
    assert services.remove_member(admin_a, membership.id) is True
    # and a non-last admin can be removed (two active admins -> removing one is fine)
    b_membership = InstitutionMembership.objects.get(user=admin_b, institution=inst)
    assert services.remove_member(admin_a, b_membership.id) is True


# --- groups -----------------------------------------------------------------
def test_groups_students_and_teachers():
    staff = make_staff()
    admin = make_admin()
    s1 = make_student("s1@example.com")
    s2 = make_student("s2@example.com")
    teacher = make_teacher()
    inst = institution_with_admin(staff, admin)

    group = services.create_group(admin, institution_id=inst.id, name="7А", level="7")
    services.add_students_to_group(admin, group.id, [s1.id, s2.id])
    assert group.memberships.count() == 2

    services.remove_student_from_group(admin, group.id, s1.id)
    assert group.memberships.count() == 1

    gt = services.assign_teacher(admin, group.id, teacher.id, "Математика")
    assert gt.subject == "Математика"
    assert group.group_teachers.count() == 1
    # idempotent for the same (group, teacher, subject)
    services.assign_teacher(admin, group.id, teacher.id, "Математика")
    assert group.group_teachers.count() == 1


def test_add_unknown_student_raises():
    staff = make_staff()
    admin = make_admin()
    teacher = make_teacher()  # not a student
    inst = institution_with_admin(staff, admin)
    group = services.create_group(admin, institution_id=inst.id, name="7А")
    with pytest.raises(NotFound):
        services.add_students_to_group(admin, group.id, [teacher.id])


# --- queries (admin-scoped reads) -------------------------------------------
def test_queries_are_admin_scoped():
    staff = make_staff()
    admin = make_admin()
    outsider = make_student("out@example.com")
    inst = institution_with_admin(staff, admin)
    services.create_group(admin, institution_id=inst.id, name="7А")
    services.invite_member(
        admin, institution_id=inst.id, email=make_teacher().email, role=MembershipRole.TEACHER
    )

    # admin sees their institution + groups + members
    assert services.get_institution(admin, inst.id) is not None
    assert len(services.list_groups(admin, inst.id)) == 1
    teachers = services.institution_members(admin, inst.id, role=MembershipRole.TEACHER)
    assert len(teachers) == 1

    # an outsider sees nothing / is denied
    assert services.get_institution(outsider, inst.id) is None
    with pytest.raises(PermissionDenied):
        services.list_groups(outsider, inst.id)


# --- group roster scoping (A-C2: children PII per-resolver, like b2782ba) ----
def test_group_roster_scoped_to_own_admin_and_assigned_teacher():
    staff = make_staff()
    admin_a = make_admin("admin.a@example.com")
    admin_b = make_admin("admin.b@example.com")
    s1 = make_student("roster.s1@example.com")
    student_viewer = make_student("roster.viewer@example.com")
    assigned = make_teacher("roster.assigned@example.com")
    outsider_teacher = make_teacher("roster.outsider@example.com")

    inst_a = institution_with_admin(staff, admin_a)
    inst_b = services.create_institution(staff, name="Школа Б")
    services.add_admin(staff, institution_id=inst_b.id, admin_user_id=admin_b.id)

    group = services.create_group(admin_a, institution_id=inst_a.id, name="7А", level="7")
    services.add_students_to_group(admin_a, group.id, [s1.id])
    services.assign_teacher(admin_a, group.id, assigned.id, "Математика")

    # positive: own-institution admin and the ASSIGNED teacher see the roster
    assert [p.user.email for p in services.group_students_for(admin_a, group)] == [
        "roster.s1@example.com"
    ]
    assert len(services.group_teachers_for(admin_a, group)) == 1
    assert [p.user.email for p in services.group_students_for(assigned, group)] == [
        "roster.s1@example.com"
    ]

    # negative: an admin of ANOTHER institution, an unassigned teacher, a student,
    # and an anonymous caller all read [] (children PII never leaks)
    assert services.group_students_for(admin_b, group) == []
    assert services.group_teachers_for(admin_b, group) == []
    assert services.group_students_for(outsider_teacher, group) == []
    assert services.group_students_for(student_viewer, group) == []
    assert services.group_teachers_for(student_viewer, group) == []
    assert services.group_students_for(None, group) == []
