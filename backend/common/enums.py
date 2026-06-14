"""Single source for enums (ERD §4).

Each enum is a plain ``Enum`` decorated for GraphQL (`@strawberry.enum`) and
reused as Django field choices via :func:`choices`. The DB stores the member
*value*; GraphQL exposes the member *name* (UPPER_SNAKE).
"""

from enum import Enum

import strawberry


def choices(enum_cls: type[Enum]) -> list[tuple[str, str]]:
    """Django ``choices=`` from an Enum: (value, member_name)."""
    return [(member.value, member.name) for member in enum_cls]


@strawberry.enum
class Role(Enum):
    STUDENT = "student"
    PARENT = "parent"
    TEACHER = "teacher"
    ADMIN = "admin"


@strawberry.enum
class AgeBand(Enum):
    JUNIOR = "junior"
    TEEN = "teen"
    ADULT = "adult"


@strawberry.enum
class VerificationStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


@strawberry.enum
class InstitutionStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    INACTIVE = "inactive"


@strawberry.enum
class MembershipRole(Enum):
    TEACHER = "teacher"
    STUDENT = "student"
    ADMIN = "admin"


@strawberry.enum
class MembershipStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    INACTIVE = "inactive"


@strawberry.enum
class GuardianshipStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"


@strawberry.enum
class CourseLevel(Enum):
    GRADE_1 = "grade_1"
    GRADE_2 = "grade_2"
    GRADE_3 = "grade_3"
    GRADE_4 = "grade_4"
    GRADE_5 = "grade_5"
    GRADE_6 = "grade_6"
    GRADE_7 = "grade_7"
    GRADE_8 = "grade_8"
    GRADE_9 = "grade_9"
    GRADE_10 = "grade_10"
    GRADE_11 = "grade_11"
    ADULT = "adult"


@strawberry.enum
class CourseStatus(Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


@strawberry.enum
class LessonStatus(Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


@strawberry.enum
class SessionStatus(Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    ENDED = "ended"
    CANCELED = "canceled"


@strawberry.enum
class MaterialType(Enum):
    FILE = "file"
    LINK = "link"
    TEXT = "text"


@strawberry.enum
class EnrollmentStatus(Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PENDING = "pending"


@strawberry.enum
class AccessStatus(Enum):
    """Payment-gating seam for an enrollment (distinct from the lifecycle
    ``EnrollmentStatus``). Default ``ACTIVE`` keeps everything open/free until a
    monetization model is chosen; ``PENDING_PAYMENT`` is reserved for the future
    ``billing`` app. See ``courses/access.py``."""

    ACTIVE = "active"
    PENDING_PAYMENT = "pending_payment"


@strawberry.enum
class HomeworkType(Enum):
    FILE = "file"
    TEXT = "text"
    QUIZ = "quiz"


@strawberry.enum
class SubmissionStatus(Enum):
    SUBMITTED = "submitted"
    LATE = "late"
    GRADED = "graded"


@strawberry.enum
class AttendanceStatus(Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"


@strawberry.enum
class RecommendationKind(Enum):
    SCHEDULE = "schedule"
    COURSE = "course"
    MATERIAL = "material"
    WELLBEING = "wellbeing"


@strawberry.enum
class PointReason(Enum):
    ATTENDANCE = "attendance"
    HOMEWORK = "homework"
    GRADE = "grade"
    STREAK = "streak"


@strawberry.enum
class ReviewStatus(Enum):
    VISIBLE = "visible"
    PENDING = "pending"
    HIDDEN = "hidden"


@strawberry.enum
class NotificationType(Enum):
    GRADE = "grade"
    NEW_LESSON = "new_lesson"
    ABSENCE = "absence"
    HOMEWORK_DONE = "homework_done"
    CMF_INSIGHT = "cmf_insight"
    WEEKLY_DIGEST = "weekly_digest"


@strawberry.enum
class NotificationChannel(Enum):
    PUSH = "push"
    EMAIL = "email"
    IN_APP = "in_app"
