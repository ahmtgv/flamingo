"""Business logic for the homework domain. Resolvers stay thin and call these.

Authorization is split in two, on purpose:

* **Student-side** "can this student view / submit / be graded on this homework?"
  is always answered by ``courses.access.can_access_course`` — the single payment-/
  access-gating chokepoint (CLAUDE.md "Future: Payments / Billing"). The course is
  resolved from the homework via :func:`_homework_course`. No ad-hoc enrollment
  check is added here: if free courses should later require enrollment to see
  homework, that rule belongs *inside* ``can_access_course``.
* **Teacher-side** authority (create/update/publish/delete/grade, list submissions)
  is ownership of the homework's course, via the existing ``courses.services``
  helpers — deliberately NOT the chokepoint, which returns ``True`` for any teacher
  on a free course and is too weak for write authority.
"""

from __future__ import annotations

from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone

from apps.courses.access import can_access_course
from apps.courses.models import Course, Lesson
from apps.courses.services import (
    _ensure_owner,
    _owned_course,
    _owned_lesson,
    _student_profile,
    _teacher_profile,
    _val,
)
from apps.files import services as files
from common import storage
from common.enums import Role, SubmissionStatus, UploadPurpose
from common.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Homework, Submission, SubmissionFile


# --- helpers ----------------------------------------------------------------
def _homework_course(homework: Homework) -> Course:
    """The course a homework belongs to (directly, or via its lesson)."""
    if homework.course_id is not None:
        return homework.course
    if homework.lesson_id is not None:
        return homework.lesson.section.course
    raise NotFound("Homework is not attached to a course")


def _get_homework(homework_id) -> Homework:
    homework = (
        Homework.objects.filter(id=homework_id)
        .select_related("course", "lesson__section__course")
        .first()
    )
    if homework is None:
        raise NotFound("Homework not found")
    return homework


def _owned_homework(user, homework_id) -> Homework:
    """Load a homework and verify the user owns its course (teacher authority)."""
    homework = _get_homework(homework_id)
    _teacher_profile(user)
    _ensure_owner(user, _homework_course(homework))
    return homework


def _require_student_access(user, homework: Homework) -> Course:
    """The chokepoint: a student may reach this homework only if they can access
    its course. Returns the resolved course for reuse by the caller."""
    course = _homework_course(homework)
    if not can_access_course(user, course):
        raise PermissionDenied("No access to this homework")
    return course


# --- homework (teacher authoring) -------------------------------------------
@transaction.atomic
def create_homework(
    user,
    *,
    title: str,
    type,
    lesson_id=None,
    course_id=None,
    group_id=None,
    description: str = "",
    due_at=None,
    allow_redo: bool = False,
) -> Homework:
    if lesson_id is not None:
        lesson = _owned_lesson(user, lesson_id)
        course = lesson.section.course
    elif course_id is not None:
        lesson = None
        course = _owned_course(user, course_id)
    else:
        raise ValidationError("Homework needs a lesson or a course")
    return Homework.objects.create(
        title=title,
        type=_val(type),
        lesson=lesson,
        course=None if lesson else course,
        group_id=group_id,  # optional institutional target (Option A)
        description=description or "",
        due_at=due_at,
        allow_redo=bool(allow_redo),
        created_by=user,
    )


@transaction.atomic
def update_homework(user, homework_id, **fields) -> Homework:
    homework = _owned_homework(user, homework_id)
    for key in ("title", "description", "due_at", "allow_redo"):
        if fields.get(key) is not None:
            setattr(homework, key, fields[key])
    if fields.get("type") is not None:
        homework.type = _val(fields["type"])
    homework.save()
    return homework


def publish_homework(user, homework_id) -> Homework:
    homework = _owned_homework(user, homework_id)
    if homework.published_at is None:
        homework.published_at = timezone.now()
        homework.save(update_fields=["published_at", "updated_at"])
    return homework


def delete_homework(user, homework_id) -> bool:
    homework = _owned_homework(user, homework_id)
    homework.delete()  # soft delete
    return True


# --- submissions (student) --------------------------------------------------
@transaction.atomic
def submit_homework(user, *, homework_id, content_text: str = "", file_keys=None) -> Submission:
    profile = _student_profile(user)
    homework = _get_homework(homework_id)
    if not homework.is_published:
        raise ValidationError("Homework is not published")
    _require_student_access(user, homework)

    prior = Submission.objects.filter(homework=homework, student=profile)
    last_attempt = prior.aggregate(m=Max("attempt"))["m"]
    if last_attempt is not None and not homework.allow_redo:
        raise ValidationError("Resubmission is not allowed for this homework")

    now = timezone.now()
    overdue = homework.due_at is not None and now > homework.due_at
    submission = Submission.objects.create(
        homework=homework,
        student=profile,
        attempt=(last_attempt or 0) + 1,
        content_text=content_text or "",
        status=SubmissionStatus.LATE.value if overdue else SubmissionStatus.SUBMITTED.value,
        submitted_at=now,
    )
    for key in file_keys or []:
        # Bind-time authz: the key must be in THIS student's own upload namespace (no binding
        # someone else's / a forged key), and the object must exist within the SUBMISSION
        # size/type limit (the presigned PUT couldn't cap size pre-upload).
        files.assert_caller_key(user, key, UploadPurpose.SUBMISSION)
        files.validate_uploaded(key, UploadPurpose.SUBMISSION)
        SubmissionFile.objects.create(
            submission=submission, file_key=key, name=key.rsplit("/", 1)[-1]
        )
    return submission


def submission_file_url(user, submission_file: SubmissionFile) -> str:
    """Presigned GET for a submission file — authorized to the submitting student (own) OR the
    teacher who owns the homework's course. NEVER a classmate (defense-in-depth on the download
    path; don't rely on parent reachability — the attendance-gap lesson)."""
    submission = submission_file.submission
    if user is not None and submission.student_id == user.id:
        pass  # the student reading their own file
    else:
        _ensure_owner(user, _homework_course(submission.homework))  # raises if not the owner
    return storage.presign_get(submission_file.file_key)


# --- grading (teacher) ------------------------------------------------------
@transaction.atomic
def grade_submission(
    user, *, submission_id, score: int, comment: str = "", allow_redo=None
) -> Submission:
    submission = (
        Submission.objects.filter(id=submission_id)
        .select_related("homework__course", "homework__lesson__section__course")
        .first()
    )
    if submission is None:
        raise NotFound("Submission not found")
    homework = submission.homework
    _teacher_profile(user)
    _ensure_owner(user, _homework_course(homework))

    submission.score = score
    submission.comment = comment or ""
    submission.graded_by = user
    submission.graded_at = timezone.now()
    submission.status = SubmissionStatus.GRADED.value
    submission.save(update_fields=["score", "comment", "graded_by", "graded_at", "status"])
    if allow_redo is not None and allow_redo != homework.allow_redo:
        homework.allow_redo = allow_redo
        homework.save(update_fields=["allow_redo", "updated_at"])
    return submission


# --- queries ----------------------------------------------------------------
def get_homework(user, homework_id) -> Homework | None:
    """A homework visible to the viewer: the owning teacher, or anyone who can
    access its course (chokepoint). Returns None when not visible."""
    homework = Homework.objects.filter(id=homework_id).first()
    if homework is None:
        return None
    course = _homework_course(homework)
    if course.owner_id == getattr(user, "id", None):
        return homework
    return homework if can_access_course(user, course) else None


def lesson_homework(user, lesson_id) -> list[Homework]:
    """Homework on a lesson. The owning teacher sees all; everyone else sees only
    published homework, and only if they can access the course (chokepoint)."""
    lesson = Lesson.objects.filter(id=lesson_id).select_related("section__course").first()
    if lesson is None:
        return []
    course = lesson.section.course
    qs = Homework.objects.filter(lesson_id=lesson_id)
    if course.owner_id == getattr(user, "id", None):
        return list(qs)
    if not can_access_course(user, course):
        return []
    return list(qs.filter(published_at__isnull=False))


def homework_submissions(user, homework_id) -> list[Submission]:
    """The teacher grading list for a homework (owner only)."""
    homework = _owned_homework(user, homework_id)
    return list(
        Submission.objects.filter(homework=homework).select_related("student__user", "graded_by")
    )


def teacher_pending_submissions(user) -> list[Submission]:
    """The teacher's cross-course grading queue: submissions awaiting grading (SUBMITTED/LATE)
    on homework in courses THIS teacher owns, oldest first. Per-resolver authz — scoped to the
    caller's own courses (homework attaches to a course directly or via its lesson), so a teacher
    never sees another teacher's queue; empty for non-teachers."""
    if getattr(user, "role", None) != Role.TEACHER.value:
        return []
    pending = [SubmissionStatus.SUBMITTED.value, SubmissionStatus.LATE.value]
    return list(
        Submission.objects.filter(status__in=pending)
        .filter(
            Q(homework__course__owner__user=user)
            | Q(homework__lesson__section__course__owner__user=user)
        )
        .select_related(
            "student__user", "homework", "homework__lesson__section__course", "homework__course"
        )
        .order_by("submitted_at", "id")
    )


def my_submissions(user, course_id=None) -> list[Submission]:
    """The signed-in student's own submissions, optionally scoped to a course."""
    if getattr(user, "role", None) != Role.STUDENT.value:
        return []
    qs = Submission.objects.filter(student__user=user).select_related(
        "homework__course", "homework__lesson__section__course"
    )
    if course_id is not None:
        qs = qs.filter(
            Q(homework__course_id=course_id) | Q(homework__lesson__section__course_id=course_id)
        )
    return list(qs)


def viewer_submission(user, homework: Homework) -> Submission | None:
    """The calling student's latest attempt on a homework (chokepoint-gated)."""
    if getattr(user, "role", None) != Role.STUDENT.value:
        return None
    if not can_access_course(user, _homework_course(homework)):
        return None
    return (
        Submission.objects.filter(homework=homework, student__user=user)
        .order_by("-attempt")
        .first()
    )


def submission_stats(homework: Homework) -> dict:
    """Aggregate counts for a homework's submissions."""
    qs = Submission.objects.filter(homework=homework)
    return {
        "total": qs.count(),
        "submitted": qs.filter(status=SubmissionStatus.SUBMITTED.value).count(),
        "graded": qs.filter(status=SubmissionStatus.GRADED.value).count(),
        "late": qs.filter(status=SubmissionStatus.LATE.value).count(),
    }
