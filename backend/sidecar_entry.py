"""Entry point of the sidecar as it ships: uvicorn serving Django on the loopback (Р5.3).

The ASGI application is imported and passed as an OBJECT, not as the string
`"config.asgi:application"`. A frozen bundle has no source tree for uvicorn's string import to
resolve against, and the failure is a bare «Could not import module» with nothing pointing at
the cause — found while building this, and worth the two lines to avoid.
"""

import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_desktop")


def main() -> None:
    import uvicorn

    from config.asgi import application

    uvicorn.run(
        application,
        host="127.0.0.1",
        port=int(os.environ.get("FLAMINGO_SIDECAR_PORT", "8931")),
        log_level="warning",
    )


if __name__ == "__main__":
    sys.exit(main())
