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
