"""The pupil's mirror (Р5.0-Б — OWNER_SCOPE §20.3).

Owner decision 14.08, verbatim: «в любом случае данные сохраняются у ученика — то есть он
должен иметь возможность получить доступ к этим документам». A teacher leaving the platform
must not take a child's schooling with them.

Two tests carry the phase, and everything else supports them:

* **the teacher's account is deleted and the pupil still reads their work** — the whole
  promise, checked the only way that means anything;
* **the ownership boundary** — «выдал классу → появилось у ученика; не выдал → своё». An
  unsent summary and an unshared guide must not be in there.
"""

import datetime as dt
from datetime import date

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.homework import services as homework
from apps.meetingpoint import mirror
from apps.meetingpoint.models import MirroredRecord
from apps.scheduling.models import LessonSession
from apps.summaries import services as summaries
from common.enums import HomeworkType, MirrorKind, Role
from common.exceptions import NotFound, PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Люция",
        last_name="Валерьевна",
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
    )


def a_course(teacher):
    course = courses.create_course(teacher, title="English A2", subject="Английский", level="adult")
    section = courses.create_section(teacher, course.id, title="Unit 4 · Travel")
    lesson = courses.create_lesson(teacher, section.id, title="Asking for directions")
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    return course, lesson


def enrolled(course, email="p@example.com", first="Аня"):
    pupil = make_pupil(email, first)
    courses.enroll(pupil, course.id)
    return pupil


def a_homework(teacher, lesson, *, title="Описать дорогу"):
    row = homework.create_homework(
        teacher, lesson_id=lesson.id, title=title, type=HomeworkType.TEXT.value
    )
    homework.publish_homework(teacher, row.id)
    return row


# --- 🔒 the promise: the teacher goes, the learning stays ---------------------------------------
def test_a_pupil_reads_their_work_after_the_teachers_account_is_deleted():
    """The whole of §20.3, checked the only way that means anything.

    Everything of the pupil's normally hangs off the teacher's course by foreign key, so
    deleting the teacher cascades it away — which is precisely the day the mirror is supposed
    to matter. `source_id` is a plain UUID for this reason and no other.
    """
    teacher = make_teacher()
    course, lesson = a_course(teacher)
    pupil = enrolled(course)
    row = a_homework(teacher, lesson)
    submission = homework.submit_homework(
        pupil, homework_id=row.id, content_text="Иду прямо, потом направо"
    )
    homework.grade_submission(teacher, submission_id=submission.id, score=5, comment="Молодец")

    teacher.delete()

    from apps.homework.models import Submission

    assert not Submission.objects.filter(id=submission.id).exists()  # the original is gone
    kept = mirror.my_mirror(pupil, kind=MirrorKind.WORK)
    assert len(kept) == 1
    assert kept[0].payload["text"] == "Иду прямо, потом направо"
    assert kept[0].payload["score"] == 5
    assert kept[0].payload["comment"] == "Молодец"


def test_a_sent_summary_survives_the_teacher_too():
    teacher = make_teacher()
    course, lesson = a_course(teacher)
    pupil = enrolled(course)
    session = LessonSession.objects.create(
        lesson=lesson, start_at=timezone.now() - dt.timedelta(minutes=20)
    )
    summaries.post_chat_message(pupil, session.id, "а go straight on тоже правильно?")
    summaries.assemble(teacher, session.id)
    summaries.send(teacher, session.id)

    teacher.delete()

    kept = mirror.my_mirror(pupil, kind=MirrorKind.SUMMARY)
    assert len(kept) == 1
    texts = [item["text"] for item in kept[0].payload["items"]]
    # The lesson chat rides inside the summary, exactly as it does on screen (§4.2 п.1).
    assert "а go straight on тоже правильно?" in texts
    assert any(item["section"] == "chat" for item in kept[0].payload["items"])


# --- 🔒 the ownership boundary --------------------------------------------------------------------
def test_a_draft_summary_is_the_teachers_and_reaches_nobody():
    """«Не выдал — своё.» Sending is the act that makes a thing the class's."""
    teacher = make_teacher()
    course, lesson = a_course(teacher)
    pupil = enrolled(course)
    session = LessonSession.objects.create(lesson=lesson, start_at=timezone.now())
    summaries.assemble(teacher, session.id)

    assert mirror.my_mirror(pupil) == []


def test_a_teachers_guide_has_no_kind_it_could_be_mirrored_under():
    """The boundary as a type rather than as a promise: there is no `MirrorKind` for a
    programme, a guide or an unshared board draft, so no future call site can copy one
    without somebody first re-deciding who owns what."""
    assert {k.value for k in MirrorKind} == {"work", "summary", "achievement", "chat"}


def test_an_unshared_material_never_appears_in_a_mirror():
    """The acceptance test of Р5.0-Б, stated the way the prompt states it: «невыданная
    методичка в зеркале не появляется»."""
    from apps.courses.models import Material
    from common.enums import MaterialType

    teacher = make_teacher()
    course, lesson = a_course(teacher)
    pupil = enrolled(course)
    Material.objects.create(
        lesson=lesson, type=MaterialType.TEXT.value, title="Методичка Unit 4", body="…"
    )

    assert mirror.my_mirror(pupil) == []


# --- 🔒 no LESSON media — but the child's work is the child's, whole (§20.4.1) -------------------
def test_the_lessons_own_media_still_has_no_way_in():
    """CLAUDE.md §2.2 governs both storage points, and the mirror is not a loophole."""
    pupil = make_pupil()
    for bad in (
        {"recording": "…"},
        {"transcript": "…"},
        {"lesson_video": "s3://x"},
        {"nested": {"recording": "…"}},
        {"items": [{"lesson_audio": "…"}]},
    ):
        with pytest.raises(ValidationError):
            mirror.put(
                pupil.student_profile,
                kind=MirrorKind.WORK,
                source_id="00000000-0000-0000-0000-000000000001",
                occurred_at=timezone.now(),
                payload=bad,
            )
    assert MirroredRecord.objects.count() == 0


def test_a_childs_own_recording_of_themselves_reading_aloud_is_not_lesson_media():
    """The over-correction OWNER_SCOPE §20.4.1 names: the old rule banned the word «audio»
    and with it a child's own reading. «Никакого медиа ЗАНЯТИЯ — но работа ребёнка
    принадлежит ребёнку целиком.»"""
    pupil = make_pupil()
    row = mirror.put(
        pupil.student_profile,
        kind=MirrorKind.WORK,
        source_id="00000000-0000-0000-0000-00000000000a",
        occurred_at=timezone.now(),
        payload={
            "text": "читал вслух",
            "attachments": [{"name": "чтение.m4a", "objectKey": "sub/1/audio", "sizeBytes": 900}],
        },
    )
    assert row.payload["attachments"][0]["name"] == "чтение.m4a"


def test_it_refuses_rather_than_quietly_dropping_the_offending_part():
    """A mirror that looks complete and is not is worse than one that failed loudly — the
    one day anybody reads it is the day the original is gone."""
    pupil = make_pupil()
    with pytest.raises(ValidationError):
        mirror.put(
            pupil.student_profile,
            kind=MirrorKind.WORK,
            source_id="00000000-0000-0000-0000-000000000002",
            occurred_at=timezone.now(),
            payload={"text": "моя работа", "transcript": "…"},
        )
    assert MirroredRecord.objects.count() == 0


def test_a_record_is_a_record_not_a_document_store():
    pupil = make_pupil()
    with pytest.raises(ValidationError):
        mirror.put(
            pupil.student_profile,
            kind=MirrorKind.WORK,
            source_id="00000000-0000-0000-0000-000000000003",
            occurred_at=timezone.now(),
            payload={"text": "x" * (mirror.MAX_TEXT + 1)},
        )


def test_the_mirror_physically_copies_the_file_it_does_not_point_at_the_teachers_machine(
    settings, tmp_path
):
    """🔴 The red debt of Р5.2, with real bytes on a real disk.

    Recording the teacher's object key works right up to the day the cabinet moves onto their
    laptop — and then fails silently: the record is there, the file does not open. So this
    runs on the LOCAL backend (the desktop profile), removes the source the way a switched-off
    laptop does, and reads the child's essay back out of the mirror.
    """
    from apps.homework.models import SubmissionFile

    settings.STORAGE_BACKEND = "local"
    settings.LOCAL_STORAGE_ROOT = str(tmp_path)

    teacher = make_teacher()
    course, lesson = a_course(teacher)
    pupil = enrolled(course)
    row = a_homework(teacher, lesson)
    submission = homework.submit_homework(pupil, homework_id=row.id, content_text="сочинение")

    source_key = f"submission/{pupil.id}/abc/essay.pdf"
    source = tmp_path / source_key
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_bytes(b"%PDF-1.4 moya rabota")
    SubmissionFile.objects.create(submission=submission, file_key=source_key, name="essay.pdf")

    mirror.mirror_submission(submission)

    kept = mirror.my_mirror(pupil, kind=MirrorKind.WORK)[0]
    attachment = kept.payload["attachments"][0]
    # The mirror points at ITS OWN copy, in the pupil's namespace — never at the original.
    assert attachment["objectKey"] != source_key
    assert attachment["objectKey"].startswith(f"mirror/{pupil.id}/")
    assert attachment["name"] == "essay.pdf"

    # The teacher goes, and with them the machine holding the original.
    teacher.delete()
    source.unlink()

    from apps.homework.models import Submission

    assert not Submission.objects.filter(id=submission.id).exists()
    kept = mirror.my_mirror(pupil, kind=MirrorKind.WORK)[0]
    key = kept.payload["attachments"][0]["objectKey"]
    assert (tmp_path / key).read_bytes() == b"%PDF-1.4 moya rabota"
    assert mirror.mirrored_file_url(pupil, record_id=kept.id, object_key=key)


def test_a_file_that_is_not_there_is_left_out_rather_than_recorded_as_a_dead_key(
    settings, tmp_path
):
    """Recording a key that resolves to nothing is the very failure the copy exists to
    prevent — a record that looks complete and opens to an error."""
    from apps.homework.models import SubmissionFile

    settings.STORAGE_BACKEND = "local"
    settings.LOCAL_STORAGE_ROOT = str(tmp_path)

    teacher = make_teacher()
    course, lesson = a_course(teacher)
    pupil = enrolled(course)
    row = a_homework(teacher, lesson)
    submission = homework.submit_homework(pupil, homework_id=row.id, content_text="текст")
    SubmissionFile.objects.create(
        submission=submission, file_key="submission/missing/x.pdf", name="x.pdf"
    )

    mirror.mirror_submission(submission)

    kept = mirror.my_mirror(pupil, kind=MirrorKind.WORK)[0]
    assert kept.payload["attachments"] == []
    assert kept.payload["text"] == "текст"


def test_a_valid_record_id_cannot_be_used_to_fish_for_other_objects():
    """The key has to be one this record actually carries."""
    teacher = make_teacher()
    course, lesson = a_course(teacher)
    pupil = enrolled(course)
    row = a_homework(teacher, lesson)
    homework.submit_homework(pupil, homework_id=row.id, content_text="текст")
    kept = mirror.my_mirror(pupil, kind=MirrorKind.WORK)[0]

    with pytest.raises(NotFound):
        mirror.mirrored_file_url(pupil, record_id=kept.id, object_key="sub/somebody-else/x.pdf")


def test_somebody_elses_mirrored_file_is_not_found():
    anya = make_pupil("a@example.com", "Аня")
    boris = make_pupil("b@example.com", "Борис")
    record = mirror.put(
        anya.student_profile,
        kind=MirrorKind.WORK,
        source_id="00000000-0000-0000-0000-00000000000b",
        occurred_at=timezone.now(),
        payload={"attachments": [{"name": "x.pdf", "objectKey": "sub/anya/x.pdf"}]},
    )
    with pytest.raises(NotFound):
        mirror.mirrored_file_url(boris, record_id=record.id, object_key="sub/anya/x.pdf")


def test_an_oversized_attachment_is_left_out_and_the_work_still_mirrors(settings, tmp_path):
    """The fence is against lesson media, not economy (§20.4.1). A work whose essay is kept
    and whose one impossible attachment is not is worth far more to a child than nothing."""
    from unittest.mock import patch

    from apps.homework.models import SubmissionFile

    settings.STORAGE_BACKEND = "local"
    settings.LOCAL_STORAGE_ROOT = str(tmp_path)

    teacher = make_teacher()
    course, lesson = a_course(teacher)
    pupil = enrolled(course)
    row = a_homework(teacher, lesson)
    submission = homework.submit_homework(pupil, homework_id=row.id, content_text="сочинение")
    SubmissionFile.objects.create(submission=submission, file_key="sub/anya/huge", name="huge.mov")

    with patch(
        "common.storage.head",
        return_value={"size": mirror.MAX_ATTACHMENT_BYTES + 1, "content_type": "video/quicktime"},
    ):
        mirror.mirror_submission(submission)

    kept = mirror.my_mirror(pupil, kind=MirrorKind.WORK)[0]
    assert kept.payload["attachments"] == []
    assert kept.payload["text"] == "сочинение"


# --- 🔒 one attempt = one record (§20.4.2) ------------------------------------------------------
def test_a_test_hand_in_is_one_document_with_every_answer_inside_it():
    """«Ученик получает документ, а не журнал событий.» One go = one record; the answers ride
    inside it rather than as a row per keystroke."""
    from apps.exercises import services as exercises
    from apps.exercises.models import Exercise, ExerciseSet
    from common.enums import AttemptContext, ExerciseKind, ExerciseMode

    teacher = make_teacher()
    course, lesson = a_course(teacher)
    pupil = enrolled(course)
    row = a_homework(teacher, lesson)
    exercise_set = ExerciseSet.objects.create(
        lesson=lesson, title="Тест", mode=ExerciseMode.HOMEWORK.value, homework=row
    )
    first = Exercise.objects.create(
        exercise_set=exercise_set,
        kind=ExerciseKind.CHOICE.value,
        prompt={"text": "how do I ___ to the station?"},
        payload={"options": ["come", "get"]},
        answer_key={"correct": 1},
        order=0,
    )
    second = Exercise.objects.create(
        exercise_set=exercise_set,
        kind=ExerciseKind.CHOICE.value,
        prompt={"text": "Is it ___ from here?"},
        payload={"options": ["far", "near"]},
        answer_key={"correct": 0},
        order=1,
    )
    exercises.record_attempt(
        pupil, first.id, response={"choice": 1}, context=AttemptContext.HOMEWORK
    )
    exercises.record_attempt(
        pupil, second.id, response={"choice": 1}, context=AttemptContext.HOMEWORK
    )

    exercises.submit_homework_set(pupil, exercise_set.id)

    kept = mirror.my_mirror(pupil, kind=MirrorKind.WORK)
    assert len(kept) == 1, "one go at the work is one record, not one per answer"
    answers = kept[0].payload["answers"]
    assert len(answers) == 2
    assert [a["isCorrect"] for a in answers] == [True, False]
    assert answers[0]["question"].startswith("how do I")


# --- 🔒 per-resolver access: the caller's own mirror, and only that ---------------------------------
def test_a_mirror_belongs_to_one_learner_and_the_query_takes_no_id():
    teacher = make_teacher()
    course, lesson = a_course(teacher)
    anya = enrolled(course, "a@example.com", "Аня")
    boris = enrolled(course, "b@example.com", "Борис")
    row = a_homework(teacher, lesson)
    homework.submit_homework(anya, homework_id=row.id, content_text="Анина работа")

    assert len(mirror.my_mirror(anya)) == 1
    assert mirror.my_mirror(boris) == []


def test_a_teacher_has_no_mirror_of_their_own_here():
    teacher = make_teacher()
    with pytest.raises(PermissionDenied):
        mirror.my_mirror(teacher)


# --- how it is filled ---------------------------------------------------------------------------------
def test_mirroring_happens_on_the_event_not_on_a_schedule():
    """«По факту события», so a pupil who refreshes a second later sees it — there is no
    batch job in this codebase and there is deliberately no place for one."""
    teacher = make_teacher()
    course, lesson = a_course(teacher)
    pupil = enrolled(course)
    row = a_homework(teacher, lesson)

    assert mirror.my_mirror(pupil) == []
    homework.submit_homework(pupil, homework_id=row.id, content_text="сдал")
    assert len(mirror.my_mirror(pupil)) == 1


def test_every_attempt_is_kept_because_a_retake_is_not_an_overwrite():
    """«Его работы, все попытки и пересдачи» — each attempt is its own row and its own copy."""
    teacher = make_teacher()
    course, lesson = a_course(teacher)
    pupil = enrolled(course)
    row = homework.create_homework(
        teacher,
        lesson_id=lesson.id,
        title="Описать дорогу",
        type=HomeworkType.TEXT.value,
        allow_redo=True,
    )
    homework.publish_homework(teacher, row.id)

    homework.submit_homework(pupil, homework_id=row.id, content_text="первая попытка")
    homework.submit_homework(pupil, homework_id=row.id, content_text="вторая попытка")

    kept = mirror.my_mirror(pupil, kind=MirrorKind.WORK)
    assert sorted(k.payload["text"] for k in kept) == ["вторая попытка", "первая попытка"]


def test_re_grading_updates_the_copy_rather_than_adding_a_second():
    """The mirror answers «what is true», not «what happened to the row»."""
    teacher = make_teacher()
    course, lesson = a_course(teacher)
    pupil = enrolled(course)
    row = a_homework(teacher, lesson)
    submission = homework.submit_homework(pupil, homework_id=row.id, content_text="работа")

    homework.grade_submission(teacher, submission_id=submission.id, score=3)
    homework.grade_submission(teacher, submission_id=submission.id, score=5)

    kept = mirror.my_mirror(pupil, kind=MirrorKind.WORK)
    assert len(kept) == 1
    assert kept[0].payload["score"] == 5


def test_a_failed_copy_never_costs_a_child_their_submission():
    """A pupil who has handed in their homework has done their part. Losing that because a
    copy step failed would be the worst possible trade."""
    from unittest.mock import patch

    teacher = make_teacher()
    course, lesson = a_course(teacher)
    pupil = enrolled(course)
    row = a_homework(teacher, lesson)

    with patch.object(mirror, "mirror_submission", side_effect=RuntimeError("mirror down")):
        submission = homework.submit_homework(pupil, homework_id=row.id, content_text="сдал")

    from apps.homework.models import Submission

    assert Submission.objects.filter(id=submission.id).exists()
    assert mirror.my_mirror(pupil) == []


def test_a_mirrored_key_never_sits_in_the_teachers_namespace():
    """The copy is only a copy if it lives somewhere the teacher's departure cannot reach."""
    key = mirror.mirror_key("stu-1", "sub-2", "моя работа.pdf")
    assert key.startswith("mirror/stu-1/sub-2/")
    assert "submission/" not in key


def test_an_object_key_cannot_climb_out_of_the_storage_root(settings, tmp_path):
    """A key arrives from a database column, and a column is only as trustworthy as everything
    that ever wrote to it. `../` must not become a path on the teacher's disk."""
    from common import storage

    settings.STORAGE_BACKEND = "local"
    settings.LOCAL_STORAGE_ROOT = str(tmp_path)

    assert storage.head("../../etc/passwd") is None
    assert storage.copy("../../etc/passwd", "mirror/x/y/z") is False
