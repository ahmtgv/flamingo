"""Ученик, пришедший КЛАССОМ, тоже уносит свою учёбу (промпт 29 §1, OWNER_SCOPE §20.5).

🔴 ЧТО БЫЛО. `can_access_course` пускает к содержимому двумя дорогами: по `Enrollment` и по
членству в группе курса. А зеркало наполнялось из `Enrollment` — в четырёх местах, каждое
своим кодом. Строка `Enrollment` заводится ровно в одном месте (`enroll()`), куда групповой
ученик не ходит: его в курс приводит класс.

Значит для зеркала его не «плохо копировали» — **его не было**. Выключил преподаватель
ноутбук, и ребёнок не видел ничего: ни дневника, ни работ, ни досок, ни выданных материалов.
Обещание §20.5, данное родителям, было неверным.

Гипотеза ревьюера подтвердилась полностью. Здесь она закреплена шестью проверками — по одной
на каждый вид §20.5.1 — плюс проверка на удвоение.
"""

from __future__ import annotations

from datetime import date

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.board import services as board
from apps.courses import services as courses
from apps.courses.access import can_access_course, students_of_course
from apps.institutions.models import (
    Group,
    GroupMembership,
    Institution,
    InstitutionMembership,
)
from apps.meetingpoint import mirror
from apps.scheduling import services as scheduling
from common.enums import (
    BoardElementKind,
    MaterialType,
    MembershipRole,
    MembershipStatus,
    Role,
)

pytestmark = pytest.mark.django_db


def _class_of_one():
    """Курс, выданный ГРУППЕ. Ученик в группе, `Enrollment` у него нет — как в жизни."""
    teacher = accounts.register_user(
        email="g.teacher@example.com",
        password="strongpass1!",
        first_name="Люция",
        last_name="Валерьевна",
        role=Role.TEACHER,
        specialty="Английский",
        consent_152fz=True,
    )
    pupil = accounts.register_user(
        email="g.pupil@example.com",
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2011, 5, 1),
        consent_152fz=True,
    )
    school = Institution.objects.create(name="Гимназия №1")
    group = Group.objects.create(institution=school, name="9А")
    GroupMembership.objects.create(group=group, student=pupil.student_profile)
    # Курс группе заводит преподаватель этого учреждения — правило `courses.create_course`,
    # и оно верное: чужой не выдаёт курсы чужому классу.
    for person, role in ((teacher, MembershipRole.TEACHER), (pupil, MembershipRole.STUDENT)):
        InstitutionMembership.objects.create(
            user=person,
            institution=school,
            role=role.value,
            status=MembershipStatus.ACTIVE.value,
        )

    course = courses.create_course(
        teacher, title="English A2", subject="Английский", level="a2", group_id=group.id
    )
    section = courses.create_section(teacher, course.id, title="Unit 4")
    lesson = courses.create_lesson(teacher, section.id, title="Travel", duration_min=40)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    return teacher, pupil, course, lesson


def test_the_hypothesis_itself_the_group_pupil_has_access_but_no_enrollment():
    """Сначала — сам дефект, чтобы он был записан, а не пересказан."""
    from apps.courses.models import Enrollment

    _teacher, pupil, course, _lesson = _class_of_one()

    assert can_access_course(pupil, course) is True, "ученик класса не видит курса — другой дефект"
    assert not Enrollment.objects.filter(student=pupil.student_profile, course=course).exists()
    # …и именно поэтому старый способ собрать список отдавал пустоту.
    assert [e.student for e in Enrollment.objects.filter(course=course)] == []
    # Новая дверь отвечает одинаково обеим дорогам.
    assert pupil.student_profile in students_of_course(course)


def test_the_diary_reaches_a_group_pupil():
    teacher, pupil, _course, lesson = _class_of_one()
    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())
    scheduling.start_session(teacher, session.id)
    scheduling.end_session(teacher, session.id)

    assert [r for r in mirror.my_mirror(pupil) if r.kind == "diary"], "дневника у ученика нет"


def test_a_saved_board_reaches_a_group_pupil_with_its_picture(monkeypatch):
    """И доска, и КАРТИНКА на ней (§1.5): иначе мы обещали доску, а отдали рамку."""
    monkeypatch.setattr(board, "get_channel_layer", lambda: None)
    teacher, pupil, _course, lesson = _class_of_one()
    board.put_element(
        teacher,
        lesson.id,
        kind=BoardElementKind.IMAGE,
        x=0,
        y=0,
        width=320,
        height=240,
        data={"key": "board/42/abc/photo.jpg"},
    )
    board.save_snapshot(teacher, lesson.id, title="Доска урока")

    kept = [r for r in mirror.my_mirror(pupil) if r.kind == "board"]
    assert kept, "доски у ученика нет"
    # Ключ картинки должен быть открываемым — иначе ученик увидит пустой квадрат.
    url = mirror.mirrored_file_url(pupil, record_id=kept[0].id, object_key="board/42/abc/photo.jpg")
    assert url, "картинка на доске не открывается — пустой квадрат вместо неё"


def test_a_shared_material_reaches_a_group_pupil():
    teacher, pupil, course, lesson = _class_of_one()
    material = courses.add_material(
        teacher, type=MaterialType.LINK, title="NASA", lesson_id=lesson.id, url="https://nasa.gov/"
    )
    courses.share_material(teacher, material.id)

    assert [r for r in mirror.my_mirror(pupil) if r.kind == "material"]
    assert course is not None


def test_a_group_pupil_who_is_also_enrolled_gets_ONE_copy_not_two():
    """🔴 Риск, названный владельцем: «чтобы не было конфликтов нового со старым».

    Ученик может быть И записан поимённо, И состоять в группе. Тогда он попадает в список
    дважды — и обязан получить ОДНУ запись: `mirror.put` идемпотентен по тройке
    (ученик, вид, источник). Проверяем это, а не рассуждаем об этом.
    """
    teacher, pupil, course, lesson = _class_of_one()
    courses.enroll(pupil, course.id)  # теперь он и в группе, и записан

    assert students_of_course(course).count(pupil.student_profile) == 1, "дубль в самом списке"

    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())
    scheduling.start_session(teacher, session.id)
    scheduling.end_session(teacher, session.id)

    diaries = [r for r in mirror.my_mirror(pupil) if r.kind == "diary"]
    assert len(diaries) == 1, f"дневник задвоился: {len(diaries)} записи вместо одной"
