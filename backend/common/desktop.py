"""What the desktop app is, and whether it is current (Р5.2 spike, question 3).

The shell and the sidecar are two artefacts that must never disagree about the schema: a Tauri
binary from August talking to a Django from July would run migrations that do not match the
screens. So they ship as **one bundle with one version**, and the sidecar refuses to answer if
it finds a cabinet a newer build has already migrated.

That last part is the only rule here worth arguing about, so: a downgrade is the dangerous
direction. An old sidecar meeting a database migrated by a new one does not fail loudly — it
reads columns that mean something else now. Refusing to start is unpleasant once; a silently
wrong grade is unpleasant for a long time and nobody knows to look.

Details of *how* an update is delivered belong to D6, which is not drawn. What is fixed here
is the shape the shell reads and the check the sidecar performs.
"""

from __future__ import annotations

from dataclasses import dataclass

#: The bundle version — shell and sidecar together. Bumped by the release, not by a developer
#: editing a file, which is why the build stamps it rather than a human typing it twice.
DESKTOP_VERSION = "0.1.0"

#: The cabinet's schema generation. Migrations move this; a bundle that does not know a
#: generation must not touch a cabinet written at it.
CABINET_SCHEMA_VERSION = 1


@dataclass(frozen=True)
class UpdateManifest:
    """What a release publishes, and what the shell polls for.

    Kept deliberately small: a version, where to get it, and whether skipping it is allowed.
    `mandatory` exists because a migration that changes a cabinet cannot be optional — an
    installed base split across two schema generations is a support problem with no floor.
    """

    version: str
    schema_version: int
    url: str
    notes_url: str
    mandatory: bool


def current() -> UpdateManifest:
    """This build, described. A release replaces the constants and republishes the file."""
    return UpdateManifest(
        version=DESKTOP_VERSION,
        schema_version=CABINET_SCHEMA_VERSION,
        url="",  # filled by the release; empty means «no update channel configured yet»
        notes_url="",
        mandatory=False,
    )


def refuses_cabinet(cabinet_schema_version: int) -> bool:
    """Should this build refuse to open that cabinet?

    Only downgrades. A newer bundle opening an older cabinet is the ordinary case — it
    migrates it forward. An older bundle opening a newer one is the dangerous one: nothing
    fails, and the columns quietly mean something else.
    """
    return cabinet_schema_version > CABINET_SCHEMA_VERSION
