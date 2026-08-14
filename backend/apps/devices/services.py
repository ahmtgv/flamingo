"""Pairing a machine: request → confirm in a browser → claim once (Р5.0).

The whole flow, in three calls and one rule each:

* ``request_pairing_code`` — **unauthenticated**, because the app has no identity yet. That
  is the point of the design, not a gap in it: an app that could authenticate would have had
  to ask for a password.
* ``confirm_pairing_code`` — **authenticated**, in the browser, by the person who owns the
  account. This is where identity enters, and it is the only place.
* ``claim_device_token`` — unauthenticated, but needs the secret the asking app holds. Runs
  exactly once and hands back the key in plaintext for the only time it will ever exist
  outside a keychain.

Jurisdiction: pairing is registered as `device_pairing` in ``matrix.json``. It is not
ceremony — binding a machine is the act that moves children's data onto a private laptop, and
the EU analysis for that (controller/processor, DPIA) has not been done (OWNER_SCOPE §18).
"""

from __future__ import annotations

import datetime as dt
import hashlib
import secrets
from pathlib import Path

from django.db import transaction
from django.utils import timezone

from common.compliance.policy import require_feature
from common.enums import BackupKind, ConnectionType
from common.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Device, DeviceToken, PairingCode

FEATURE_PAIRING = "device_pairing"

#: PROMPT_14 §2.2.3. Ten minutes is long enough to walk to a browser and short enough that a
#: code left on a screen is dead before the room empties.
PAIRING_TTL = dt.timedelta(minutes=10)

#: No 0/O/1/I — read off one screen and typed into another, in a hurry. Same alphabet the
#: projector code uses, for the same reason.
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

MAX_DEVICE_NAME = 120


#: Пять шагов листа D2: вход · данные · согласия · проверка · готово.
SETUP_STEPS = 5


def _new_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))


def hash_secret(raw: str) -> str:
    """sha256, no salt — deliberately.

    These are 256-bit random strings we generated ourselves, not passwords a person chose:
    there is no dictionary to attack and no reuse across sites to protect. A slow KDF here
    would buy nothing and would put a work factor on the heartbeat path.
    """
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _new_secret() -> str:
    return secrets.token_urlsafe(32)


# --- 1. the app asks ---------------------------------------------------------------------


@transaction.atomic
def request_pairing_code(*, device_name: str, platform: str, app_version: str = "") -> tuple:
    """The app shows a code. Returns ``(row, secret)`` — the secret is never stored raw.

    Unauthenticated on purpose (§19.4). Nothing is created for an account here: until a
    person confirms in a browser, this row is an offer, not a permission.
    """
    device_name = (device_name or "").strip()[:MAX_DEVICE_NAME]
    if not device_name:
        raise ValidationError("A device needs a name")

    secret = _new_secret()
    for _ in range(10):  # collision retry; the alphabet makes it practically never happen
        code = _new_code()
        if PairingCode.objects.filter(code=code).exists():
            continue
        row = PairingCode.objects.create(
            code=code,
            secret_hash=hash_secret(secret),
            device_name=device_name,
            platform=platform,
            app_version=(app_version or "")[:32],
            expires_at=timezone.now() + PAIRING_TTL,
        )
        return row, secret
    raise ValidationError("Could not allocate a pairing code")


# --- 2. the person confirms, in a browser ---------------------------------------------------


def _live_code(code: str) -> PairingCode:
    row = PairingCode.objects.filter(code=(code or "").strip().upper()).first()
    # One error for «wrong», «expired» and «already used». Distinguishing them would turn the
    # endpoint into an oracle for guessing codes, and none of the three is actionable
    # differently by the person: they ask the app for a new code either way.
    if row is None or row.consumed_at is not None or row.expires_at < timezone.now():
        raise NotFound("Pairing code not found")
    return row


def confirm_pairing_code(user, code: str) -> Device:
    """«Связать» in the browser. The one place identity enters the flow."""
    # Before the transaction: a refusal writes evidence and then raises, and inside an atomic
    # block that raise would roll the evidence back with it (common/compliance/policy.py).
    require_feature(user, FEATURE_PAIRING)
    return _confirm(user, code)


@transaction.atomic
def _confirm(user, code: str) -> Device:
    row = _live_code(code)
    if row.confirmed_at is not None:
        raise ValidationError("This code has already been confirmed")

    device = Device.objects.create(
        owner=user,
        name=row.device_name,
        platform=row.platform,
        app_version=row.app_version,
    )
    row.confirmed_at = timezone.now()
    row.confirmed_by = user
    row.device = device
    row.save(update_fields=["confirmed_at", "confirmed_by", "device", "updated_at"])
    return device


# --- 3. the app collects the key, once ------------------------------------------------------


@transaction.atomic
def claim_device_token(*, code: str, secret: str) -> tuple[Device, str]:
    """Exchange a confirmed code for the machine key. Returns ``(device, raw_token)``.

    The secret is what makes this safe to leave unauthenticated: the code proves a human
    approved, the secret proves this is the machine that asked. Holding only one of the two
    gets you nothing.
    """
    row = _live_code(code)
    if row.confirmed_at is None or row.device is None:
        raise ValidationError("This code has not been confirmed yet")
    if not secrets.compare_digest(row.secret_hash, hash_secret(secret or "")):
        # Same message as an unknown code — a different one would say «the code is real,
        # keep trying the secret».
        raise NotFound("Pairing code not found")

    raw = secrets.token_urlsafe(48)
    DeviceToken.objects.create(device=row.device, token_hash=hash_secret(raw))
    row.consumed_at = timezone.now()
    row.save(update_fields=["consumed_at", "updated_at"])
    return row.device, raw


# --- living with a paired machine -------------------------------------------------------------


def authenticate_device(raw_token: str) -> Device | None:
    """Resolve a machine key to its device, or None. Never raises — a caller decides what an
    unknown key means in its own context."""
    if not raw_token:
        return None
    token = (
        DeviceToken.objects.filter(token_hash=hash_secret(raw_token), revoked_at__isnull=True)
        .select_related("device__owner")
        .first()
    )
    if token is None or token.device.is_revoked:
        return None
    return token.device


def touch(device: Device) -> Device:
    """Record that the machine is alive. Presence is read from this."""
    now = timezone.now()
    Device.objects.filter(id=device.id).update(last_seen_at=now, updated_at=now)
    DeviceToken.objects.filter(device=device, revoked_at__isnull=True).update(last_used_at=now)
    device.last_seen_at = now
    return device


def report_uplink(raw_token: str, *, mbps: float, connection_type: str) -> Device:
    """The machine reports what it measured, by key. Kept for callers holding a raw key."""
    device = authenticate_device(raw_token)
    if device is None:
        raise NotFound("Device not found")
    return record_uplink(device, mbps=mbps, connection_type=connection_type)


def record_uplink(device: Device, *, mbps: float, connection_type: str) -> Device:
    """The same, for a machine already resolved from `Authorization: Device <key>` (Р5.2).

    🔴 Recording a measurement never refuses anything. Owner decision §19.3 is «предупреждаем,
    не запрещаем» — a weak channel produces a verdict in words and a smaller suggested group,
    and the teacher decides. There is deliberately no code path here that could block a lesson.
    """
    try:
        value = float(mbps)
    except (TypeError, ValueError) as exc:
        raise ValidationError("A measurement must be a number") from exc
    if value != value or value < 0:  # NaN or negative
        raise ValidationError("A measurement must be a number")
    try:
        ConnectionType(connection_type)
    except ValueError as exc:
        raise ValidationError("Unknown connection type") from exc

    now = timezone.now()
    device.uplink_mbps = value
    device.uplink_measured_at = now
    device.connection_type = connection_type
    device.last_seen_at = now
    device.save(
        update_fields=[
            "uplink_mbps",
            "uplink_measured_at",
            "connection_type",
            "last_seen_at",
            "updated_at",
        ]
    )
    return device


def my_devices(user) -> list[Device]:
    """The caller's own machines. Takes no user id."""
    return list(Device.objects.filter(owner=user, revoked_at__isnull=True))


@transaction.atomic
def revoke_device(user, device_id) -> bool:
    """«Отозвать» — the stolen-laptop button (§19.4 п.3).

    Revoking the device revokes its keys in the same breath. Leaving a live key attached to a
    dead device is exactly the kind of half-revocation that reads as done and is not.
    """
    device = Device.objects.filter(id=device_id).first()
    if device is None:
        raise NotFound("Device not found")
    if device.owner_id != getattr(user, "id", None):
        # Not «нельзя» — «нет такой». Whose machines exist is not a stranger's business.
        raise NotFound("Device not found")

    now = timezone.now()
    device.revoked_at = now
    device.save(update_fields=["revoked_at", "updated_at"])
    DeviceToken.objects.filter(device=device, revoked_at__isnull=True).update(
        revoked_at=now, updated_at=now
    )
    return True


def require_owner(user, device: Device) -> None:
    if device.owner_id != getattr(user, "id", None):
        raise PermissionDenied("Not your device")


# --- first run (D2, Р5.4) ----------------------------------------------------
def advance_setup(device: Device, *, step: int) -> Device:
    """Remember which of the five steps this machine reached.

    Monotonic on purpose: «сделанное сохраняется, приложение вернёт на тот же шаг». Going
    back to re-read step 3 must not un-remember step 4, so the stored number only ever grows.
    """
    if step < 1 or step > SETUP_STEPS:
        raise ValidationError("Unknown setup step")
    if step > device.setup_step:
        Device.objects.filter(id=device.id).update(setup_step=step, updated_at=timezone.now())
        device.setup_step = step
    return device


def configure_backup(device: Device, *, kind: str, cloud_copy: bool = False) -> Device:
    """Record that a copy is configured — and refuse the state where none is.

    🔴 OWNER_SCOPE §19.1: the copy is mandatory and this step cannot be skipped. It is the one
    place in the product that forces anything, and it earns it — the laptop is the only place
    the work and grades of living children exist.

    What is stored is the KIND, never the path (see `Device.backup_kind`).
    """
    try:
        value = BackupKind(kind)
    except ValueError as exc:
        raise ValidationError("Unknown backup kind") from exc
    if value is BackupKind.NONE:
        raise ValidationError("A cabinet copy is mandatory")

    now = timezone.now()
    Device.objects.filter(id=device.id).update(
        backup_kind=value.value,
        backup_configured_at=now,
        cloud_copy_enabled=bool(cloud_copy),
        updated_at=now,
    )
    device.backup_kind = value.value
    device.backup_configured_at = now
    device.cloud_copy_enabled = bool(cloud_copy)
    return advance_setup(device, step=3)


def record_backup(device: Device) -> Device:
    """A copy was just made. The settings screen shows this as «последняя копия»."""
    now = timezone.now()
    Device.objects.filter(id=device.id).update(last_backup_at=now, updated_at=now)
    device.last_backup_at = now
    return device


def complete_setup(device: Device) -> Device:
    """«Готово» — but only if the mandatory copy actually happened.

    The check is here rather than on the screen because a wizard is a sequence of components
    and a component can be skipped by a URL. §19.1 says the step cannot be skipped; this is
    the sentence that makes that true.
    """
    if device.backup_kind == BackupKind.NONE.value:
        raise ValidationError("A cabinet copy is mandatory")
    now = timezone.now()
    Device.objects.filter(id=device.id).update(
        setup_step=SETUP_STEPS, setup_completed_at=now, updated_at=now
    )
    device.setup_step = SETUP_STEPS
    device.setup_completed_at = now
    return device


# --- расписание копий (Р5.5) -------------------------------------------------
#: «Раз в день» из листа D2. Не настраивается: копия — обязательство, а не предпочтение.
BACKUP_INTERVAL = dt.timedelta(days=1)

#: Куда sidecar кладёт файл. Наружу — на внешний диск или в папку облака — его переносит
#: оболочка: путь, который выбрал преподаватель, живёт на машине и в операции не попадает.
BACKUP_DIRNAME = "backups"


def backup_is_due(device: Device, *, now=None, after_lesson: bool = False) -> bool:
    """Пора ли снимать копию — «раз в день и после каждого занятия» (лист D2).

    After a lesson always, and not because a day has passed: the work that just came in is
    precisely what is not anywhere else yet. A daily copy that misses the evening's homework
    is a daily copy of yesterday.
    """
    if device.backup_kind == BackupKind.NONE.value:
        # Настройка не дошла до шага 2. Требовать копию некуда — это состояние чинится
        # мастером, а не расписанием.
        return False
    if after_lesson:
        return True
    if device.last_backup_at is None:
        return True
    return (now or timezone.now()) - device.last_backup_at >= BACKUP_INTERVAL


def run_backup(device: Device, *, passphrase: str | None = None):
    """Снять копию кабинета одним файлом и запомнить, что она снята.

    Возвращает заголовок файла — числа, а не «успешно»: экран настроек показывает, сколько
    строк и сколько файлов уехало, потому что «копия сделана» без чисел проверить нельзя.
    """
    from django.conf import settings

    from common.cabinet_file import SUFFIX, export_cabinet

    folder = Path(getattr(settings, "DATA_DIR", ".")) / BACKUP_DIRNAME
    stamp = timezone.now().strftime("%Y-%m-%d-%H%M")
    header = export_cabinet(folder / f"cabinet-{stamp}{SUFFIX}", passphrase=passphrase)
    record_backup(device)
    return header
