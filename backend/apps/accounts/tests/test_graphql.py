"""GraphQL-layer tests: execute operations through the schema."""

from types import SimpleNamespace

import pytest
from django.contrib.auth.models import AnonymousUser

from api.schema import schema
from common.auth import authenticate_request

pytestmark = pytest.mark.django_db


def _ctx(user=None, token: str | None = None):
    meta = {}
    if token:
        meta["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    request = SimpleNamespace(META=meta, user=user or AnonymousUser())
    return SimpleNamespace(request=request)


REGISTER = """
mutation Reg($i: RegisterUserInput!) {
  registerUser(input: $i) {
    token
    refreshToken
    user { id email role firstName studentProfile { ageBand points } }
  }
}
"""

ME = "query { me { id email role } }"


def test_register_then_me_through_schema():
    variables = {
        "i": {
            "email": "flow@example.com",
            "password": "strongpass1!",
            "firstName": "Петя",
            "lastName": "Сидоров",
            "role": "STUDENT",
            "student": {"birthDate": "2013-01-01", "gradeLevel": "7"},
        }
    }
    res = schema.execute_sync(REGISTER, variable_values=variables, context_value=_ctx())
    assert res.errors is None, res.errors
    payload = res.data["registerUser"]
    assert payload["token"] and payload["refreshToken"]
    assert payload["user"]["email"] == "flow@example.com"
    assert payload["user"]["role"] == "STUDENT"
    assert payload["user"]["studentProfile"]["ageBand"] == "TEEN"

    # authenticate as that user via the access token and query `me`
    token = payload["token"]
    user = authenticate_request(_ctx(token=token).request)
    assert user is not None
    res2 = schema.execute_sync(ME, context_value=_ctx(user=user, token=token))
    assert res2.errors is None, res2.errors
    assert res2.data["me"]["email"] == "flow@example.com"


def test_me_is_null_without_auth():
    res = schema.execute_sync(ME, context_value=_ctx())
    assert res.errors is None, res.errors
    assert res.data["me"] is None


TEACHER_CARD = "query($id: ID!) { teacher(id: $id) { user { id firstName email phone } } }"


def test_teacher_contact_pii_hidden_from_anonymous():
    """A-152fz-1: email/phone are 152-FZ contact PII. The public teacher card exposes name only —
    anonymous/unrelated viewers get null email+phone; the teacher themselves sees their own."""
    from apps.accounts import services as accounts
    from common.enums import Role

    teacher = accounts.register_user(
        email="pii.teacher@example.com",
        password="strongpass1!",
        first_name="Мария",
        last_name="П",
        role=Role.TEACHER,
        specialty="Математика",
    )
    teacher.phone = "+79990000000"
    teacher.save(update_fields=["phone"])
    tid = str(teacher.id)

    def card(user):
        res = schema.execute_sync(
            TEACHER_CARD, variable_values={"id": tid}, context_value=_ctx(user=user)
        )
        assert res.errors is None, res.errors
        return res.data["teacher"]["user"]

    # Anonymous: name visible, contact PII hidden.
    anon = card(None)
    assert anon["firstName"] == "Мария"
    assert anon["email"] is None and anon["phone"] is None

    # The teacher themselves: own contact PII visible.
    mine = card(teacher)
    assert mine["email"] == "pii.teacher@example.com"
    assert mine["phone"] == "+79990000000"
