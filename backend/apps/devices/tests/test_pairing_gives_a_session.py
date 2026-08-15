"""Связывание выдаёт приложению сессию преподавателя — и она настоящая.

🔴 НАХОДКА ВЛАДЕЛЬЦА 15.08, вечер (промпт 18 §Б0-септ). Все пять шагов мастера зелёные,
«Приложение настроено». Нажатие «Открыть кабинет» **не делает ничего** и ошибки не показывает.

Одна причина на три симптома: кабинет, расписание, курсы и комната урока стоят за
пользовательской сессией, а у приложения был только ключ машины. `/start` под `ProtectedRoute`
→ сессии нет → обратно в мастер. Круг замкнулся, и он молчаливый. Имя («Вход выполнен — .»)
и флаг внимания («выключен», хотя включён) брались из того же `me`, который не отвечал.

⚠️ Проверяется ПОВЕДЕНИЕ, а не наличие токена в ответе. Токен в ответе — это «элемент есть»;
ловушка 15 августа была ровно в том, что элемент есть, а работы нет. Поэтому здесь выданной
сессией открывают настоящий `require_user`-резолвер и смотрят, пустят ли.
"""

import pytest

from apps.accounts.models import User
from apps.devices import services as devices
from common.auth import authenticate_request
from common.enums import DevicePlatform

pytestmark = pytest.mark.django_db


class FakeRequest:
    """Запрос с заголовком — ровно то, что читает `authenticate_request`."""

    def __init__(self, authorization: str):
        self.META = {"HTTP_AUTHORIZATION": authorization}


def a_teacher(email="irina@example.com"):
    return User.objects.create_user(email=email, password="x", first_name="Ирина")


def pair(teacher, name="MacBook Ирины"):
    """Пройти связывание так, как его проходит человек: запрос → подтверждение → забор."""
    row, secret = devices.request_pairing_code(
        device_name=name, platform=DevicePlatform.MACOS.value
    )
    devices.confirm_pairing_code(teacher, row.code)
    return devices.claim_device_token(code=row.code, secret=secret)


def test_the_session_handed_over_actually_opens_the_cabinet():
    """🔴 Тот самый дефект: мастер пройден — и есть куда идти.

    Не «в ответе лежит строка токена», а «этим токеном пускают».
    """
    teacher = a_teacher()
    _device, _key, session = pair(teacher)

    who = authenticate_request(FakeRequest(f"Bearer {session['token']}"))

    assert who is not None, "мастер пройден, а сессии нет — «Открыть кабинет» ведёт в никуда"
    assert who.id == teacher.id


def test_the_session_belongs_to_whoever_confirmed_the_code():
    """Сессию получает тот, кто нажал «Связать» в браузере, а не кто-нибудь ещё.

    Связывание — это акт входа: человек доказал, что он это он, на странице с адресной
    строкой и замком. Выдать сессию другого значило бы отдать чужой кабинет.
    """
    irina = a_teacher("irina@example.com")
    pyotr = a_teacher("pyotr@example.com")
    _device, _key, session = pair(irina)

    who = authenticate_request(FakeRequest(f"Bearer {session['token']}"))

    assert who.id == irina.id
    assert who.id != pyotr.id


def test_revoking_the_machine_kills_the_session_it_was_given():
    """🔴 «Отозвать» на листе D8 — кнопка для украденного ноутбука. Она обязана гасить всё.

    Без этого отзыв был бы половинным: ключ машины умирает, а сессия, выданная вместе с ним,
    продолжает открывать кабинет. Кнопка читалась бы как сделанная и не была бы.
    """
    teacher = a_teacher()
    device, _key, session = pair(teacher)
    header = FakeRequest(f"Bearer {session['token']}")
    assert authenticate_request(header) is not None, "до отзыва сессия должна работать"

    devices.revoke_device(teacher, device.id)

    assert authenticate_request(header) is None, "ноутбук отозван, а кабинет всё ещё открыт"


def test_revoking_one_machine_leaves_the_teacher_own_browser_alone():
    """Отзыв гасит сессию ЭТОЙ машины, а не выкидывает преподавателя отовсюду.

    Без этой проверки предыдущая прошла бы и на «отзыв поднимает token_version», то есть на
    поведении, при котором нажатие «Отозвать» на ноутбуке выбрасывает человека из браузера,
    где он в этот момент и нажимает.
    """
    teacher = a_teacher()
    device, _key, _session = pair(teacher)
    from common.auth import issue_tokens

    browser = issue_tokens(teacher)  # обычный вход, без машины

    devices.revoke_device(teacher, device.id)

    assert authenticate_request(FakeRequest(f"Bearer {browser['token']}")) is not None


def test_a_second_machine_keeps_working_when_the_first_is_revoked():
    """Два ноутбука — две сессии. Отзыв одного не трогает второй."""
    teacher = a_teacher()
    first, _k1, s1 = pair(teacher, "Старый MacBook")
    _second, _k2, s2 = pair(teacher, "Новый MacBook")

    devices.revoke_device(teacher, first.id)

    assert authenticate_request(FakeRequest(f"Bearer {s1['token']}")) is None
    assert authenticate_request(FakeRequest(f"Bearer {s2['token']}")) is not None


def test_the_machine_key_and_the_session_stay_different_things():
    """🔒 Граница §Б0-тер цела: ключ машины — не сессия, сессия — не ключ машины.

    Приложение получает ОБЫЧНУЮ сессию вдобавок к ключу, а не ключ с расширенными правами.
    Если бы одно подменяло другое, десять проверок §Б0-тер стали бы неправдой.
    """
    teacher = a_teacher()
    _device, key, session = pair(teacher)

    # Ключ машины не работает как сессия…
    assert authenticate_request(FakeRequest(f"Bearer {key}")) is None
    # …а сессия не работает как ключ машины.
    assert devices.authenticate_device(session["token"]) is None


def test_a_session_is_refused_when_the_confirming_account_is_gone():
    """Подтвердивший отключён — сессию выдавать некому, и это говорится вслух.

    Отдать молча один ключ значило бы вернуть ровно тот дефект, что здесь чинится: мастер
    прошёл бы до конца и снова упёрся в «Открыть кабинет», которая ничего не делает.
    """
    from common.exceptions import ValidationError

    teacher = a_teacher()
    row, secret = devices.request_pairing_code(
        device_name="MacBook", platform=DevicePlatform.MACOS.value
    )
    devices.confirm_pairing_code(teacher, row.code)
    User.objects.filter(id=teacher.id).update(is_active=False)

    with pytest.raises(ValidationError):
        devices.claim_device_token(code=row.code, secret=secret)
