"""Single chokepoint for course-CONTENT access decisions.

``can_access_course`` answers "may this user access this course's content?". Access is
**enrollment-controlled**: the owning teacher, a student in the course's institutional group,
or a student with an ACTIVE enrollment. It is NOT price-based — all courses are free today, but
price does not determine access (billing is a separate future layer). Anonymous and unenrolled
users are denied, even on a free course.

This gates CONTENT only. Course DISCOVERY (the public catalog/preview) must stay open so a
non-enrolled user can find a course and enroll — those queries do NOT call this function.

When the monetization model is chosen and the ``billing`` app is built, a PAID course will
ADDITIONALLY require payment on top of enrollment — added HERE (payment-ready). These existing
call sites make their own ad-hoc access decisions and are NOT yet routed through this function;
wire them through it then so the chokepoint doesn't drift from reality:

    TODO(payments): route through can_access_course when gating is introduced:
      - apps/courses/graphql/queries.py :: CoursesQuery.course   (draft/owner check only)
      - apps/courses/services.py        :: enroll                (no access check)
      - apps/courses/services.py        :: mark_lesson_viewed    (enrollment-only check)

Do NOT add pricing/subscription/provider logic here — that lives in the future
``billing`` app. This function only answers "may this user access this course?".
"""

from apps.institutions.models import GroupMembership
from common.enums import AccessStatus

from .models import Course, Enrollment


def can_access_course(user, course: Course) -> bool:
    """Whether ``user`` may access ``course``'s CONTENT (materials, homework, …).

    Access is ENROLLMENT-CONTROLLED, not price-based: a student is granted access by the
    course owner, an institution admin, or institutional (group) delivery. All courses are
    free today, but price is NOT the access determinant — billing is a separate future layer.

    - the owning teacher always has access;
    - a student in the course's target group has access (institutional delivery, Option A);
    - a student with an ``ACTIVE`` enrollment has access;
    - everyone else — anonymous OR unenrolled — is denied (even on a free course).

    This is the single chokepoint for content-access decisions. Course DISCOVERY (the public
    catalog / detail-preview, so a non-enrolled user can see name/description/teacher to
    enroll) does NOT go through here — it shows published courses to everyone.

    TODO(payments): payment is a FUTURE ADDITIVE gate — when billing lands, a PAID course will
    additionally require payment ON TOP of enrollment (paid + no settled payment => ``False``).
    Enrollment is the basis now; the chokepoint stays payment-ready. Do NOT add
    pricing/provider logic here — that lives in the future ``billing`` app.
    """
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


def students_of_course(course: Course) -> list:
    """Кто учится на этом курсе — ПОИМЁННО ЗАПИСАННЫЕ И ПРИШЕДШИЕ ГРУППОЙ, одним списком.

    🔴 БЕЗ ЭТОЙ ФУНКЦИИ ГРУППОВОЙ УЧЕНИК НЕ СУЩЕСТВОВАЛ ДЛЯ ЗЕРКАЛА (промпт 29 §1).

    `can_access_course` выше пускает к содержимому двумя дорогами: по `Enrollment` и по
    членству в группе курса. А зеркало наполнялось так — в четырёх местах, каждое своим
    кодом:

        students = [e.student for e in Enrollment.objects.filter(course=...)]

    Ученик, пришедший в составе класса, строки `Enrollment` не имеет: она заводится ровно в
    одном месте — `enroll()`, куда он не ходит. Значит для зеркала его не «плохо копировали»
    — его **не было**. Выключил преподаватель ноутбук, и ребёнок не видел ничего: ни дневника,
    ни работ, ни досок. Обещание §20.5, данное родителям, было неверным.

    Почему одна функция, а не четыре заплатки: четыре места, каждое само отвечающее на вопрос
    «кто ученики этого курса», — это и есть причина, по которой дефект появился и по которой
    он бы вернулся. Правило доступа живёт здесь же, рядом с `can_access_course`, чтобы «кому
    можно» и «кому копируем» не разошлись снова.

    ⚠️ Дубли возможны и они безвредны: ученик может быть И записан поимённо, И состоять в
    группе. Возвращаем уникальные профили; ниже по течению `mirror.put` идемпотентен по
    тройке (ученик, вид, источник), и это проверено тестом, а не доводом.
    """
    from apps.accounts.models import StudentProfile

    enrolled = Enrollment.objects.filter(
        course=course, access_status=AccessStatus.ACTIVE.value
    ).values_list("student_id", flat=True)

    ids = set(enrolled)
    if course.group_id is not None:
        ids |= set(
            GroupMembership.objects.filter(group_id=course.group_id).values_list(
                "student_id", flat=True
            )
        )
    if not ids:
        return []
    return list(StudentProfile.objects.filter(pk__in=ids).select_related("user"))
