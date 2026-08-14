"""The first run of a teacher's machine — atlas D2, OWNER_SCOPE §19 (Р5.4).

Three things this file exists to hold, all of them owner decisions rather than taste:
the copy is mandatory, the cabinet's location never leaves the machine, and attention
analysis starts off.
"""

from __future__ import annotations

import datetime as dt

import pytest
from django.utils import timezone

from apps.accounts import services as accounts
from apps.devices import services
from apps.devices.models import Device
from common.enums import BackupKind, Role
from common.exceptions import ValidationError

pytestmark = pytest.mark.django_db


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Люция",
        last_name="Валерьевна",
        role=Role.TEACHER,
    )


def paired_machine(user) -> Device:
    row, secret = services.request_pairing_code(
        device_name="MacBook Люции", platform="macos", app_version="0.1.0"
    )
    services.confirm_pairing_code(user, row.code)
    device, _token = services.claim_device_token(code=row.code, secret=secret)
    return device


# --- §19.1: копия обязательна -----------------------------------------------
def test_a_fresh_machine_starts_on_step_one_with_no_copy():
    device = paired_machine(make_teacher())
    assert device.setup_step == 1
    assert device.setup_completed_at is None
    assert device.backup_kind == BackupKind.NONE.value


def test_setup_refuses_to_finish_without_the_mandatory_copy():
    # 🔴 §19.1: «шаг пропустить нельзя». A wizard is a sequence of components and a component
    # can be skipped by a URL — so the refusal lives here, not on the screen.
    device = paired_machine(make_teacher())
    services.advance_setup(device, step=4)
    with pytest.raises(ValidationError):
        services.complete_setup(device)


def test_none_is_not_a_choice_a_teacher_can_make():
    device = paired_machine(make_teacher())
    with pytest.raises(ValidationError):
        services.configure_backup(device, kind=BackupKind.NONE.value)


def test_a_configured_copy_lets_setup_finish():
    device = paired_machine(make_teacher())
    services.configure_backup(device, kind=BackupKind.EXTERNAL_DISK.value)
    services.advance_setup(device, step=4)
    device = services.complete_setup(device)
    assert device.setup_completed_at is not None
    assert device.setup_step == 5


def test_progress_only_moves_forward():
    # «Настройку можно прервать: сделанное сохраняется, приложение вернёт на тот же шаг» —
    # re-reading step 2 must not un-remember step 4.
    device = paired_machine(make_teacher())
    services.advance_setup(device, step=4)
    services.advance_setup(device, step=2)
    assert Device.objects.get(id=device.id).setup_step == 4


def test_an_unknown_step_is_refused():
    device = paired_machine(make_teacher())
    for step in (0, 6, 99, -1):
        with pytest.raises(ValidationError):
            services.advance_setup(device, step=step)


# --- 🔒 the cabinet's location stays on the machine --------------------------
def test_the_server_never_learns_where_the_cabinet_folder_is():
    """§19.1 entitles us to know a copy EXISTS. Where it sits is the teacher's own disk.

    A path would carry their OS account name — «/Users/люция/…» — for no product benefit.
    Asserted against the model's own columns so a future field cannot slip in quietly.
    """
    columns = {f.name for f in Device._meta.get_fields() if hasattr(f, "attname")}
    for forbidden in ("path", "folder", "directory", "cabinet_path", "backup_path", "location"):
        assert not any(
            forbidden in name for name in columns
        ), f"Device.{forbidden} would put the teacher's own filesystem on our server"


def test_the_backup_record_carries_a_kind_and_a_time_and_nothing_else():
    device = paired_machine(make_teacher())
    services.configure_backup(device, kind=BackupKind.CLOUD_FOLDER.value, cloud_copy=True)
    row = Device.objects.get(id=device.id)
    assert row.backup_kind == BackupKind.CLOUD_FOLDER.value
    assert row.backup_configured_at is not None
    assert row.cloud_copy_enabled is True


def test_making_a_copy_is_remembered_for_the_settings_screen():
    device = paired_machine(make_teacher())
    before = timezone.now()
    device = services.record_backup(device)
    assert device.last_backup_at is not None and device.last_backup_at >= before


# --- расписание копий (Р5.5) -------------------------------------------------
def test_a_machine_with_no_copy_configured_is_not_nagged():
    """Настройка не дошла до шага 2 — это чинит мастер, а не расписание."""
    device = paired_machine(make_teacher())
    assert services.backup_is_due(device) is False


def test_the_first_copy_is_due_immediately():
    device = paired_machine(make_teacher())
    services.configure_backup(device, kind=BackupKind.EXTERNAL_DISK.value)
    assert services.backup_is_due(device) is True


def test_a_copy_a_day_and_not_more_often():
    device = paired_machine(make_teacher())
    services.configure_backup(device, kind=BackupKind.EXTERNAL_DISK.value)
    device = services.record_backup(device)

    assert (
        services.backup_is_due(device, now=device.last_backup_at + dt.timedelta(hours=3)) is False
    )
    assert (
        services.backup_is_due(device, now=device.last_backup_at + dt.timedelta(hours=25)) is True
    )


def test_after_a_lesson_always_even_if_one_was_made_an_hour_ago():
    """🔴 Работа, которая только что пришла, — ровно то, чего ещё нигде нет.

    Ежедневная копия, пропускающая вечернюю домашку, — это ежедневная копия вчерашнего дня.
    """
    device = paired_machine(make_teacher())
    services.configure_backup(device, kind=BackupKind.EXTERNAL_DISK.value)
    device = services.record_backup(device)

    just_now = device.last_backup_at + dt.timedelta(minutes=1)
    assert services.backup_is_due(device, now=just_now) is False
    assert services.backup_is_due(device, now=just_now, after_lesson=True) is True
