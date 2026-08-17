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
from django.utils.text import get_valid_filename

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

#: Mirrored files live under the PUPIL's own prefix. Not the teacher's — a key under theirs
#: disappears with them, on exactly the day the mirror is supposed to matter.
MIRROR_PREFIX = "mirror"


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
                "authorName": (item.author.formal_name if item.author_id else ""),
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


def mirror_key(student_id, submission_id, name: str) -> str:
    """Where a mirrored file lives: in the PUPIL's namespace, never the teacher's.

    That is the difference between a copy and a pointer. A key under the teacher's prefix goes
    away with the teacher — which is the exact day §20.3 says the file must still open.
    """
    safe = get_valid_filename(name) or "file"
    return f"{MIRROR_PREFIX}/{student_id}/{submission_id}/{safe}"


def _attachments(submission) -> list[dict]:
    """The pupil's own files, **physically copied** into the meeting point's storage.

    🔴 PROMPT_14 Р5.2, the red debt. Until now the mirror recorded the ORIGINAL object key,
    which works exactly as long as the file sits in shared storage. Once the cabinet moves to
    the teacher's laptop that key points at *their computer*, and the promise «ученик откроет
    свою работу всегда» breaks in the worst possible way: the record is there and the file
    does not open. So the bytes are copied, into a key under the pupil's own namespace, and
    the mirror never refers to anything the teacher owns.

    Provenance is what keeps it safe: a `SubmissionFile` was bound at hand-in through
    `files.assert_caller_key(user, key, SUBMISSION)`, so it is this child's own upload and
    cannot be anything else. The size fence is against lesson media, not economy (§20.4.1).
    """
    from common import storage

    carried = []
    for row in submission.files.all():
        meta = storage.head(row.file_key)
        size = meta["size"] if meta else None
        if size is not None and size > MAX_ATTACHMENT_BYTES:
            # Leave out the one file, keep the record. A work whose essay is mirrored and
            # whose one impossible attachment is not is worth far more than nothing.
            continue
        destination = mirror_key(submission.student_id, submission.id, row.name)
        if not storage.copy(row.file_key, destination):
            # The source is not there. Record the work without it rather than losing both —
            # and do not record a key that resolves to nothing, which is the very failure
            # this copy exists to prevent.
            continue
        carried.append({"name": row.name, "objectKey": destination, "sizeBytes": size})
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
            "senderName": sender.formal_name,
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
    if object_key not in _object_keys(row.payload or {}):
        raise NotFound("Record not found")
    return storage.presign_get(object_key)


def _object_keys(payload: dict) -> set[str]:
    """Каждый объектный ключ, который несёт запись — своей работы, выданного материала, доски.

    Собирается из полезной нагрузки, а не из знания о виде записи: иначе новый вид зеркала
    открывался бы через «файл не найден», и это выяснилось бы у ученика.

    🔴 И ровно это и случилось (промпт 29 §1.5). Вчера картинка на доске перестала быть
    base64 и стала ключом файла. Ключ лежит ВНУТРИ элемента доски (`elements[].data.key`),
    а здесь собирались только `attachments[].objectKey` и `payload.objectKey` — то есть
    ученик, открывший сохранённую доску своего урока при выключенной машине преподавателя,
    получал «файл не найден» и видел ПУСТОЙ КВАДРАТ вместо картинки.
    Мы обещали доску, а отдали бы рамку.

    ⚠️ Прав это не расширяет ни на шаг: отдаётся только тот ключ, который запись **и так
    несёт**, и только владельцу записи. Смысл этой функции — не пускать по чужому ключу с
    валидным идентификатором записи — сохранён целиком.

    ⚠️ И вторая половина находки, для истории: ДО вчерашней правки доска с картинкой не
    зеркалилась ВОВСЕ. Строка base64 длиннее `MAX_TEXT`, `_no_lesson_media` бросал
    исключение, а `_mirror_to_the_class` его глотал. Проверено исполнением.
    """
    keys = {a.get("objectKey") for a in payload.get("attachments", []) if isinstance(a, dict)}
    if payload.get("objectKey"):
        keys.add(payload["objectKey"])
    for element in payload.get("elements", []):
        if isinstance(element, dict) and isinstance(element.get("data"), dict):
            keys.add(element["data"].get("key"))
    return {k for k in keys if k}


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


# --- Р5.4-Б: вся база знаний ученика (OWNER_SCOPE §20.5.1) ----------------------------------
#: Per handed-out material. Same fence as an attachment and for the same reason: it is against
#: lesson media, not economy. A guide is a PDF; an hour of video is gigabytes.
MAX_MATERIAL_BYTES = MAX_ATTACHMENT_BYTES


#: Выданные материалы тоже ложатся под префикс самого ученика — иначе они уедут вместе с
#: преподавателем ровно в тот день, когда должны были остаться.
def material_key(student_id, material_id, name: str) -> str:
    safe = get_valid_filename(name) or "file"
    return f"{MIRROR_PREFIX}/{student_id}/materials/{material_id}/{safe}"


def mirror_diary(
    session, student, *, attendance=None, progress_pct=None, closed_automatically=False
) -> MirroredRecord:
    """Одно занятие в дневнике ученика (§20.5.1 п.1).

    «Частично уже есть — свести в один вид»: посещаемость живёт в `Attendance`, оценки в
    работах, прогресс в `Enrollment`. Дневник — это тот самый один вид: строка на занятие,
    в которой видно, когда оно было, был ли ученик и что с ним стало.

    Мирроринг по событию, как и всё остальное здесь: занятие закончилось — запись появилась.
    """
    lesson = session.lesson
    return put(
        student,
        kind=MirrorKind.DIARY,
        source_id=session.id,
        occurred_at=session.end_at or session.start_at or timezone.now(),
        payload={
            "lessonTitle": lesson.title,
            "lessonId": str(lesson.id),
            "courseTitle": lesson.section.course.title,
            "startAt": session.start_at.isoformat() if session.start_at else None,
            "endAt": session.end_at.isoformat() if session.end_at else None,
            "attendance": attendance or "",
            "progressPct": progress_pct,
            # Р5.5-В п.2: «занятие завершилось само» — отдельный факт, а не молчание. Ученик
            # видит, что урок оборвался, вместо выдуманной длительности «как обычно».
            "closedAutomatically": bool(closed_automatically),
        },
    )


def mirror_board(snapshot, students) -> int:
    """Сохранённая доска — «то, что класс видел на экране» (§20.5.1 п.4).

    🔴 Граница не сдвинулась. Зеркалится **сохранённая** доска: сохранение — это акт
    преподавателя, тот же по смыслу, что «отправить саммари». Живой холст, на котором ещё
    рисуют, и черновик, который классу не показывали, сюда не попадают — им просто нечем
    сюда попасть, потому что событие одно и оно называется «сохранил».

    Элементы едут содержимым: доска, восстановленная как список ссылок на чужую машину, —
    это ровно тот отказ, который зеркало существует, чтобы предотвратить.
    """
    payload = {
        "title": snapshot.title,
        "lessonId": str(snapshot.board.lesson_id),
        "savedAt": snapshot.created_at.isoformat(),
        "elements": snapshot.elements,
    }
    for student in students:
        put(
            student,
            kind=MirrorKind.BOARD,
            source_id=snapshot.id,
            occurred_at=snapshot.created_at,
            payload=payload,
        )
    return len(students)


def _material_body(material, student_id) -> dict:
    """Материал — **содержимым** (§20.5.1 п.5; прежняя строка про «имя и ссылку» отменена).

    Текст едет текстом, файл — байтами, скопированными в пространство самого ученика. Ссылка
    на внешний источник остаётся ссылкой: она и была ссылкой, скачивать за преподавателя чужой
    сайт мы не подряжались, а лицензия у открытых баз путешествует с источником.
    """
    from common import storage

    carried: dict = {
        "title": material.title,
        "type": material.type,
        "body": material.body or "",
        "url": material.url or "",
        "license": material.license or "",
        "attribution": material.attribution or "",
    }
    if material.board_snapshot_id is not None:
        # Сохранённая доска, приложенная материалом: её содержимое — элементы, а не файл.
        carried["elements"] = material.board_snapshot.elements

    if material.file_key:
        meta = storage.head(material.file_key)
        size = meta["size"] if meta else None
        if size is not None and size > MAX_MATERIAL_BYTES:
            return carried
        destination = material_key(student_id, material.id, material.title)
        if storage.copy(material.file_key, destination):
            carried["objectKey"] = destination
            carried["sizeBytes"] = size
    return carried


def mirror_material(material, students) -> int:
    """Выданная методичка или материал (§20.5.1 п.5).

    Вызывается из акта выдачи, а не из создания: `courses.services.share_material`. Пока
    преподаватель не выдал — материала у ученика нет, и `test_an_unshared_material_never_...`
    продолжает это проверять.
    """
    count = 0
    for student in students:
        put(
            student,
            kind=MirrorKind.MATERIAL,
            source_id=material.id,
            occurred_at=material.shared_at or timezone.now(),
            payload=_material_body(material, student.pk),
        )
        count += 1
    return count
