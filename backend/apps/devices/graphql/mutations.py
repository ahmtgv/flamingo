"""Device writes — the three steps of pairing, and the revoke.

🔒 There is no mutation here that takes a password, and there never will be (PROMPT_14
§2.2.1, OWNER_SCOPE §19.4). The fallback «войти по почте и паролю» is the ordinary WEB login
that already exists; the app's boundary is never where a password crosses.
"""

from __future__ import annotations

import strawberry

from apps.devices import services
from common.auth import require_user
from common.enums import DevicePlatform

from .types import Device, DeviceClaim, PairingRequest


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
