"""Pairing a machine (Р5.0 — PROMPT_14 §2.2, OWNER_SCOPE §19.4).

Four of the phase's five new invariants live here, and each is checked against the code or
the schema rather than against anybody's care:

1. the app never accepts a password — no field, no mutation, no path;
2. the machine key leaves the server once and is never readable back;
3. a pairing code is one-time and expires in ten minutes;
4. revoking a device revokes its keys with it.
"""

import ast
import datetime as dt
import re
from datetime import date
from pathlib import Path

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.devices import services as devices
from apps.devices.models import Device, DeviceToken, PairingCode
from common.enums import DevicePlatform, Role
from common.exceptions import NotFound, PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db

DEVICES_DIR = Path(devices.__file__).resolve().parent


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Ирина",
        last_name="Соколова",
        role=Role.TEACHER,
        specialty="English",
        consent_152fz=True,
    )


def make_pupil(email="p@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2010, 1, 1),
        consent_152fz=True,
    )


def a_pairing(name="MacBook Ирины"):
    return devices.request_pairing_code(
        device_name=name, platform=DevicePlatform.MACOS.value, app_version="0.1.0"
    )


def paired(user, name="MacBook Ирины"):
    row, secret = a_pairing(name)
    devices.confirm_pairing_code(user, row.code)
    return devices.claim_device_token(code=row.code, secret=secret)


# --- 🔒 invariant 1: no password ever crosses the app's boundary --------------------------------
def test_no_device_mutation_accepts_a_password():
    """PROMPT_14 §2.2.1 / OWNER_SCOPE §19.4, as a schema assertion.

    The fallback «войти по почте и паролю» is the ordinary WEB login and stays there. What
    must never exist is a second place to type a password — an app that asks for one at the
    moment the OS has just called us «неизвестный разработчик» is the worst possible ask.
    """
    from api.schema import schema

    sdl = schema.as_str()
    mutation_block = re.search(r"type Mutation \{(.*?)\n\}", sdl, re.S).group(1)
    device_lines = [
        line
        for line in mutation_block.splitlines()
        if re.search(
            r"\b(requestPairingCode|confirmPairingCode|claimDeviceToken|revokeDevice|hostHeartbeat)\b",
            line,
        )
    ]
    assert device_lines, "the pairing mutations are missing from the contract"
    for line in device_lines:
        assert "password" not in line.lower(), line


def test_the_devices_module_contains_no_password_path_at_all():
    """Executable code only, so the guard cannot be satisfied by rewording a docstring —
    this module's own prose says «password» repeatedly on purpose."""
    offenders = []
    for path in DEVICES_DIR.rglob("*.py"):
        if "test" in path.name:
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Module | ast.ClassDef | ast.FunctionDef):
                body = node.body
                if (
                    body
                    and isinstance(body[0], ast.Expr)
                    and isinstance(body[0].value, ast.Constant)
                ):
                    node.body = body[1:]
        code = ast.unparse(tree).lower()
        if "password" in code or "check_password" in code:
            offenders.append(str(path.name))
    assert not offenders, f"a password path exists in the device layer: {offenders}"


# --- 🔒 invariant 2: the machine key is handed over once, and never readable ---------------------
def test_the_key_is_stored_as_a_hash_and_returned_exactly_once():
    teacher = make_teacher()
    device, raw = paired(teacher)

    stored = DeviceToken.objects.get(device=device)
    assert stored.token_hash != raw
    assert stored.token_hash == devices.hash_secret(raw)
    # And the raw value appears in no column anywhere.
    assert not DeviceToken.objects.filter(token_hash=raw).exists()


def test_no_query_returns_a_machine_key():
    """A key you can read back is a key that ends up in a screenshot."""
    from api.schema import schema

    sdl = schema.as_str()
    device_type = re.search(r"type Device \{(.*?)\n\}", sdl, re.S).group(1)
    assert "token" not in device_type.lower()
    query_block = re.search(r"type Query \{(.*?)\n\}", sdl, re.S).group(1)
    assert "token" not in query_block.lower().replace("roomtoken", "")


def test_a_paired_key_authenticates_its_own_device_and_nothing_else():
    ira, petr = make_teacher("a@example.com"), make_teacher("b@example.com")
    device_a, key_a = paired(ira, "MacBook Ирины")
    _device_b, key_b = paired(petr, "ThinkPad Петра")

    assert devices.authenticate_device(key_a).id == device_a.id
    assert devices.authenticate_device(key_b).id != device_a.id
    assert devices.authenticate_device("nonsense") is None
    assert devices.authenticate_device("") is None


# --- 🔒 invariant 3: the code is one-time and short-lived ----------------------------------------
def test_a_code_can_be_claimed_once():
    teacher = make_teacher()
    row, secret = a_pairing()
    devices.confirm_pairing_code(teacher, row.code)

    devices.claim_device_token(code=row.code, secret=secret)
    with pytest.raises(NotFound):
        devices.claim_device_token(code=row.code, secret=secret)


def test_a_code_cannot_be_confirmed_twice():
    ira, petr = make_teacher("a@example.com"), make_teacher("b@example.com")
    row, _secret = a_pairing()
    devices.confirm_pairing_code(ira, row.code)

    with pytest.raises(ValidationError):
        devices.confirm_pairing_code(petr, row.code)
    assert Device.objects.count() == 1


def test_a_code_expires_in_ten_minutes():
    teacher = make_teacher()
    row, secret = a_pairing()
    PairingCode.objects.filter(id=row.id).update(
        expires_at=timezone.now() - dt.timedelta(seconds=1)
    )

    with pytest.raises(NotFound):
        devices.confirm_pairing_code(teacher, row.code)
    assert devices.PAIRING_TTL == dt.timedelta(minutes=10)


def test_the_code_alone_is_not_enough_to_walk_away_with_a_key():
    """Two credentials, deliberately: the code proves a human approved, the secret proves
    this is the machine that asked. Somebody reading the code over a shoulder gets nothing."""
    teacher = make_teacher()
    row, _secret = a_pairing()
    devices.confirm_pairing_code(teacher, row.code)

    with pytest.raises(NotFound):
        devices.claim_device_token(code=row.code, secret="guessed")
    assert DeviceToken.objects.count() == 0


def test_an_unconfirmed_code_hands_over_nothing():
    row, secret = a_pairing()
    with pytest.raises(ValidationError):
        devices.claim_device_token(code=row.code, secret=secret)


def test_an_unknown_code_and_a_wrong_secret_answer_the_same_way():
    """A different message for «the code is real but the secret is wrong» would say: keep
    trying the secret."""
    teacher = make_teacher()
    row, _secret = a_pairing()
    devices.confirm_pairing_code(teacher, row.code)

    with pytest.raises(NotFound) as wrong_secret:
        devices.claim_device_token(code=row.code, secret="nope")
    with pytest.raises(NotFound) as unknown_code:
        devices.claim_device_token(code="ZZZZZZ", secret="nope")
    assert str(wrong_secret.value) == str(unknown_code.value)


def test_a_code_needs_a_device_name():
    with pytest.raises(ValidationError):
        devices.request_pairing_code(device_name="   ", platform=DevicePlatform.MACOS.value)


# --- 🔒 invariant 4: revoking a device revokes its keys with it ------------------------------------
def test_revoking_a_device_kills_its_key_in_the_same_breath():
    """A live key on a dead device is a half-revocation that reads as done."""
    teacher = make_teacher()
    device, raw = paired(teacher)
    assert devices.authenticate_device(raw) is not None

    devices.revoke_device(teacher, device.id)

    assert devices.authenticate_device(raw) is None
    assert devices.my_devices(teacher) == []
    # The record stays — a person has to be able to see they already dealt with it.
    assert Device.objects.filter(id=device.id).exists()


def test_only_the_owner_can_revoke_and_a_stranger_is_told_nothing():
    ira, petr = make_teacher("a@example.com"), make_teacher("b@example.com")
    device, _raw = paired(ira)

    with pytest.raises(NotFound):
        devices.revoke_device(petr, device.id)


def test_my_devices_is_the_callers_own_and_takes_no_user_id():
    ira, petr = make_teacher("a@example.com"), make_teacher("b@example.com")
    paired(ira, "MacBook Ирины")

    assert [d.name for d in devices.my_devices(ira)] == ["MacBook Ирины"]
    assert devices.my_devices(petr) == []


# --- the jurisdiction gate ----------------------------------------------------------------------
def test_pairing_is_gated_because_it_moves_children_data_onto_a_private_laptop(settings):
    """`device_pairing` is not ceremony: binding a machine is what changes where the data
    physically lives, and the EU analysis for that has not been done (OWNER_SCOPE §18)."""
    from common.compliance.policy import reload_matrix

    settings.DEPLOYMENT_JURISDICTION = "eu"
    reload_matrix()
    teacher = make_teacher()
    row, _secret = a_pairing()

    with pytest.raises(PermissionDenied):
        devices.confirm_pairing_code(teacher, row.code)


def test_a_machine_can_always_be_switched_off_whatever_the_regime(settings):
    """Revocation carries no gate on purpose: a jurisdiction change must not strand a laptop
    that nobody can turn off remotely."""
    from common.compliance.policy import reload_matrix

    teacher = make_teacher()
    device, raw = paired(teacher)

    settings.DEPLOYMENT_JURISDICTION = "eu"
    reload_matrix()
    assert devices.revoke_device(teacher, device.id) is True
    assert devices.authenticate_device(raw) is None


def test_a_learner_may_pair_a_machine_too():
    """«Десктоп у ученика — опция» (OWNER_SCOPE §18). Nothing here is teacher-only."""
    pupil = make_pupil()
    device, raw = paired(pupil, "Домашний ПК")
    assert device.owner_id == pupil.id
    assert devices.authenticate_device(raw) is not None


# --- Р5.2: one authentication path for a machine ---------------------------------------------
def test_a_machine_authenticates_through_the_same_header_as_everyone_else():
    """Р5.1 shipped the key as a mutation argument — accepted as temporary because the sidecar
    did not exist yet. It does now, so there is one path (PROMPT_14 Р5.2 debt).

    Keeping it as an argument put a live credential into every query log that records
    variables, which is the quiet kind of leak nobody notices until an audit.
    """
    from common.auth import authenticate_device_request, require_device

    teacher = make_teacher()
    device, raw = paired(teacher)

    class _Request:
        META = {"HTTP_AUTHORIZATION": f"Device {raw}"}

    assert authenticate_device_request(_Request()).id == device.id

    class _Info:
        class context:
            request = _Request()

    assert require_device(_Info()).id == device.id


def test_a_persons_session_is_not_a_machine_key_and_the_reverse():
    """`require_device` returns a Device, `require_user` a User — deliberately not
    interchangeable. A machine may say it is alive and how fast its channel is; it must never
    thereby be able to read a child's homework.
    """
    from common.auth import authenticate_device_request

    teacher = make_teacher()
    _device, raw = paired(teacher)

    class _BearerRequest:
        META = {"HTTP_AUTHORIZATION": f"Bearer {raw}"}

    class _NoHeader:
        META = {}

    assert authenticate_device_request(_BearerRequest()) is None
    assert authenticate_device_request(_NoHeader()) is None
    assert authenticate_device_request(None) is None


def test_a_revoked_machines_header_stops_working_immediately():
    from common.auth import authenticate_device_request

    teacher = make_teacher()
    device, raw = paired(teacher)

    class _Request:
        META = {"HTTP_AUTHORIZATION": f"Device {raw}"}

    assert authenticate_device_request(_Request()) is not None
    devices.revoke_device(teacher, device.id)
    assert authenticate_device_request(_Request()) is None


def test_no_mutation_takes_a_machine_key_as_an_argument_any_more():
    """The debt, as a schema assertion: a credential in a variable is a credential in a log."""
    import re as _re

    from api.schema import schema

    block = _re.search(r"type Mutation \{(.*?)\n\}", schema.as_str(), _re.S).group(1)
    for line in block.splitlines():
        assert "deviceToken" not in line, line
