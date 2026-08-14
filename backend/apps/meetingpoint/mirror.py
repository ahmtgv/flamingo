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

**No LESSON media — but a child's work belongs to the child, whole** (owner decision 14.08,
OWNER_SCOPE §20.4.1). Those are two different rules and an earlier version of this module ran
them together, which is the mistake the owner corrected:

* the ban in CLAUDE.md §2.2 is on **lesson** video, **lesson** audio and the verbatim
  transcript. It governs both places the data lives and is not relaxed here;
* a file the pupil attached to their own work — an essay, a photo of a solution, a recording
  of themselves reading aloud — **is mirrored by content and opens always**, including after
  the teacher has left the platform. «Ну конечно ученик видит, это же логично.»

What keeps the two apart is provenance, not file type. The only attachments that reach a
mirror come from `SubmissionFile`, and a `SubmissionFile` was bound at hand-in through
`files.assert_caller_key(user, key, SUBMISSION)` — it is, by construction, this pupil's own
upload. A lesson recording has no route in: it does not exist anywhere in the product.

The size fence below is a fence against lesson media, **not economy** (§20.4.1). An essay or
a photo is megabytes; an hour of video is gigabytes.
"""

from __future__ import annotations

import datetime as dt

from django.utils import timezone

from common.enums import MirrorKind
from common.exceptions import NotFound, PermissionDenied, ValidationError

from .models import MirroredRecord

#: Keys that must never appear in a mirrored payload, whatever the kind. These name the
#: LESSON's media, which is forbidden in both storage points and has no route here anyway.
#:
#: `audio` and `video` are deliberately NOT on this list. They were, and that banned a child's
#: own recording of themselves reading aloud — the over-correction OWNER_SCOPE §20.4.1
#: identifies by name. The rule is «no LESSON media», not «no media».
FORBIDDEN_KEYS = ("recording", "transcript", "lesson_video", "lesson_audio")

#: A mirrored record is a record, not a document store — this bounds the TEXT of it.
MAX_TEXT = 20_000

#: Per attached file. A fence against lesson media, not economy (§20.4.1): an essay or a photo
#: of a solution is megabytes, an hour of video is gigabytes. A pupil's work passes; a
#: recording could not fit even if one existed to try.
MAX_ATTACHMENT_BYTES = 64 * 1024 * 1024


def _no_lesson_media(payload: dict) -> dict:
    """Refuse a payload that names the lesson's own media. Raises rather than strips.

    Dropping an offending key quietly would leave a mirror that looks complete and is not —
    and the one day anybody reads a mirror is the day the original is gone.

    Raw bytes are refused too, but for a different reason: a mirrored record is a record, and
    file CONTENT rides as an object key beside it (see `_attachments`), not inline in a JSON
    column where nothing can stream it.
    """
    for key, value in payload.items():
        lowered = str(key).lower()
        for banned in FORBIDDEN_KEYS:
            if banned in lowered:
                raise ValidationError(f"A mirrored record may not carry '{key}'")
        if isinstance(value, bytes):
            raise ValidationError(f"A mirrored record may not carry raw bytes ('{key}')")
        if isinstance(value, str) and len(value) > MAX_TEXT:
            raise ValidationError(f"A mirrored value is too long to be a record ('{key}')")
        if isinstance(value, dict):
            _no_lesson_media(value)
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    _no_lesson_media(item)
                elif isinstance(item, bytes):
                    raise ValidationError(f"A mirrored record may not carry raw bytes ('{key}')")
    return payload


def put(student, *, kind: MirrorKind, source_id, occurred_at: dt.datetime, payload: dict):
    """Write one record into a pupil's mirror. Idempotent per (student, kind, source).

    Re-mirroring an updated record (a work re-graded, a summary corrected) replaces the copy
    rather than adding a second — the mirror answers «what is true», not «what happened to
    the row».
    """
    _no_lesson_media(payload)
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


def _attachments(submission) -> list[dict]:
    """The pupil's own files, carried by CONTENT (§20.4.1).

    What travels is a name, a size and the object key — the bytes stay in object storage and
    the pupil opens them through their own presigned read (`mirrored_file_url`). Inlining them
    in a JSON column would mean a photo of a solution nothing can stream.

    Provenance is what makes this safe: a `SubmissionFile` was bound at hand-in through
    `files.assert_caller_key(user, key, SUBMISSION)`, so it is this child's own upload and
    cannot be anything else. The size fence is against lesson media, not economy.
    """
    from common import storage

    carried = []
    for row in submission.files.all():
        meta = storage.head(row.file_key)
        size = meta["size"] if meta else None
        if size is not None and size > MAX_ATTACHMENT_BYTES:
            # Refuse the one file, keep the record. A work whose essay is mirrored and whose
            # oversized attachment is not is still worth far more to a child than nothing.
            continue
        carried.append({"name": row.name, "objectKey": row.file_key, "sizeBytes": size})
    return carried


def _answers(submission) -> list[dict]:
    """One attempt = one record, with every answer inside it (§20.4.2).

    Owner's framing: «ученик получает документ, а не журнал событий». So a test hand-in is one
    mirrored row carrying what was asked, what was answered and whether it was right — not a
    row per keystroke.
    """
    from apps.exercises.models import Attempt, Exercise, ExerciseSet

    sets = list(ExerciseSet.objects.filter(homework_id=submission.homework_id))
    if not sets:
        return []
    exercises = list(Exercise.objects.filter(exercise_set__in=sets).order_by("order"))
    if not exercises:
        return []

    latest: dict[str, Attempt] = {}
    for attempt in Attempt.objects.filter(
        exercise__in=exercises, student=submission.student
    ).order_by("created_at"):
        latest[str(attempt.exercise_id)] = attempt

    answered = []
    for exercise in exercises:
        attempt = latest.get(str(exercise.id))
        if attempt is None:
            continue
        answered.append(
            {
                "question": str((exercise.prompt or {}).get("text", "")),
                "response": attempt.response,
                "isCorrect": attempt.is_correct,
                "score": attempt.score,
            }
        )
    return answered


def mirror_submission(submission) -> MirroredRecord:
    """A handed-in or graded work — «его работы, все попытки и пересдачи».

    **One attempt, one record** (§20.4.2). Each `Submission` row is one go at the work and
    becomes one mirrored document with every answer inside it; a retake sits beside it as a
    second document rather than overwriting the first. The promise «все попытки и пересдачи
    сохраняются» is kept in full, and the pupil still gets something they can read.

    The files they attached ride along by content (§20.4.1): «ну конечно ученик видит, это же
    логично».
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
            "attachments": _attachments(submission),
            "answers": _answers(submission),
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


def mirrored_file_url(user, *, record_id, object_key: str) -> str:
    """Open a file the pupil attached to their own work — always (§20.4.1).

    Authorised against the MIRROR and not against the submission: the submission may be gone
    with the teacher's account, which is the whole point. The key must be one this record
    actually carries, so a valid record id cannot be used to fish for other objects.
    """
    from common import storage

    profile = getattr(user, "student_profile", None)
    if profile is None:
        raise PermissionDenied("A mirror belongs to a learner")
    row = MirroredRecord.objects.filter(id=record_id, student=profile).first()
    if row is None:
        raise NotFound("Record not found")
    keys = {a.get("objectKey") for a in (row.payload or {}).get("attachments", [])}
    if object_key not in keys:
        raise NotFound("Record not found")
    return storage.presign_get(object_key)


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
