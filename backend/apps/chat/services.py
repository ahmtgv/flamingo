"""Chat services: who may talk to whom, and what happens when they do.

**Owner decision 2026-08-13 (§6.3): the platform is open by default.** Writing to another
person needs nothing but their id — no shared group, no allow-list — and NOBODY gets to read
a conversation they are not in. Not a teacher, not an administrator. Restrictions exist only
as switched-off mechanisms (the jurisdiction matrix, `InstitutionChatSettings`) to be turned
on region by region when we actually know a region's law. Guessing at somebody else's law in
advance is what this decision rejects.

Access is membership, and that is now the whole of it. `_channel_or_deny` is the single
chokepoint; a channel the caller is not in comes back as NotFound rather than
PermissionDenied, so a probe cannot enumerate other people's conversations.

«Пожаловаться» stays, and it is the opposite of a restriction: it records a signal for US.
It grants no third party access to anything.
"""

from __future__ import annotations

import datetime as dt

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import Count, F, Q, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from common.enums import ChannelKind, MembershipRole, MembershipStatus, ReportStatus, Role
from common.exceptions import NotFound, PermissionDenied, ValidationError

from .models import ChannelMembership, ChannelMessage, ChatChannel, ChatReport
from .policy import ChatPolicy, blocked_by_stopword, resolve_policy

MAX_MESSAGE_LENGTH = 4000


# --- relations ---------------------------------------------------------------------------
def _student_profile(user):
    return getattr(user, "student_profile", None)


def _teacher_profile(user):
    return getattr(user, "teacher_profile", None)


def group_ids_of(user) -> set:
    """Every group this person belongs to — as a pupil or as its teacher."""
    from apps.institutions.models import GroupMembership, GroupTeacher

    student = _student_profile(user)
    teacher = _teacher_profile(user)
    ids = set()
    if student is not None:
        ids |= set(
            GroupMembership.objects.filter(student=student).values_list("group_id", flat=True)
        )
    if teacher is not None:
        ids |= set(GroupTeacher.objects.filter(teacher=teacher).values_list("group_id", flat=True))
    return ids


def institution_ids_of(user) -> set:
    from apps.institutions.models import InstitutionMembership

    return set(
        InstitutionMembership.objects.filter(
            user=user, status=MembershipStatus.ACTIVE.value
        ).values_list("institution_id", flat=True)
    )


def shares_a_group(user, other) -> bool:
    """Whether two people share a group.

    No longer a gate on writing (owner decision 2026-08-13) — kept because the channel LIST
    and future region-specific switches may still want to know, and deleting a true,
    used-elsewhere predicate to express a policy change would be the wrong tool.
    """
    mine = group_ids_of(user)
    return bool(mine and mine & group_ids_of(other))


def _primary_institution(user):
    from apps.institutions.models import Institution

    ids = institution_ids_of(user)
    return Institution.objects.filter(id__in=ids).first() if ids else None


def policy_for(user, institution=None) -> ChatPolicy:
    return resolve_policy(user, institution or _primary_institution(user))


# --- access ------------------------------------------------------------------------------
def is_member(user, channel: ChatChannel) -> bool:
    return ChannelMembership.objects.filter(channel=channel, user=user).exists()


def can_read_without_membership(user, channel: ChatChannel) -> bool:
    """Whether somebody outside a conversation may read it. Today: only if a region has
    explicitly switched permanent visibility on, which no region has.

    **A complaint no longer opens anything** (owner decision 2026-08-13). Filing one records a
    signal for us; it does not hand a third party someone else's conversation. Supervision is
    not the default — it is a mechanism waiting for a jurisdiction that actually requires it.
    """
    teacher = _teacher_profile(user)
    if teacher is None:
        return False
    from apps.institutions.models import GroupMembership, GroupTeacher

    institution = channel.institution or _primary_institution(user)
    if not policy_for(user, institution).teacher_visible_always:
        return False

    # Even with the switch on, a teacher only ever sees their OWN group's conversations.
    participants = ChannelMembership.objects.filter(channel=channel).values_list(
        "user_id", flat=True
    )
    taught_groups = set(
        GroupTeacher.objects.filter(teacher=teacher).values_list("group_id", flat=True)
    )
    if not taught_groups:
        return False
    return GroupMembership.objects.filter(
        student__user_id__in=list(participants), group_id__in=taught_groups
    ).exists()


def _channel_or_deny(user, channel_id) -> ChatChannel:
    """Load a channel the caller may actually see.

    A channel they are not in is NotFound, not PermissionDenied: a refusal that confirms the
    conversation exists is itself a leak about who is talking to whom.
    """
    channel = ChatChannel.objects.filter(id=channel_id).first()
    if channel is None:
        raise NotFound("Channel not found")
    if is_member(user, channel) or can_read_without_membership(user, channel):
        return channel
    raise NotFound("Channel not found")


# Общие чаты — те, где сидит больше двух человек. Личная переписка с преподавателем к ним не
# относится: у ограниченного человека разбирают дело, и отрезать его от собеседника, с которым
# это дело обсуждают, значило бы наказать вместо того, чтобы ограничить (лист D7).
SHARED_CHANNEL_KINDS = frozenset({ChannelKind.SUBJECT_GROUP.value, ChannelKind.STAFF_ROOM.value})


def _require_writer(user, channel: ChatChannel) -> None:
    """Being able to read a conversation is never permission to join it.

    🔴 §3-тер: сюда же подключено состояние учётной записи. Оно существовало с описанием
    «ограничен — входит и видит СВОЁ, но не ведёт занятий и **не пишет в общие чаты**», и
    вторая половина этого предложения не была написана в коде нигде: `may_write_to_shared_chats`
    не вызывался ни одной строкой продукта.
    """
    from apps.oversight.state import may_write_to_shared_chats

    if not is_member(user, channel):
        raise PermissionDenied("Not a member of this channel")
    if channel.kind in SHARED_CHANNEL_KINDS and not may_write_to_shared_chats(user):
        raise PermissionDenied(
            "Учётная запись ограничена: писать в общий чат нельзя. "
            "Личная переписка с преподавателем открыта."
        )


# --- provisioning ------------------------------------------------------------------------
def _pair_key(a, b) -> str:
    return ":".join(sorted([str(a), str(b)]))


def _sync_members(channel: ChatChannel, users) -> None:
    for user in users:
        if user is not None:
            ChannelMembership.objects.get_or_create(channel=channel, user=user)


@transaction.atomic
def subject_channel(user, course_id) -> ChatChannel:
    """The предмет × группа room. Provisioned on first open, membership from the group."""
    from apps.courses.access import can_access_course
    from apps.courses.models import Course
    from apps.institutions.models import GroupMembership, GroupTeacher

    course = Course.objects.filter(id=course_id).select_related("owner__user", "group").first()
    if course is None or not can_access_course(user, course):
        raise NotFound("Course not found")
    if course.group_id is None:
        # A self-paced course has no class behind it, so there is no room to open.
        raise NotFound("Course has no group")

    channel, _ = ChatChannel.objects.get_or_create(
        kind=ChannelKind.SUBJECT_GROUP.value,
        course=course,
        group_id=course.group_id,
        defaults={"institution_id": course.institution_id},
    )
    pupils = [
        m.student.user
        for m in GroupMembership.objects.filter(group_id=course.group_id).select_related(
            "student__user"
        )
    ]
    teachers = [
        t.teacher.user
        for t in GroupTeacher.objects.filter(group_id=course.group_id).select_related(
            "teacher__user"
        )
    ]
    _sync_members(channel, [*pupils, *teachers, course.owner.user])
    if not is_member(user, channel):
        raise NotFound("Channel not found")
    return channel


@transaction.atomic
def direct_channel(user, other_user_id) -> ChatChannel:
    """Open (or reopen) a one-to-one conversation with anybody on the platform.

    Open by default (owner decision 2026-08-13): no shared group is required. The only things
    that can stand in the way are the switched-off mechanisms — the jurisdiction matrix for
    pupil↔pupil, and an institution that has explicitly turned direct messages off. Neither
    is on anywhere today.
    """
    from apps.accounts.models import User

    other = User.objects.filter(id=other_user_id, is_active=True).first()
    if other is None or other.id == user.id:
        raise NotFound("User not found")

    both_learners = user.role == Role.STUDENT.value and other.role == Role.STUDENT.value
    institution = _primary_institution(user)
    policy = policy_for(user, institution)
    if both_learners and not policy.peer_direct_allowed:
        raise PermissionDenied("Direct messages between pupils are not available here")
    if not both_learners and not policy.direct_messages:
        raise PermissionDenied("Direct messages are switched off for this institution")

    kind = ChannelKind.PEER.value if both_learners else ChannelKind.PUPIL_TEACHER.value
    channel, _ = ChatChannel.objects.get_or_create(
        pair_key=_pair_key(user.id, other.id),
        defaults={"kind": kind, "institution": institution},
    )
    _sync_members(channel, [user, other])
    return channel


@transaction.atomic
def staff_channel(user, institution_id) -> ChatChannel:
    """Учительская: the institution's teachers and admins."""
    from apps.institutions.models import Institution, InstitutionMembership

    if institution_id not in institution_ids_of(user):
        raise NotFound("Institution not found")
    membership = InstitutionMembership.objects.filter(
        user=user, institution_id=institution_id, status=MembershipStatus.ACTIVE.value
    ).first()
    if membership is None or membership.role == MembershipRole.STUDENT.value:
        raise PermissionDenied("The staff room is for teachers and administrators")

    institution = Institution.objects.filter(id=institution_id).first()
    channel, _ = ChatChannel.objects.get_or_create(
        kind=ChannelKind.STAFF_ROOM.value,
        institution=institution,
        defaults={},
    )
    staff = [
        m.user
        for m in InstitutionMembership.objects.filter(
            institution=institution, status=MembershipStatus.ACTIVE.value
        )
        .exclude(role=MembershipRole.STUDENT.value)
        .select_related("user")
    ]
    _sync_members(channel, staff)
    return channel


# --- reads -------------------------------------------------------------------------------
def my_channels(user) -> list[ChatChannel]:
    """Every conversation the caller is in, busiest first."""
    return list(
        ChatChannel.objects.filter(memberships__user=user)
        .select_related("course", "group", "institution")
        .order_by("-last_message_at", "-created_at")
        .distinct()
    )


#: A channel nobody has opened yet must count as "everything unread", not "nothing unread",
#: so a NULL last_read_at is coalesced to the beginning of time rather than to now.
NEVER_READ = dt.datetime(1970, 1, 1, tzinfo=dt.UTC)


def unread_counts(user) -> dict[str, int]:
    """Unread per channel — what the bubble and the subject badge count.

    A person's own messages never count as unread to them.
    """
    rows = (
        ChannelMembership.objects.filter(user=user)
        .annotate(
            unread=Count(
                "channel__messages",
                filter=Q(
                    channel__messages__sent_at__gt=Coalesce(F("last_read_at"), Value(NEVER_READ))
                )
                & ~Q(channel__messages__sender=user),
            )
        )
        .values_list("channel_id", "unread")
    )
    return {str(channel_id): count for channel_id, count in rows}


def total_unread(user) -> int:
    return sum(unread_counts(user).values())


def messages(user, channel_id, limit: int = 100) -> list[ChannelMessage]:
    channel = _channel_or_deny(user, channel_id)
    rows = list(
        ChannelMessage.objects.filter(channel=channel)
        .select_related("sender")
        .order_by("-sent_at")[:limit]
    )
    return list(reversed(rows))


def last_messages(channel_ids) -> dict[str, ChannelMessage]:
    """The most recent message per channel — the preview line in the channel list."""
    latest: dict[str, ChannelMessage] = {}
    for message in (
        ChannelMessage.objects.filter(channel_id__in=list(channel_ids))
        .select_related("sender")
        .order_by("sent_at")
    ):
        latest[str(message.channel_id)] = message
    return latest


def participants(user, channel: ChatChannel):
    from apps.accounts.models import User

    ids = ChannelMembership.objects.filter(channel=channel).values_list("user_id", flat=True)
    return list(User.objects.filter(id__in=list(ids)))


# --- writes ------------------------------------------------------------------------------
def send_message(user, channel_id, text: str) -> ChannelMessage:
    channel = _channel_or_deny(user, channel_id)
    _require_writer(user, channel)

    text = (text or "").strip()
    if not text:
        raise ValidationError("Message is empty")
    if len(text) > MAX_MESSAGE_LENGTH:
        raise ValidationError("Message is too long")

    policy = policy_for(user, channel.institution)
    if channel.kind == ChannelKind.PEER.value and not policy.peer_chat:
        # The gate can close after a channel exists (a matrix change, a moved tenant).
        raise PermissionDenied("Peer chat is not available here")
    word = blocked_by_stopword(text, policy)
    if word is not None:
        raise ValidationError("Message contains a word this institution does not allow")

    message = ChannelMessage.objects.create(channel=channel, sender=user, text=text)
    ChatChannel.objects.filter(id=channel.id).update(last_message_at=message.sent_at)
    ChannelMembership.objects.filter(channel=channel, user=user).update(
        last_read_at=message.sent_at
    )
    _broadcast(message)
    return message


def mark_read(user, channel_id) -> ChatChannel:
    channel = _channel_or_deny(user, channel_id)
    _require_writer(user, channel)
    ChannelMembership.objects.filter(channel=channel, user=user).update(last_read_at=timezone.now())
    return channel


def report_channel(user, channel_id, *, message_id=None, reason: str = "") -> ChatReport:
    """«Пожаловаться» — available on every conversation, to every participant.

    This is feedback to US, not a key. Filing a complaint records the signal and grants
    nobody — teacher, administrator or anyone else — access to the conversation (owner
    decision 2026-08-13). Handling complaints is an operational process, not an automatic
    unlocking of someone's private messages.
    """
    channel = _channel_or_deny(user, channel_id)
    _require_writer(user, channel)
    message = None
    if message_id is not None:
        message = ChannelMessage.objects.filter(id=message_id, channel=channel).first()
        if message is None:
            raise NotFound("Message not found")
    return ChatReport.objects.create(
        channel=channel, message=message, reporter=user, reason=(reason or "").strip()
    )


def resolve_report(user, report_id, *, dismiss: bool = False) -> ChatReport:
    """Close a complaint. Only somebody who can already read the conversation can — which,
    with supervision off everywhere, means a participant of it."""
    report = ChatReport.objects.filter(id=report_id).select_related("channel").first()
    if report is None:
        raise NotFound("Report not found")
    if not (is_member(user, report.channel) or can_read_without_membership(user, report.channel)):
        raise NotFound("Report not found")
    report.status = ReportStatus.DISMISSED.value if dismiss else ReportStatus.REVIEWED.value
    report.reviewed_by = user
    report.reviewed_at = timezone.now()
    report.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
    return report


def open_reports(user) -> list[ChatReport]:
    """Complaints the caller can actually act on — i.e. on conversations they may already
    read. With supervision off everywhere, a complaint reaches us, not a teacher's queue."""
    rows = (
        ChatReport.objects.filter(status=ReportStatus.OPEN.value)
        .select_related("channel", "reporter")
        .order_by("-created_at")
    )
    return [
        r
        for r in rows
        if is_member(user, r.channel) or can_read_without_membership(user, r.channel)
    ]


# --- realtime ----------------------------------------------------------------------------
def _broadcast(message: ChannelMessage) -> None:
    """Push the message to the channel's live group (channelMessageReceived).

    Text only, to people already authorised on the socket — the subscription re-checks
    membership before it streams anything.
    """
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(
        f"chat_{message.channel_id}",
        {
            "type": "chat.message",
            "id": str(message.id),
            "channel_id": str(message.channel_id),
            "sender_id": str(message.sender_id),
            "sender_name": message.sender.formal_name,
            "text": message.text,
            "sent_at": message.sent_at.isoformat(),
        },
    )
