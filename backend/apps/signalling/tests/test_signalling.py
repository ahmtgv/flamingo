"""Signalling and the relay (Р5.1 — PROMPT_14).

Two properties carry this phase, and both are checked against structure rather than intent:

* **the server routes and forgets.** No model, no stored SDP, no ICE candidate that outlives
  the call it set up — an ICE candidate is a home IP address;
* **a handshake is between two people.** It goes to the addressee's own channel, never to the
  room, or every pupil would learn every other pupil's network addresses.

Plus the relay credential, which must expire by itself and must never be signed with a
stand-in secret.
"""

import ast
import base64
import hashlib
import hmac
import re
import time
from datetime import date
from pathlib import Path
from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.scheduling.models import LessonSession
from apps.signalling import services as signalling
from common.enums import Role, SignalKind
from common.exceptions import NotFound, PermissionDenied, ValidationError
from common.turn import credentials_for

pytestmark = pytest.mark.django_db

SIGNALLING_DIR = Path(signalling.__file__).resolve().parent


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Люция",
        last_name="Валерьевна",
        role=Role.TEACHER,
        specialty="English",
    )


def make_pupil(email="p@example.com", first="Аня"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name=first,
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2010, 1, 1),
        consent_152fz=True,
    )


def a_session(teacher):
    course = courses.create_course(teacher, title="English A2", subject="Английский", level="adult")
    section = courses.create_section(teacher, course.id, title="Unit 4 · Travel")
    lesson = courses.create_lesson(teacher, section.id, title="Asking for directions")
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    return course, LessonSession.objects.create(lesson=lesson, start_at=timezone.now())


SDP = "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n"


# --- 🔒 the server routes and forgets -----------------------------------------------------------
def test_the_signalling_app_has_no_model_at_all():
    """An SDP that outlives the call it set up is a record of who was where, kept for nobody.

    Checked as an absence of a file and of any `models.Model` in the package — «мы просто не
    стали писать модель» is not a guarantee, a failing test is.
    """
    assert not (SIGNALLING_DIR / "models.py").exists()
    for path in SIGNALLING_DIR.rglob("*.py"):
        if "test" in path.name:
            continue  # this file names the forbidden things on purpose
        source = path.read_text(encoding="utf-8")
        assert "models.Model" not in source, path.name
        assert "objects.create" not in source, path.name


def test_no_model_anywhere_holds_an_sdp_or_an_ice_candidate():
    from django.apps import apps as django_apps

    banned = ("sdp", "ice_candidate", "icecandidate", "signal")
    offenders = []
    for model in django_apps.get_models():
        if not model.__module__.startswith("apps."):
            continue
        label = f"{model._meta.app_label}.{model.__name__}"
        for token in banned:
            if token in model.__name__.lower():
                offenders.append(label)
            for field in model._meta.get_fields():
                if token in getattr(field, "name", "").lower():
                    offenders.append(f"{label}.{field.name}")
    assert not offenders, f"signalling data is being stored: {sorted(set(offenders))}"


def test_a_signal_goes_to_the_addressee_and_not_to_the_room():
    """Broadcasting a handshake to the class would hand every pupil's home IP address to
    every other pupil. The group name is per RECIPIENT for exactly that reason."""
    teacher = make_teacher()
    course, session = a_session(teacher)
    anya = make_pupil("a@example.com")
    courses.enroll(anya, course.id)

    sent = {}

    class _Layer:
        async def group_send(self, group, message):
            sent["group"] = group
            sent["message"] = message

    with patch("apps.signalling.services.get_channel_layer", return_value=_Layer()):
        signalling.send(
            teacher,
            session_id=session.id,
            to_peer=str(anya.id),
            kind=SignalKind.OFFER,
            payload=SDP,
        )

    assert sent["group"] == f"signal_{session.id}_{anya.id}"
    assert str(session.id) in sent["group"]
    assert sent["message"]["from_peer"] == str(teacher.id)
    assert sent["message"]["payload"] == SDP


# --- who may signal whom -------------------------------------------------------------------------
def test_a_stranger_cannot_signal_into_a_lesson():
    teacher = make_teacher()
    _course, session = a_session(teacher)
    outsider = make_pupil("far@example.com", "Чужой")

    with pytest.raises(NotFound):
        signalling.send(
            outsider,
            session_id=session.id,
            to_peer=str(teacher.id),
            kind=SignalKind.OFFER,
            payload=SDP,
        )


def test_a_signal_addressed_outside_the_lesson_goes_nowhere():
    """«Нет такого», not «нельзя»: who else is in a lesson must not be enumerable by probing."""
    teacher = make_teacher()
    course, session = a_session(teacher)
    anya = make_pupil("a@example.com")
    courses.enroll(anya, course.id)
    outsider = make_pupil("far@example.com", "Чужой")

    with pytest.raises(NotFound):
        signalling.send(
            anya,
            session_id=session.id,
            to_peer=str(outsider.id),
            kind=SignalKind.OFFER,
            payload=SDP,
        )


def test_an_oversized_payload_is_refused():
    """A few kilobytes is a handshake. An order of magnitude more is somebody using the
    signalling channel as a transport."""
    teacher = make_teacher()
    _course, session = a_session(teacher)

    with pytest.raises(ValidationError):
        signalling.send(
            teacher,
            session_id=session.id,
            to_peer=str(teacher.id),
            kind=SignalKind.ICE,
            payload="x" * (signalling.MAX_PAYLOAD + 1),
        )


def test_signalling_is_gated_by_the_matrix(settings):
    """One key covers the handshake and the relay: turning off one without the other gives a
    lesson that connects for some children and not others."""
    from common.compliance.policy import reload_matrix

    teacher = make_teacher()
    _course, session = a_session(teacher)
    settings.DEPLOYMENT_JURISDICTION = ""  # unmodelled regime → fail closed
    reload_matrix()

    with pytest.raises(PermissionDenied):
        signalling.send(
            teacher,
            session_id=session.id,
            to_peer=str(teacher.id),
            kind=SignalKind.OFFER,
            payload=SDP,
        )


# --- 🔒 the relay credential ------------------------------------------------------------------------
def test_a_credential_is_an_hmac_that_expires_by_itself(settings):
    """The coturn REST scheme: the username IS the expiry, and the password is its HMAC. So a
    credential read out of a browser's memory is dead within the hour."""
    settings.TURN = {"urls": "turn:relay.example:3478", "secret": "s3cret", "ttl_seconds": 3600}

    creds = credentials_for("user-1", ttl_seconds=600)

    expiry, identity = creds.username.split(":", 1)
    assert identity == "user-1"
    assert 590 <= int(expiry) - int(time.time()) <= 610
    expected = base64.b64encode(
        hmac.new(b"s3cret", creds.username.encode(), hashlib.sha1).digest()
    ).decode()
    assert creds.credential == expected
    assert creds.configured is True


def test_without_a_configured_secret_the_credential_is_unusable_and_says_so(settings):
    """Signing with a stand-in would produce a credential that looks valid and is not — an
    hour of debugging the wrong thing."""
    settings.TURN = {"urls": "", "secret": "", "ttl_seconds": 3600}

    creds = credentials_for("user-1")
    assert creds.credential == ""
    assert creds.configured is False


def test_the_ttl_is_bounded_at_both_ends(settings):
    settings.TURN = {"urls": "turn:relay.example:3478", "secret": "s"}
    assert credentials_for("u", ttl_seconds=1).ttl_seconds == 60
    assert credentials_for("u", ttl_seconds=10**9).ttl_seconds == 86_400


def test_the_secret_never_reaches_the_client():
    """What a client gets is one HMAC and no way to mint another."""
    from api.schema import schema

    sdl = schema.as_str()
    block = re.search(r"type TurnCredentials \{(.*?)\n\}", sdl, re.S).group(1)
    assert "secret" not in block.lower()
    assert "credential: String!" in block


def test_the_turn_helper_reaches_for_no_network_and_no_storage():
    """Minting is arithmetic. A module that talked to the relay, or wrote a row, would be a
    second place a credential exists."""
    import common.turn as turn_module

    tree = ast.parse(Path(turn_module.__file__).read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Module | ast.ClassDef | ast.FunctionDef):
            body = node.body
            if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
                node.body = body[1:]
    code = ast.unparse(tree).lower()
    for smell in ("requests.", "urlopen", "httpx", "objects.", "models"):
        assert smell not in code, f"the TURN helper reaches for {smell!r}"
