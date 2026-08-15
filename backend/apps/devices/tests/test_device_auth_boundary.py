"""Граница между «машиной» и «человеком» (промпт 18 §Б0-тер, п.4).

🔴 Зачем тест, а не комментарий. В этой фазе приложение научилось представляться серверу
ключом машины: `Authorization: Device <ключ>`. С этого момента в продукте два способа быть
кем-то, и соблазн сделать их взаимозаменяемыми появится в первой же задаче, где «ну машина же
преподавателя, пусть посмотрит».

Правило: **ключ машины не открывает НИЧЕГО пользовательского.** Машина может сказать, что она
жива, какой у неё канал и на каком шаге настройки она стоит. Прочитать домашнюю работу ребёнка
она не может — ни через один резолвер.
"""

import pytest

from apps.accounts import services as accounts
from apps.devices import services as devices
from common.auth import authenticate_device_request, get_current_user
from common.enums import Role
from common.exceptions import AuthError

pytestmark = pytest.mark.django_db


class FakeRequest:
    """Запрос с одним заголовком — ровно то, что видит сервер."""

    def __init__(self, authorization: str = ""):
        self.META = {"HTTP_AUTHORIZATION": authorization} if authorization else {}
        self.user = None


class FakeInfo:
    def __init__(self, request):
        self.context = type("Ctx", (), {"request": request})()


def paired_machine():
    """Преподаватель, связавший машину, и ключ этой машины."""
    teacher = accounts.register_user(
        email="t@example.com",
        password="strongpass1!",
        first_name="Люция",
        last_name="Хамидуллина",
        middle_name="Валерьевна",
        role=Role.TEACHER,
        specialty="Английский",
        consent_152fz=True,
    )
    row, secret = devices.request_pairing_code(
        device_name="Mac", platform="macos", app_version="0.1.0"
    )
    devices.confirm_pairing_code(teacher, row.code)
    _, key, _session = devices.claim_device_token(code=row.code, secret=secret)
    return teacher, key


# --- ключ работает там, где должен ---------------------------------------------------------
def test_a_machine_key_identifies_the_machine():
    _, key = paired_machine()
    device = authenticate_device_request(FakeRequest(f"Device {key}"))
    assert device is not None
    assert device.name == "Mac"


# --- 🔴 и не работает там, где не должен ----------------------------------------------------
def test_a_machine_key_is_not_a_user_session():
    """Главное утверждение файла: `Device` не превращается в пользователя.

    Иначе всё, что защищено `require_user` — работы, оценки, чаты, зеркало ученика — открылось
    бы ключом, который лежит на ноутбуке и переживает кражу этого ноутбука.
    """
    from common.auth import require_user

    _, key = paired_machine()
    info = FakeInfo(FakeRequest(f"Device {key}"))

    assert get_current_user(info) is None
    with pytest.raises(AuthError):
        require_user(info)


def test_a_user_token_is_not_a_machine():
    """И обратно: пользовательская сессия не выдаёт себя за машину.

    Иначе преподаватель из браузера мог бы отчитаться за настройку ноутбука, которого нет, —
    и «машина настроена» перестало бы значить, что она вообще существует.
    """
    from common.auth import require_device

    teacher, _ = paired_machine()
    tokens = accounts.issue_tokens(teacher) if hasattr(accounts, "issue_tokens") else None
    from common.auth import issue_tokens

    tokens = tokens or issue_tokens(teacher)
    info = FakeInfo(FakeRequest(f"Bearer {tokens['token']}"))

    with pytest.raises(AuthError):
        require_device(info)


def test_a_revoked_machine_stops_being_anybody():
    """Отзыв — не пометка в списке, а конец доступа. Ради этого он и обещан на экране D2."""
    teacher, key = paired_machine()
    device = authenticate_device_request(FakeRequest(f"Device {key}"))

    devices.revoke_device(teacher, device.id)

    assert authenticate_device_request(FakeRequest(f"Device {key}")) is None


@pytest.mark.parametrize(
    "header",
    ["", "Device ", "Device не-тот-ключ", "Bearer подделка", "device lowercase-scheme"],
)
def test_nothing_else_authenticates_a_machine(header):
    paired_machine()
    assert authenticate_device_request(FakeRequest(header)) is None


def test_this_device_answers_only_about_the_machine_that_asked():
    """`thisDevice` не принимает идентификатора — спросить о чужой машине через эту дверь
    невозможно by construction, и это проверяется по контракту."""
    from api.schema import schema

    sdl = schema.as_str()
    line = next(line for line in sdl.splitlines() if "thisDevice" in line)
    assert "(" not in line, f"thisDevice не должен принимать аргументов: {line}"
