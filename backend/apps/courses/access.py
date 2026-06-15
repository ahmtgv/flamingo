"""Single chokepoint for course-content access decisions.

``can_access_course`` is the ONE place where payment gating will later be added
(see CLAUDE.md "Future: Payments / Billing"). It is **default-open** today: with
the current data model every course is free (``Course.price is None``) and every
enrollment is ``ACTIVE`` (``Enrollment.access_status``), so this returns ``True``
for everyone and changes no current behaviour. It exists now only so that future
gating drops into one function instead of being scattered across resolvers.

When the monetization model is chosen and the ``billing`` app is built, gating is
added HERE and these existing call sites — which currently make their own ad-hoc
access decisions and are NOT yet routed through this function — must be wired
through it so the chokepoint doesn't drift from reality:

    TODO(payments): route through can_access_course when gating is introduced:
      - apps/courses/graphql/queries.py :: CoursesQuery.course   (draft/owner check only)
      - apps/courses/graphql/queries.py :: CoursesQuery.lesson   (currently ungated)
      - apps/courses/services.py        :: enroll                (no access check)
      - apps/courses/services.py        :: mark_lesson_viewed    (enrollment-only check)

Do NOT add pricing/subscription/provider logic here — that lives in the future
``billing`` app. This function only answers "may this user access this course?".
"""

from apps.institutions.models import GroupMembership
from common.enums import AccessStatus

from .models import Course, Enrollment


def can_access_course(user, course: Course) -> bool:
    """Whether ``user`` may access ``course``'s content. Default-open.

    Structured for the future payment gate but behaviour-preserving today, because
    ``price`` is always ``None`` (free) and ``access_status`` always ``ACTIVE``:

    - free courses (``price is None``) are open to everyone;
    - the owning teacher always has access;
    - a student in the course's target group has access (institutional delivery);
    - an enrolled student with an ``ACTIVE`` access status has access.

    Group→course access is decided HERE on purpose (the single chokepoint), so the
    later Option A→B group-model move and any payment gating change one place only.
    Payment gating (paid course + no active access => ``False``) is added here
    later, gated on the chosen monetization model — not now.
    """
    # Free course: open to all (current state for every course).
    if course.price is None:
        return True

    if user is None or not user.is_authenticated:
        return False

    # Owning teacher always has access. Profile PKs are the User PK
    # (OneToOneField primary_key=True), so owner_id == owner's user id.
    if course.owner_id == user.id:
        return True

    # Institutional delivery (Option A): a student in the course's target group
    # has access without an individual enrollment.
    if (
        course.group_id is not None
        and GroupMembership.objects.filter(group_id=course.group_id, student__user=user).exists()
    ):
        return True

    # Enrolled student with an active access status.
    return Enrollment.objects.filter(
        course=course,
        student__user=user,
        access_status=AccessStatus.ACTIVE.value,
    ).exists()
