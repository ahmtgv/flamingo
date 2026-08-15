"""Согласия с машины — решение владельца 15.08 (OWNER_SCOPE §26, промпт 18 §Б0-кватер).

Шаг 3 мастера отказывал: обе мутации согласий требовали `require_user`, а пользовательской
сессии в приложении нет и не будет (§19.4). Связывание уже доказало, что машина принадлежит
преподавателю, — гонять его в браузер посреди мастера незачем.

⚠️ Граница §Б0-тер этим не отменяется, и здесь это проверяется отдельно: расширяется РОВНО
один случай — собственные согласия связанного преподавателя.
"""

import pytest

from apps.accounts import services as accounts
from apps.devices import services as devices
from common.auth import consenting_user
from common.enums import Role
from common.exceptions import AuthError

pytestmark = pytest.mark.django_db


class FakeRequest:
    def __init__(self, authorization: str = ""):
        self.META = {"HTTP_AUTHORIZATION": authorization} if authorization else {}
        self.user = None


class FakeInfo:
    def __init__(self, request):
        self.context = type("Ctx", (), {"request": request})()


def teacher(email="luciya@example.ru"):
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


def paired(owner, name="Mac"):
    row, secret = devices.request_pairing_code(
        device_name=name, platform="macos", app_version="0.1.0"
    )
    devices.confirm_pairing_code(owner, row.code)
    device, key = devices.claim_device_token(code=row.code, secret=secret)
    return device, key


def info_with_key(key):
    return FakeInfo(FakeRequest(f"Device {key}"))


# --- согласие с машины ------------------------------------------------------------------------
def test_a_machine_key_records_consent_for_its_own_teacher():
    """🔴 Главное: согласие записывается ТОМУ САМОМУ преподавателю, с которым связана машина."""
    owner = teacher()
    device, key = paired(owner)

    who, machine = consenting_user(info_with_key(key))

    assert who.id == owner.id
    assert machine is not None and machine.id == device.id


def test_consent_from_a_machine_never_lands_on_somebody_else():
    """Две машины двух преподавателей: ключ одной не пишет согласие другому."""
    first = teacher("first@example.ru")
    second = teacher("second@example.ru")
    _, first_key = paired(first, name="Mac Люции")
    _, second_key = paired(second, name="ПК Игоря")

    assert consenting_user(info_with_key(first_key))[0].id == first.id
    assert consenting_user(info_with_key(second_key))[0].id == second.id


def test_a_person_signed_in_stays_the_author_of_their_own_consent():
    """Пользовательская сессия имеет приоритет, и машина при этом не приписывается."""
    from common.auth import issue_tokens

    owner = teacher()
    paired(owner)
    request = FakeRequest()
    request.user = owner  # так его кладёт middleware после Bearer
    issue_tokens(owner)

    who, machine = consenting_user(FakeInfo(request))

    assert who.id == owner.id
    assert machine is None, "согласие дал человек — машине тут не приписываться"


def test_a_revoked_machine_can_no_longer_speak_for_anyone():
    owner = teacher()
    device, key = paired(owner)
    devices.revoke_device(owner, device.id)

    with pytest.raises(AuthError):
        consenting_user(info_with_key(key))


def test_without_any_credential_nobody_consents():
    with pytest.raises(AuthError):
        consenting_user(FakeInfo(FakeRequest()))


# --- 🔴 граница не расширилась ---------------------------------------------------------------
def test_the_machine_key_still_opens_nothing_of_the_persons_own():
    """Расширен ровно один случай — согласия. Всё остальное по-прежнему требует человека.

    Проверяется той же дверью, что и раньше: `require_user` ключом машины не открывается.
    Если однажды кто-то заменит `require_user` на `consenting_user` в резолвере работ или
    зеркала — этот тест не поймает; его ловит `test_device_auth_boundary.py`. Здесь важно, что
    сама функция не подменяет одно другим.
    """
    from common.auth import get_current_user, require_user

    owner = teacher()
    _, key = paired(owner)
    info = info_with_key(key)

    assert get_current_user(info) is None
    with pytest.raises(AuthError):
        require_user(info)


def test_consent_records_which_machine_wrote_it():
    """«Дано с машины» — факт учёта: на вопрос «кто это записал» есть ответ (§26)."""
    from django.utils import timezone

    owner = teacher()
    device, key = paired(owner)

    who, machine = consenting_user(info_with_key(key))
    who.consent_attention = True
    who.consent_attention_at = timezone.now()
    who.consent_attention_device_id = machine.id
    who.save()

    owner.refresh_from_db()
    assert owner.consent_attention is True
    assert owner.consent_attention_device_id == device.id
