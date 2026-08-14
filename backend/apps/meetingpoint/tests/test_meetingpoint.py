"""The meeting point (Р5.0 — PROMPT_14, atlas D3).

The acceptance criterion of the phase, restated: **a pupil must be able to find out when
their lesson is while the teacher's laptop is off.** So the tests are mostly about what still
answers when nothing is running on the host — and about the one refusal that is deliberate:
materials do not, because they live on that laptop and pretending otherwise would mean
serving a stale copy nobody promised to keep fresh.
"""

import datetime as dt
from datetime import date

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.devices import services as devices
from apps.institutions.models import (
    Group,
    GroupMembership,
    GroupTeacher,
    Institution,
)
from apps.meetingpoint import services as mp
from apps.meetingpoint.capabilities import without_host
from apps.meetingpoint.models import MeetingPoint, RetiredLink
from apps.scheduling.models import LessonSession
from common.enums import (
    DevicePlatform,
    JoinDecision,
    Jurisdiction,
    JurisdictionSource,
    MeetingAccessMode,
    Role,
    SessionStatus,
)
from common.exceptions import NotFound, PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Люция",
        last_name="Валерьевна",
        role=Role.TEACHER,
        specialty="English",
    )


def make_pupil(email="p@example.com", first="Аня"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name=first,
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2010, 1, 1),
        consent_152fz=True,
    )


def a_group(teacher, pupils=()):
    school = Institution.objects.create(
        name="Гимназия №1",
        jurisdiction=Jurisdiction.RU.value,
        jurisdiction_source=JurisdictionSource.CONTRACT.value,
    )
    group = Group.objects.create(institution=school, name="7А")
    GroupTeacher.objects.create(group=group, teacher=teacher.teacher_profile, subject="English")
    for pupil in pupils:
        GroupMembership.objects.create(group=group, student=pupil.student_profile)
    return group


def a_lesson_session(teacher, group, *, minutes_ahead=120, status=SessionStatus.SCHEDULED):
    from apps.courses import services as courses

    course = courses.create_course(teacher, title="English A2", subject="Английский", level="adult")
    section = courses.create_section(teacher, course.id, title="Unit 4 · Travel")
    lesson = courses.create_lesson(teacher, section.id, title="Asking for directions")
    return LessonSession.objects.create(
        lesson=lesson,
        group=group,
        start_at=timezone.now() + dt.timedelta(minutes=minutes_ahead),
        status=status.value,
    )


def bring_host_online(teacher):
    row, secret = devices.request_pairing_code(
        device_name="MacBook", platform=DevicePlatform.MACOS.value
    )
    devices.confirm_pairing_code(teacher, row.code)
    _device, token = devices.claim_device_token(code=row.code, secret=secret)
    mp.heartbeat(token)
    return token


# --- the link belongs to the group ---------------------------------------------------------
def test_a_group_gets_one_permanent_link_and_a_code_beside_it():
    """D3: one link per GROUP, not per lesson — a fresh link every week is a mailout half
    the class loses."""
    teacher = make_teacher()
    group = a_group(teacher)

    first = mp.for_teacher(teacher, group.id)
    second = mp.for_teacher(teacher, group.id)

    assert first.id == second.id
    assert len(first.slug) == 10
    assert len(first.code) == 6
    assert MeetingPoint.objects.count() == 1


def test_the_code_reaches_the_same_place_as_the_link():
    """«Код тот же, что в ссылке» — for the people who would rather read it out loud."""
    teacher = make_teacher()
    group = a_group(teacher)
    point = mp.for_teacher(teacher, group.id)

    by_slug = mp.view_by_slug(teacher, point.slug)
    by_code = mp.view_by_code(teacher, point.code.lower())
    assert by_slug["slug"] == by_code["slug"]


def test_only_a_teacher_of_the_group_manages_its_link():
    ira, petr = make_teacher("a@example.com"), make_teacher("b@example.com")
    group = a_group(ira)

    with pytest.raises(PermissionDenied):
        mp.for_teacher(petr, group.id)
    with pytest.raises(PermissionDenied):
        mp.replace_link(petr, group.id)


# --- who may come in -------------------------------------------------------------------------
def test_a_pupil_of_the_group_is_let_in_whatever_the_mode():
    teacher = make_teacher()
    anya = make_pupil()
    group = a_group(teacher, [anya])
    point = mp.for_teacher(teacher, group.id)

    for mode in MeetingAccessMode:
        mp.set_access_mode(teacher, group.id, mode.value)
        point.refresh_from_db()
        assert mp.decide(anya, point) is JoinDecision.ALLOWED


def test_a_stranger_is_told_they_are_not_in_the_group_not_that_it_does_not_exist():
    """D3: «Посторонний со ссылкой увидит "вы не в этой группе" и кнопку "попросить
    доступ"» — a way forward, not a dead end."""
    teacher = make_teacher()
    outsider = make_pupil("far@example.com", "Чужой")
    group = a_group(teacher)
    point = mp.for_teacher(teacher, group.id)

    assert mp.decide(outsider, point) is JoinDecision.NOT_IN_GROUP
    view = mp.view_by_slug(outsider, point.slug)
    assert view["decision"] is JoinDecision.NOT_IN_GROUP
    # …and the wait screen still tells them whose lesson it is, so they can ask the right person.
    assert view["teacher_name"] == "Люция Валерьевна"


def test_the_open_mode_lets_any_signed_in_person_in():
    teacher = make_teacher()
    outsider = make_pupil("far@example.com", "Гость")
    group = a_group(teacher)
    mp.set_access_mode(teacher, group.id, MeetingAccessMode.ANY_AUTHENTICATED.value)
    point = MeetingPoint.objects.get(group=group)

    assert mp.decide(outsider, point) is JoinDecision.ALLOWED


def test_the_knock_mode_makes_a_stranger_knock():
    teacher = make_teacher()
    outsider = make_pupil("far@example.com", "Гость")
    group = a_group(teacher)
    mp.set_access_mode(teacher, group.id, MeetingAccessMode.KNOCK.value)
    point = MeetingPoint.objects.get(group=group)

    assert mp.decide(outsider, point) is JoinDecision.KNOCK_REQUIRED


def test_the_default_mode_is_the_sheets_default():
    """Owner §5.1 of PROMPT_14 is still open — this pins what we ship meanwhile so the answer
    is a one-line change and not a surprise."""
    teacher = make_teacher()
    group = a_group(teacher)
    assert mp.for_teacher(teacher, group.id).access_mode == MeetingAccessMode.GROUP_ONLY.value


def test_an_unknown_mode_is_refused():
    teacher = make_teacher()
    group = a_group(teacher)
    with pytest.raises(ValidationError):
        mp.set_access_mode(teacher, group.id, "everybody")


# --- replacing the link ---------------------------------------------------------------------------
def test_a_replaced_link_says_it_was_replaced_rather_than_that_it_never_existed():
    """«Эта ссылка больше не работает — преподаватель заменил ссылку группы». Answering
    «не найдено» would send a person hunting for a typo they did not make."""
    teacher = make_teacher()
    anya = make_pupil()
    group = a_group(teacher, [anya])
    old = mp.for_teacher(teacher, group.id).slug

    mp.replace_link(teacher, group.id)

    view = mp.view_by_slug(anya, old)
    assert view["decision"] is JoinDecision.LINK_REPLACED
    # And a dead link tells a stranger nothing about the group behind it.
    assert view["group_name"] == ""
    assert view["teacher_name"] == ""
    assert RetiredLink.objects.filter(slug=old).exists()


def test_the_new_link_works_and_pupils_of_the_group_never_needed_one():
    teacher = make_teacher()
    anya = make_pupil()
    group = a_group(teacher, [anya])
    mp.for_teacher(teacher, group.id)

    point = mp.replace_link(teacher, group.id)

    assert mp.view_by_slug(anya, point.slug)["decision"] is JoinDecision.ALLOWED


def test_a_link_that_never_existed_is_simply_not_found():
    teacher = make_teacher()
    with pytest.raises(NotFound):
        mp.view_by_slug(teacher, "nosuchlink")


# --- 🔴 the acceptance criterion: the host is off and the pupil is not stranded --------------------
def test_the_schedule_answers_while_the_teachers_machine_is_off():
    """This is the phase. A pupil opening the link at 17:59 finds out when the lesson is,
    from the server, with nothing running on the teacher's laptop."""
    teacher = make_teacher()
    anya = make_pupil()
    group = a_group(teacher, [anya])
    session = a_lesson_session(teacher, group)
    point = mp.for_teacher(teacher, group.id)

    view = mp.view_by_slug(anya, point.slug)

    assert view["host_online"] is False
    assert view["next_session"].id == session.id
    assert view["group_name"] == "7А"
    assert view["teacher_name"] == "Люция Валерьевна"


def test_what_survives_the_host_being_off_is_drawn_by_whose_data_it_is():
    """Owner decision 14.08 (§20.2/§20.3), pinned because the offline screen states it to a
    child: **a pupil's own** work, grades and summaries open always — from their mirror —
    while the **teacher's** guides, the live board and the room need their machine.

    An earlier version of this test said summaries were unavailable offline. That was the
    superseded acceptance line, and it is exactly the kind of thing that quietly becomes the
    product if nobody re-reads the decision.
    """
    caps = without_host()
    assert (caps.schedule, caps.chat, caps.homework) == (True, True, True)
    assert (caps.my_work, caps.my_grades, caps.my_summaries) == (True, True, True)
    assert (caps.lesson_materials, caps.live_board, caps.room) == (False, False, False)

    teacher = make_teacher()
    anya = make_pupil()
    group = a_group(teacher, [anya])
    point = mp.for_teacher(teacher, group.id)
    assert mp.view_by_slug(anya, point.slug)["capabilities"] is caps


def test_a_live_lesson_outranks_the_next_scheduled_one():
    """«Урок идёт, заходите» must win over «в четверг в 18:00»."""
    teacher = make_teacher()
    anya = make_pupil()
    group = a_group(teacher, [anya])
    a_lesson_session(teacher, group, minutes_ahead=2880)
    live = a_lesson_session(teacher, group, minutes_ahead=-10, status=SessionStatus.LIVE)
    point = mp.for_teacher(teacher, group.id)

    assert mp.view_by_slug(anya, point.slug)["next_session"].id == live.id


# --- presence ---------------------------------------------------------------------------------------
def test_presence_is_derived_from_a_heartbeat_not_from_a_flag():
    """A flag survives a lid closing and then tells a waiting pupil the lesson is about to
    start when it is not."""
    teacher = make_teacher()
    anya = make_pupil()
    group = a_group(teacher, [anya])
    point = mp.for_teacher(teacher, group.id)

    assert mp.view_by_slug(anya, point.slug)["host_online"] is False
    bring_host_online(teacher)
    assert mp.view_by_slug(anya, point.slug)["host_online"] is True


def test_a_machine_that_stopped_checking_in_stops_being_online():
    teacher = make_teacher()
    anya = make_pupil()
    group = a_group(teacher, [anya])
    point = mp.for_teacher(teacher, group.id)
    bring_host_online(teacher)

    from apps.devices.models import Device

    Device.objects.filter(owner=teacher).update(
        last_seen_at=timezone.now() - mp.HEARTBEAT_WINDOW - dt.timedelta(seconds=1)
    )
    assert mp.view_by_slug(anya, point.slug)["host_online"] is False


def test_a_revoked_machine_never_counts_as_the_host():
    teacher = make_teacher()
    anya = make_pupil()
    group = a_group(teacher, [anya])
    point = mp.for_teacher(teacher, group.id)
    bring_host_online(teacher)

    from apps.devices.models import Device

    device = Device.objects.get(owner=teacher)
    devices.revoke_device(teacher, device.id)
    assert mp.view_by_slug(anya, point.slug)["host_online"] is False


def test_a_heartbeat_needs_a_real_machine_key():
    with pytest.raises(NotFound):
        mp.heartbeat("not-a-key")


def test_a_heartbeat_from_a_revoked_machine_is_refused():
    teacher = make_teacher()
    a_group(teacher)
    token = bring_host_online(teacher)

    from apps.devices.models import Device

    devices.revoke_device(teacher, Device.objects.get(owner=teacher).id)
    with pytest.raises(NotFound):
        mp.heartbeat(token)


# --- Р5.6: список участников с состояниями (лист D3) ---------------------------------------
def test_the_participant_list_says_where_each_person_is():
    """Состояния листа D3 выводятся из признаков, а не выдумываются.

    «Не заходила ни разу» — сильное утверждение о ребёнке, и до Р5.6 его нечем было сделать
    правдой: отметки об открытии двери не существовало.
    """
    from apps.meetingpoint.models import MeetingVisit

    teacher = make_teacher()
    anya = make_pupil("anya@example.com", "Аня")
    petya = make_pupil("petya@example.com", "Петя")
    ira = make_pupil("ira@example.com", "Ира")
    group = a_group(teacher, [anya, petya, ira])
    point = mp.ensure_meeting_point(group)

    # Аня открыла ссылку только что — стоит у двери.
    MeetingVisit.objects.create(
        meeting_point=point, student=anya.student_profile, last_opened_at=timezone.now()
    )
    # Петя открывал вчера — приглашён, но сейчас не пришёл.
    MeetingVisit.objects.create(
        meeting_point=point,
        student=petya.student_profile,
        last_opened_at=timezone.now() - dt.timedelta(days=1),
    )
    # Ира не открывала ни разу — и это теперь факт, а не догадка.

    by_name = {row["name"]: row["state"] for row in mp.participants(teacher, group.id)}
    assert by_name["Аня Коваль"] == "at_the_door"
    assert by_name["Петя Коваль"] == "invited"
    assert by_name["Ира Коваль"] == "never_opened"


def test_only_the_groups_teacher_sees_who_came():
    """Кто из детей когда заходил — не общее знание."""
    teacher = make_teacher()
    stranger = make_teacher("other@example.com")
    pupil = make_pupil("p2@example.com", "Аня")
    group = a_group(teacher, [pupil])

    with pytest.raises(PermissionDenied):
        mp.participants(stranger, group.id)
    with pytest.raises(PermissionDenied):
        mp.participants(pupil, group.id)


def test_opening_the_door_is_remembered_so_the_teacher_can_see_it():
    """Отметка ставится там, где ученик и так оказывается — на странице ожидания."""
    from apps.meetingpoint.models import MeetingVisit

    teacher = make_teacher()
    pupil = make_pupil("p3@example.com", "Аня")
    group = a_group(teacher, [pupil])
    point = mp.ensure_meeting_point(group)

    assert not MeetingVisit.objects.filter(meeting_point=point).exists()
    mp.view_by_slug(pupil, point.slug)
    assert MeetingVisit.objects.filter(meeting_point=point, student=pupil.student_profile).exists()


def test_a_pupil_keeps_their_diary_boards_and_given_guides_without_the_host():
    """§20.5 расширил зеркало — обещание экрана «нет в сети» обязано было расшириться с ним.

    D3: «недоступна только живая доска и методички ЭТОГО урока». Выданное — уже у ученика.
    """
    from apps.meetingpoint.capabilities import without_host

    caps = without_host()
    assert (caps.my_diary, caps.my_boards, caps.my_materials) == (True, True, True)
    assert (caps.live_board, caps.lesson_materials, caps.room) == (False, False, False)
