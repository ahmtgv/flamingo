"""Reading a group's meeting point, and deciding who may come in (Р5.0).

Everything here answers without the teacher's machine — that is the whole reason the app
exists. A pupil opening the link finds out when the lesson is and whether the host is up;
a stranger finds out that they are not in this group, with a way to ask; somebody holding an
old link finds out it was replaced rather than that it never existed.

**Presence is derived, not declared.** «Онлайн» means a paired machine sent a heartbeat
recently — see `HEARTBEAT_WINDOW`. Nothing sets a flag, because a flag survives a laptop
lid closing and a derived value does not.
"""

from __future__ import annotations

import datetime as dt
import secrets

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone

from apps.devices.models import Device
from apps.institutions.models import Group, GroupMembership
from apps.scheduling.models import LessonSession
from common.compliance.policy import require_feature
from common.enums import JoinDecision, MeetingAccessMode, SessionStatus
from common.exceptions import NotFound, PermissionDenied, ValidationError

from .capabilities import without_host
from .models import MeetingPoint, RetiredLink

FEATURE_MEETING_POINT = "meeting_point"

#: A machine is «в сети» if it checked in this recently. Generous enough to survive one
#: missed beat on a bad network, short enough that a closed lid stops looking online within
#: the time it takes a pupil to notice.
HEARTBEAT_WINDOW = dt.timedelta(minutes=2)

_SLUG_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789"
#: The code is read aloud; the slug is not. Different alphabets for different jobs.
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _new_slug() -> str:
    return "".join(secrets.choice(_SLUG_ALPHABET) for _ in range(10))


def _new_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))


# --- who owns a group's meeting point ------------------------------------------------------


def _teachers_of(group: Group):
    return [gt.teacher for gt in group.group_teachers.select_related("teacher__user")]


def is_teacher_of_group(user, group: Group) -> bool:
    uid = getattr(user, "id", None)
    return any(t.user_id == uid for t in _teachers_of(group))


def _require_group_teacher(user, group: Group) -> None:
    if not is_teacher_of_group(user, group):
        raise PermissionDenied("Only a teacher of this group manages its link")


def _group_or_404(group_id) -> Group:
    group = Group.objects.filter(id=group_id).prefetch_related("group_teachers").first()
    if group is None:
        raise NotFound("Group not found")
    return group


# --- the link -------------------------------------------------------------------------------


@transaction.atomic
def ensure_meeting_point(group: Group) -> MeetingPoint:
    """One per group, created on first need. Idempotent."""
    existing = MeetingPoint.objects.filter(group=group).first()
    if existing is not None:
        return existing
    for _ in range(10):
        slug, code = _new_slug(), _new_code()
        taken = (
            MeetingPoint.objects.filter(slug=slug).exists()
            or MeetingPoint.objects.filter(code=code).exists()
            or RetiredLink.objects.filter(slug=slug).exists()
        )
        if not taken:
            return MeetingPoint.objects.create(group=group, slug=slug, code=code)
    raise ValidationError("Could not allocate a meeting-point link")


def for_teacher(user, group_id) -> MeetingPoint:
    """The teacher's own view: the link, the code and the access mode."""
    group = _group_or_404(group_id)
    _require_group_teacher(user, group)
    require_feature(user, FEATURE_MEETING_POINT)
    return ensure_meeting_point(group)


@transaction.atomic
def set_access_mode(user, group_id, mode: str) -> MeetingPoint:
    group = _group_or_404(group_id)
    _require_group_teacher(user, group)
    try:
        MeetingAccessMode(mode)
    except ValueError as exc:
        raise ValidationError("Unknown access mode") from exc

    point = ensure_meeting_point(group)
    point.access_mode = mode
    point.save(update_fields=["access_mode", "updated_at"])
    return point


@transaction.atomic
def replace_link(user, group_id) -> MeetingPoint:
    """«Заменить ссылку» — the old one dies, and it is remembered so it can say so.

    Pupils of the group are unaffected on purpose (D3): they never needed the link, the
    lesson is in their timetable. Replacing is for the case where a link went somewhere it
    should not have.
    """
    group = _group_or_404(group_id)
    _require_group_teacher(user, group)
    point = ensure_meeting_point(group)

    RetiredLink.objects.create(
        meeting_point=point, slug=point.slug, code=point.code, retired_at=timezone.now()
    )
    for _ in range(10):
        slug, code = _new_slug(), _new_code()
        taken = (
            MeetingPoint.objects.filter(slug=slug).exists()
            or MeetingPoint.objects.filter(code=code).exists()
            or RetiredLink.objects.filter(slug=slug).exists()
        )
        if not taken:
            point.slug, point.code = slug, code
            point.save(update_fields=["slug", "code", "updated_at"])
            return point
    raise ValidationError("Could not allocate a meeting-point link")


# --- presence ---------------------------------------------------------------------------------


def host_online(group: Group, *, now: dt.datetime | None = None) -> bool:
    """Is any of this group's teachers' machines awake?

    Derived from the heartbeat rather than from a flag: a flag survives a lid closing and
    then tells a waiting pupil the lesson is about to start when it is not.
    """
    moment = now or timezone.now()
    owner_ids = [t.user_id for t in _teachers_of(group)]
    if not owner_ids:
        return False
    return Device.objects.filter(
        owner_id__in=owner_ids,
        revoked_at__isnull=True,
        last_seen_at__gte=moment - HEARTBEAT_WINDOW,
    ).exists()


def heartbeat(raw_token: str) -> tuple[Device, list[Group]]:
    """The app says it is alive. Returns the device and the groups whose watchers were told.

    Takes the machine key explicitly rather than through the auth header: the general header
    path belongs with the sidecar in Р5.2, when its shape is known, and inventing it now
    would mean changing `common/auth.py` for a caller that does not exist yet.
    """
    from apps.devices import services as devices

    device = devices.authenticate_device(raw_token)
    if device is None:
        raise NotFound("Device not found")
    devices.touch(device)

    groups = list(
        Group.objects.filter(group_teachers__teacher__user_id=device.owner_id)
        .prefetch_related("group_teachers")
        .distinct()
    )
    for group in groups:
        _broadcast_presence(group, online=True)
    return device, groups


def _broadcast_presence(group: Group, *, online: bool) -> None:
    point = MeetingPoint.objects.filter(group=group).first()
    if point is None:
        return
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(
        f"host_{point.slug}",
        {"type": "host.presence", "slug": point.slug, "online": online},
    )


# --- what the person holding a link sees ---------------------------------------------------------


def _next_session(group: Group) -> LessonSession | None:
    """The nearest lesson worth waiting for: the one running now, else the next scheduled."""
    live = (
        LessonSession.objects.filter(group=group, status=SessionStatus.LIVE.value)
        .select_related("lesson")
        .order_by("start_at")
        .first()
    )
    if live is not None:
        return live
    return (
        LessonSession.objects.filter(
            group=group,
            status=SessionStatus.SCHEDULED.value,
            start_at__gte=timezone.now() - dt.timedelta(hours=1),
        )
        .select_related("lesson")
        .order_by("start_at")
        .first()
    )


def decide(user, point: MeetingPoint) -> JoinDecision:
    """May this person come in by the link? D3's three modes, and nothing else."""
    mode = MeetingAccessMode(point.access_mode)
    profile = getattr(user, "student_profile", None)
    in_group = (
        profile is not None
        and GroupMembership.objects.filter(group=point.group, student=profile).exists()
    )

    if in_group or is_teacher_of_group(user, point.group):
        return JoinDecision.ALLOWED
    if mode is MeetingAccessMode.ANY_AUTHENTICATED:
        return JoinDecision.ALLOWED
    if mode is MeetingAccessMode.KNOCK:
        return JoinDecision.KNOCK_REQUIRED
    return JoinDecision.NOT_IN_GROUP


def view_by_slug(user, slug: str) -> dict:
    """Everything the arrival screen needs, answered WITHOUT the teacher's machine.

    A retired slug comes back as a view too, with `LINK_REPLACED` and nothing about the
    group: the person is told what happened, not shown a room they may not enter.
    """
    slug = (slug or "").strip().lower()
    point = MeetingPoint.objects.filter(slug=slug).select_related("group").first()

    if point is None:
        retired = RetiredLink.objects.filter(slug=slug).first()
        if retired is None:
            raise NotFound("Meeting point not found")
        return {
            "slug": slug,
            "decision": JoinDecision.LINK_REPLACED,
            "group_name": "",
            "teacher_name": "",
            "host_online": False,
            "next_session": None,
            "capabilities": without_host(),
        }

    group = point.group
    teachers = _teachers_of(group)
    teacher = teachers[0].user if teachers else None
    return {
        "slug": point.slug,
        "decision": decide(user, point),
        "group_name": group.name,
        "teacher_name": (
            f"{teacher.first_name} {teacher.last_name}".strip() if teacher is not None else ""
        ),
        "host_online": host_online(group),
        "next_session": _next_session(group),
        "capabilities": without_host(),
    }


def view_by_code(user, code: str) -> dict:
    """The same view, reached by the code somebody read out over the phone."""
    code = (code or "").strip().upper()
    point = MeetingPoint.objects.filter(code=code).first()
    if point is None:
        raise NotFound("Meeting point not found")
    return view_by_slug(user, point.slug)
