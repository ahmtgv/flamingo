"""The subject cabinet — atlas sheet 01, first half (lessons · materials · rail).

One frame for pupil, cadet and teacher: a subject header, tabs, work on the left, a rail on
the right. What differs is the filling, not the structure.

Two rules from the sheet are load-bearing here and are enforced in this module:

* **Materials are split, hard.** What the teacher and the programme gave sits above what the
  learner saved themselves. The sheet calls the separation principled — a teacher's
  authority must not be mixed with personal finds — so the two never share a list.
* **A learner sees a subject only through the access chokepoint.** Every entry point calls
  ``can_access_course``; nothing here re-implements that decision.

Rows carry data, never display text: the client words "6 из 8 пройдено" and the lesson chips
from `kind` + counts through i18n.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from enum import Enum

import strawberry
from django.utils import timezone

from common.enums import (
    LearningProfileKind,
    LessonKind,
    LessonStatus,
    MaterialType,
    Role,
    SavedItemKind,
    SessionStatus,
    SubmissionStatus,
)
from common.exceptions import NotFound, PermissionDenied

from .access import can_access_course
from .models import Course, Enrollment, Material, SavedItem


@strawberry.enum
class LessonProgress(Enum):
    """Where a lesson sits for this viewer — the sheet's ✓ / › / blank marks."""

    DONE = "done"
    CURRENT = "current"
    AHEAD = "ahead"


@dataclass(frozen=True)
class SubjectLesson:
    id: str
    title: str
    subtitle: str | None
    progress: LessonProgress
    kind: LessonKind
    device_key: str | None
    order_label: str  # "Урок 12" is composed client-side from this index
    material_count: int
    has_homework: bool
    session_id: str | None = None
    session_at: dt.datetime | None = None
    is_live: bool = False
    grade: int | None = None  # pupil: the mark for this lesson's work
    completed_by: int | None = None  # teacher: how many of the group finished it
    group_size: int | None = None


@dataclass(frozen=True)
class SubjectSection:
    id: str
    title: str
    done_lessons: int
    total_lessons: int
    lessons: list[SubjectLesson] = field(default_factory=list)


@dataclass(frozen=True)
class SubjectMaterial:
    """A material handed down by the teacher/programme, or a learner's own saved item.
    `saved_id` is set when the viewer already keeps it, so the quiet corner can toggle."""

    id: str
    title: str
    subtitle: str | None
    type: MaterialType | None
    url: str | None
    from_label: str | None  # who it came from: teacher name / programme / source name
    lesson_id: str | None
    saved_id: str | None = None
    note: str | None = None
    saved_kind: SavedItemKind | None = None


@dataclass(frozen=True)
class SubjectSource:
    """A rail source. `in_lesson` separates "given in the lesson" from "recommended around
    the topic" — the sheet insists the two zones stay visibly different."""

    id: str
    name: str
    source_name: str | None
    url: str | None
    note: str | None
    in_lesson: bool
    saved_id: str | None = None


@dataclass(frozen=True)
class SubjectCabinet:
    course_id: str
    title: str
    profile_kind: LearningProfileKind
    institution_name: str | None
    group_name: str | None
    teacher_name: str | None
    teacher_id: str | None
    lesson_count: int
    student_count: int | None
    progress_pct: int
    sections: list[SubjectSection]
    materials: list[SubjectMaterial]
    saved_materials: list[SubjectMaterial]
    sources: list[SubjectSource]
    next_lesson: SubjectLesson | None


# --- helpers ---------------------------------------------------------------------------------
def _course_or_deny(user, course_id) -> Course:
    """Load a course the caller may actually open.

    The chokepoint decides: owner, institutional group member, or ACTIVE enrolment. A course
    the viewer has no relation to is NotFound rather than PermissionDenied — we do not
    confirm that someone else's subject exists.
    """
    course = (
        Course.objects.filter(id=course_id).select_related("owner__user", "institution").first()
    )
    if course is None:
        raise NotFound("Course not found")
    if not can_access_course(user, course):
        raise NotFound("Course not found")
    return course


def _viewer_kind(user, course: Course) -> LearningProfileKind:
    if course.owner.user_id == getattr(user, "id", None):
        return LearningProfileKind.TEACHER
    # A school subject has an institution behind it; a standalone course is self-paced.
    return LearningProfileKind.PUPIL if course.institution_id else LearningProfileKind.CADET


def _sessions_by_lesson(course: Course) -> dict[str, object]:
    """The next (or running) session per lesson — what makes a lesson "сегодня 10:15"."""
    from apps.scheduling.models import LessonSession

    now = timezone.now()
    found: dict[str, object] = {}
    for session in (
        LessonSession.objects.filter(lesson__section__course=course)
        .exclude(status=SessionStatus.CANCELED.value)
        .order_by("start_at")
    ):
        key = str(session.lesson_id)
        if key in found:
            continue
        if session.status == SessionStatus.LIVE.value or session.start_at >= now - dt.timedelta(
            hours=3
        ):
            found[key] = session
    return found


def _grades_by_lesson(user, course: Course) -> dict[str, int]:
    from apps.homework.models import Submission

    student_profile = getattr(user, "student_profile", None)
    if student_profile is None:
        return {}
    grades: dict[str, int] = {}
    for lesson_id, score in (
        Submission.objects.filter(
            student=student_profile,
            status=SubmissionStatus.GRADED.value,
            homework__lesson__section__course=course,
        )
        .order_by("-graded_at")
        .values_list("homework__lesson_id", "score")
    ):
        if lesson_id is not None and str(lesson_id) not in grades and score is not None:
            grades[str(lesson_id)] = score
    return grades


def _homework_lesson_ids(course: Course) -> set[str]:
    from apps.homework.models import Homework

    return {
        str(lesson_id)
        for lesson_id in Homework.objects.filter(
            lesson__section__course=course, published_at__isnull=False
        ).values_list("lesson_id", flat=True)
        if lesson_id
    }


def _group_completion(course: Course) -> tuple[dict[str, int], int]:
    """How many of the group finished each lesson — the teacher's "22 из 24".

    Deliberately a COUNT, never a per-pupil list: sheet 01 says the teacher sees topic
    coverage for the group, not efficiency profiles of children.
    """
    completed: dict[str, int] = {}
    enrolments = list(
        Enrollment.objects.filter(course=course).values_list("viewed_lesson_ids", flat=True)
    )
    for viewed in enrolments:
        for lesson_id in viewed or []:
            key = str(lesson_id)
            completed[key] = completed.get(key, 0) + 1
    return completed, len(enrolments)


# --- composition -------------------------------------------------------------------------------
def subject_cabinet(user, course_id) -> SubjectCabinet:
    course = _course_or_deny(user, course_id)
    kind = _viewer_kind(user, course)
    is_teacher = kind is LearningProfileKind.TEACHER

    student_profile = getattr(user, "student_profile", None)
    enrolment = (
        Enrollment.objects.filter(student=student_profile, course=course).first()
        if student_profile
        else None
    )
    viewed = {str(x) for x in (enrolment.viewed_lesson_ids if enrolment else [])}
    sessions = _sessions_by_lesson(course)
    grades = _grades_by_lesson(user, course) if not is_teacher else {}
    homework_lessons = _homework_lesson_ids(course)
    completed_by, group_size = _group_completion(course) if is_teacher else ({}, 0)

    material_counts: dict[str, int] = {}
    for lesson_id in Material.objects.filter(lesson__section__course=course).values_list(
        "lesson_id", flat=True
    ):
        if lesson_id:
            material_counts[str(lesson_id)] = material_counts.get(str(lesson_id), 0) + 1

    # The programme: sections in order, published lessons only for a learner (the DRAFT
    # filter is the same rule visible_lessons applies elsewhere).
    sections: list[SubjectSection] = []
    ordinal = 0
    current_seen = False
    next_lesson: SubjectLesson | None = None

    for section in course.sections.all().order_by("order", "created_at"):
        lessons_qs = section.lessons.all().order_by("order", "created_at")
        if not is_teacher:
            lessons_qs = lessons_qs.filter(status=LessonStatus.PUBLISHED.value)

        lessons: list[SubjectLesson] = []
        for lesson in lessons_qs:
            ordinal += 1
            lesson_id = str(lesson.id)
            session = sessions.get(lesson_id)
            done = lesson_id in viewed
            live = bool(session) and getattr(session, "status", "") == SessionStatus.LIVE.value
            # "Current" is the first thing not yet done — for a pupil that is usually the
            # scheduled lesson, for a self-paced learner it is simply where they stopped.
            is_current = not done and not current_seen and (live or True)
            if is_current:
                current_seen = True

            item = SubjectLesson(
                id=lesson_id,
                title=lesson.title,
                subtitle=lesson.description or None,
                progress=(
                    LessonProgress.DONE
                    if done
                    else LessonProgress.CURRENT if is_current else LessonProgress.AHEAD
                ),
                kind=LessonKind(lesson.kind),
                device_key=lesson.device_key or None,
                order_label=str(ordinal),
                material_count=material_counts.get(lesson_id, 0),
                has_homework=lesson_id in homework_lessons,
                session_id=str(session.id) if session else None,
                session_at=getattr(session, "start_at", None),
                is_live=live,
                grade=grades.get(lesson_id),
                completed_by=completed_by.get(lesson_id, 0) if is_teacher else None,
                group_size=group_size if is_teacher else None,
            )
            lessons.append(item)
            if item.progress is LessonProgress.CURRENT and next_lesson is None:
                next_lesson = item

        sections.append(
            SubjectSection(
                id=str(section.id),
                title=section.title,
                done_lessons=sum(1 for x in lessons if x.progress is LessonProgress.DONE),
                total_lessons=len(lessons),
                lessons=lessons,
            )
        )

    materials, saved, sources = _materials_and_sources(user, course, is_teacher)

    total = sum(s.total_lessons for s in sections)
    done = sum(s.done_lessons for s in sections)
    # A learner's header shows their own progress; a teacher's shows how far the GROUP has
    # come through the programme (a group average, never a per-child figure).
    if is_teacher:
        progress_pct = _group_pct(completed_by, group_size, total)
    elif enrolment:
        progress_pct = enrolment.progress_pct
    else:
        progress_pct = round(100 * done / total) if total else 0

    return SubjectCabinet(
        course_id=str(course.id),
        title=course.title,
        profile_kind=kind,
        institution_name=course.institution.name if course.institution_id else None,
        group_name=_group_name(course, student_profile),
        teacher_name=f"{course.owner.user.first_name} {course.owner.user.last_name}".strip(),
        teacher_id=str(course.owner.user_id),
        lesson_count=total,
        student_count=group_size if is_teacher else None,
        progress_pct=progress_pct,
        sections=sections,
        materials=materials,
        saved_materials=saved,
        sources=sources,
        next_lesson=next_lesson,
    )


def _group_pct(completed_by: dict[str, int], group_size: int, total: int) -> int:
    if not group_size or not total:
        return 0
    return round(100 * sum(completed_by.values()) / (group_size * total))


def _group_name(course: Course, student_profile) -> str | None:
    from apps.institutions.models import GroupMembership

    if course.group_id:
        return course.group.name
    if student_profile is None or not course.institution_id:
        return None
    membership = (
        GroupMembership.objects.filter(
            student=student_profile, group__institution_id=course.institution_id
        )
        .select_related("group")
        .first()
    )
    return membership.group.name if membership else None


def _materials_and_sources(user, course: Course, is_teacher: bool):
    """The two material blocks and the rail's two source zones.

    They are built together because a saved item may point at a course material, and the
    quiet corner needs to know whether this viewer already keeps it.
    """
    teacher_name = f"{course.owner.user.first_name} {course.owner.user.last_name}".strip()
    saved_rows = list(
        SavedItem.objects.filter(user=user, course=course).select_related("material")
        if getattr(user, "is_authenticated", False)
        else []
    )
    saved_by_material = {str(row.material_id): row for row in saved_rows if row.material_id}

    materials: list[SubjectMaterial] = []
    for material in (
        Material.objects.filter(lesson__section__course=course)
        .select_related("lesson")
        .order_by("lesson__section__order", "lesson__order", "order")
    ):
        existing = saved_by_material.get(str(material.id))
        materials.append(
            SubjectMaterial(
                id=str(material.id),
                title=material.title,
                subtitle=material.body or None,
                type=MaterialType(material.type),
                url=material.url or None,
                from_label=teacher_name,
                lesson_id=str(material.lesson_id) if material.lesson_id else None,
                saved_id=str(existing.id) if existing else None,
            )
        )

    saved_materials = [
        SubjectMaterial(
            id=str(row.id),
            title=row.title or (row.material.title if row.material_id else ""),
            subtitle=(row.material.body or None) if row.material_id else None,
            type=MaterialType(row.material.type) if row.material_id else None,
            url=row.url or (row.material.url if row.material_id else None) or None,
            from_label=row.source_name or None,
            lesson_id=str(row.lesson_id) if row.lesson_id else None,
            saved_id=str(row.id),
            note=row.note or None,
            saved_kind=SavedItemKind(row.kind),
        )
        for row in saved_rows
    ]

    # Rail sources. "In lesson" = links the teacher attached; the second zone (recommended
    # around the topic) needs the sources hub, which is a later phase — so it stays empty
    # rather than being filled with guesses.
    sources = [
        SubjectSource(
            id=item.id,
            name=item.title,
            source_name=item.from_label,
            url=item.url,
            note=None,
            in_lesson=True,
            saved_id=item.saved_id,
        )
        for item in materials
        if item.type is MaterialType.LINK
    ]
    return materials, saved_materials, sources


# --- saving ---------------------------------------------------------------------------------
def save_item(
    user,
    *,
    course_id=None,
    lesson_id=None,
    material_id=None,
    title: str = "",
    url: str = "",
    source_name: str = "",
    note: str = "",
    kind: SavedItemKind = SavedItemKind.SAVED,
) -> SavedItem:
    """Keep a material or an external find in the viewer's own list.

    Only a link and a note are stored — never a copy of the content. Licences travel with
    the source (RND_02 §1), and "поделиться" means passing the link on, not the material.
    """
    if getattr(user, "role", None) is None:
        raise PermissionDenied("Sign in to save materials")

    course = None
    if course_id:
        course = _course_or_deny(user, course_id)  # cannot save into a course you cannot open

    material = None
    if material_id:
        material = (
            Material.objects.filter(id=material_id)
            .select_related("lesson__section__course")
            .first()
        )
        if material is None:
            raise NotFound("Material not found")
        owning_course = material.lesson.section.course if material.lesson_id else material.course
        if owning_course is None or not can_access_course(user, owning_course):
            raise NotFound("Material not found")
        course = course or owning_course
        if not title:
            title = material.title

    if material is None and not (title and url):
        raise PermissionDenied("A saved find needs a title and a link")

    existing = SavedItem.objects.filter(user=user, material=material).first() if material else None
    if existing:
        existing.note = note or existing.note
        existing.kind = kind.value
        existing.save(update_fields=["note", "kind", "updated_at"])
        return existing

    return SavedItem.objects.create(
        user=user,
        course=course,
        lesson_id=lesson_id or (material.lesson_id if material else None),
        material=material,
        title=title,
        url=url,
        source_name=source_name,
        kind=kind.value,
        note=note,
    )


def remove_saved_item(user, saved_id) -> bool:
    """Drop one of the caller's OWN saved items (someone else's is simply not found)."""
    row = SavedItem.objects.filter(id=saved_id, user=user).first()
    if row is None:
        raise NotFound("Saved item not found")
    row.delete()
    return True


def my_saved_items(user, course_id=None) -> list[SavedItem]:
    if not getattr(user, "is_authenticated", False):
        return []
    qs = SavedItem.objects.filter(user=user).select_related("material", "course")
    if course_id:
        qs = qs.filter(course_id=course_id)
    return list(qs.order_by("-created_at"))


def share_link(user, *, material_id=None, saved_id=None) -> str:
    """The link to pass on. Sharing means handing over the SOURCE, never a copy of it —
    the licence stays with the origin (owner req. 12, RND_02 §1). Chat targets arrive with
    the chat module; until then the client offers the link itself."""
    if material_id:
        material = (
            Material.objects.filter(id=material_id)
            .select_related("lesson__section__course")
            .first()
        )
        if material is None:
            raise NotFound("Material not found")
        owning_course = material.lesson.section.course if material.lesson_id else material.course
        if owning_course is None or not can_access_course(user, owning_course):
            raise NotFound("Material not found")
        return material.url or f"/lessons/{material.lesson_id}/materials/{material.id}"

    row = SavedItem.objects.filter(id=saved_id, user=user).select_related("material").first()
    if row is None:
        raise NotFound("Saved item not found")
    return row.url or (row.material.url if row.material_id else "") or ""


def is_learner(user) -> bool:
    return getattr(user, "role", None) == Role.STUDENT.value
