"""Device writes — the three steps of pairing, and the revoke.

🔒 There is no mutation here that takes a password, and there never will be (PROMPT_14
§2.2.1, OWNER_SCOPE §19.4). The fallback «войти по почте и паролю» is the ordinary WEB login
that already exists; the app's boundary is never where a password crosses.
"""

from __future__ import annotations

import strawberry

from apps.devices import services
from common.auth import require_device, require_user
from common.enums import BackupKind, ConnectionType, DevicePlatform

from .types import CabinetBackup, Device, DeviceClaim, PairingRequest


@strawberry.type
class DevicesMutation:
    @strawberry.mutation
    def request_pairing_code(
        self,
        info: strawberry.Info,
        device_name: str,
        platform: DevicePlatform = DevicePlatform.OTHER,
        app_version: str = "",
    ) -> PairingRequest:
        """The app asks to be paired. UNAUTHENTICATED by design.

        The app has no identity yet, and giving it one would have meant asking for a
        password. Nothing is granted here — until a person confirms in a browser this is an
        offer, not a permission.
        """
        row, secret = services.request_pairing_code(
            device_name=device_name, platform=platform.value, app_version=app_version
        )
        return PairingRequest(code=row.code, secret=secret, expires_at=row.expires_at)

    @strawberry.mutation
    def confirm_pairing_code(self, info: strawberry.Info, code: str) -> Device:
        """«Связать» in the browser — the one place identity enters the flow."""
        return Device.of(services.confirm_pairing_code(require_user(info), code))

    @strawberry.mutation
    def claim_device_token(self, info: strawberry.Info, code: str, secret: str) -> DeviceClaim:
        """The app collects the key, once. The secret proves it is the machine that asked."""
        device, token = services.claim_device_token(code=code, secret=secret)
        return DeviceClaim(device=Device.of(device), token=token)

    @strawberry.mutation
    def revoke_device(self, info: strawberry.Info, device_id: strawberry.ID) -> bool:
        """The stolen-laptop button. Revokes the machine AND its keys in one act."""
        return services.revoke_device(require_user(info), device_id)

    @strawberry.mutation
    def report_uplink(
        self,
        info: strawberry.Info,
        mbps: float,
        connection_type: ConnectionType = ConnectionType.UNKNOWN,
    ) -> Device:
        """The machine reports its twelve-second measurement (Р5.1).

        Authenticated by `Authorization: Device <key>` — one path, as of Р5.2. It used to take
        the key as an argument, which put a live credential into every query log that records
        variables.

        🔴 Recording it refuses nothing. §19.3: «предупреждаем, не запрещаем» — the teacher
        is told what the channel is good for and decides, because they know what the lesson
        is and who the children are.
        """
        return Device.of(
            services.record_uplink(
                require_device(info), mbps=mbps, connection_type=connection_type.value
            )
        )

    # --- first run (лист D2, Р5.4) ------------------------------------------------------
    @strawberry.mutation
    def advance_device_setup(self, info: strawberry.Info, step: int) -> Device:
        """Запомнить пройденный шаг. Аутентификация — машиной, не пользователем.

        The five steps are this machine's progress through its own first run, so the machine
        is who says so. Monotonic: re-reading step 3 does not forget step 4.
        """
        return Device.of(services.advance_setup(require_device(info), step=step))

    @strawberry.mutation
    def configure_cabinet_backup(
        self,
        info: strawberry.Info,
        kind: BackupKind,
        cloud_copy: bool = False,
    ) -> Device:
        """Шаг 2 — копия кабинета. 🔴 Обязательна (§19.1), и отказ здесь настоящий.

        Takes the KIND and never the path: «/Users/люция/…» is the teacher's own machine and
        their OS account name. Knowing a copy exists is what §19.1 entitles us to; knowing
        where it sits buys nothing and costs a name.
        """
        return Device.of(
            services.configure_backup(require_device(info), kind=kind.value, cloud_copy=cloud_copy)
        )

    @strawberry.mutation
    def record_cabinet_backup(self, info: strawberry.Info) -> Device:
        """«Сделать сейчас» отработало — экран настроек показывает это как «последняя копия»."""
        return Device.of(services.record_backup(require_device(info)))

    @strawberry.mutation
    def complete_device_setup(self, info: strawberry.Info) -> Device:
        """«Готово». Откажет, если обязательная копия так и не настроена."""
        return Device.of(services.complete_setup(require_device(info)))

    @strawberry.mutation
    def export_cabinet(self, info: strawberry.Info, passphrase: str | None = None) -> CabinetBackup:
        """Снять копию кабинета одним файлом (Р5.5, лист D2 «Выгрузить»).

        🔴 Это то, чего не хватало первому запуску: §19.1 заставляет настроить копию, а писателя
        копии не было. Здесь он.

        `passphrase` не обязателен для копии на свой диск (§2.2-бис — не изобретать ограничений;
        забытый пароль уничтожил бы ровно ту копию, ради которой всё это) и обязателен для той,
        что уходит к нам: `cabinet_file.seal_required_for`.
        """
        from datetime import datetime

        header, file_name = services.run_backup(require_device(info), passphrase=passphrase or None)
        return CabinetBackup(
            created_at=datetime.fromisoformat(header.created_at),
            file_name=file_name,
            sealed=header.sealed,
            rows=header.rows,
            files=header.files,
            tables=header.tables,
        )
