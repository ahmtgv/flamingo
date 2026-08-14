"""Service-level tests for scheduling (lifecycle, attendance, permissions)."""

from datetime import date, timedelta

import jwt
import pytest
from django.conf import settings
from django.utils import timezone

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.scheduling import services as scheduling
from apps.scheduling.models import Attendance
from common.enums import Role, SessionStatus
from common.exceptions import PermissionDenied, ValidationError
from common.livekit import room_token

pytestmark = pytest.mark.django_db


def _student(email):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="С",
        last_name="Т",
        role=Role.STUDENT,
        birth_date=date(2008, 1, 1),
        consent_152fz=True,
    )


def _setup():
    teacher = accounts.register_user(
        email="t@e.com",
        password="strongpass1!",
        first_name="Т",
        last_name="П",
        role=Role.TEACHER,
        specialty="Математика",
    )
    student = _student("s@e.com")
    course = courses.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    section = courses.create_section(teacher, course.id, title="Раздел")
    lesson = courses.create_lesson(teacher, section.id, title="Урок", duration_min=30)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    courses.enroll(student, course.id)
    return teacher, student, course, lesson


def test_schedule_session_persists_group_within_institution():
    """A-drop-session-group: schedule_session persists a target group when it belongs to the
    course's institution; a group on a non-institutional course is rejected."""
    from apps.institutions import services as institutions
    from apps.institutions.models import InstitutionMembership
    from common.enums import MembershipRole, MembershipStatus

    teacher = accounts.register_user(
        email="sg.teacher@e.com",
        password="strongpass1!",
        first_name="Т",
        last_name="П",
        role=Role.TEACHER,
        specialty="Математика",
    )
    staff = accounts.register_user(
        email="sg.staff@e.com",
        password="strongpass1!",
        first_name="S",
        last_name="T",
        role=Role.ADMIN,
    )
    staff.is_staff = True
    staff.save(update_fields=["is_staff"])
    admin = accounts.register_user(
        email="sg.adm@e.com",
        password="strongpass1!",
        first_name="A",
        last_name="D",
        role=Role.ADMIN,
    )
    inst = institutions.create_institution(staff, name="Гимназия №3")
    institutions.add_admin(staff, institution_id=inst.id, admin_user_id=admin.id)
    group = institutions.create_group(admin, institution_id=inst.id, name="7А")
    InstitutionMembership.objects.create(
        user=teacher,
        institution=inst,
        role=MembershipRole.TEACHER.value,
        status=MembershipStatus.ACTIVE.value,
    )

    inst_course = courses.create_course(
        teacher,
        title="Институт-курс",
        subject="Математика",
        level="grade_7",
        institution_id=str(inst.id),
        group_id=str(group.id),
    )
    inst_section = courses.create_section(teacher, inst_course.id, title="Раздел")
    inst_lesson = courses.create_lesson(teacher, inst_section.id, title="Урок", duration_min=30)

    session = scheduling.schedule_session(
        teacher, lesson_id=inst_lesson.id, start_at=timezone.now(), group_id=str(group.id)
    )
    assert str(session.group_id) == str(group.id)

    # A B2C course (no institution) cannot bind a session to a group.
    b2c = courses.create_course(teacher, title="B2C", subject="Математика", level="grade_7")
    b2c_section = courses.create_section(teacher, b2c.id, title="Р")
    b2c_lesson = courses.create_lesson(teacher, b2c_section.id, title="У", duration_min=30)
    with pytest.raises(ValidationError):
        scheduling.schedule_session(
            teacher, lesson_id=b2c_lesson.id, start_at=timezone.now(), group_id=str(group.id)
        )


def test_schedule_requires_owner():
    teacher, student, course, lesson = _setup()
    with pytest.raises(PermissionDenied):
        scheduling.schedule_session(student, lesson_id=lesson.id, start_at=timezone.now())


def test_session_lifecycle_and_join():
    teacher, student, course, lesson = _setup()
    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())
    assert session.status == SessionStatus.SCHEDULED.value

    with pytest.raises(ValidationError):  # cannot join before it is live
        scheduling.join_session(student, session.id)

    scheduling.start_session(teacher, session.id)
    joined, token = scheduling.join_session(student, session.id)
    assert token
    assert Attendance.objects.filter(session=joined).count() == 1

    ended = scheduling.end_session(teacher, session.id)
    assert ended.status == SessionStatus.ENDED.value


def test_non_enrolled_cannot_join():
    teacher, _student_, course, lesson = _setup()
    outsider = _student("outsider@e.com")
    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())
    scheduling.start_session(teacher, session.id)
    with pytest.raises(PermissionDenied):
        scheduling.join_session(outsider, session.id)


def test_my_schedule_is_role_aware():
    teacher, student, course, lesson = _setup()
    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())
    frm = timezone.now() - timedelta(days=1)
    to = timezone.now() + timedelta(days=1)
    assert session in scheduling.my_schedule(teacher, frm, to)
    assert session in scheduling.my_schedule(student, frm, to)
    outsider = _student("out2@e.com")
    assert session not in scheduling.my_schedule(outsider, frm, to)


def test_room_token_only_when_live_for_participant():
    teacher, student, course, lesson = _setup()
    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())
    assert scheduling.room_token_for(student, session) is None  # scheduled, not live
    scheduling.start_session(teacher, session.id)
    session.refresh_from_db()
    assert scheduling.room_token_for(student, session)
    outsider = _student("out3@e.com")
    assert scheduling.room_token_for(outsider, session) is None


def test_room_token_is_a_valid_livekit_grant():
    """The minted JWT must carry a real LiveKit VideoGrant (so LiveKit Cloud accepts it).
    Decode with the same secret room_token signs with: the configured LIVEKIT_API_SECRET
    if present (real cloud project), else the SECRET_KEY dev fallback."""
    secret = settings.LIVEKIT.get("api_secret") or settings.SECRET_KEY
    token = room_token(identity="user-1", room="room-1")
    claims = jwt.decode(token, secret, algorithms=["HS256"])
    assert claims["sub"] == "user-1"  # participant identity
    assert claims["iss"]  # API key (project key in prod, 'devkey' in dev)
    grant = claims["video"]
    assert grant["room"] == "room-1"
    assert grant["roomJoin"] is True
    assert grant["canPublish"] is True
    assert grant["canSubscribe"] is True


def test_attendance_roster_is_teacher_only():
    """The roster (student names = PII) is readable ONLY by the course owner. A non-owner
    enrolled student — who CAN otherwise read the session — must not enumerate classmates."""
    teacher, student, course, lesson = _setup()
    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())
    scheduling.start_session(teacher, session.id)
    scheduling.join_session(student, session.id)  # creates an Attendance row
    assert Attendance.objects.filter(session=session).count() == 1

    # Owner (teacher) sees the roster…
    assert len(scheduling.attendance_for(teacher, session)) == 1
    # …but a non-owner enrolled student gets nothing (cannot enumerate names)…
    assert scheduling.attendance_for(student, session) == []
    # …and an anonymous viewer gets nothing.
    assert scheduling.attendance_for(None, session) == []


# --- A-C3: session participation == course access (one chokepoint) -----------
def test_pending_payment_enrollment_cannot_join():
    """A-C3 negative: an enrollment with access_status=pending_payment must NOT admit —
    the old _enrollment helper ignored access_status entirely."""
    from apps.courses.models import Enrollment
    from common.enums import AccessStatus

    teacher, student, course, lesson = _setup()
    session = scheduling.schedule_session(
        teacher, lesson_id=lesson.id, start_at=timezone.now() + timedelta(hours=1)
    )
    scheduling.start_session(teacher, session.id)

    Enrollment.objects.filter(student__user=student, course=course).update(
        access_status=AccessStatus.PENDING_PAYMENT.value
    )
    with pytest.raises(PermissionDenied):
        scheduling.join_session(student, session.id)
    # and no per-viewer roomToken either
    assert scheduling.room_token_for(student, session) is None


def test_group_delivered_student_joins_without_personal_enrollment():
    """A-C3 positive: institutional (group) delivery admits a student with NO personal
    enrollment — and records their attendance row."""
    from apps.institutions import services as institutions

    teacher, _, course, lesson = _setup()
    group_student = _student("group.kid@e.com")

    staff = accounts.register_user(
        email="staff.sched@e.com",
        password="strongpass1!",
        first_name="С",
        last_name="Т",
        role=Role.ADMIN,
    )
    staff.is_staff = True
    staff.save(update_fields=["is_staff"])
    admin = accounts.register_user(
        email="admin.sched@e.com",
        password="strongpass1!",
        first_name="А",
        last_name="Д",
        role=Role.ADMIN,
    )
    inst = institutions.create_institution(staff, name="Школа")
    institutions.add_admin(staff, institution_id=inst.id, admin_user_id=admin.id)
    group = institutions.create_group(admin, institution_id=inst.id, name="7А")
    institutions.add_students_to_group(admin, group.id, [group_student.id])
    course.group = group
    course.save(update_fields=["group"])

    session = scheduling.schedule_session(
        teacher, lesson_id=lesson.id, start_at=timezone.now() + timedelta(hours=1)
    )
    scheduling.start_session(teacher, session.id)

    joined, token = scheduling.join_session(group_student, session.id)
    assert joined.id == session.id and token
    assert Attendance.objects.filter(session=session, student__user=group_student).exists()


def test_teacher_name_exposed_to_participant_via_session():
    """SDL hand-add LessonSession.teacherName: a session participant sees the course owner's
    display name (labels the teacher tile); a non-participant cannot reach the session at all
    (get_session gate), so the field is never exposed to outsiders."""
    from types import SimpleNamespace

    from django.contrib.auth.models import AnonymousUser

    from api.schema import schema

    teacher, student, course, lesson = _setup()
    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())
    scheduling.start_session(teacher, session.id)

    # service returns "Имя Фамилия" (registered as Т/П in _setup)
    session.refresh_from_db()
    assert scheduling.teacher_name_for(session) == "Т П"

    q = "query($id: ID!){ session(id: $id){ id teacherName } }"

    def ctx(u):
        return SimpleNamespace(request=SimpleNamespace(META={}, user=u or AnonymousUser()))

    # participant (the enrolled student) sees the name
    res = schema.execute_sync(
        q, variable_values={"id": str(session.id)}, context_value=ctx(student)
    )
    assert res.errors is None, res.errors
    assert res.data["session"]["teacherName"] == "Т П"

    # a non-participant cannot reach the session (existing get_session gate) → no name leak
    outsider = _student("tn.out@e.com")
    res = schema.execute_sync(
        q, variable_values={"id": str(session.id)}, context_value=ctx(outsider)
    )
    assert res.errors is None, res.errors
    assert res.data["session"] is None
