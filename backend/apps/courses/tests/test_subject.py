"""Subject cabinet — atlas sheet 01, first half (PROMPT_13 R1.1).

What is worth pinning: the access chokepoint is not bypassed by the new entry point, the
two material blocks never mix, and a learner's saved items are theirs alone.
"""

from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.courses import subject
from apps.courses.models import Lesson, SavedItem
from apps.courses.subject import LessonProgress
from apps.homework import services as homework
from apps.institutions.models import Institution, InstitutionMembership
from apps.scheduling.models import LessonSession
from common.enums import (
    HomeworkType,
    LearningProfileKind,
    LessonKind,
    MaterialType,
    MembershipRole,
    MembershipStatus,
    Role,
    SavedItemKind,
)
from common.exceptions import NotFound

pytestmark = pytest.mark.django_db


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Мария",
        last_name="Петровна",
        role=Role.TEACHER,
        specialty="Астрономия",
    )


def make_pupil(email="p@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2010, 1, 1),
    )


def build_course(teacher, *, institution=None, lessons=("Урок 1", "Урок 2", "Урок 3")):
    if institution is not None:
        InstitutionMembership.objects.get_or_create(
            user=teacher,
            institution=institution,
            defaults={
                "role": MembershipRole.TEACHER.value,
                "status": MembershipStatus.ACTIVE.value,
            },
        )
    course = courses.create_course(
        teacher,
        title="Астрономия",
        subject="Астрономия",
        level="grade_9",
        institution_id=(institution.id if institution else None),
    )
    section = courses.create_section(teacher, course.id, title="Раздел 2 · Планетные системы")
    made = []
    for title in lessons:
        lesson = courses.create_lesson(teacher, section.id, title=title, duration_min=45)
        courses.publish_lesson(teacher, lesson.id)
        made.append(lesson)
    courses.publish_course(teacher, course.id)
    return course, section, made


# --- access ------------------------------------------------------------------------------------
def test_a_stranger_cannot_open_someone_elses_subject():
    """can_access_course is not bypassed by the new entry point, and the refusal does not
    confirm that the course exists."""
    teacher = make_teacher()
    course, _, _ = build_course(teacher)
    stranger = make_pupil("stranger@example.com")

    with pytest.raises(NotFound):
        subject.subject_cabinet(stranger, course.id)


def test_an_enrolled_pupil_opens_it_and_the_owner_too():
    teacher = make_teacher()
    course, _, _ = build_course(teacher)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)

    assert subject.subject_cabinet(pupil, course.id).title == "Астрономия"
    assert subject.subject_cabinet(teacher, course.id).profile_kind is LearningProfileKind.TEACHER


def test_draft_lessons_stay_owner_only():
    """The same rule visible_lessons applies elsewhere: an unpublished lesson is not part of
    a learner's programme."""
    teacher = make_teacher()
    course, section, _ = build_course(teacher)
    courses.create_lesson(teacher, section.id, title="Черновик", duration_min=30)  # unpublished
    pupil = make_pupil()
    courses.enroll(pupil, course.id)

    learner_titles = [
        lesson.title
        for s in subject.subject_cabinet(pupil, course.id).sections
        for lesson in s.lessons
    ]
    owner_titles = [
        lesson.title
        for s in subject.subject_cabinet(teacher, course.id).sections
        for lesson in s.lessons
    ]
    assert "Черновик" not in learner_titles
    assert "Черновик" in owner_titles


# --- lessons -------------------------------------------------------------------------------------
def test_lesson_marks_are_done_current_ahead():
    """The sheet's ✓ / › / blank: everything viewed is done, the first unfinished one is
    current, the rest are ahead."""
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    courses.mark_lesson_viewed(pupil, lessons[0].id)

    cabinet = subject.subject_cabinet(pupil, course.id)
    (section,) = cabinet.sections
    assert [x.progress for x in section.lessons] == [
        LessonProgress.DONE,
        LessonProgress.CURRENT,
        LessonProgress.AHEAD,
    ]
    assert section.done_lessons == 1 and section.total_lessons == 3
    # "Продолжить с того места" — the rail's nearest action for a self-paced learner.
    assert cabinet.next_lesson is not None and cabinet.next_lesson.title == "Урок 2"


def test_a_scheduled_lesson_carries_its_session_and_live_flag():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    session = LessonSession.objects.create(
        lesson=lessons[0], start_at=timezone.now() + timedelta(minutes=17)
    )

    lesson = subject.subject_cabinet(pupil, course.id).sections[0].lessons[0]
    assert lesson.session_id == str(session.id) and lesson.is_live is False

    session.status = "live"
    session.save(update_fields=["status"])
    assert subject.subject_cabinet(pupil, course.id).sections[0].lessons[0].is_live


def test_an_external_device_lesson_keeps_its_kind_and_device():
    """Owner decision: the telescope lesson stays in the programme; the client sends the
    learner to the instrument's own page when they start it (that page is a later phase)."""
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    Lesson.objects.filter(id=lessons[2].id).update(
        kind=LessonKind.EXTERNAL_DEVICE.value, device_key="microobservatory"
    )
    pupil = make_pupil()
    courses.enroll(pupil, course.id)

    device_lesson = subject.subject_cabinet(pupil, course.id).sections[0].lessons[2]
    assert device_lesson.kind is LessonKind.EXTERNAL_DEVICE
    assert device_lesson.device_key == "microobservatory"
    # Ordinary lessons stay ordinary — the kind is opt-in per lesson.
    assert (
        subject.subject_cabinet(pupil, course.id).sections[0].lessons[0].kind is LessonKind.STANDARD
    )


def test_teacher_sees_group_counts_not_a_list_of_children():
    """Sheet 01: the teacher gets "22 из 24" per lesson — coverage of the group, never a
    per-child efficiency profile."""
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    first = make_pupil("a@example.com")
    second = make_pupil("b@example.com")
    for pupil in (first, second):
        courses.enroll(pupil, course.id)
    courses.mark_lesson_viewed(first, lessons[0].id)

    cabinet = subject.subject_cabinet(teacher, course.id)
    lesson = cabinet.sections[0].lessons[0]
    assert lesson.completed_by == 1 and lesson.group_size == 2
    assert cabinet.student_count == 2
    # No structure here can carry a per-pupil breakdown.
    assert not hasattr(lesson, "students")


def test_a_pupil_sees_their_own_mark_on_a_lesson():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    item = homework.create_homework(
        teacher, title="Лабораторная", type=HomeworkType.TEXT, lesson_id=lessons[0].id
    )
    homework.publish_homework(teacher, item.id)
    submission = homework.submit_homework(pupil, homework_id=item.id, content_text="ответ")
    homework.grade_submission(teacher, submission_id=submission.id, score=5)

    lesson = subject.subject_cabinet(pupil, course.id).sections[0].lessons[0]
    assert lesson.grade == 5 and lesson.has_homework


# --- materials ------------------------------------------------------------------------------------
def test_teacher_materials_and_personal_saves_never_share_a_list():
    """The split is the point of the tab: authority above, personal finds below."""
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    courses.add_material(
        teacher,
        type=MaterialType.LINK,
        title="NASA Exoplanet Archive",
        lesson_id=lessons[0].id,
        url="https://exoplanetarchive.ipac.caltech.edu/",
    )
    subject.save_item(
        pupil,
        course_id=course.id,
        title="Met Open Access",
        url="https://www.metmuseum.org/",
        source_name="The Met",
        kind=SavedItemKind.WATCH_LATER,
    )

    cabinet = subject.subject_cabinet(pupil, course.id)
    assert [m.title for m in cabinet.materials] == ["NASA Exoplanet Archive"]
    assert [m.title for m in cabinet.saved_materials] == ["Met Open Access"]
    assert cabinet.saved_materials[0].saved_kind is SavedItemKind.WATCH_LATER


def test_saving_a_course_material_marks_it_as_kept():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    material = courses.add_material(
        teacher,
        type=MaterialType.LINK,
        title="NASA Live",
        lesson_id=lessons[0].id,
        url="https://www.nasa.gov/live",
    )

    before = subject.subject_cabinet(pupil, course.id).materials[0]
    assert before.saved_id is None

    subject.save_item(pupil, material_id=material.id, note="взять массу и период")
    after = subject.subject_cabinet(pupil, course.id)
    assert after.materials[0].saved_id is not None  # the quiet corner can now un-save it
    assert after.saved_materials[0].note == "взять массу и период"


def test_saving_the_same_material_twice_updates_rather_than_duplicates():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    material = courses.add_material(
        teacher,
        type=MaterialType.LINK,
        title="NASA Live",
        lesson_id=lessons[0].id,
        url="https://www.nasa.gov/live",
    )
    subject.save_item(pupil, material_id=material.id, note="первая заметка")
    subject.save_item(pupil, material_id=material.id, note="вторая заметка")

    rows = SavedItem.objects.filter(user=pupil, material=material)
    assert rows.count() == 1 and rows.first().note == "вторая заметка"


def test_cannot_save_a_material_from_a_course_you_cannot_open():
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    material = courses.add_material(
        teacher,
        type=MaterialType.LINK,
        title="Закрытое",
        lesson_id=lessons[0].id,
        url="https://example.org/",
    )
    stranger = make_pupil("stranger@example.com")

    with pytest.raises(NotFound):
        subject.save_item(stranger, material_id=material.id)
    assert SavedItem.objects.count() == 0


def test_saved_items_are_private_to_their_owner():
    teacher = make_teacher()
    course, _, _ = build_course(teacher)
    mine = make_pupil("mine@example.com")
    theirs = make_pupil("theirs@example.com")
    for pupil in (mine, theirs):
        courses.enroll(pupil, course.id)
    row = subject.save_item(mine, course_id=course.id, title="Моё", url="https://example.org/")

    assert subject.my_saved_items(theirs) == []
    assert [x.id for x in subject.my_saved_items(mine)] == [row.id]
    with pytest.raises(NotFound):  # someone else's item is simply not found
        subject.remove_saved_item(theirs, row.id)
    assert subject.remove_saved_item(mine, row.id) is True


def test_sharing_hands_over_the_link_never_a_copy():
    """Owner req. 12 / RND_02 §1: we pass the source on, we do not copy its content."""
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    material = courses.add_material(
        teacher,
        type=MaterialType.LINK,
        title="NASA Live",
        lesson_id=lessons[0].id,
        url="https://www.nasa.gov/live",
    )
    assert subject.share_link(pupil, material_id=material.id) == "https://www.nasa.gov/live"

    stranger = make_pupil("stranger@example.com")
    with pytest.raises(NotFound):
        subject.share_link(stranger, material_id=material.id)


def test_rail_sources_separate_in_lesson_from_recommendations():
    """Two zones, visibly different. The recommendation zone needs the sources hub, so it
    stays empty for now instead of being filled with guesses."""
    teacher = make_teacher()
    course, _, lessons = build_course(teacher)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)
    courses.add_material(
        teacher,
        type=MaterialType.LINK,
        title="NASA Live",
        lesson_id=lessons[0].id,
        url="https://www.nasa.gov/live",
    )
    courses.add_material(
        teacher, type=MaterialType.TEXT, title="Конспект", lesson_id=lessons[0].id, body="текст"
    )

    sources = subject.subject_cabinet(pupil, course.id).sources
    assert [s.name for s in sources] == ["NASA Live"]  # only links become rail sources
    assert all(s.in_lesson for s in sources)


def test_a_self_paced_course_reads_as_a_cadet_context():
    teacher = make_teacher()
    course, _, _ = build_course(teacher, institution=None)
    pupil = make_pupil()
    courses.enroll(pupil, course.id)

    cabinet = subject.subject_cabinet(pupil, course.id)
    assert cabinet.profile_kind is LearningProfileKind.CADET
    assert cabinet.institution_name is None


def test_a_school_subject_reads_as_a_pupil_context_with_its_class():
    from apps.institutions.models import Group, GroupMembership

    teacher = make_teacher()
    school = Institution.objects.create(name="Гимназия №1")
    course, _, _ = build_course(teacher, institution=school)
    pupil = make_pupil()
    InstitutionMembership.objects.create(
        user=pupil,
        institution=school,
        role=MembershipRole.STUDENT.value,
        status=MembershipStatus.ACTIVE.value,
    )
    GroupMembership.objects.create(
        group=Group.objects.create(institution=school, name="9А"), student=pupil.student_profile
    )
    courses.enroll(pupil, course.id)

    cabinet = subject.subject_cabinet(pupil, course.id)
    assert cabinet.profile_kind is LearningProfileKind.PUPIL
    assert cabinet.institution_name == "Гимназия №1" and cabinet.group_name == "9А"
    assert cabinet.teacher_name == "Мария Петровна"
