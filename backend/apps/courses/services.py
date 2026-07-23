"""Business logic for the courses domain. Resolvers stay thin and call these."""

from __future__ import annotations

from django.db import transaction
from django.db.models import Count, Max, Q

from apps.accounts.models import StudentProfile, TeacherProfile
from apps.files import services as files
from common import storage
from common.enums import (
    CourseStatus,
    EnrollmentStatus,
    LessonStatus,
    MaterialType,
    MembershipStatus,
    Role,
    UploadPurpose,
)
from common.exceptions import NotFound, PermissionDenied, ValidationError

from .access import can_access_course
from .models import Course, Enrollment, Lesson, Material, Section


def _val(x):
    """Accept either a (Strawberry) enum member or its raw value."""
    return x.value if hasattr(x, "value") else x


# --- permission helpers -----------------------------------------------------
def _teacher_profile(user) -> TeacherProfile:
    if getattr(user, "role", None) != Role.TEACHER.value:
        raise PermissionDenied("Only a teacher can manage courses")
    profile = TeacherProfile.objects.filter(user=user).first()
    if profile is None:
        raise PermissionDenied("Teacher profile is missing")
    return profile


def _student_profile(user) -> StudentProfile:
    if getattr(user, "role", None) != Role.STUDENT.value:
        raise PermissionDenied("Only a student can enroll")
    profile = StudentProfile.objects.filter(user=user).first()
    if profile is None:
        raise PermissionDenied("Student profile is missing")
    return profile


def _ensure_owner(user, course: Course) -> None:
    if course.owner_id != getattr(user, "id", None):
        raise PermissionDenied("Not your course")


def _get_course(course_id) -> Course:
    course = Course.objects.filter(id=course_id).first()
    if course is None:
        raise NotFound("Course not found")
    return course


def _owned_course(user, course_id) -> Course:
    _teacher_profile(user)
    course = _get_course(course_id)
    _ensure_owner(user, course)
    return course


def _resolve_institutional(user, institution_id, group_id):
    """Validate + resolve (institution, group) for an institutional (Option A) course binding.
    The acting teacher MUST be an ACTIVE member of the institution, and the group (if given) must
    belong to it — this is what makes ``can_access_course``'s group path grant content access to
    the group's students. B2C courses pass both as None → (None, None)."""
    if institution_id is None and group_id is None:
        return None, None
    from apps.institutions.models import Group, Institution, InstitutionMembership

    group = None
    if group_id is not None:
        group = Group.objects.select_related("institution").filter(id=group_id).first()
        if group is None:
            raise NotFound("Group not found")
        institution = group.institution
        if institution_id is not None and str(institution.id) != str(institution_id):
            raise ValidationError("Group does not belong to the institution")
    else:
        institution = Institution.objects.filter(id=institution_id).first()
        if institution is None:
            raise NotFound("Institution not found")
    if not InstitutionMembership.objects.filter(
        user=user, institution=institution, status=MembershipStatus.ACTIVE.value
    ).exists():
        raise PermissionDenied("Not a member of this institution")
    return institution, group


def _owned_section(user, section_id) -> Section:
    section = Section.objects.filter(id=section_id).select_related("course").first()
    if section is None:
        raise NotFound("Section not found")
    _teacher_profile(user)
    _ensure_owner(user, section.course)
    return section


def _owned_lesson(user, lesson_id) -> Lesson:
    lesson = Lesson.objects.filter(id=lesson_id).select_related("section__course").first()
    if lesson is None:
        raise NotFound("Lesson not found")
    _teacher_profile(user)
    _ensure_owner(user, lesson.section.course)
    return lesson


# --- courses ----------------------------------------------------------------
@transaction.atomic
def create_course(
    user,
    *,
    title: str,
    subject: str,
    level,
    description: str = "",
    language: str = "ru",
    cover_key: str = "",
    institution_id=None,
    group_id=None,
) -> Course:
    profile = _teacher_profile(user)
    institution, group = _resolve_institutional(user, institution_id, group_id)
    return Course.objects.create(
        owner=profile,
        title=title,
        subject=subject,
        level=_val(level),
        description=description or "",
        language=language or "ru",
        cover_key=cover_key or "",
        institution=institution,
        group=group,
    )


@transaction.atomic
def update_course(user, course_id, **fields) -> Course:
    course = _owned_course(user, course_id)
    allowed = {"title", "subject", "level", "description", "language", "cover_key"}
    for key, value in fields.items():
        if key in allowed and value is not None:
            setattr(course, key, _val(value))
    # Institutional (Option A) binding is validated, not set blindly (authz reach: group binding
    # grants group-member content access via can_access_course).
    if fields.get("institution_id") is not None or fields.get("group_id") is not None:
        institution, group = _resolve_institutional(
            user, fields.get("institution_id"), fields.get("group_id")
        )
        course.institution = institution
        course.group = group
    course.save()
    return course


def publish_course(user, course_id) -> Course:
    course = _owned_course(user, course_id)
    course.status = CourseStatus.PUBLISHED.value
    course.save(update_fields=["status", "updated_at"])
    return course


def archive_course(user, course_id) -> Course:
    course = _owned_course(user, course_id)
    course.status = CourseStatus.ARCHIVED.value
    course.save(update_fields=["status", "updated_at"])
    return course


def delete_course(user, course_id) -> bool:
    course = _owned_course(user, course_id)
    course.delete()  # soft delete
    return True


# --- sections ---------------------------------------------------------------
@transaction.atomic
def create_section(
    user, course_id, *, title: str, description: str = "", cover_key: str = ""
) -> Section:
    course = _owned_course(user, course_id)
    order = (course.sections.aggregate(m=Max("order"))["m"] or 0) + 1
    return Section.objects.create(
        course=course,
        title=title,
        description=description or "",
        cover_key=cover_key or "",
        order=order,
    )


@transaction.atomic
def update_section(user, section_id, **fields) -> Section:
    section = _owned_section(user, section_id)
    for key in ("title", "description", "cover_key"):
        if fields.get(key) is not None:
            setattr(section, key, fields[key])
    section.save()
    return section


def delete_section(user, section_id) -> bool:
    section = _owned_section(user, section_id)
    section.delete()
    return True


@transaction.atomic
def reorder_sections(user, course_id, ordered_ids: list) -> list[Section]:
    course = _owned_course(user, course_id)
    for index, section_id in enumerate(ordered_ids):
        Section.objects.filter(id=section_id, course=course).update(order=index)
    return list(course.sections.all())


# --- lessons ----------------------------------------------------------------
@transaction.atomic
def create_lesson(
    user,
    section_id,
    *,
    title: str,
    description: str = "",
    duration_min: int = 0,
    options: dict | None = None,
    schedule_rule: dict | None = None,
) -> Lesson:
    section = _owned_section(user, section_id)
    order = (section.lessons.aggregate(m=Max("order"))["m"] or 0) + 1
    create_kwargs = {
        "section": section,
        "title": title,
        "description": description or "",
        "duration_min": duration_min or 0,
        "schedule_rule": schedule_rule,
        "order": order,
    }
    if options is not None:
        create_kwargs["options"] = options
    return Lesson.objects.create(**create_kwargs)


@transaction.atomic
def update_lesson(user, lesson_id, **fields) -> Lesson:
    lesson = _owned_lesson(user, lesson_id)
    for key in ("title", "description", "duration_min", "options", "schedule_rule"):
        if fields.get(key) is not None:
            setattr(lesson, key, fields[key])
    lesson.save()
    return lesson


def publish_lesson(user, lesson_id) -> Lesson:
    lesson = _owned_lesson(user, lesson_id)
    lesson.status = LessonStatus.PUBLISHED.value
    lesson.save(update_fields=["status", "updated_at"])
    return lesson


def delete_lesson(user, lesson_id) -> bool:
    lesson = _owned_lesson(user, lesson_id)
    lesson.delete()
    return True


@transaction.atomic
def reorder_lessons(user, section_id, ordered_ids: list) -> list[Lesson]:
    section = _owned_section(user, section_id)
    for index, lesson_id in enumerate(ordered_ids):
        Lesson.objects.filter(id=lesson_id, section=section).update(order=index)
    return list(section.lessons.all())


# --- materials --------------------------------------------------------------
@transaction.atomic
def add_material(
    user,
    *,
    type,
    title: str,
    lesson_id=None,
    course_id=None,
    file_key: str = "",
    url: str = "",
    body: str = "",
) -> Material:
    lesson = None
    if lesson_id is not None:
        lesson = _owned_lesson(user, lesson_id)
        course = lesson.section.course
    elif course_id is not None:
        course = _owned_course(user, course_id)
    else:
        raise ValidationError("Material needs a lesson or a course")
    if _val(type) == MaterialType.FILE.value:
        # FILE materials carry an uploaded object. Bind-time: the key must be in THIS teacher's
        # own MATERIAL namespace, and the object must exist within the size/type limit.
        if not file_key:
            raise ValidationError("A FILE material needs an uploaded file")
        files.assert_caller_key(user, file_key, UploadPurpose.MATERIAL)
        files.validate_uploaded(file_key, UploadPurpose.MATERIAL)
    sibling = Material.objects.filter(lesson=lesson, course=None if lesson else course)
    order = (sibling.aggregate(m=Max("order"))["m"] or 0) + 1
    return Material.objects.create(
        lesson=lesson,
        course=None if lesson else course,
        type=_val(type),
        title=title,
        file_key=file_key or "",
        url=url or "",
        body=body or "",
        order=order,
    )


def material_file_url(user, material: Material) -> str:
    """Presigned GET for a FILE material — authorized to anyone who can access the course
    (enrolled students + the owning teacher) via can_access_course; never the general public.
    Assumes the material has a file_key (the resolver returns None otherwise)."""
    course = material.course or material.lesson.section.course
    if not can_access_course(user, course):
        raise PermissionDenied("No access to this material")
    return storage.presign_get(material.file_key)


def delete_material(user, material_id) -> bool:
    material = (
        Material.objects.filter(id=material_id)
        .select_related("lesson__section__course", "course")
        .first()
    )
    if material is None:
        raise NotFound("Material not found")
    course = material.course or (material.lesson.section.course if material.lesson else None)
    if course is None:
        raise NotFound("Material is not attached to a course")
    _teacher_profile(user)
    _ensure_owner(user, course)
    material.delete()
    return True


# --- enrollment & progress --------------------------------------------------
@transaction.atomic
def enroll(user, course_id) -> Enrollment:
    profile = _student_profile(user)
    course = _get_course(course_id)
    if course.status != CourseStatus.PUBLISHED.value:
        raise ValidationError("Course is not open for enrollment")
    enrollment, _ = Enrollment.objects.get_or_create(student=profile, course=course)
    return enrollment


def unenroll(user, course_id) -> bool:
    profile = _student_profile(user)
    Enrollment.objects.filter(student=profile, course_id=course_id).delete()
    return True


@transaction.atomic
def mark_lesson_viewed(user, lesson_id) -> Enrollment:
    profile = _student_profile(user)
    lesson = Lesson.objects.filter(id=lesson_id).select_related("section__course").first()
    if lesson is None:
        raise NotFound("Lesson not found")
    course = lesson.section.course
    enrollment = Enrollment.objects.filter(student=profile, course=course).first()
    if enrollment is None:
        raise PermissionDenied("Not enrolled in this course")

    viewed = set(enrollment.viewed_lesson_ids or [])
    viewed.add(str(lesson_id))
    total = Lesson.objects.filter(
        section__course=course, status=LessonStatus.PUBLISHED.value
    ).count()
    enrollment.viewed_lesson_ids = sorted(viewed)
    enrollment.progress_pct = min(100, round(100 * len(viewed) / total)) if total else 0
    if enrollment.progress_pct >= 100:
        enrollment.status = EnrollmentStatus.COMPLETED.value
    enrollment.save(update_fields=["viewed_lesson_ids", "progress_pct", "status", "updated_at"])
    return enrollment


# --- content visibility (A-authz-1/2) ---------------------------------------
def _is_course_owner(user, course: Course) -> bool:
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    return course.owner_id == user.id


def visible_lessons(user, section: Section) -> list[Lesson]:
    """Lessons of a section as a viewer may see them. The owner sees all (incl. DRAFT);
    everyone else — enrolled or anonymous — sees only PUBLISHED lessons. Draft content stays
    owner-only, while published titles are discovery-safe (atlas-04 "guest sees the program")."""
    qs = section.lessons.all()
    if not _is_course_owner(user, section.course):
        qs = qs.filter(status=LessonStatus.PUBLISHED.value)
    return list(qs)


def lesson_content_visible(user, lesson: Lesson) -> bool:
    """Whether a viewer may read a lesson's gated content (description + materials). Gated by
    can_access_course (owner / institutional group / ACTIVE enrollment). Guests and unenrolled
    users see only the published title (discovery), never the description/body/materials."""
    return can_access_course(user, lesson.section.course)


def visible_materials(user, lesson: Lesson) -> list[Material]:
    """A lesson's materials for viewers who pass can_access_course; [] otherwise (a guest or
    unenrolled viewer never sees material bodies/urls/files)."""
    if not lesson_content_visible(user, lesson):
        return []
    return list(lesson.materials.all())


# --- catalog ----------------------------------------------------------------
def published_courses(*, level=None, subject=None, language=None, search=None):
    # Annotate the per-card counts so the catalog does not run 2 COUNT queries per course
    # (A-H1). distinct=True avoids the multiple-aggregate row multiplication; the lesson count
    # excludes soft-deleted lessons to match the Lesson (SoftDeleteManager) default.
    qs = (
        Course.objects.filter(status=CourseStatus.PUBLISHED.value)
        .select_related("owner__user")
        .annotate(
            _lesson_count=Count(
                "sections__lessons",
                distinct=True,
                filter=Q(sections__lessons__deleted_at__isnull=True),
            ),
            _enrollment_count=Count("enrollments", distinct=True),
        )
    )
    if level:
        qs = qs.filter(level=_val(level))
    if subject:
        qs = qs.filter(subject__icontains=subject)
    if language:
        qs = qs.filter(language=language)
    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
    return qs.order_by("-created_at", "id")


def viewer_enrollment(user, course: Course) -> Enrollment | None:
    if getattr(user, "role", None) != Role.STUDENT.value:
        return None
    profile = StudentProfile.objects.filter(user=user).first()
    if profile is None:
        return None
    return Enrollment.objects.filter(student=profile, course=course).first()


def teacher_courses(user) -> list[Course]:
    """A teacher's own courses (all statuses, incl. drafts). Empty for non-teachers."""
    if getattr(user, "role", None) != Role.TEACHER.value:
        return []
    profile = TeacherProfile.objects.filter(user=user).first()
    if profile is None:
        return []
    return list(Course.objects.filter(owner=profile).order_by("-created_at", "id"))
