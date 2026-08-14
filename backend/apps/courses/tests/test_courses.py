"""Service-level tests for the courses domain (logic + permission boundaries)."""

from datetime import date

import pytest

from apps.accounts import services as accounts
from apps.courses import services
from apps.courses.models import Enrollment, Section
from common import storage
from common.enums import CourseStatus, EnrollmentStatus, MaterialType, Role
from common.exceptions import PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


def make_teacher(email="teacher@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Иван",
        last_name="Петров",
        role=Role.TEACHER,
        specialty="Математика",
    )


def make_student(email="student@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Пётр",
        last_name="Сидоров",
        role=Role.STUDENT,
        birth_date=date(2008, 1, 1),
        consent_152fz=True,
    )


def test_create_course_requires_teacher():
    parent = accounts.register_user(
        email="p@example.com",
        password="strongpass1!",
        first_name="A",
        last_name="B",
        role=Role.PARENT,
    )
    with pytest.raises(PermissionDenied):
        services.create_course(parent, title="Алгебра", subject="Математика", level="grade_7")


def test_create_and_publish_course():
    teacher = make_teacher()
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    assert course.status == CourseStatus.DRAFT.value
    published = services.publish_course(teacher, course.id)
    assert published.status == CourseStatus.PUBLISHED.value


def test_non_owner_cannot_edit_course():
    owner = make_teacher("owner@example.com")
    other = make_teacher("other@example.com")
    course = services.create_course(owner, title="Алгебра", subject="Математика", level="grade_7")
    with pytest.raises(PermissionDenied):
        services.update_course(other, course.id, title="Взлом")


def test_unpublish_course_is_owner_only_and_reversible():
    """Atlas 04 "Снять с публикации": PUBLISHED → DRAFT, owner-only (distinct from archive)."""
    owner = make_teacher("unpub.owner@example.com")
    other = make_teacher("unpub.other@example.com")
    course = services.create_course(owner, title="Алгебра", subject="Математика", level="grade_7")
    services.publish_course(owner, course.id)

    with pytest.raises(PermissionDenied):
        services.unpublish_course(other, course.id)
    unpublished = services.unpublish_course(owner, course.id)
    assert unpublished.status == CourseStatus.DRAFT.value  # back to draft, not ARCHIVED


def test_catalog_returns_only_published():
    teacher = make_teacher()
    draft = services.create_course(teacher, title="Черновик", subject="Физика", level="grade_8")
    published = services.create_course(teacher, title="Готовый", subject="Физика", level="grade_8")
    services.publish_course(teacher, published.id)
    ids = set(services.published_courses().values_list("id", flat=True))
    assert published.id in ids
    assert draft.id not in ids


def test_catalog_subject_count_is_distinct_over_published():
    """Atlas 04 meta "N курса · M предметов": distinct subjects across the PUBLISHED catalog
    (drafts excluded), reflecting the active filter."""
    teacher = make_teacher()
    for title, subj in [
        ("Алгебра", "Математика"),
        ("Геометрия", "Математика"),
        ("Оптика", "Физика"),
    ]:
        c = services.create_course(teacher, title=title, subject=subj, level="grade_7")
        services.publish_course(teacher, c.id)
    draft = services.create_course(teacher, title="Черновик", subject="Химия", level="grade_7")
    assert draft.status == CourseStatus.DRAFT.value

    assert services.published_courses().count() == 3  # 3 published (draft/Химия excluded)
    assert services.published_subject_count() == 2  # Математика, Физика — not Химия
    # Filtered subject-count stays consistent with the filter.
    assert services.published_subject_count(subject="Матем") == 1


def test_catalog_search_matches_subject_and_teacher_name():
    """The search box promises "курс, предмет или преподаватель" — match subject and the
    owning teacher's name, not only title/description (atlas 04)."""
    teacher = make_teacher("t.search@example.com")  # first_name Иван, last_name Петров
    course = services.create_course(
        teacher, title="Готовый курс", subject="Биология", level="grade_9"
    )
    services.publish_course(teacher, course.id)

    by_subject = set(services.published_courses(search="биолог").values_list("id", flat=True))
    by_teacher = set(services.published_courses(search="Петров").values_list("id", flat=True))
    assert course.id in by_subject
    assert course.id in by_teacher


def test_enroll_published_only_and_no_duplicates():
    teacher = make_teacher()
    student = make_student()
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    with pytest.raises(ValidationError):
        services.enroll(student, course.id)  # still a draft
    services.publish_course(teacher, course.id)
    services.enroll(student, course.id)
    services.enroll(student, course.id)  # idempotent
    assert Enrollment.objects.filter(course=course).count() == 1


def test_enroll_requires_student():
    teacher = make_teacher()
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    services.publish_course(teacher, course.id)
    with pytest.raises(PermissionDenied):
        services.enroll(teacher, course.id)


def test_reorder_sections():
    teacher = make_teacher()
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    a = services.create_section(teacher, course.id, title="A")
    b = services.create_section(teacher, course.id, title="B")
    c = services.create_section(teacher, course.id, title="C")
    services.reorder_sections(teacher, course.id, [c.id, a.id, b.id])
    order = list(
        Section.objects.filter(course=course).order_by("order").values_list("id", flat=True)
    )
    assert order == [c.id, a.id, b.id]


def test_mark_lesson_viewed_updates_progress():
    teacher = make_teacher()
    student = make_student()
    course = services.create_course(teacher, title="Алгебра", subject="Математика", level="grade_7")
    section = services.create_section(teacher, course.id, title="Раздел 1")
    l1 = services.create_lesson(teacher, section.id, title="Урок 1", duration_min=30)
    l2 = services.create_lesson(teacher, section.id, title="Урок 2", duration_min=30)
    services.publish_lesson(teacher, l1.id)
    services.publish_lesson(teacher, l2.id)
    services.publish_course(teacher, course.id)
    services.enroll(student, course.id)

    enrollment = services.mark_lesson_viewed(student, l1.id)
    assert enrollment.progress_pct == 50
    enrollment = services.mark_lesson_viewed(student, l2.id)
    assert enrollment.progress_pct == 100
    assert enrollment.status == EnrollmentStatus.COMPLETED.value


def test_teacher_courses_lists_own_including_drafts():
    teacher = make_teacher()
    other = make_teacher("other2@example.com")
    draft = services.create_course(teacher, title="Черновик", subject="М", level="grade_7")
    published = services.create_course(teacher, title="Готовый", subject="М", level="grade_7")
    services.publish_course(teacher, published.id)
    services.create_course(other, title="Чужой", subject="М", level="grade_7")

    ids = {c.id for c in services.teacher_courses(teacher)}
    assert ids == {draft.id, published.id}
    assert services.teacher_courses(make_student()) == []


def test_file_material_key_validation_and_download_authz(monkeypatch):
    teacher = make_teacher()
    other_teacher = make_teacher("other@example.com")
    enrolled = make_student("enrolled@example.com")
    outsider = make_student("outsider@example.com")
    course = services.create_course(teacher, title="Алгебра", subject="М", level="grade_7")
    section = services.create_section(teacher, course.id, title="Раздел")
    lesson = services.create_lesson(teacher, section.id, title="Урок", duration_min=30)
    services.publish_lesson(teacher, lesson.id)
    services.publish_course(teacher, course.id)
    services.enroll(enrolled, course.id)

    monkeypatch.setattr(
        storage, "head", lambda key: {"size": 10, "content_type": "application/pdf"}
    )

    # A FILE material needs an uploaded key…
    with pytest.raises(ValidationError):
        services.add_material(teacher, type=MaterialType.FILE, title="N", lesson_id=lesson.id)
    # …in the CALLER's own namespace (binding another teacher's key is denied)…
    with pytest.raises(PermissionDenied):
        services.add_material(
            teacher,
            type=MaterialType.FILE,
            title="N",
            lesson_id=lesson.id,
            file_key=f"material/{other_teacher.id}/x/n.pdf",
        )
    # …owner uploads in their own namespace.
    key = f"material/{teacher.id}/abc/notes.pdf"
    mat = services.add_material(
        teacher, type=MaterialType.FILE, title="Notes", lesson_id=lesson.id, file_key=key
    )
    assert mat.file_key == key

    # Download authz (enrollment-controlled): owner + enrolled get a presigned URL…
    assert services.material_file_url(teacher, mat).startswith("http")
    assert services.material_file_url(enrolled, mat).startswith("http")
    # …a non-enrolled authed user is denied (even though the course is free)…
    with pytest.raises(PermissionDenied):
        services.material_file_url(outsider, mat)
    # …and anonymous is denied.
    with pytest.raises(PermissionDenied):
        services.material_file_url(None, mat)
