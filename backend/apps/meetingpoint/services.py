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
from common.enums import AttendanceStatus, JoinDecision, MeetingAccessMode, SessionStatus
from common.exceptions import NotFound, PermissionDenied, ValidationError

from .capabilities import without_host
from .models import MeetingPoint, MeetingVisit, RetiredLink

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
    """The app says it is alive, by key. Kept for callers that hold a raw key (tests, and the
    first-run flow before a session exists)."""
    from apps.devices import services as devices

    device = devices.authenticate_device(raw_token)
    if device is None:
        raise NotFound("Device not found")
    return heartbeat_for(device)


def heartbeat_for(device: Device) -> tuple[Device, list[Group]]:
    """The same, for a machine already resolved from `Authorization: Device <key>` (Р5.2)."""
    from apps.devices import services as devices

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

    # Р5.5-В п.2, лениво: страница ожидания — то место, где пропажу хоста замечают первой.
    # Планировщика нет и не заводим (Celery отложен, CLAUDE.md §5).
    close_abandoned_sessions()
    # Р5.6: и она же — единственное место, где видно, что ученик открывал дверь.
    _record_visit(user, point)

    group = point.group
    teachers = _teachers_of(group)
    teacher = teachers[0].user if teachers else None
    return {
        "slug": point.slug,
        "decision": decide(user, point),
        "group_name": group.name,
        "teacher_name": (teacher.formal_name if teacher is not None else ""),
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


# --- Р5.5-В п.2: занятие закрывается само -------------------------------------------------
#: Сколько молчит машина преподавателя, прежде чем занятие считается брошенным. Больше
#: HEARTBEAT_WINDOW на порядок: две минуты — это «крышку прикрыли и понесли в другую комнату»,
#: десять — «сегодня уже не вернутся».
#:
#: ⚠️ Отсчёт идёт **от планового конца занятия**, а не от любого момента урока. Иначе
#: преподаватель, отошедший за чаем на десятой минуте, обнаружил бы урок закрытым под собой —
#: молчащая машина посреди занятия и молчащая машина через час после него это разные события.
HOST_GONE_AFTER = dt.timedelta(minutes=10)

#: Если у урока не проставлена длительность, считаем занятие обычной академической парой.
#: Промахнуться в большую сторону здесь безопаснее: цена ошибки — занятие закроется позже,
#: а не закроется под живым преподавателем.
FALLBACK_LESSON_MINUTES = 45

#: «Открыла ссылку, ждёт» — насколько свежим должно быть открытие, чтобы человек считался
#: стоящим у двери, а не просто когда-то приглашённым.
AT_THE_DOOR_WINDOW = dt.timedelta(minutes=30)


def close_abandoned_sessions(*, now: dt.datetime | None = None) -> list:
    """Закрыть занятия, у которых пропал хост, и написать дневник (Р5.5-В п.2).

    🔴 Дыра, которую это чинит: дневник писался только на «Завершить». Преподаватель закрыл
    ноутбук — и занятия для ученика не было вовсе: ни посещаемости, ни строки в дневнике.
    Точка встречи видит presence, поэтому закрыть занятие может именно она.

    **Ничего не выдумываем.** `end_at` — последний известный признак жизни машины, а не «сейчас»:
    сколько занятие шло на самом деле, мы не знаем и знать не можем. Присутствие — те записи,
    что успели появиться. Пометка `closed_automatically` едет в дневник ученика словами, потому
    что «занятие длилось 40 минут» и «занятие оборвалось» — разные факты, и второй честнее.

    Вызывается лениво — со страницы ожидания ученика и из heartbeat, — потому что Celery
    отложен решением (CLAUDE.md §5), и заводить планировщик ради одного правила дороже.
    """
    from apps.scheduling.models import LessonSession

    moment = now or timezone.now()
    closed = []
    live = LessonSession.objects.filter(status=SessionStatus.LIVE.value).select_related(
        "lesson__section__course__owner"
    )
    for session in live:
        owner_id = session.lesson.section.course.owner_id
        last_seen = (
            Device.objects.filter(owner_id=owner_id, revoked_at__isnull=True)
            .order_by("-last_seen_at")
            .values_list("last_seen_at", flat=True)
            .first()
        )
        if last_seen is None:
            # У преподавателя вообще нет связанной машины — значит занятие идёт не с рабочего
            # стола, а по серверному контуру, который остаётся запасным путём (PROMPT_14 §6).
            # Закрывать его по отсутствию heartbeat означало бы гасить урок, который идёт.
            continue

        # 🔴 Тишина считается ПОСЛЕ планового конца. Занятие, которое ещё идёт по расписанию,
        # не закрывается, сколько бы машина ни молчала: преподаватель мог отойти, а ученики —
        # остаться в комнате. Отсчёт начинается с того, что случилось позже: конец по
        # расписанию или последний признак жизни.
        scheduled_end = session.start_at + dt.timedelta(minutes=_planned_minutes(session))
        silence_from = max(last_seen, scheduled_end)
        if moment - silence_from < HOST_GONE_AFTER:
            continue

        session.status = SessionStatus.ENDED.value
        # То, что известно: машина в последний раз давала о себе знать тогда-то. «Сейчас» —
        # это выдуманная длительность, а её мы не пишем.
        session.end_at = last_seen
        session.closed_automatically = True
        session.save(update_fields=["status", "end_at", "closed_automatically", "updated_at"])
        _write_the_diary(session)
        closed.append(session)
    return closed


def _planned_minutes(session) -> int:
    """Сколько занятие должно было идти по расписанию."""
    minutes = getattr(session.lesson, "duration_min", None)
    return int(minutes) if minutes else FALLBACK_LESSON_MINUTES


def _write_the_diary(session) -> None:
    """Дневник за брошенное занятие. Тот же вид, что и у завершённого рукой."""
    from apps.scheduling.services import mirror_the_diary

    try:
        mirror_the_diary(session)
    except Exception:  # noqa: BLE001 — занятие закрыто; копия — лучшее усилие
        pass


# --- Р5.6: список участников с состояниями (лист D3) ---------------------------------------
def _record_visit(user, point: MeetingPoint) -> None:
    """Отметить, что ученик открывал дверь. Молча — это не действие пользователя."""
    profile = getattr(user, "student_profile", None)
    if profile is None:
        return
    MeetingVisit.objects.update_or_create(
        meeting_point=point, student=profile, defaults={"last_opened_at": timezone.now()}
    )


def participants(user, group_id) -> list[dict]:
    """Кто где — для панели преподавателя (лист D3, «Участники · 8»).

    Состояния листа и то, из чего каждое выводится. Ни одно не выдумано: где признака нет,
    там и состояния нет.

    * **в комнате** — есть запись присутствия на идущем занятии;
    * **только звук** — то же, но человек вошёл без камеры (D3: «вход с телефона · камеры нет»);
    * **у двери** — открывал ссылку недавно, но в комнату не вошёл: «открыла ссылку, ждёт»;
    * **приглашён** — открывал ссылку когда-то раньше;
    * **не заходил** — ссылка не открывалась ни разу.

    Только преподаватель группы: кто из детей когда заходил — не общее знание.
    """
    from apps.scheduling.models import Attendance, LessonSession

    group = _group_or_404(group_id)
    _require_group_teacher(user, group)
    point = ensure_meeting_point(group)

    live = (
        LessonSession.objects.filter(group=group, status=SessionStatus.LIVE.value)
        .order_by("-start_at")
        .first()
    )
    present = {}
    if live is not None:
        present = {
            str(a.student_id): a
            for a in Attendance.objects.filter(session=live, status=AttendanceStatus.PRESENT.value)
        }
    visited = {
        str(v.student_id): v.last_opened_at
        for v in MeetingVisit.objects.filter(meeting_point=point)
    }

    now = timezone.now()
    rows = []
    for membership in group.memberships.select_related("student__user"):
        student = membership.student
        key = str(student.pk)
        user_row = student.user
        # Полоса участников — узкая: «Имя Ф.» помещается, «Имя Фамилия» обрезается.
        name = user_row.short_name
        attendance = present.get(key)
        opened = visited.get(key)

        if attendance is not None:
            state = "in_room"
            since = attendance.joined_at
        elif opened is not None and now - opened <= AT_THE_DOOR_WINDOW:
            state = "at_the_door"
            since = opened
        elif opened is not None:
            state = "invited"
            since = opened
        else:
            state = "never_opened"
            since = None
        rows.append({"student_id": key, "name": name, "state": state, "since": since})
    return rows
