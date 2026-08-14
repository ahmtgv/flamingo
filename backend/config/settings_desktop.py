"""Settings for the sidecar inside the teacher's desktop app (Р5.2).

The working hypothesis of ADR-001: the same Django, the same models, the same services and the
same permission checks — on SQLite, listening on the loopback interface, inside the Tauri
shell. The economics of the whole desktop decision rest on that reuse
(`R5_DESKTOP_HOST_BUDGET.md` §5), so this module is deliberately thin: it changes *where*
things are, never *what they are*.

What differs from the server profile, and why each one:

* **SQLite in the cabinet folder.** One file the teacher can see, copy and back up — which is
  also what makes the mandatory copy (§19.1) something a person can understand.
* **In-memory channel layer.** One process, one machine; Redis would be a second thing to
  install for a queue with one reader.
* **Local blob storage instead of S3.** The desktop has no object store. Files live beside
  the database in the cabinet folder — see `common/storage.py`, which switches backend by
  configuration rather than by an `if` at every call site.
* **Loopback only.** The sidecar binds 127.0.0.1 and is reachable by nothing else; the shell
  holds a one-time token. That is a deployment property, NOT a licence to relax authorisation:
  every per-resolver check stays exactly as it is on the server (PROMPT_14 §2.1).

Nothing here weakens an invariant. The storage rule and the camera-privacy rule apply on a
laptop precisely as they do on a server — «на своём компьютере» is not an exception (§2.1).
"""

import os
from pathlib import Path

from config.settings import *  # noqa: F403

#: Where the cabinet lives. The first-run screen (D2) asks the teacher and writes it here.
DATA_DIR = Path(os.environ.get("FLAMINGO_DATA_DIR", Path.home() / ".flamingo"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(DATA_DIR / "cabinet.sqlite3"),
        "OPTIONS": {
            # WAL: a read while a write is in flight must not block the lesson. The default
            # rollback journal locks the whole file, and on a laptop the writer is the same
            # process serving the board.
            "init_command": "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;",
            # SQLite's default is 5 seconds; a laptop under a lesson is busier than that.
            "timeout": 20,
        },
    }
}

# One process on one machine. Redis for a queue with a single reader would be a second thing
# to install and a second thing to go wrong.
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}

# No object store on a laptop. Files sit beside the database, in the folder the teacher chose.
# Р5.5: только на кабинете разрешена выгрузка одним файлом. На сервере эти же таблицы
# держат всех преподавателей и всех учеников, и экспорт там был бы полным дампом базы —
# поэтому право объявляется развёртыванием (§18-г), а не выводится из движка базы.
CABINET_IS_LOCAL = True
STORAGE_BACKEND = "local"
LOCAL_STORAGE_ROOT = str(DATA_DIR / "files")

# The sidecar is reachable only from this machine.
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]

# The relay and the meeting point are still the SERVER's — a desktop lesson signals through
# them. Empty here means «not configured yet», exactly as on the server.
