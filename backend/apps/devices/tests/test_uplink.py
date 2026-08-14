"""Measuring the teacher's channel (Р5.1 — OWNER_SCOPE §19.3).

The numbers are the budget's (`R5_DESKTOP_HOST_BUDGET.md` §3): 1.1 / 2.4 / 4.3 Mbit/s
outbound for 2 / 4 / 8 participants in the Р5.1 video mode. This file pins that they are
applied downward — a channel that measured 4.29 does not get told it can carry eight, because
the cost of optimism here is a lesson breaking up in front of children.

🔴 And it pins the rule that matters more than any number: **the verdict never blocks
anything.** «Предупреждаем, не запрещаем» — the teacher is told what the channel is good for
and decides, because they know what the lesson is and who the children are.
"""

import ast
import datetime as dt
from pathlib import Path

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.devices import services as devices
from apps.devices import uplink
from common.enums import ConnectionType, DevicePlatform, Role, UplinkVerdict
from common.exceptions import NotFound, ValidationError

pytestmark = pytest.mark.django_db


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Люция",
        last_name="Валерьевна",
        role=Role.TEACHER,
        specialty="English",
    )


def paired(user):
    row, secret = devices.request_pairing_code(
        device_name="MacBook", platform=DevicePlatform.MACOS.value
    )
    devices.confirm_pairing_code(user, row.code)
    return devices.claim_device_token(code=row.code, secret=secret)


# --- the numbers are the budget's ----------------------------------------------------------------
def test_the_thresholds_are_the_ones_the_budget_names():
    """Not re-derived here. If these ever drift from R5_DESKTOP_HOST_BUDGET.md §3, the screen
    starts promising a group size the channel cannot carry."""
    assert uplink.REQUIRED_MBPS == {2: 1.1, 4: 2.4, 8: 4.3}
    assert uplink.PROBE_SECONDS == 12
    assert uplink.MEASURE_BEFORE_LESSON == dt.timedelta(minutes=5)


@pytest.mark.parametrize(
    ("mbps", "group"),
    [
        (0.4, 0),  # below the floor: even a pair breaks up
        (1.0, 2),  # over the floor, under the two-person figure — a pair, and only just
        (1.1, 2),
        (2.39, 2),  # rounded DOWN: 2.39 is not four people
        (2.4, 4),
        (4.29, 4),  # …and 4.29 is not eight
        (4.3, 8),
        (25.0, 8),
    ],
)
def test_a_channel_is_never_credited_with_more_than_it_measured(mbps, group):
    assert uplink.assess(mbps).group_size == group


def test_the_verdicts_read_the_way_a_person_would_expect():
    assert uplink.assess(0.4).verdict is UplinkVerdict.TOO_WEAK
    assert uplink.assess(1.5).verdict is UplinkVerdict.TIGHT
    assert uplink.assess(3.0).verdict is UplinkVerdict.WORKABLE
    # Exactly on the eight-person figure is «workable», not «comfortable»: no headroom.
    assert uplink.assess(4.3).verdict is UplinkVerdict.WORKABLE
    assert uplink.assess(20.0).verdict is UplinkVerdict.COMFORTABLE
    assert uplink.assess(None).verdict is UplinkVerdict.UNKNOWN


def test_nonsense_measures_as_unknown_rather_than_as_a_great_channel():
    assert uplink.assess(float("nan")).verdict is UplinkVerdict.UNKNOWN
    assert uplink.assess(-5).verdict is UplinkVerdict.UNKNOWN


def test_a_measurement_from_this_morning_says_nothing_about_this_evening():
    now = timezone.now()
    assert uplink.is_stale(None) is True
    assert uplink.is_stale(now - dt.timedelta(hours=1), now=now) is False
    assert uplink.is_stale(now - dt.timedelta(hours=13), now=now) is True


def test_the_next_measurement_is_due_five_minutes_before_the_lesson():
    """One place, so the app and the server do not each keep their own five minutes."""
    start = timezone.now() + dt.timedelta(hours=2)
    assert uplink.due_at(start) == start - dt.timedelta(minutes=5)
    assert uplink.due_at(None) is None


# --- 🔴 «предупреждаем, не запрещаем» ---------------------------------------------------------------
def test_recording_a_terrible_measurement_refuses_nothing():
    """Owner decision §19.3. A weak channel produces a verdict and a smaller suggested group,
    and the lesson still starts if the teacher wants it to."""
    teacher = make_teacher()
    _device, token = paired(teacher)

    row = devices.report_uplink(token, mbps=0.2, connection_type=ConnectionType.RELAY.value)

    assert row.uplink_mbps == 0.2
    assert uplink.assess(row.uplink_mbps).verdict is UplinkVerdict.TOO_WEAK
    # …and the machine is still perfectly able to host: nothing was disabled.
    assert row.is_revoked is False
    assert devices.authenticate_device(token) is not None


def test_the_uplink_module_can_refuse_nothing_because_it_raises_nothing():
    """The rule as a property of the code: a pure assessment has no way to block a lesson.

    Executable code only, so the prose above (which says «блокирует» on purpose) cannot
    satisfy it.
    """
    tree = ast.parse(Path(uplink.__file__).read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Module | ast.ClassDef | ast.FunctionDef):
            body = node.body
            if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
                node.body = body[1:]
    assert not [n for n in ast.walk(tree) if isinstance(n, ast.Raise)]


# --- reporting -----------------------------------------------------------------------------------------
def test_a_measurement_needs_a_real_machine_key():
    with pytest.raises(NotFound):
        devices.report_uplink("not-a-key", mbps=5.0, connection_type="direct")


def test_a_revoked_machine_cannot_report():
    teacher = make_teacher()
    device, token = paired(teacher)
    devices.revoke_device(teacher, device.id)

    with pytest.raises(NotFound):
        devices.report_uplink(token, mbps=5.0, connection_type="direct")


def test_nonsense_is_refused_at_the_door():
    teacher = make_teacher()
    _device, token = paired(teacher)

    with pytest.raises(ValidationError):
        devices.report_uplink(token, mbps=float("nan"), connection_type="direct")
    with pytest.raises(ValidationError):
        devices.report_uplink(token, mbps=-1, connection_type="direct")
    with pytest.raises(ValidationError):
        devices.report_uplink(token, mbps=5.0, connection_type="carrier-pigeon")


def test_reporting_a_measurement_also_counts_as_being_alive():
    """A machine that just measured is plainly awake — making the teacher's presence depend on
    a separate heartbeat arriving first would show «не в сети» to a pupil at the worst moment."""
    teacher = make_teacher()
    _device, token = paired(teacher)

    row = devices.report_uplink(token, mbps=6.0, connection_type=ConnectionType.DIRECT.value)
    assert row.last_seen_at is not None


def test_the_connection_type_is_remembered_because_it_explains_what_the_teacher_feels():
    """RELAY means the network refused a direct path and every packet goes through our
    server. Worth knowing before blaming the laptop."""
    teacher = make_teacher()
    _device, token = paired(teacher)

    devices.report_uplink(token, mbps=6.0, connection_type=ConnectionType.RELAY.value)
    assert devices.my_devices(teacher)[0].connection_type == ConnectionType.RELAY.value

    devices.report_uplink(token, mbps=6.0, connection_type=ConnectionType.DIRECT.value)
    assert devices.my_devices(teacher)[0].connection_type == ConnectionType.DIRECT.value


def test_a_machine_that_never_measured_reports_no_assessment():
    """Null, not «0 Мбит/с» — an unmeasured channel and a dead one are different facts."""
    from apps.devices.graphql.types import Device as DeviceType

    teacher = make_teacher()
    device, _token = paired(teacher)
    assert DeviceType.of(device).uplink is None
