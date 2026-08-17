"""Состояние учётной записи — три положения и история (OWNER_SCOPE §23.3.3, промпт 18 §В2).

🔴 Главное, что здесь пришпилено: **блокировка не трогает учёбу ученика** (§20.5). Заблокировали
— человек не входит; сняли — он находит своё ровно там, где оставил. Удаления в панели нет
вовсе, и его отсутствие проверяется по контракту, а не обещанием.
"""

import uuid
from datetime import date

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.oversight import state as account_state
from apps.oversight.models import AccessLogEntry, OversightAction
from apps.oversight.state import AccountState
from common.enums import Role
from common.exceptions import PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


def make_staff(email="staff@example.com"):
    user = accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Адель",
        last_name="Ахметгареев",
        role=Role.ADMIN,
        consent_152fz=True,
    )
    user.is_staff = True
    user.save(update_fields=["is_staff"])
    return user


def make_pupil(email="p@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Тимур",
        last_name="Мухаметшин",
        role=Role.STUDENT,
        birth_date=date(2011, 3, 1),
        consent_152fz=True,
    )


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Люция",
        last_name="Хамидуллина",
        middle_name="Валерьевна",
        role=Role.TEACHER,
        specialty="Английский",
        consent_152fz=True,
    )


# --- три состояния ---------------------------------------------------------------------------
def test_a_fresh_account_is_active_without_any_record():
    """Учётка заводится работающей: отсутствие записи — это «активен», а не «неизвестно»."""
    assert account_state.current_state(make_pupil()) == AccountState.ACTIVE.value


def test_the_current_state_is_the_last_transition():
    staff, pupil = make_staff(), make_pupil()

    account_state.set_state(staff, pupil.id, state="limited", reason="жалоба преподавателя")
    assert account_state.current_state(pupil) == AccountState.LIMITED.value

    account_state.set_state(staff, pupil.id, state="blocked", reason="повторно")
    assert account_state.current_state(pupil) == AccountState.BLOCKED.value

    account_state.set_state(staff, pupil.id, state="active")
    assert account_state.current_state(pupil) == AccountState.ACTIVE.value


def test_every_transition_is_kept_as_history():
    """Спор «меня заблокировали ни за что» разбирается историей, а не пересказом."""
    staff, pupil = make_staff(), make_pupil()
    account_state.set_state(staff, pupil.id, state="limited", reason="первое")
    account_state.set_state(staff, pupil.id, state="blocked", reason="второе")
    account_state.set_state(staff, pupil.id, state="active")

    rows = account_state.history(pupil)

    assert [r.state for r in rows] == ["active", "blocked", "limited"]
    assert rows[1].reason == "второе"
    assert all(r.actor_id == staff.id for r in rows)


def test_closing_access_without_a_reason_is_refused():
    """Закрыть доступ молча — то же, что отказать в верификации без причины."""
    staff, pupil = make_staff(), make_pupil()
    for state in ("limited", "blocked"):
        with pytest.raises(ValidationError):
            account_state.set_state(staff, pupil.id, state=state, reason="   ")
    assert account_state.current_state(pupil) == AccountState.ACTIVE.value


def test_returning_to_active_needs_no_reason():
    """Возврат доступа объяснять не нужно: он ничего у человека не отнимает."""
    staff, pupil = make_staff(), make_pupil()
    account_state.set_state(staff, pupil.id, state="blocked", reason="разбор")
    account_state.set_state(staff, pupil.id, state="active")
    assert account_state.current_state(pupil) == AccountState.ACTIVE.value


# --- что состояние значит --------------------------------------------------------------------
def test_a_limited_account_signs_in_but_does_not_teach():
    """«Входит и видит своё, но не ведёт занятий и не пишет в общие чаты» — §23.3.3."""
    staff, teacher = make_staff(), make_teacher()
    account_state.set_state(staff, teacher.id, state="limited", reason="разбор жалобы")

    teacher.refresh_from_db()
    assert teacher.is_active is True, "ограниченный ВХОДИТ — это не блокировка"
    assert account_state.may_teach(teacher) is False
    assert account_state.may_write_to_shared_chats(teacher) is False


def test_a_blocked_account_cannot_sign_in():
    staff, pupil = make_staff(), make_pupil()
    account_state.set_state(staff, pupil.id, state="blocked", reason="нарушение")

    pupil.refresh_from_db()
    assert pupil.is_active is False

    from common.exceptions import AuthError

    with pytest.raises(AuthError):
        accounts.login(email=pupil.email, password="strongpass1!")


def test_unblocking_restores_the_ability_to_sign_in():
    staff, pupil = make_staff(), make_pupil()
    account_state.set_state(staff, pupil.id, state="blocked", reason="нарушение")
    account_state.set_state(staff, pupil.id, state="active")

    pupil.refresh_from_db()
    assert pupil.is_active is True
    user, tokens = accounts.login(email=pupil.email, password="strongpass1!")
    assert tokens["token"]


def test_the_two_sources_of_truth_never_diverge():
    """`is_active` и состояние синхронизирует ОДНА функция. Пока их два, это проверяется."""
    staff, pupil = make_staff(), make_pupil()
    for state in ("limited", "blocked", "active", "blocked", "active"):
        account_state.set_state(staff, pupil.id, state=state, reason="причина")
        pupil.refresh_from_db()
        blocked = account_state.current_state(pupil) == AccountState.BLOCKED.value
        assert pupil.is_active is not blocked


# --- 🔴 учёба ученика ---------------------------------------------------------------------------
def test_blocking_never_touches_the_pupils_own_learning():
    """§20.5: данные ученика не удаляются никогда. Блокировка снимает ДОСТУП, и только."""
    from apps.accounts.models import StudentProfile
    from apps.meetingpoint.models import MirroredRecord

    staff, pupil = make_staff(), make_pupil()
    profile = StudentProfile.objects.get(user=pupil)
    MirroredRecord.objects.create(
        student=profile,
        kind="homework",
        source_id=uuid.uuid4(),
        occurred_at=timezone.now(),
        payload={"title": "Лабораторная №2"},
    )
    before = MirroredRecord.objects.filter(student=profile).count()

    account_state.set_state(staff, pupil.id, state="blocked", reason="разбор")

    # Зеркало на месте: блокировка снимает доступ к платформе, а не отбирает учёбу.
    assert MirroredRecord.objects.filter(student=profile).count() == before == 1
    # И сам человек на месте: панель не удаляет учётные записи вовсе.
    pupil.refresh_from_db()
    assert pupil.id is not None


def test_the_panel_has_no_way_to_delete_a_person():
    """Проверяется по КОНТРАКТУ, а не по правам: ручки удаления просто нет в схеме."""
    from api.schema import schema

    sdl = schema.as_str()
    block = sdl[sdl.index("type Mutation {") :]
    block = block[: block.index("\n}")]
    for line in block.splitlines():
        lowered = line.lower().replace(" ", "")
        assert not lowered.startswith("deleteuser"), line
        assert not lowered.startswith("removeuser"), line
        assert "deleteaccount" not in lowered, line


# --- границы -------------------------------------------------------------------------------------
@pytest.mark.parametrize("who", ["pupil", "teacher"])
def test_only_platform_staff_changes_a_state(who):
    staff = make_staff()
    pupil = make_pupil()
    actor = pupil if who == "pupil" else make_teacher()

    with pytest.raises(PermissionDenied):
        account_state.set_state(actor, pupil.id, state="blocked", reason="сам себя")

    assert account_state.current_state(pupil) == AccountState.ACTIVE.value
    assert staff.is_staff


def test_a_state_change_is_written_to_the_journal():
    staff, pupil = make_staff(), make_pupil()
    account_state.set_state(staff, pupil.id, state="limited", reason="жалоба преподавателя")

    row = AccessLogEntry.objects.filter(action=OversightAction.STATE_CHANGED.value).get()
    assert row.actor_id == staff.id
    assert row.subject_user_id == pupil.id
    assert row.reason == "жалоба преподавателя"
    assert "ограничен" in row.object_label


# --- ЧТО СОСТОЯНИЕ МЕНЯЕТ НА САМОМ ДЕЛЕ (§3-тер, 17.08) ---------------------------------
#
# 🔴 Тринадцать тестов выше проверяли ПЕРЕХОДЫ: что состояние записывается, что причина
# обязательна, что журнал ведётся, что себя заблокировать нельзя. Все зелёные с первого дня.
#
# И всё это время блокировка была ДЕКОРАЦИЕЙ. `set_state` не имел ни одного вызывающего:
# мутации в схеме не было, значит из продукта в неё не попасть. `may_teach` и
# `may_write_to_shared_chats` не вызывались ни одной строкой продукта — перевод человека в
# «ограничен» не менял в его дне ничего. А заблокированному вход отвечал «неверная почта или
# пароль»: единственное слово, которое он слышал от платформы, было неправдой.
#
# Ниже — не переходы, а ПОСЛЕДСТВИЯ. Три вопроса, которых прежние тесты не задавали:
# ведёт ли ограниченный занятие, пишет ли он в общий чат, что слышит заблокированный на входе.


def test_a_limited_teacher_cannot_start_a_lesson(monkeypatch):
    """«Ограничен» = входит и видит своё, но НЕ ВЕДЁТ (лист D7). До 17.08 — вёл."""
    from datetime import date

    from django.utils import timezone

    from apps.courses import services as courses
    from apps.scheduling import services as scheduling
    from common.exceptions import PermissionDenied

    staff = make_staff()
    teacher = accounts.register_user(
        email="lim@example.com",
        password="strongpass1!",
        first_name="Ограниченный",
        last_name="Преподаватель",
        role=Role.TEACHER,
        specialty="Английский",
        consent_152fz=True,
    )
    course = courses.create_course(teacher, title="English A2", subject="Английский", level="a2")
    section = courses.create_section(teacher, course.id, title="Unit 1")
    lesson = courses.create_lesson(teacher, section.id, title="Travel", duration_min=40)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    session = scheduling.schedule_session(teacher, lesson_id=lesson.id, start_at=timezone.now())

    # Пока активен — ведёт.
    assert scheduling.start_session(teacher, session.id).status == "live"

    account_state.set_state(staff, teacher.id, state="limited", reason="разбор жалобы")
    later = scheduling.schedule_session(
        teacher, lesson_id=lesson.id, start_at=timezone.now() + timezone.timedelta(days=1)
    )
    # Запланировать может — ограничение снимут раньше вторника. Встать перед классом — нет.
    with pytest.raises(PermissionDenied):
        scheduling.start_session(teacher, later.id)
    assert date is not None


def test_a_limited_pupil_is_silent_in_the_group_chat_but_not_with_the_teacher():
    """Вторая половина того же предложения листа: «не пишет в общие чаты».

    ⚠️ Личная переписка с преподавателем остаётся открытой намеренно: у человека разбирают
    дело, и отрезать его от собеседника, с которым это дело обсуждают, значило бы наказать
    вместо того, чтобы ограничить.
    """
    from apps.chat import services as chat
    from apps.courses import services as courses
    from apps.institutions.models import (
        Group,
        GroupMembership,
        GroupTeacher,
        Institution,
        InstitutionMembership,
    )
    from common.enums import MembershipRole, MembershipStatus
    from common.exceptions import PermissionDenied

    staff, pupil = make_staff(), make_pupil()
    teacher = make_teacher("t2@example.com")

    # Предметный чат — это «предмет × ГРУППА»: без класса за курсом комнаты не существует.
    school = Institution.objects.create(name="Гимназия №1")
    group = Group.objects.create(institution=school, name="9А")
    GroupMembership.objects.create(group=group, student=pupil.student_profile)
    GroupTeacher.objects.create(group=group, teacher=teacher.teacher_profile, subject="Английский")
    for person, role in ((pupil, MembershipRole.STUDENT), (teacher, MembershipRole.TEACHER)):
        InstitutionMembership.objects.create(
            user=person,
            institution=school,
            role=role.value,
            status=MembershipStatus.ACTIVE.value,
        )

    course = courses.create_course(
        teacher, title="Английский A2", subject="Английский", level="a2", group_id=group.id
    )
    courses.publish_course(teacher, course.id)
    courses.enroll(pupil, course.id)

    group_chat = chat.subject_channel(pupil, course.id)
    personal = chat.direct_channel(pupil, str(teacher.id))
    assert chat.send_message(pupil, group_chat.id, "здравствуйте").text == "здравствуйте"

    account_state.set_state(staff, pupil.id, state="limited", reason="разбор")
    with pytest.raises(PermissionDenied):
        chat.send_message(pupil, group_chat.id, "снова здравствуйте")
    # А преподавателю — пишет.
    assert chat.send_message(pupil, personal.id, "объясните, пожалуйста").text.startswith("объясн")


def test_a_blocked_person_is_told_they_are_blocked_not_that_the_password_is_wrong():
    """🔴 Единственное слово платформы заблокированному было неправдой.

    Проверяем обе стороны: свой слышит правду, чужой — прежний общий отказ, иначе форма входа
    стала бы справочником «кто на платформе есть».
    """
    from common.exceptions import AuthError

    staff, pupil = make_staff(), make_pupil()
    account_state.set_state(staff, pupil.id, state="blocked", reason="разбор")

    with pytest.raises(AuthError) as blocked:
        accounts.login(email=pupil.email, password="strongpass1!")
    assert "закрыт" in str(blocked.value)
    assert "пароль" not in str(blocked.value).lower()

    # Неверный пароль у заблокированного — тот же общий отказ, что у всех.
    with pytest.raises(AuthError) as wrong:
        accounts.login(email=pupil.email, password="совершенно-не-тот")
    assert "Invalid email or password" in str(wrong.value)


def test_the_state_can_be_reached_through_the_schema_at_all():
    """Дверь есть. Прежде её не было: `set_state` вызывали только тесты.

    Идём мутацией, как пойдёт панель надзора, а не сервисом.
    """
    from types import SimpleNamespace

    from api.schema import schema

    staff, pupil = make_staff(), make_pupil()
    request = SimpleNamespace(META={}, user=staff)
    result = schema.execute_sync(
        "mutation($u: ID!, $s: AccountStateValue!, $r: String!)"
        "{ setAccountState(userId: $u, state: $s, reason: $r) { id } }",
        variable_values={"u": str(pupil.id), "s": "LIMITED", "r": "жалоба преподавателя"},
        context_value=SimpleNamespace(request=request),
    )
    assert result.errors is None, result.errors
    assert account_state.current_state(pupil) == "limited"

    # И тем же путём — обратно, потому что «снять ограничение» тоже должно быть достижимо.
    back = schema.execute_sync(
        "mutation($u: ID!, $s: AccountStateValue!)"
        "{ setAccountState(userId: $u, state: $s) { id } }",
        variable_values={"u": str(pupil.id), "s": "ACTIVE"},
        context_value=SimpleNamespace(request=request),
    )
    assert back.errors is None, back.errors
    assert account_state.current_state(pupil) == "active"
