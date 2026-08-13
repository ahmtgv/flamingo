"""The word card and what a person can do with it (R4.3, atlas sheet 02).

Owner decision 2026-08-12, in as many words on the sheet: **only open bases go inside the
product** — Open English WordNet (CC BY 4.0), Tatoeba (CC BY 2.0 FR), Mozilla Common Voice
(CC0). A closed dictionary — Cambridge and the rest — is a **link that opens in a new tab**,
never a row in a table and never a request from our server. The spec is blunt about why
(§5.3): those bases are not licensed for embedding or redistribution, and presuming
permission is the one presumption that cannot be made here.

Three actions hang off the card, and each is deliberately something the product already has:

* **«В мои слова»** creates an `SrsCard` — putting a word in your own list IS putting it in
  the repetition queue, so there is no second list to keep in sync with it.
* **«На доску»** writes a board element, through the board's own service and therefore
  through the board's own «who may write» rule.
* **«Показать всем»** (teacher) broadcasts over Channels and stores nothing. It is a gesture,
  like pointing at the whiteboard — the same category as the projector focus.
"""

from __future__ import annotations

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone

from apps.courses.access import can_access_course
from apps.courses.models import Lesson
from common.enums import BoardElementKind, CardDirection, CardState
from common.exceptions import NotFound, PermissionDenied

from .models import LexicalItem, SrsCard

#: Closed dictionaries the sheet offers as an outbound LINK. Data, so the client renders the
#: same list it is tested against — and so that adding one is visibly a link, not an import.
EXTERNAL_DICTIONARIES = (
    {
        "key": "cambridge",
        "name": "Cambridge Dictionary",
        "url": "https://dictionary.cambridge.org/dictionary/english/",
    },
)


def _lesson_or_deny(user, lesson_id) -> Lesson:
    lesson = Lesson.objects.filter(id=lesson_id).select_related("section__course__owner").first()
    if lesson is None:
        raise NotFound("Lesson not found")
    if not can_access_course(user, lesson.section.course):
        raise NotFound("Lesson not found")
    return lesson


def _item_or_404(item_id) -> LexicalItem:
    item = LexicalItem.objects.filter(id=item_id).prefetch_related("examples").first()
    if item is None:
        raise NotFound("Word not found")
    return item


# --- reading -------------------------------------------------------------------------------


def lookup(user, lemma: str) -> list[LexicalItem]:
    """Every sense of a lemma — the card on the sheet is the senses, stacked.

    The dictionary is not course content: it is the language, and it is the same language for
    everyone. So there is no per-course gate here and deliberately so — gating a definition
    behind an enrolment would be theatre, since the same word is a click away on any open
    dictionary in the world.
    """
    lemma = (lemma or "").strip().lower()
    if not lemma:
        return []
    return list(
        LexicalItem.objects.filter(lemma__iexact=lemma).prefetch_related(
            "examples", "pronunciation"
        )
    )


def lesson_words(user, lesson_id) -> list[LexicalItem]:
    """«Слова этого урока» — behind the lesson's own access rule, because the LIST is the
    teacher's choice about a lesson even though each word is not."""
    lesson = _lesson_or_deny(user, lesson_id)
    return list(lesson.words.prefetch_related("examples", "pronunciation"))


# --- «в мои слова» --------------------------------------------------------------------------


def _student_or_deny(user):
    profile = getattr(user, "student_profile", None)
    if profile is None:
        raise PermissionDenied("Only a learner keeps a word list")
    return profile


@transaction.atomic
def add_to_my_words(user, item_id, *, direction: str | None = None) -> SrsCard:
    """Put a word in your own list — which means: put it in the repetition queue, due now.

    Idempotent: pressing it twice does not reset a card you have already been reviewing. That
    matters more than it looks — the button is right next to a word you may well have met
    before, and losing your schedule to a stray click would be a real loss.
    """
    student = _student_or_deny(user)
    item = _item_or_404(item_id)
    card, _created = SrsCard.objects.get_or_create(
        student=student,
        item=item,
        direction=direction or CardDirection.RECOGNITION.value,
        defaults={"state": CardState.NEW.value, "due_at": timezone.now()},
    )
    return card


def my_words(user) -> list[SrsCard]:
    """The caller's own list. Takes no user id — a learner's words are their own, and an
    endpoint that accepted somebody else's id would be an invitation."""
    student = _student_or_deny(user)
    return list(
        SrsCard.objects.filter(student=student)
        .select_related("item")
        .prefetch_related("item__examples")
    )


# --- «на доску» -------------------------------------------------------------------------------


def put_on_board(user, lesson_id, item_id):
    """Write the word on the lesson board — through the board's service, so the teacher's
    open/closed switch decides whether a learner may do it. No second permission rule."""
    from apps.board import services as board

    item = _item_or_404(item_id)
    text = item.lemma if not item.translation_ru else f"{item.lemma} — {item.translation_ru}"
    return board.put_element(
        user,
        lesson_id,
        kind=BoardElementKind.STICKER,
        x=40,
        y=40,
        width=220,
        height=110,
        data={"text": text},
    )


# --- «показать всем» ----------------------------------------------------------------------------


def show_to_class(user, session_id, item_id) -> LexicalItem:
    """The teacher points at a word and everyone's dictionary pane turns to it.

    Nothing is stored: this is a gesture during a lesson, the same category as the projector
    focus. What travels is an id — the card itself is read by each client through the query
    it already uses.
    """
    from apps.scheduling.models import LessonSession

    session = (
        LessonSession.objects.filter(id=session_id)
        .select_related("lesson__section__course__owner")
        .first()
    )
    if session is None:
        raise NotFound("Session not found")
    if not can_access_course(user, session.lesson.section.course):
        raise NotFound("Session not found")
    if session.lesson.section.course.owner.user_id != getattr(user, "id", None):
        raise PermissionDenied("Only the teacher shows a word to the class")

    item = _item_or_404(item_id)
    layer = get_channel_layer()
    if layer is not None:
        async_to_sync(layer.group_send)(
            f"dict_{session_id}",
            {
                "type": "dict.shown",
                "session_id": str(session_id),
                "item_id": str(item.id),
                "lemma": item.lemma,
            },
        )
    return item
