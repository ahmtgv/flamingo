"""GraphQL-layer tests: execute operations through the schema."""
from types import SimpleNamespace

import pytest
from django.contrib.auth.models import AnonymousUser

from common.auth import authenticate_request

from api.schema import schema

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
