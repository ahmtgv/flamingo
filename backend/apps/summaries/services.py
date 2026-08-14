"""Summary services: assembling a lesson's record, editing it, and sending it out.

Four sources feed the draft, and each keeps its provenance on the item (sheet 02 shows it
under every line):

* the lesson **plan** — its title and description, the shape the teacher intended;
* the **board** — what the class actually drew and wrote, with the author;
* the **test** — how the group did, as counts, never as a list of names;
* the lesson **chat** — already inside the summary, because that is where it has lived since
  the first message was sent;
* and, when and only when it is allowed, **speech** — points from an in-memory stream that is
  dropped in the same call that reads it.

Two invariants worth stating out loud:

**Assembly never overwrites a person.** Re-assembling replaces the machine's own items and
leaves alone anything the teacher wrote or edited, and the whole CHAT section. A tool that
eats your edits when you press the wrong button is a tool you stop pressing buttons in.

**Sending is what makes it real.** Until then the draft is the teacher's; on send it becomes
a material of the lesson for everyone, and the homework in it becomes an actual HOMEWORK row
in «Задания» — created once, tracked by a link on the item so a second send does not
duplicate it.
"""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.courses.access import can_access_course
from apps.courses.models import Enrollment, Material
from apps.scheduling.models import LessonSession
from common.compliance.policy import require_feature
from common.enums import (
    AttemptContext,
    HomeworkType,
    MaterialType,
    SummarySection,
    SummarySource,
    SummaryStatus,
)
from common.exceptions import NotFound, PermissionDenied, ValidationError

from . import speech_stream
from .consent import may_use_speech_of
from .models import LessonSummary, SummaryItem

#: Two keys, not one: a regime that forbids processing lesson speech does not thereby forbid
#: writing down what was on the board. The second lives in consent.py.
FEATURE_SUMMARY = "lesson_summary"

MAX_TEXT = 2000
#: Sources the machine owns. Anything else on an item means a person put it there.
ASSEMBLED_SOURCES = (
    SummarySource.PLAN.value,
    SummarySource.BOARD.value,
    SummarySource.SPEECH.value,
    SummarySource.MATERIAL.value,
    SummarySource.TEST.value,
)


# --- access ------------------------------------------------------------------------------


def _session_or_deny(user, session_id) -> LessonSession:
    session = (
        LessonSession.objects.filter(id=session_id)
        .select_related("lesson__section__course__owner")
        .first()
    )
    if session is None:
        raise NotFound("Session not found")
    if not can_access_course(user, session.lesson.section.course):
        raise NotFound("Session not found")
    return session


def is_teacher_of(user, session: LessonSession) -> bool:
    return session.lesson.section.course.owner.user_id == getattr(user, "id", None)


def _require_teacher(user, session: LessonSession) -> None:
    if not is_teacher_of(user, session):
        raise PermissionDenied("Only the teacher of this lesson works on its summary")


def _summary_of(session: LessonSession) -> LessonSummary:
    summary, _ = LessonSummary.objects.get_or_create(session=session)
    return summary


# --- reading -----------------------------------------------------------------------------


def get_summary(user, session_id) -> LessonSummary | None:
    """The teacher gets the draft; everyone else gets it only once it has been sent.

    A learner asking for an unsent summary gets *nothing*, not a refusal: whether the teacher
    has started writing is not their business either.
    """
    session = _session_or_deny(user, session_id)
    summary = LessonSummary.objects.filter(session=session).first()
    if summary is None:
        return None
    if summary.is_sent or is_teacher_of(user, session):
        return summary
    return None


def items(user, session_id) -> list[SummaryItem]:
    summary = get_summary(user, session_id)
    if summary is None:
        return []
    return list(SummaryItem.objects.filter(summary=summary).select_related("author"))


# --- the lesson chat, which IS the CHAT section ------------------------------------------


def chat_messages(user, session_id) -> list[SummaryItem]:
    """The lesson chat, readable by every participant while the lesson runs.

    This is the one part of a draft a learner may read, and the reason is not a compromise:
    they are writing it. Everything else in the draft stays the teacher's until they send it.
    """
    session = _session_or_deny(user, session_id)
    summary = LessonSummary.objects.filter(session=session).first()
    if summary is None:
        return []
    return list(
        SummaryItem.objects.filter(
            summary=summary, section=SummarySection.CHAT.value
        ).select_related("author")
    )


@transaction.atomic
def post_chat_message(user, session_id, text: str) -> SummaryItem:
    """Write into the lesson chat — which means: write into the summary."""
    text = (text or "").strip()
    if not text:
        raise ValidationError("A message cannot be empty")
    if len(text) > MAX_TEXT:
        raise ValidationError("This message is too long")

    session = _session_or_deny(user, session_id)
    summary = _summary_of(session)
    order = (
        SummaryItem.objects.filter(summary=summary, section=SummarySection.CHAT.value).count() + 1
    )
    return SummaryItem.objects.create(
        summary=summary,
        section=SummarySection.CHAT.value,
        source=SummarySource.CHAT.value,
        text=text,
        author=user,
        at_offset_sec=_offset_of(session),
        order=order,
    )


def _offset_of(session: LessonSession) -> int:
    """Seconds since the lesson started — the «12:09» column. Zero before it starts."""
    if session.start_at is None:
        return 0
    delta = (timezone.now() - session.start_at).total_seconds()
    return max(0, int(delta))


# --- assembly ----------------------------------------------------------------------------


def assemble(user, session_id) -> LessonSummary:
    """«Собрать саммари сейчас» — build the draft from what the lesson actually produced."""
    session = _session_or_deny(user, session_id)
    _require_teacher(user, session)
    # The gate runs BEFORE the transaction: a refusal writes evidence and raises, and inside
    # an atomic block that raise would roll the evidence back with it (policy.py).
    require_feature(session.lesson.section.course.owner.user, FEATURE_SUMMARY)

    with transaction.atomic():
        summary = _summary_of(session)
        if summary.is_sent:
            raise ValidationError("This summary has already been sent")

        # Only the machine's own items are replaced; a teacher's lines and the chat survive.
        SummaryItem.objects.filter(
            summary=summary, source__in=ASSEMBLED_SOURCES, edited=False
        ).delete()

        drafted: list[SummaryItem] = []
        drafted += _from_plan(summary, session)
        drafted += _from_board(summary, session)
        speech_items, omitted = _from_speech(summary, session)
        drafted += speech_items
        drafted += _from_materials(summary, session)
        drafted += _from_test(summary, session)
        drafted += _from_words(summary, session)

        for position, item in enumerate(drafted, start=1):
            item.order = position
        SummaryItem.objects.bulk_create(drafted)

        summary.assembled_at = timezone.now()
        summary.speech_omitted = omitted
        summary.save(update_fields=["assembled_at", "speech_omitted", "updated_at"])
        return summary


def _from_words(summary: LessonSummary, session: LessonSession) -> list[SummaryItem]:
    """«Новые слова» — the lesson's own dictionary entries, by id.

    Not free text: the ids are what turns this section into a repetition queue when the
    summary is sent (R4.4). One path, not two — the words in the summary and the words in the
    queue are the same rows, so they cannot drift apart.
    """
    words = list(session.lesson.words.all())
    if not words:
        return []
    return [
        SummaryItem(
            summary=summary,
            section=SummarySection.WORDS.value,
            source=SummarySource.MATERIAL.value,
            source_meta={"count": len(words), "itemIds": [str(w.id) for w in words]},
            text=" · ".join(w.lemma for w in words),
        )
    ]


def _from_plan(summary: LessonSummary, session: LessonSession) -> list[SummaryItem]:
    lesson = session.lesson
    text = lesson.description.strip() or lesson.title
    return [
        SummaryItem(
            summary=summary,
            section=SummarySection.TOPIC.value,
            source=SummarySource.PLAN.value,
            source_meta={"lessonId": str(lesson.id)},
            at_offset_sec=0,
            text=text,
        )
    ]


def _from_board(summary: LessonSummary, session: LessonSession) -> list[SummaryItem]:
    """What went on the canvas. Text and stickers carry words, so they carry the meaning;
    strokes are counted, not transcribed — a summary of a drawing is a lie."""
    from apps.board.models import Board, BoardElement
    from common.enums import BoardElementKind

    board = Board.objects.filter(lesson=session.lesson).first()
    if board is None:
        return []
    elements = list(
        BoardElement.objects.filter(board=board, deleted_at__isnull=True)
        .select_related("author")
        .order_by("created_at")
    )
    if not elements:
        return []

    wordy = [
        element
        for element in elements
        if element.kind in (BoardElementKind.TEXT.value, BoardElementKind.STICKER.value)
        and str(element.data.get("text", "")).strip()
    ]
    if not wordy:
        return []

    author = wordy[0].author
    return [
        SummaryItem(
            summary=summary,
            section=SummarySection.TOPIC.value,
            source=SummarySource.BOARD.value,
            source_meta={
                "elements": len(elements),
                "authorName": getattr(author, "first_name", "") or "",
            },
            at_offset_sec=_element_offset(session, wordy[0].created_at),
            text=" · ".join(str(e.data.get("text", "")).strip() for e in wordy[:6]),
        )
    ]


def _element_offset(session: LessonSession, at) -> int:
    if session.start_at is None or at is None:
        return 0
    return max(0, int((at - session.start_at).total_seconds()))


def _from_speech(summary: LessonSummary, session: LessonSession) -> tuple[list[SummaryItem], bool]:
    """Points from the in-memory stream — and the stream is emptied here, always.

    ``drain`` runs whatever the answer turns out to be. If the jurisdiction or a speaker says
    no, their points are discarded rather than kept for later: a buffer that survives a
    refusal is a store, and the whole rule is that this is not one.
    """
    from apps.accounts.models import User

    points = speech_stream.drain(session.id)
    if not points:
        return [], False

    tenant = session.lesson.section.course.owner.user
    speakers = {
        str(u.id): u
        for u in User.objects.filter(id__in={p.speaker_id for p in points}).select_related(
            "student_profile"
        )
    }

    kept: list[SummaryItem] = []
    omitted = False
    for point in points:
        speaker = speakers.get(str(point.speaker_id))
        if not may_use_speech_of(speaker, tenant=tenant):
            omitted = True
            continue
        kept.append(
            SummaryItem(
                summary=summary,
                section=SummarySection.TOPIC.value,
                source=SummarySource.SPEECH.value,
                source_meta={"speakerName": speaker.first_name},
                at_offset_sec=point.at_offset_sec,
                text=point.text,
                author=speaker,
            )
        )
    return kept, omitted


def _from_materials(summary: LessonSummary, session: LessonSession) -> list[SummaryItem]:
    materials = list(Material.objects.filter(lesson=session.lesson).order_by("order")[:5])
    if not materials:
        return []
    return [
        SummaryItem(
            summary=summary,
            section=SummarySection.TOPIC.value,
            source=SummarySource.MATERIAL.value,
            source_meta={"materialIds": [str(m.id) for m in materials]},
            text=" · ".join(m.title for m in materials),
        )
    ]


def _from_test(summary: LessonSummary, session: LessonSession) -> list[SummaryItem]:
    """How the group did — as counts. The same aggregate the live picture shows, and for the
    same reason: a summary the whole group reads must not name who got it wrong."""
    from apps.exercises.models import Attempt, Exercise, ExerciseSet

    sets = list(ExerciseSet.objects.filter(lesson=session.lesson))
    if not sets:
        return []
    exercise_ids = list(Exercise.objects.filter(exercise_set__in=sets).values_list("id", flat=True))
    if not exercise_ids:
        return []

    attempts = Attempt.objects.filter(
        exercise_id__in=exercise_ids, context=AttemptContext.LIVE.value
    )
    latest: dict[tuple[str, str], bool | None] = {}
    for attempt in attempts.order_by("created_at"):
        latest[(str(attempt.exercise_id), str(attempt.student_id))] = attempt.is_correct
    if not latest:
        return []

    correct = sum(1 for value in latest.values() if value)
    group_size = Enrollment.objects.filter(course=session.lesson.section.course).count()
    return [
        SummaryItem(
            summary=summary,
            section=SummarySection.TOPIC.value,
            source=SummarySource.TEST.value,
            source_meta={
                "answered": len(latest),
                "correct": correct,
                "groupSize": group_size,
                "setTitle": sets[0].title,
            },
            text=sets[0].title,
        )
    ]


# --- the teacher's edits ------------------------------------------------------------------


@transaction.atomic
def add_item(
    user,
    session_id,
    *,
    section: str,
    text: str,
    due_at=None,
    source_meta: dict | None = None,
) -> SummaryItem:
    """A line the teacher writes themselves. Its source is TEACHER, and it says so."""
    text = (text or "").strip()
    if not text:
        raise ValidationError("A summary line cannot be empty")
    if len(text) > MAX_TEXT:
        raise ValidationError("This line is too long")

    session = _session_or_deny(user, session_id)
    _require_teacher(user, session)
    summary = _summary_of(session)
    if summary.is_sent:
        raise ValidationError("This summary has already been sent")

    order = SummaryItem.objects.filter(summary=summary, section=section).count() + 1
    return SummaryItem.objects.create(
        summary=summary,
        section=section,
        source=SummarySource.TEACHER.value,
        source_meta=source_meta or {},
        text=text,
        due_at=due_at,
        order=order,
        edited=True,
    )


@transaction.atomic
def update_item(user, item_id, *, text: str) -> SummaryItem:
    """Rewriting a line marks it as a person's — assembly will not touch it again."""
    text = (text or "").strip()
    if not text:
        raise ValidationError("A summary line cannot be empty")
    if len(text) > MAX_TEXT:
        raise ValidationError("This line is too long")

    item = _item_or_deny(user, item_id)
    if item.summary.is_sent:
        raise ValidationError("This summary has already been sent")
    item.text = text
    item.edited = True
    item.save(update_fields=["text", "edited", "updated_at"])
    return item


@transaction.atomic
def remove_item(user, item_id) -> bool:
    item = _item_or_deny(user, item_id)
    if item.summary.is_sent:
        raise ValidationError("This summary has already been sent")
    item.delete()
    return True


def _item_or_deny(user, item_id) -> SummaryItem:
    item = (
        SummaryItem.objects.filter(id=item_id)
        .select_related("summary__session__lesson__section__course__owner")
        .first()
    )
    if item is None:
        raise NotFound("Summary line not found")
    session = item.summary.session
    if not can_access_course(user, session.lesson.section.course):
        raise NotFound("Summary line not found")
    _require_teacher(user, session)
    return item


@transaction.atomic
def set_intro(user, session_id, text: str) -> LessonSummary:
    session = _session_or_deny(user, session_id)
    _require_teacher(user, session)
    summary = _summary_of(session)
    summary.intro = (text or "").strip()[:MAX_TEXT]
    summary.save(update_fields=["intro", "updated_at"])
    return summary


# --- sending ------------------------------------------------------------------------------


def send(user, session_id) -> LessonSummary:
    """«Отправить группе». The draft becomes the lesson's record for everyone in it.

    Two things happen besides the status change, and both are the sheet's:
    the summary lands in the lesson's materials — where a learner already looks for the
    lesson's things — and anything under «Задано» becomes a real homework in «Задания».
    """
    session = _session_or_deny(user, session_id)
    _require_teacher(user, session)
    require_feature(session.lesson.section.course.owner.user, FEATURE_SUMMARY)

    with transaction.atomic():
        summary = _summary_of(session)
        if summary.is_sent:
            return summary

        summary.status = SummaryStatus.SENT.value
        summary.sent_at = timezone.now()
        summary.sent_by = user
        summary.save(update_fields=["status", "sent_at", "sent_by", "updated_at"])

        _publish_homework(user, summary, session)
        _put_in_materials(summary, session)
        _enqueue_new_words(summary, session)
        _mirror_to_participants(summary, session)

    # Nothing of the lesson's speech may outlive the lesson, sent or not.
    speech_stream.clear(session.id)
    return summary


def _mirror_to_participants(summary: LessonSummary, session: LessonSession) -> None:
    """A SENT summary reaches every pupil who was in the lesson (Р5.0-Б, OWNER_SCOPE §20.3).

    «Выдал классу — стало общим и появилось у ученика.» Sending is that act, which is why
    this sits inside `send` and nowhere near `assemble`: a draft is the teacher's, and a
    pupil has no copy of it to keep.

    Best-effort on purpose — the summary has been sent either way, and failing the send
    because a copy did not take would undo the thing the teacher just did.
    """
    from apps.meetingpoint import mirror

    students = [
        e.student
        for e in Enrollment.objects.filter(course=session.lesson.section.course).select_related(
            "student"
        )
    ]
    if not students:
        return
    try:
        mirror.mirror_summary(
            summary,
            list(SummaryItem.objects.filter(summary=summary).select_related("author")),
            students,
        )
    except Exception:  # noqa: BLE001 — the copy is best-effort; the summary is the record
        pass


def _enqueue_new_words(summary: LessonSummary, session: LessonSession) -> None:
    """The «Новые слова» section becomes everyone's repetition queue (R4.2 → R4.4).

    The same rows, not a copy: the section carries the `LexicalItem` ids, and the queue is
    built from those ids. «Уйдут в повторение» is what the summary already promises on the
    sheet — this is that promise, executed at the moment the teacher sends it.
    """
    from apps.exercises.models import LexicalItem
    from apps.exercises.repetition import enqueue_words

    item_ids: list[str] = []
    for item in SummaryItem.objects.filter(summary=summary, section=SummarySection.WORDS.value):
        item_ids += [str(x) for x in (item.source_meta or {}).get("itemIds", [])]
    if not item_ids:
        return

    words = list(LexicalItem.objects.filter(id__in=item_ids))
    if not words:
        return
    for enrollment in Enrollment.objects.filter(
        course=session.lesson.section.course
    ).select_related("student"):
        enqueue_words(enrollment.student, words)


def _publish_homework(user, summary: LessonSummary, session: LessonSession) -> None:
    from apps.homework.models import Homework

    pending = SummaryItem.objects.filter(
        summary=summary, section=SummarySection.HOMEWORK.value, homework__isnull=True
    )
    for item in pending:
        homework = Homework.objects.create(
            title=item.text[:200],
            description=item.text,
            type=HomeworkType.TEXT.value,
            due_at=item.due_at,
            lesson=session.lesson,
            course=session.lesson.section.course,
            group=session.group,
            created_by=user,
            published_at=timezone.now(),
        )
        item.homework = homework
        item.save(update_fields=["homework", "updated_at"])


def _put_in_materials(summary: LessonSummary, session: LessonSession) -> None:
    """One material row per lesson, pointing at the summary — never a copy of its text.
    The summary keeps being edited-in-place elsewhere; a duplicated body would go stale."""
    Material.objects.get_or_create(
        lesson=session.lesson,
        summary=summary,
        defaults={
            "type": MaterialType.LINK.value,
            "title": session.lesson.title,
            "order": 0,
        },
    )
