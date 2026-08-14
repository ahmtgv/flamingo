"""The word card (R4.3, atlas sheet 02).

The rule this file exists to make unbreakable is the owner's, dated 2026-08-12: **only open
bases go inside the product**, and a closed dictionary is a link that opens in a new tab. The
tests come in two kinds:

* behaviour — the three actions on the card do what the sheet says, behind the right rule;
* structure — an unattributed word cannot be *stored*, and no closed dictionary can be
  reached from our code. Those are checked against the database and the source, not against
  anyone's memory of the decision.
"""

import ast
import re
from datetime import date
from pathlib import Path

import pytest
from django.db.utils import IntegrityError
from django.utils import timezone

from apps.accounts import services as accounts
from apps.board.models import BoardElement
from apps.courses import services as courses
from apps.exercises import dictionary
from apps.exercises.models import LexicalExample, LexicalItem, SrsCard
from apps.scheduling.models import LessonSession
from common.enums import CardDirection, CardState, LexicalSource, PartOfSpeech, Role
from common.exceptions import NotFound, PermissionDenied

pytestmark = pytest.mark.django_db


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Ирина",
        last_name="Соколова",
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


def a_lesson(teacher):
    course = courses.create_course(teacher, title="English A2", subject="Английский", level="adult")
    section = courses.create_section(teacher, course.id, title="Unit 4 · Travel")
    lesson = courses.create_lesson(teacher, section.id, title="Asking for directions")
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    return course, lesson


def a_word(lemma="crossroads", sense="oewn-03088580-n", **over) -> LexicalItem:
    fields = {
        "lemma": lemma,
        "pos": PartOfSpeech.NOUN.value,
        "sense_id": sense,
        "ipa": "/ˈkrɒs.rəʊdz/",
        "definition_ru": "место, где пересекаются две дороги; перекрёсток",
        "translation_ru": "перекрёсток",
        "source": LexicalSource.WORDNET.value,
        "license": "CC BY 4.0",
        "attribution": "Princeton WordNet · Open English WordNet team",
        "source_url": "https://en-word.net/",
    }
    fields.update(over)
    return LexicalItem.objects.create(**fields)


# --- attribution is structural ---------------------------------------------------------------
def test_a_word_cannot_be_stored_without_a_licence_and_a_credit():
    """Not a lint, not a code review note — a database constraint.

    An open licence is still a licence: CC BY wants a name. Making attribution optional would
    mean the first bulk import quietly ships an unattributed dictionary.
    """
    with pytest.raises(IntegrityError):
        LexicalItem.objects.create(
            lemma="ghost",
            pos=PartOfSpeech.NOUN.value,
            source=LexicalSource.WORDNET.value,
            license="",
            attribution="",
        )


def test_an_example_carries_its_own_credit_because_it_has_its_own_rights_holder():
    """A WordNet gloss and a Tatoeba sentence are different licences and different people.
    One attribution line covering both is how licence compliance quietly goes wrong."""
    item = a_word()
    example = LexicalExample.objects.create(
        item=item,
        text="Turn right at the crossroads and go straight ahead.",
        translation_ru="Поверни направо на перекрёстке и иди прямо.",
        source=LexicalSource.TATOEBA.value,
        license="CC BY 2.0 FR",
        attribution="автор предложения CK",
        source_url="https://tatoeba.org/en/sentences/show/1",
    )

    assert example.license != item.license
    assert example.attribution != item.attribution

    with pytest.raises(IntegrityError):
        LexicalExample.objects.create(
            item=item, text="unattributed", source=LexicalSource.TATOEBA.value
        )


def test_only_the_three_open_bases_are_modelled_as_sources():
    """The enum IS the licensing decision. Adding a member is a legal act, not a refactor —
    and a closed base has no member to be added under."""
    assert {s.value for s in LexicalSource} == {"wordnet", "tatoeba", "common_voice", "own"}


def test_no_closed_dictionary_is_ever_fetched_by_our_code():
    """Cambridge and the rest are LINKS. The card must not embed them, and our server must
    not call them — the spec is explicit that they are not licensed for either (§5.3).

    Checked on executable code, so the guard cannot be satisfied by rewording a docstring
    (this module's own prose names Cambridge on purpose).
    """
    source = Path(dictionary.__file__).read_text(encoding="utf-8")
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.Module | ast.ClassDef | ast.FunctionDef):
            body = node.body
            if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
                node.body = body[1:]
    code = ast.unparse(tree).lower()

    # The one place a closed dictionary may appear is the outbound link list, and it may only
    # ever be a URL sitting in data — never an argument to anything that performs a request.
    for caller in ("requests.", "urlopen", "httpx", "fetch(", "aiohttp"):
        assert caller not in code, f"the dictionary module makes a request: {caller!r}"

    for row in dictionary.EXTERNAL_DICTIONARIES:
        assert row["url"].startswith("https://"), row
    assert {row["key"] for row in dictionary.EXTERNAL_DICTIONARIES} == {"cambridge"}


def test_no_closed_dictionary_content_is_stored_anywhere():
    """Belt and braces: a closed base could only get in as a LexicalItem, and there is no
    source value it could be written under."""
    closed = ("cambridge", "oxford", "longman", "macmillan", "collins", "merriam")
    for name in closed:
        assert not any(name in s.value for s in LexicalSource)
        assert not LexicalItem.objects.filter(attribution__icontains=name).exists()


# --- the card ----------------------------------------------------------------------------------
def test_a_lemma_returns_every_sense_because_the_card_stacks_them():
    teacher = make_teacher()
    a_word(sense="oewn-03088580-n", definition_ru="перекрёсток")
    a_word(sense="oewn-15266164-n", definition_ru="момент важного решения")
    a_word(lemma="ahead", sense="oewn-00099999-r", pos=PartOfSpeech.ADVERB.value)

    senses = dictionary.lookup(teacher, "Crossroads")
    assert len(senses) == 2
    assert {s.definition_ru for s in senses} == {"перекрёсток", "момент важного решения"}


def test_an_unknown_or_empty_lemma_is_an_empty_card_not_an_error():
    teacher = make_teacher()
    assert dictionary.lookup(teacher, "  ") == []
    assert dictionary.lookup(teacher, "zzzz") == []


def test_the_lessons_word_list_is_behind_the_lessons_own_access_rule():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    word = a_word()
    word.lessons.add(lesson)
    stranger = make_pupil("far@example.com", "Чужой")

    assert [w.lemma for w in dictionary.lesson_words(teacher, lesson.id)] == ["crossroads"]
    with pytest.raises(NotFound):
        dictionary.lesson_words(stranger, lesson.id)


# --- «в мои слова» ---------------------------------------------------------------------------
def test_adding_a_word_puts_it_in_the_repetition_queue_due_now():
    """There is no separate «saved words» list — the list IS the queue (§7.2)."""
    teacher = make_teacher()
    course, _ = a_lesson(teacher)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    word = a_word()

    card = dictionary.add_to_my_words(pupil, word.id)
    assert card.state == CardState.NEW.value
    assert card.direction == CardDirection.RECOGNITION.value
    assert card.due_at <= timezone.now()
    assert SrsCard.objects.count() == 1


def test_pressing_it_twice_does_not_reset_a_card_you_have_been_reviewing():
    """The button sits next to a word you may well have met before. Losing weeks of schedule
    to a stray second click would be a real loss, so the write is idempotent."""
    pupil = make_pupil()
    word = a_word()
    card = dictionary.add_to_my_words(pupil, word.id)
    SrsCard.objects.filter(id=card.id).update(state=CardState.REVIEW.value, reps=7, stability=42.0)

    again = dictionary.add_to_my_words(pupil, word.id)
    again.refresh_from_db()
    assert again.id == card.id
    assert again.reps == 7
    assert again.state == CardState.REVIEW.value


def test_my_words_takes_no_student_id_and_returns_only_the_callers_own():
    anya, boris = make_pupil("a@example.com"), make_pupil("b@example.com", "Борис")
    word = a_word()
    dictionary.add_to_my_words(anya, word.id)

    assert len(dictionary.my_words(anya)) == 1
    assert dictionary.my_words(boris) == []


def test_a_teacher_has_no_word_list_of_their_own_here():
    teacher = make_teacher()
    word = a_word()
    with pytest.raises(PermissionDenied):
        dictionary.add_to_my_words(teacher, word.id)


# --- «на доску» --------------------------------------------------------------------------------
def test_putting_a_word_on_the_board_goes_through_the_boards_own_rule():
    """No second permission rule: a closed board refuses a word exactly as it refuses a
    sticker, because it IS a sticker."""
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    word = a_word()

    with pytest.raises(PermissionDenied):
        dictionary.put_on_board(pupil, lesson.id, word.id)

    from apps.board import services as board

    board.set_open_for_students(teacher, lesson.id, is_open=True)
    element = dictionary.put_on_board(pupil, lesson.id, word.id)
    assert element.author_id == pupil.id
    assert "crossroads" in BoardElement.objects.get(id=element.id).data["text"]


# --- «показать всем» -----------------------------------------------------------------------------
def test_only_the_teacher_of_the_lesson_shows_a_word_to_the_class():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    session = LessonSession.objects.create(lesson=lesson, start_at=timezone.now())
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    word = a_word()

    with pytest.raises(PermissionDenied):
        dictionary.show_to_class(pupil, session.id, word.id)
    assert dictionary.show_to_class(teacher, session.id, word.id).id == word.id


def test_showing_a_word_stores_nothing():
    """It is a gesture, like pointing at the whiteboard — the same category as the projector
    focus, and equally not a record of anything."""
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    session = LessonSession.objects.create(lesson=lesson, start_at=timezone.now())
    word = a_word()

    before = {m.__name__: m.objects.count() for m in (LexicalItem, LexicalExample, SrsCard)}
    dictionary.show_to_class(teacher, session.id, word.id)
    after = {m.__name__: m.objects.count() for m in (LexicalItem, LexicalExample, SrsCard)}
    assert before == after


def test_a_stranger_cannot_even_address_the_session():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    session = LessonSession.objects.create(lesson=lesson, start_at=timezone.now())
    stranger = make_pupil("far@example.com", "Чужой")

    with pytest.raises(NotFound):
        dictionary.show_to_class(stranger, session.id, a_word().id)


# --- the contract ----------------------------------------------------------------------------
def test_the_published_card_carries_its_licence_on_every_part():
    """The reviewer's requirement, as a schema assertion: attribution is IN the card, not in
    a comment. Both the item and each example expose their own credit."""
    from api.schema import schema

    sdl = schema.as_str()
    item = re.search(r"type LexicalItem \{(.*?)\n\}", sdl, re.S).group(1)
    example = re.search(r"type LexicalExample \{(.*?)\n\}", sdl, re.S).group(1)
    attribution = re.search(r"type Attribution \{(.*?)\n\}", sdl, re.S).group(1)

    assert "credit: Attribution!" in item
    assert "credit: Attribution!" in example
    for field in ("source:", "license:", "attribution:", "sourceUrl:"):
        assert field in attribution
