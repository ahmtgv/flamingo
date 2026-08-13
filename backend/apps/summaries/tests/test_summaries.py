"""The lesson summary (PROMPT_13 R4.2, atlas sheet 02).

What is worth pinning here, in the order it matters:

* speech is a stream and leaves nothing behind — not on a refusal, not on success;
* the lesson chat is a section of the summary, and a learner may read *that* while the rest
  of the draft is still the teacher's;
* a draft is invisible to learners until it is sent, and it is invisible by being absent;
* assembly does not eat a teacher's edits;
* sending puts the summary in the lesson's materials and the homework in «Задания», once.
"""

from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.accounts.models import Guardianship
from apps.board import services as board
from apps.courses import services as courses
from apps.courses.models import Material
from apps.exercises import services as exercises
from apps.exercises.models import Exercise, ExerciseSet
from apps.homework.models import Homework
from apps.scheduling.models import LessonSession
from apps.summaries import services as summaries
from apps.summaries import speech_stream
from apps.summaries.consent import may_use_speech_of
from apps.summaries.models import LessonSummary, SummaryItem
from apps.summaries.speech_stream import SpeechPoint
from common.enums import (
    AttemptContext,
    BoardElementKind,
    ExerciseKind,
    ExerciseMode,
    GuardianshipStatus,
    Role,
    SummarySection,
    SummarySource,
    SummaryStatus,
)
from common.exceptions import NotFound, PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _no_speech_leaks_between_tests():
    speech_stream.clear_all()
    yield
    speech_stream.clear_all()


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Ирина",
        last_name="Соколова",
        role=Role.TEACHER,
        specialty="English",
    )


def make_pupil(email="p@example.com", first="Аня", birth=date(2010, 1, 1)):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name=first,
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=birth,
    )


def a_lesson(teacher):
    course = courses.create_course(teacher, title="English A2", subject="Английский", level="adult")
    section = courses.create_section(teacher, course.id, title="Unit 4 · Travel")
    lesson = courses.create_lesson(
        teacher,
        section.id,
        title="Asking for directions",
        description="Разобрать три конструкции вопроса о дороге",
        duration_min=45,
    )
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    return course, lesson


def a_session(lesson, minutes_ago=20):
    return LessonSession.objects.create(
        lesson=lesson, start_at=timezone.now() - timedelta(minutes=minutes_ago)
    )


def enrolled_pupil(course, email="p@example.com", first="Аня"):
    pupil = make_pupil(email, first)
    courses.enroll(pupil, course.id)
    return pupil


def consenting(user):
    user.consent_speech = True
    user.consent_speech_at = timezone.now()
    user.save(update_fields=["consent_speech", "consent_speech_at"])
    return user


# --- access --------------------------------------------------------------------------------
def test_a_stranger_cannot_reach_the_summary_of_a_lesson_they_are_not_in():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    session = a_session(lesson)
    stranger = make_pupil("far@example.com", "Чужой")

    with pytest.raises(NotFound):
        summaries.assemble(stranger, session.id)
    with pytest.raises(NotFound):
        summaries.chat_messages(stranger, session.id)


def test_a_pupil_of_the_course_cannot_assemble_or_send():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    session = a_session(lesson)
    pupil = enrolled_pupil(course)

    with pytest.raises(PermissionDenied):
        summaries.assemble(pupil, session.id)
    with pytest.raises(PermissionDenied):
        summaries.send(pupil, session.id)


def test_a_draft_is_invisible_to_learners_by_being_absent():
    """Not a refusal: whether the teacher has started writing up the lesson is not something
    a learner needs to be told about either."""
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    session = a_session(lesson)
    pupil = enrolled_pupil(course)
    summaries.assemble(teacher, session.id)

    assert summaries.get_summary(pupil, session.id) is None
    assert summaries.items(pupil, session.id) == []
    assert summaries.get_summary(teacher, session.id) is not None


def test_sending_makes_it_visible_to_the_group():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    session = a_session(lesson)
    pupil = enrolled_pupil(course)
    summaries.assemble(teacher, session.id)

    summaries.send(teacher, session.id)
    seen = summaries.get_summary(pupil, session.id)
    assert seen is not None and seen.status == SummaryStatus.SENT.value
    assert summaries.items(pupil, session.id)


# --- the lesson chat IS the CHAT section ---------------------------------------------------
def test_a_lesson_message_is_written_into_the_summary_not_into_a_feed_of_its_own():
    """«Переписка едет вместе с итогом» — true of the schema, not only of the screen."""
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    session = a_session(lesson)
    pupil = enrolled_pupil(course)

    summaries.post_chat_message(pupil, session.id, "а go straight on тоже правильно?")
    item = SummaryItem.objects.get()

    assert item.section == SummarySection.CHAT.value
    assert item.source == SummarySource.CHAT.value
    assert item.summary.session_id == session.id
    assert item.author_id == pupil.id


def test_participants_read_the_lesson_chat_while_the_rest_of_the_draft_stays_the_teachers():
    """The one part of a draft a learner may read — they are writing it."""
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    session = a_session(lesson)
    pupil = enrolled_pupil(course)
    summaries.assemble(teacher, session.id)
    summaries.post_chat_message(pupil, session.id, "можно ссылку на аудио ещё раз?")

    assert [m.text for m in summaries.chat_messages(pupil, session.id)] == [
        "можно ссылку на аудио ещё раз?"
    ]
    assert summaries.get_summary(pupil, session.id) is None  # everything else still hidden


def test_an_empty_or_oversized_message_is_refused():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    session = a_session(lesson)
    pupil = enrolled_pupil(course)

    with pytest.raises(ValidationError):
        summaries.post_chat_message(pupil, session.id, "   ")
    with pytest.raises(ValidationError):
        summaries.post_chat_message(pupil, session.id, "x" * (summaries.MAX_TEXT + 1))


def test_assembly_never_touches_the_chat():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    session = a_session(lesson)
    pupil = enrolled_pupil(course)
    summaries.post_chat_message(pupil, session.id, "вопрос по доске")

    summaries.assemble(teacher, session.id)
    summaries.assemble(teacher, session.id)

    chat = SummaryItem.objects.filter(section=SummarySection.CHAT.value)
    assert [c.text for c in chat] == ["вопрос по доске"]


# --- what a summary is assembled from -------------------------------------------------------
def test_the_draft_carries_the_plan_the_board_and_the_test_each_with_its_source():
    """Sheet 02 puts «откуда взято» under every single line, so every line has a source."""
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    session = a_session(lesson)
    pupil = enrolled_pupil(course)

    board.put_element(
        teacher, lesson.id, kind=BoardElementKind.TEXT, data={"text": "Asking for directions"}
    )
    exercise_set = ExerciseSet.objects.create(
        lesson=lesson, title="Быстрый тест · directions", mode=ExerciseMode.LIVE.value
    )
    exercise = Exercise.objects.create(
        exercise_set=exercise_set,
        kind=ExerciseKind.CHOICE.value,
        prompt={"text": "how do I ___ to the station?"},
        payload={"options": ["come", "get"]},
        answer_key={"correct": 1},
    )
    exercises.record_attempt(
        pupil, exercise.id, response={"choice": 1}, context=AttemptContext.LIVE
    )

    summaries.assemble(teacher, session.id)
    sources = {i.source for i in summaries.items(teacher, session.id)}
    assert SummarySource.PLAN.value in sources
    assert SummarySource.BOARD.value in sources
    assert SummarySource.TEST.value in sources


def test_the_test_line_is_counts_and_never_names_a_pupil():
    """The same rule as the live picture: a summary the whole group reads must not say who
    got it wrong."""
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    session = a_session(lesson)
    pupil = enrolled_pupil(course, first="Петя")

    exercise_set = ExerciseSet.objects.create(
        lesson=lesson, title="Быстрый тест", mode=ExerciseMode.LIVE.value
    )
    exercise = Exercise.objects.create(
        exercise_set=exercise_set,
        kind=ExerciseKind.CHOICE.value,
        prompt={"text": "q"},
        payload={"options": ["a", "b"]},
        answer_key={"correct": 0},
    )
    exercises.record_attempt(
        pupil, exercise.id, response={"choice": 1}, context=AttemptContext.LIVE
    )

    summaries.assemble(teacher, session.id)
    line = next(
        i for i in summaries.items(teacher, session.id) if i.source == SummarySource.TEST.value
    )
    assert line.source_meta == {
        "answered": 1,
        "correct": 0,
        "groupSize": 1,
        "setTitle": "Быстрый тест",
    }
    assert "Петя" not in line.text and line.author_id is None


def test_a_board_of_pure_strokes_produces_no_line():
    """A summary of a drawing is a lie — strokes are counted, not narrated."""
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    session = a_session(lesson)
    board.put_element(teacher, lesson.id, kind=BoardElementKind.PEN, data={"points": [1, 2, 3]})

    summaries.assemble(teacher, session.id)
    assert not [
        i for i in summaries.items(teacher, session.id) if i.source == SummarySource.BOARD.value
    ]


# --- the teacher's edits survive -------------------------------------------------------------
def test_reassembling_does_not_eat_what_the_teacher_wrote_or_rewrote():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    session = a_session(lesson)
    summaries.assemble(teacher, session.id)

    own = summaries.add_item(
        teacher, session.id, section=SummarySection.WATCH.value, text="go straight ahead, не on"
    )
    plan = next(
        i for i in summaries.items(teacher, session.id) if i.source == SummarySource.PLAN.value
    )
    summaries.update_item(teacher, plan.id, text="Урок про дорогу, своими словами")

    summaries.assemble(teacher, session.id)
    texts = [i.text for i in summaries.items(teacher, session.id)]
    assert "go straight ahead, не on" in texts
    assert "Урок про дорогу, своими словами" in texts
    assert own.source == SummarySource.TEACHER.value


def test_a_sent_summary_is_no_longer_editable():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    session = a_session(lesson)
    summaries.assemble(teacher, session.id)
    item = summaries.items(teacher, session.id)[0]
    summaries.send(teacher, session.id)

    with pytest.raises(ValidationError):
        summaries.update_item(teacher, item.id, text="поздно")
    with pytest.raises(ValidationError):
        summaries.assemble(teacher, session.id)


# --- sending ---------------------------------------------------------------------------------
def test_homework_from_the_summary_becomes_a_real_row_in_zadaniya_exactly_once():
    teacher = make_teacher()
    course, lesson = a_lesson(teacher)
    session = a_session(lesson)
    due = timezone.now() + timedelta(days=3)
    summaries.add_item(
        teacher,
        session.id,
        section=SummarySection.HOMEWORK.value,
        text="Описать дорогу от дома до школы, 5–7 предложений",
        due_at=due,
    )

    summaries.send(teacher, session.id)
    summaries.send(teacher, session.id)  # a second send must not duplicate it

    homework = Homework.objects.get()
    assert homework.lesson_id == lesson.id
    assert homework.course_id == course.id
    assert homework.is_published
    assert homework.due_at == due
    assert SummaryItem.objects.get(section=SummarySection.HOMEWORK.value).homework_id == homework.id


def test_a_sent_summary_lands_in_the_lessons_materials_as_a_pointer():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    session = a_session(lesson)
    summaries.assemble(teacher, session.id)

    summaries.send(teacher, session.id)
    summaries.send(teacher, session.id)

    material = Material.objects.get(lesson=lesson)
    assert material.summary_id == LessonSummary.objects.get().id
    assert material.body == ""  # a pointer, never a copy of the text


# --- speech: the stream that leaves nothing behind ---------------------------------------------
def test_a_speech_point_reaches_the_summary_only_with_consent_and_leaves_no_buffer():
    teacher = consenting(make_teacher())
    _, lesson = a_lesson(teacher)
    session = a_session(lesson)
    speech_stream.note(
        session.id,
        SpeechPoint(str(teacher.id), 665, "на экзамене пишите ahead, on — разговорный"),
    )

    summaries.assemble(teacher, session.id)

    line = next(
        i for i in summaries.items(teacher, session.id) if i.source == SummarySource.SPEECH.value
    )
    assert line.at_offset_sec == 665
    assert speech_stream.pending(session.id) == 0


def test_without_consent_the_point_is_dropped_and_the_summary_says_so():
    """A refusal is silent to the speaker but not to the reader: a thin summary that does not
    explain itself is worse than no summary."""
    teacher = make_teacher()  # никакого согласия
    _, lesson = a_lesson(teacher)
    session = a_session(lesson)
    speech_stream.note(session.id, SpeechPoint(str(teacher.id), 100, "что-то сказанное"))

    summary = summaries.assemble(teacher, session.id)

    assert not [
        i for i in summaries.items(teacher, session.id) if i.source == SummarySource.SPEECH.value
    ]
    assert summary.speech_omitted is True
    # And it is GONE — a buffer that survives a refusal is a store.
    assert speech_stream.pending(session.id) == 0


def test_a_minors_own_consent_is_not_enough_without_a_guardians():
    teacher = consenting(make_teacher())
    course, lesson = a_lesson(teacher)
    child = consenting(enrolled_pupil(course, first="Петя"))
    parent = accounts.register_user(
        email="mum@example.com",
        password="strongpass1!",
        first_name="Мама",
        last_name="Ковалёва",
        role=Role.PARENT,
    )

    assert may_use_speech_of(child, tenant=teacher) is False

    Guardianship.objects.create(
        parent_user=parent,
        child_user=child,
        status=GuardianshipStatus.ACTIVE.value,
        consent_152fz=True,
        consent_at=timezone.now(),
    )
    child.refresh_from_db()
    assert may_use_speech_of(child, tenant=teacher) is True


def test_an_adult_needs_only_their_own_consent():
    teacher = make_teacher()
    assert may_use_speech_of(teacher, tenant=teacher) is False
    assert may_use_speech_of(consenting(teacher), tenant=teacher) is True


def test_a_jurisdiction_that_forbids_transcription_still_gets_a_summary(settings):
    """The EU path, and the reason there are two matrix keys: no speech points, but the board,
    the test and the chat are still written down."""
    settings.DEPLOYMENT_JURISDICTION = "eu"
    teacher = consenting(make_teacher())
    course, lesson = a_lesson(teacher)
    session = a_session(lesson)
    pupil = enrolled_pupil(course)
    summaries.post_chat_message(pupil, session.id, "вопрос")
    speech_stream.note(session.id, SpeechPoint(str(teacher.id), 60, "сказанное вслух"))

    summary = summaries.assemble(teacher, session.id)

    assert not [
        i for i in summaries.items(teacher, session.id) if i.source == SummarySource.SPEECH.value
    ]
    assert summary.speech_omitted is True
    assert [i for i in summaries.items(teacher, session.id) if i.source == SummarySource.PLAN.value]
    assert speech_stream.pending(session.id) == 0


def test_an_unknown_jurisdiction_refuses_the_summary_outright(settings):
    """Fail-closed: nothing known is not «probably fine»."""
    from common.compliance.policy import reload_matrix

    settings.DEPLOYMENT_JURISDICTION = ""
    reload_matrix()
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    session = a_session(lesson)

    with pytest.raises(PermissionDenied):
        summaries.assemble(teacher, session.id)


def test_sending_drops_the_speech_buffer_even_if_nothing_was_assembled_from_it():
    teacher = make_teacher()
    _, lesson = a_lesson(teacher)
    session = a_session(lesson)
    speech_stream.note(session.id, SpeechPoint(str(teacher.id), 10, "что-то"))

    summaries.send(teacher, session.id)
    assert speech_stream.pending(session.id) == 0
