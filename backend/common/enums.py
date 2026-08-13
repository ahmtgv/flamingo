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
class LearningProfileKind(Enum):
    """One learning context inside a single account (owner decision 2026-08-12, req. 15).

    PUPIL — studying inside an institution: class, timetable, deadlines set from outside.
    CADET — self-paced study on a standalone course.
    TEACHER — teaching inside an institution.

    A schoolchild taking evening courses holds a PUPIL and a CADET profile at once. These
    are projections over existing relations (INSTITUTION_MEMBERSHIP / ENROLLMENT), not a
    stored entity — see apps/accounts/learning.py.
    """

    PUPIL = "pupil"
    CADET = "cadet"
    TEACHER = "teacher"


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
class LessonKind(Enum):
    """What a lesson runs on. Owner decision 2026-08-12 (atlas sheet 01, question 1): a
    telescope lesson stays a lesson in the programme, but doing it opens the device's own
    page — the instrument behaves like a subject of its own. EXTERNAL_DEVICE is the seam for
    the shared ExternalDevice abstraction (CLAUDE.md §11), not a per-vendor hack."""

    STANDARD = "standard"
    EXTERNAL_DEVICE = "external_device"


@strawberry.enum
class SavedItemKind(Enum):
    """Why a learner kept something — the two tags atlas sheet 01 shows on saved items."""

    SAVED = "saved"  # "в мои материалы", usually with a note
    WATCH_LATER = "watch_later"


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
class UploadPurpose(Enum):
    """What a presigned upload is for — gates the requestUpload role check, key prefix, and
    per-purpose size/type limits (see apps/files/services.py). Not a DB enum."""

    AVATAR = "avatar"
    MATERIAL = "material"
    SUBMISSION = "submission"
    VERIFICATION = "verification"
    COVER = "cover"
    INSTITUTION_LOGO = "institution_logo"


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
class InsightKind(Enum):
    GOOD = "good"
    WATCH = "watch"


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


# --- Chat (R2) ---------------------------------------------------------------
@strawberry.enum
class ChannelKind(Enum):
    """Who a conversation is between. The kind decides who may be a member and which
    safety options apply — it is never a display label."""

    SUBJECT_GROUP = "subject_group"  # предмет × группа
    PUPIL_TEACHER = "pupil_teacher"  # ученик ↔ учитель
    PEER = "peer"  # ученик ↔ ученик
    STAFF_ROOM = "staff_room"  # учительская


@strawberry.enum
class ReportStatus(Enum):
    """A complaint about a conversation. OPEN is what lets a group teacher open it."""

    OPEN = "open"
    REVIEWED = "reviewed"
    DISMISSED = "dismissed"


# --- Jurisdiction gate (docs/rnd/RND_01_JURISDICTION.md) ---------------------
# Deliberately NOT @strawberry.enum: the compliance layer is server-side only. A client
# must never be able to read (let alone influence) the jurisdiction decision, and keeping
# these out of the schema also keeps the published contract free of compliance internals.


class Jurisdiction(Enum):
    """Legal regime a tenant operates under. UNKNOWN is a real, strictest-profile value —
    never a placeholder to be treated as "probably fine" (fail-closed, red line 7)."""

    RU = "ru"
    EU = "eu"
    UNKNOWN = "unknown"


class JurisdictionSource(Enum):
    """How a tenant's jurisdiction was established — governs whether it may *lower*
    strictness (§6.2). CONTRACT/KYC_VERIFIED are evidence about the tenant; DEPLOYMENT is
    the operator's own data contour (§6.1: deployment region is the strongest technical
    criterion). SELF_DECLARED/INFERRED are claims: they may raise strictness, never lower it.
    IP/locale are INFERRED and are only ever an anomaly signal (§6.1)."""

    CONTRACT = "contract"
    KYC_VERIFIED = "kyc_verified"
    DEPLOYMENT = "deployment"
    SELF_DECLARED = "self_declared"
    INFERRED = "inferred"
