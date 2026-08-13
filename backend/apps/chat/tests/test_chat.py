"""Chat — channels, membership, safety (PROMPT_13 R2).

What is worth pinning: you can only write to people you share a group with, a conversation
you are not in is invisible rather than merely forbidden, a complaint is what opens a
pupil↔pupil conversation to a teacher, and every stricter mode is configuration rather than
a constant somebody shipped.
"""

from datetime import date

import pytest

from apps.accounts import services as accounts
from apps.chat import policy as chat_policy
from apps.chat import services as chat
from apps.chat.models import ChannelMembership, ChannelMessage, ChatReport, InstitutionChatSettings
from apps.courses import services as courses
from apps.institutions.models import (
    Group,
    GroupMembership,
    GroupTeacher,
    Institution,
    InstitutionMembership,
)
from common.enums import (
    ChannelKind,
    Jurisdiction,
    JurisdictionSource,
    MembershipRole,
    MembershipStatus,
    ReportStatus,
    Role,
)
from common.exceptions import NotFound, PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


# --- fixtures ----------------------------------------------------------------------------
def make_school(name="Гимназия №1", jurisdiction=Jurisdiction.RU):
    return Institution.objects.create(
        name=name,
        jurisdiction=jurisdiction.value,
        jurisdiction_source=JurisdictionSource.CONTRACT.value,
    )


def make_pupil(email, first="Аня"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name=first,
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2010, 1, 1),
    )


def make_teacher(email, first="Мария"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name=first,
        last_name="Петровна",
        role=Role.TEACHER,
        specialty="Астрономия",
    )


def join(school, user, role):
    InstitutionMembership.objects.get_or_create(
        user=user,
        institution=school,
        defaults={"role": role.value, "status": MembershipStatus.ACTIVE.value},
    )


def classroom(school, name="9А", pupils=(), teachers=()):
    group = Group.objects.create(institution=school, name=name)
    for pupil in pupils:
        GroupMembership.objects.create(group=group, student=pupil.student_profile)
        join(school, pupil, MembershipRole.STUDENT)
    for teacher in teachers:
        GroupTeacher.objects.create(
            group=group, teacher=teacher.teacher_profile, subject="Астрономия"
        )
        join(school, teacher, MembershipRole.TEACHER)
    return group


# --- the base rule: you write to your own people -----------------------------------------
def test_two_classmates_can_open_a_conversation():
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    classroom(school, pupils=[anya, boris])

    channel = chat.direct_channel(anya, boris.id)
    assert channel.kind == ChannelKind.PEER.value
    assert chat.is_member(boris, channel)


def test_a_stranger_cannot_be_written_to_at_all():
    """The base mode (§6.3): not only anti-bullying — it is the cheapest anti-spam rule."""
    school = make_school()
    anya = make_pupil("a@example.com")
    classroom(school, pupils=[anya])
    outsider = make_pupil("far@example.com", "Чужой")
    classroom(make_school("Другая школа"), name="7Б", pupils=[outsider])

    with pytest.raises(PermissionDenied):
        chat.direct_channel(anya, outsider.id)


def test_opening_the_same_conversation_twice_returns_the_same_one():
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    classroom(school, pupils=[anya, boris])

    first = chat.direct_channel(anya, boris.id)
    second = chat.direct_channel(boris, anya.id)
    assert first.id == second.id


def test_a_pupil_can_write_to_a_teacher_of_their_group():
    school = make_school()
    anya, maria = make_pupil("a@example.com"), make_teacher("t@example.com")
    classroom(school, pupils=[anya], teachers=[maria])

    channel = chat.direct_channel(anya, maria.id)
    assert channel.kind == ChannelKind.PUPIL_TEACHER.value


def test_the_subject_room_is_provisioned_from_the_group():
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    maria = make_teacher("t@example.com")
    group = classroom(school, pupils=[anya, boris], teachers=[maria])
    course = courses.create_course(
        maria,
        title="Астрономия",
        subject="Астрономия",
        level="grade_9",
        institution_id=school.id,
        group_id=group.id,
    )
    courses.publish_course(maria, course.id)

    channel = chat.subject_channel(anya, course.id)
    assert channel.kind == ChannelKind.SUBJECT_GROUP.value
    members = set(
        ChannelMembership.objects.filter(channel=channel).values_list("user_id", flat=True)
    )
    assert {anya.id, boris.id, maria.id} <= members


def test_the_staff_room_is_for_teachers_and_admins_only():
    school = make_school()
    maria = make_teacher("t@example.com")
    anya = make_pupil("a@example.com")
    classroom(school, pupils=[anya], teachers=[maria])

    staff = chat.staff_channel(maria, school.id)
    assert staff.kind == ChannelKind.STAFF_ROOM.value
    assert not chat.is_member(anya, staff)
    with pytest.raises(PermissionDenied):
        chat.staff_channel(anya, school.id)


# --- access: a conversation you are not in is invisible ----------------------------------
def test_someone_elses_conversation_is_not_readable_and_not_confirmed_to_exist():
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    vera = make_pupil("v@example.com", "Вера")
    classroom(school, pupils=[anya, boris, vera])
    channel = chat.direct_channel(anya, boris.id)

    # NotFound, not PermissionDenied: a refusal that confirms the conversation exists is
    # itself a leak about who is talking to whom.
    with pytest.raises(NotFound):
        chat.messages(vera, channel.id)
    with pytest.raises(NotFound):
        chat.send_message(vera, channel.id, "подслушиваю")


def test_a_teacher_cannot_read_an_unreported_pupil_conversation():
    """The base mode does NOT put every child under permanent observation."""
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    maria = make_teacher("t@example.com")
    classroom(school, pupils=[anya, boris], teachers=[maria])
    channel = chat.direct_channel(anya, boris.id)
    chat.send_message(anya, channel.id, "привет")

    assert chat.can_open_on_report(maria, channel) is False
    with pytest.raises(NotFound):
        chat.messages(maria, channel.id)


def test_a_complaint_is_what_opens_the_conversation_to_the_group_teacher():
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    maria = make_teacher("t@example.com")
    classroom(school, pupils=[anya, boris], teachers=[maria])
    channel = chat.direct_channel(anya, boris.id)
    chat.send_message(boris, channel.id, "обидное сообщение")

    chat.report_channel(anya, channel.id, reason="грубит")

    assert chat.can_open_on_report(maria, channel) is True
    assert [m.text for m in chat.messages(maria, channel.id)] == ["обидное сообщение"]
    # Reading a reported conversation is not joining it.
    with pytest.raises(PermissionDenied):
        chat.send_message(maria, channel.id, "я всё вижу")


def test_a_teacher_of_another_group_gets_nothing_even_with_an_open_complaint():
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    mine = make_teacher("t@example.com")
    other = make_teacher("t2@example.com", "Илья")
    classroom(school, pupils=[anya, boris], teachers=[mine])
    classroom(school, name="7Б", teachers=[other])
    channel = chat.direct_channel(anya, boris.id)
    chat.report_channel(anya, channel.id, reason="грубит")

    assert chat.can_open_on_report(other, channel) is False
    with pytest.raises(NotFound):
        chat.messages(other, channel.id)


def test_closing_a_complaint_closes_the_teachers_window_again():
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    maria = make_teacher("t@example.com")
    classroom(school, pupils=[anya, boris], teachers=[maria])
    channel = chat.direct_channel(anya, boris.id)
    report = chat.report_channel(anya, channel.id, reason="грубит")

    assert chat.can_open_on_report(maria, channel) is True
    chat.resolve_report(maria, report.id)
    assert ChatReport.objects.get(id=report.id).status == ReportStatus.REVIEWED.value
    assert chat.can_open_on_report(maria, channel) is False


def test_every_participant_can_complain_including_about_one_message():
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    classroom(school, pupils=[anya, boris])
    channel = chat.direct_channel(anya, boris.id)
    message = chat.send_message(boris, channel.id, "грубость")

    report = chat.report_channel(anya, channel.id, message_id=message.id, reason="вот это")
    assert report.message_id == message.id
    assert report.status == ReportStatus.OPEN.value


# --- messages, unread ---------------------------------------------------------------------
def test_unread_counts_everything_in_a_conversation_never_opened():
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    classroom(school, pupils=[anya, boris])
    channel = chat.direct_channel(anya, boris.id)
    for text in ("раз", "два", "три"):
        chat.send_message(boris, channel.id, text)

    assert chat.total_unread(anya) == 3
    # My own messages are never unread to me.
    assert chat.total_unread(boris) == 0

    chat.mark_read(anya, channel.id)
    assert chat.total_unread(anya) == 0


def test_an_empty_or_oversized_message_is_refused():
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    classroom(school, pupils=[anya, boris])
    channel = chat.direct_channel(anya, boris.id)

    with pytest.raises(ValidationError):
        chat.send_message(anya, channel.id, "   ")
    with pytest.raises(ValidationError):
        chat.send_message(anya, channel.id, "x" * (chat.MAX_MESSAGE_LENGTH + 1))


# --- safety strictness is configuration, never a constant ---------------------------------
def test_peer_chat_is_switched_off_by_the_jurisdiction_not_by_the_chat_module():
    """Same code, different matrix row: an EU school gets no pupil↔pupil channel, while its
    subject room and pupil↔teacher conversations keep working."""
    school = make_school("Europaschule", jurisdiction=Jurisdiction.EU)
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    maria = make_teacher("t@example.com")
    classroom(school, pupils=[anya, boris], teachers=[maria])

    assert chat.policy_for(anya).peer_chat is False
    with pytest.raises(PermissionDenied):
        chat.direct_channel(anya, boris.id)

    # Not a blanket switch-off: the teacher conversation is unaffected.
    assert chat.direct_channel(anya, maria.id).kind == ChannelKind.PUPIL_TEACHER.value


def test_an_institution_can_switch_direct_messages_off_without_touching_the_matrix():
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    classroom(school, pupils=[anya, boris])
    InstitutionChatSettings.objects.create(institution=school, direct_messages_enabled=False)

    assert chat.policy_for(anya, school).peer_direct_allowed is False
    with pytest.raises(PermissionDenied):
        chat.direct_channel(anya, boris.id)


def test_permanent_teacher_visibility_is_an_option_and_is_off_by_default():
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    maria = make_teacher("t@example.com")
    classroom(school, pupils=[anya, boris], teachers=[maria])
    channel = chat.direct_channel(anya, boris.id)

    assert chat.policy_for(maria, school).teacher_visible_always is False
    assert chat.can_open_on_report(maria, channel) is False

    InstitutionChatSettings.objects.create(institution=school, teacher_visible_always=True)
    assert chat.can_open_on_report(maria, channel) is True


def test_stopwords_come_from_the_institution_and_default_to_none():
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    classroom(school, pupils=[anya, boris])
    channel = chat.direct_channel(anya, boris.id)

    # Nothing is blocked until an institution says what to block.
    assert chat.send_message(anya, channel.id, "любое слово").text == "любое слово"

    InstitutionChatSettings.objects.create(institution=school, stopwords=["запрещёнка"])
    with pytest.raises(ValidationError):
        chat.send_message(anya, channel.id, "тут ЗАПРЕЩЁНКА внутри")


def test_an_unknown_jurisdiction_fails_closed_for_peer_chat(settings):
    """An institution with nothing on record inherits the deployment contour (§6.1). When the
    contour is undeclared too, nothing is known — and nothing known means denied, not
    "probably fine"."""
    from common.compliance.policy import DENIED_UNKNOWN_JURISDICTION

    settings.DEPLOYMENT_JURISDICTION = ""
    school = Institution.objects.create(name="Ничья школа")  # no jurisdiction on record
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    classroom(school, pupils=[anya, boris])

    policy = chat.policy_for(anya, school)
    assert policy.peer_chat is False
    assert policy.peer_chat_reason == DENIED_UNKNOWN_JURISDICTION
    with pytest.raises(PermissionDenied):
        chat.direct_channel(anya, boris.id)


def test_the_chat_module_contains_no_jurisdiction_branches():
    """The §6.3 engineering requirement, as a test rather than a promise.

    Adding a country must be an edit to matrix.json. If a country name (or the Jurisdiction
    enum) ever appears inside apps/chat, strictness has been re-implemented locally and the
    matrix has stopped being the single source of the rule.
    """
    import ast
    import re
    from pathlib import Path

    # Docstrings and comments are prose — this file's own docstring says "country" several
    # times. Only executable code is checked, so the guard cannot be satisfied by rewording.
    def code_of(source: str) -> str:
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Module | ast.ClassDef | ast.FunctionDef | ast.AsyncFunctionDef):
                body = node.body
                if (
                    body
                    and isinstance(body[0], ast.Expr)
                    and isinstance(body[0].value, ast.Constant)
                ):
                    if isinstance(body[0].value.value, str):
                        node.body = body[1:] or [ast.Pass()]
        return ast.unparse(tree)

    banned = re.compile(
        r"""Jurisdiction|jurisdiction\s*[=!]=|['"](?:ru|eu|RU|EU)['"]|\bcountry\b"""
    )
    root = Path(chat.__file__).parent
    offenders = []
    for path in sorted(root.rglob("*.py")):
        if "tests" in path.parts:
            continue
        for i, line in enumerate(code_of(path.read_text(encoding="utf-8")).splitlines(), start=1):
            if banned.search(line):
                offenders.append(f"{path.relative_to(root)} (code line {i}): {line.strip()}")
    assert offenders == [], "jurisdiction logic leaked into the chat module:\n" + "\n".join(
        offenders
    )


def test_peer_chat_is_registered_in_the_matrix_with_a_legal_basis():
    from common.compliance.policy import feature_spec

    spec = feature_spec(chat_policy.PEER_CHAT_FEATURE)
    assert spec is not None, "an unregistered feature would fail closed everywhere"
    assert spec["jurisdiction_policy"]["ru"] == "enabled"
    assert spec["jurisdiction_policy"]["eu"] == "disabled"
    assert spec["default_state"] == "disabled"
    assert spec["legal_basis_ref"]


# --- realtime ------------------------------------------------------------------------------
def test_a_sent_message_is_broadcast_to_the_channel_group(monkeypatch):
    sent = []

    class FakeLayer:
        async def group_send(self, group, message):
            sent.append((group, message))

    monkeypatch.setattr(chat, "get_channel_layer", lambda: FakeLayer())
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    classroom(school, pupils=[anya, boris])
    channel = chat.direct_channel(anya, boris.id)

    message = chat.send_message(anya, channel.id, "привет")
    ((group, payload),) = sent
    assert group == f"chat_{channel.id}"
    assert payload["type"] == "chat.message"
    assert payload["text"] == "привет"
    assert payload["id"] == str(message.id)


def test_messages_are_kept_this_is_the_storage_whitelist():
    """Chats are §4.2 п.3: they are stored, deliberately."""
    school = make_school()
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    classroom(school, pupils=[anya, boris])
    channel = chat.direct_channel(anya, boris.id)
    chat.send_message(anya, channel.id, "останется в истории")

    assert ChannelMessage.objects.filter(channel=channel).count() == 1
