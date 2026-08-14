"""The pupil's mirror: what is copied, when, and what may never be (Р5.0-Б).

Owner decision 14.08 (OWNER_SCOPE §20.3). One rule draws the whole boundary and there are no
exceptions to it:

    **выдал классу — стало общим и появилось у ученика; не выдал — своё.**

So a summary mirrors when the teacher **sends** it, and only to the people who were in that
lesson. A homework mirrors when it has been **handed in or graded**. A teacher's programme, a
guide, an unshared board draft — nothing here can copy them, because there is no `MirrorKind`
they could be written under. That is the boundary as a type, not as a promise.

**Event-driven, never a batch.** «Зеркалирование по факту события (саммари собрано · работа
проверена · оценка выставлена), а не пакетной выгрузкой по расписанию.» Each `mirror_*` call
below sits on the write that just happened, so a pupil who refreshes a second later sees it.

**Text only.** CLAUDE.md §2.2 governs *both* places the data lives — a mirror is not a reason
to keep video, audio or a verbatim transcript, and it is not a media store either. Every
payload goes through `_text_only`, which refuses anything media-shaped rather than dropping
it quietly: silently discarding half a record is how a backup turns out to be useless on the
day it is needed.
"""

from __future__ import annotations

import datetime as dt

from django.utils import timezone

from common.enums import MirrorKind
from common.exceptions import PermissionDenied, ValidationError

from .models import MirroredRecord

#: Keys that must never appear in a mirrored payload. The same words `test_storage_policy.py`
#: greps the schema for — the mirror is held to the identical standard, deliberately.
FORBIDDEN_KEYS = ("recording", "transcript", "audio", "video", "file_key", "blob", "bytes")

#: A mirrored record is a record, not a document store. Anything longer than this is a sign
#: somebody started shipping content that belongs on the teacher's machine.
MAX_TEXT = 20_000


def _text_only(payload: dict) -> dict:
    """Refuse a payload that is not plain text. Raises rather than strips.

    Dropping an offending key quietly would leave a mirror that looks complete and is not —
    and the one day anybody reads a mirror is the day the original is gone.
    """
    for key, value in payload.items():
        lowered = str(key).lower()
        for banned in FORBIDDEN_KEYS:
            if banned in lowered:
                raise ValidationError(f"A mirrored record may not carry '{key}'")
        if isinstance(value, bytes):
            raise ValidationError(f"A mirrored record may not carry bytes ('{key}')")
        if isinstance(value, str) and len(value) > MAX_TEXT:
            raise ValidationError(f"A mirrored value is too long to be a record ('{key}')")
        if isinstance(value, dict):
            _text_only(value)
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    _text_only(item)
                elif isinstance(item, bytes):
                    raise ValidationError(f"A mirrored record may not carry bytes ('{key}')")
    return payload


def put(student, *, kind: MirrorKind, source_id, occurred_at: dt.datetime, payload: dict):
    """Write one record into a pupil's mirror. Idempotent per (student, kind, source).

    Re-mirroring an updated record (a work re-graded, a summary corrected) replaces the copy
    rather than adding a second — the mirror answers «what is true», not «what happened to
    the row».
    """
    _text_only(payload)
    row, _created = MirroredRecord.objects.update_or_create(
        student=student,
        kind=kind.value,
        source_id=source_id,
        defaults={"occurred_at": occurred_at or timezone.now(), "payload": payload},
    )
    return row


# --- the events that fill it ---------------------------------------------------------------


def mirror_summary(summary, items, students) -> int:
    """A sent summary reaches everyone who was in the lesson (§20.3).

    The chat section rides inside it, because that is where the lesson chat lives (§4.2 п.1)
    — the pupil keeps the conversation along with the record of the lesson, exactly as the
    summary screen shows it.

    A DRAFT never mirrors. «Не выдал — своё»: until the teacher sends it, the write-up is
    theirs and a pupil has no copy of it to keep.
    """
    if not summary.is_sent:
        return 0

    payload = {
        "sessionId": str(summary.session_id),
        "sentAt": summary.sent_at.isoformat() if summary.sent_at else None,
        "intro": summary.intro,
        "items": [
            {
                "section": item.section,
                "source": item.source,
                "atOffsetSec": item.at_offset_sec,
                "text": item.text,
                "authorName": (
                    f"{item.author.first_name} {item.author.last_name}".strip()
                    if item.author_id
                    else ""
                ),
            }
            for item in items
        ],
    }
    for student in students:
        put(
            student,
            kind=MirrorKind.SUMMARY,
            source_id=summary.id,
            occurred_at=summary.sent_at or timezone.now(),
            payload=payload,
        )
    return len(students)


def mirror_submission(submission) -> MirroredRecord:
    """A handed-in or graded work — «его работы, все попытки и пересдачи».

    Each attempt is its own `Submission` row and therefore its own mirrored record, which is
    what «все попытки» means: a retake does not overwrite the try before it.

    Attachments are named and not carried. The bytes live where the file lives, and a mirror
    that pretended to hold them would be a media store. ⚠️ Whether a pupil should also keep
    the FILES they submitted is a real question and not one this phase may answer on its own
    — it is in the report.
    """
    homework = submission.homework
    return put(
        submission.student,
        kind=MirrorKind.WORK,
        source_id=submission.id,
        occurred_at=submission.graded_at or submission.submitted_at or timezone.now(),
        payload={
            "homeworkTitle": homework.title,
            "homeworkId": str(homework.id),
            "attempt": submission.attempt,
            "status": submission.status,
            "text": submission.content_text,
            "score": submission.score,
            "comment": submission.comment,
            "attachmentNames": [f.name for f in submission.files.all()],
        },
    )


def mirror_achievement(earned) -> MirroredRecord:
    """A milestone — the child's own history, which nobody else's departure may erase."""
    return put(
        earned.student,
        kind=MirrorKind.ACHIEVEMENT,
        source_id=earned.id,
        occurred_at=earned.earned_at,
        payload={"key": earned.key},
    )


def mirror_message(message, student) -> MirroredRecord:
    """One message from a conversation this pupil is in (§4.2 п.3 / §20.3)."""
    sender = message.sender
    return put(
        student,
        kind=MirrorKind.CHAT,
        source_id=message.id,
        occurred_at=message.sent_at,
        payload={
            "channelId": str(message.channel_id),
            "senderName": f"{sender.first_name} {sender.last_name}".strip(),
            "text": message.text,
        },
    )


# --- reading it back ----------------------------------------------------------------------------


def my_mirror(user, *, kind: MirrorKind | None = None, limit: int = 100) -> list[MirroredRecord]:
    """The caller's own mirror, and only ever their own.

    The same per-resolver rule as everywhere else (§20.3): the query takes no student id, and
    somebody else's mirror is not reachable by asking nicely.
    """
    profile = getattr(user, "student_profile", None)
    if profile is None:
        raise PermissionDenied("A mirror belongs to a learner")
    rows = MirroredRecord.objects.filter(student=profile)
    if kind is not None:
        rows = rows.filter(kind=kind.value)
    return list(rows[: max(1, min(int(limit or 100), 500))])
