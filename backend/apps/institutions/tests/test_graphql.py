"""GraphQL-layer tests for institutions: execute operations through the schema."""

from types import SimpleNamespace

import pytest
from django.contrib.auth.models import AnonymousUser

from api.schema import schema
from apps.accounts import services as accounts
from apps.institutions import services
from common.enums import Role

pytestmark = pytest.mark.django_db


def _ctx(user=None):
    request = SimpleNamespace(META={}, user=user or AnonymousUser())
    return SimpleNamespace(request=request)


CREATE_INST = "mutation($i: InstitutionInput!){ createInstitution(input: $i){ id name status } }"
CREATE_GROUP = "mutation($i: GroupInput!){ createGroup(input: $i){ id name level } }"
GROUPS = "query($id: ID!){ groups(institutionId: $id){ id name } }"


def _make(email, role, **kw):
    return accounts.register_user(
        email=email, password="strongpass1!", first_name="И", last_name="Ф", role=role, **kw
    )


def test_institution_admin_flow_through_schema():
    staff = _make("staff@example.com", Role.ADMIN)
    staff.is_staff = True
    staff.save(update_fields=["is_staff"])
    admin = _make("admin@example.com", Role.ADMIN)

    # staff (back-office) creates the institution
    res = schema.execute_sync(
        CREATE_INST, variable_values={"i": {"name": "Школа №1"}}, context_value=_ctx(staff)
    )
    assert res.errors is None, res.errors
    inst_id = res.data["createInstitution"]["id"]
    assert res.data["createInstitution"]["status"] == "ACTIVE"

    # a non-staff user cannot create an institution
    res = schema.execute_sync(
        CREATE_INST, variable_values={"i": {"name": "Пиратская"}}, context_value=_ctx(admin)
    )
    assert res.errors is not None

    # back-office seeds the first admin; that admin then creates a group
    services.add_admin(staff, institution_id=inst_id, admin_user_id=admin.id)
    res = schema.execute_sync(
        CREATE_GROUP,
        variable_values={"i": {"institutionId": inst_id, "name": "7А", "level": "7"}},
        context_value=_ctx(admin),
    )
    assert res.errors is None, res.errors
    assert res.data["createGroup"]["name"] == "7А"

    # admin can list the institution's groups
    res = schema.execute_sync(GROUPS, variable_values={"id": inst_id}, context_value=_ctx(admin))
    assert res.errors is None, res.errors
    assert len(res.data["groups"]) == 1

    # an anonymous user cannot
    res = schema.execute_sync(GROUPS, variable_values={"id": inst_id}, context_value=_ctx())
    assert res.errors is not None


ME_INSTITUTION = "query { me { adminProfile { institution { id name } } } }"


def test_admin_me_exposes_their_institution():
    staff = _make("staff2@example.com", Role.ADMIN)
    staff.is_staff = True
    staff.save(update_fields=["is_staff"])
    admin = _make("admin2@example.com", Role.ADMIN)
    inst = services.create_institution(staff, name="Школа №2")
    services.add_admin(staff, institution_id=inst.id, admin_user_id=admin.id)

    # the admin's own institution is reachable via me.adminProfile.institution
    res = schema.execute_sync(ME_INSTITUTION, context_value=_ctx(admin))
    assert res.errors is None, res.errors
    assert res.data["me"]["adminProfile"]["institution"]["name"] == "Школа №2"

    # an admin with no active membership sees null (no entry point yet)
    other = _make("admin3@example.com", Role.ADMIN)
    res = schema.execute_sync(ME_INSTITUTION, context_value=_ctx(other))
    assert res.errors is None, res.errors
    assert res.data["me"]["adminProfile"]["institution"] is None
