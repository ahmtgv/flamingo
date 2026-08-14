"""The desktop runtime profile (Р5.2 — ADR-001).

The spike's own conclusions, kept as tests so they stay true. Each one corresponds to a
section of `docs/adr/ADR-001-desktop-runtime.md`: the whole domain runs on SQLite, Russian
search works there, storage switches by configuration rather than by a hardcode, and an old
build refuses a cabinet a newer one has migrated.
"""

import pytest
from django.conf import settings

from common import desktop, storage

pytestmark = pytest.mark.django_db


# --- §1: the domain runs on SQLite ---------------------------------------------------------
def test_case_folding_works_for_russian_on_sqlite():
    """The one real portability break the spike found: SQLite's LIKE folds case for ASCII
    only, so «биолог» did not find «Биология» — quietly, with an empty list and no reason.

    Fixed by giving SQLite a Unicode-aware LIKE. Registered for the tests too, because a
    difference between what the tests run on and what a teacher runs on is a difference only
    a teacher discovers.
    """
    from common.sqlite_unicode import _like

    assert _like("%биолог%", "Биология") is True
    assert _like("%ПЕТРОВ%", "Иван Петров") is True
    assert _like("%physics%", "PHYSICS 101") is True
    assert _like("%алгебра%", "Биология") is False
    # LIKE's own wildcards keep their meaning — no regex sneaking in through the back door.
    assert _like("а_б", "а.б") is True
    assert _like("а.б", "аХб") is False


def test_the_search_a_teacher_actually_types_finds_the_course():
    """End to end, through the ORM, on whichever backend the suite is running."""
    from datetime import date  # noqa: F401  (kept for parity with other fixtures)

    from apps.accounts import services as accounts
    from apps.courses import services as courses
    from common.enums import Role

    teacher = accounts.register_user(
        email="search@example.com",
        password="strongpass1!",
        first_name="Иван",
        last_name="Петров",
        role=Role.TEACHER,
        specialty="Биология",
    )
    course = courses.create_course(
        teacher, title="Готовый курс", subject="Биология", level="grade_9"
    )
    courses.publish_course(teacher, course.id)

    found = set(courses.published_courses(search="биолог").values_list("id", flat=True))
    assert course.id in found


# --- §4: storage is configuration, never a hardcode ------------------------------------------
def test_the_storage_backend_is_a_setting(settings):
    """OWNER_SCOPE §18 requirement (г): no «данные только локально» in the code. Turning the
    desktop profile on is a setting, not a rewrite."""
    settings.STORAGE_BACKEND = "local"
    assert storage.backend() == "local"
    settings.STORAGE_BACKEND = "s3"
    assert storage.backend() == "s3"


def test_the_local_backend_round_trips_a_file(settings, tmp_path):
    settings.STORAGE_BACKEND = "local"
    settings.LOCAL_STORAGE_ROOT = str(tmp_path)

    source = tmp_path / "a/b/essay.pdf"
    source.parent.mkdir(parents=True)
    source.write_bytes(b"content")

    assert storage.head("a/b/essay.pdf") == {"size": 7, "content_type": ""}
    assert storage.copy("a/b/essay.pdf", "mirror/s/1/essay.pdf") is True
    assert (tmp_path / "mirror/s/1/essay.pdf").read_bytes() == b"content"
    assert storage.head("nope") is None
    assert storage.copy("nope", "mirror/s/1/x") is False


# --- §3: the shell and the sidecar are one version -------------------------------------------
def test_an_older_build_refuses_a_cabinet_a_newer_one_migrated():
    """The dangerous direction is the downgrade: nothing fails, the columns just mean
    something else now. Refusing once beats a silently wrong grade nobody knows to look for."""
    assert desktop.refuses_cabinet(desktop.CABINET_SCHEMA_VERSION + 1) is True
    assert desktop.refuses_cabinet(desktop.CABINET_SCHEMA_VERSION) is False
    assert desktop.refuses_cabinet(desktop.CABINET_SCHEMA_VERSION - 1) is False


def test_the_manifest_carries_the_schema_generation_beside_the_version():
    """A version alone cannot answer «may this build open that cabinet»."""
    manifest = desktop.current()
    assert manifest.version == desktop.DESKTOP_VERSION
    assert manifest.schema_version == desktop.CABINET_SCHEMA_VERSION


# --- the desktop profile is a location, never a relaxation ------------------------------------
def test_the_desktop_settings_change_where_things_are_and_not_what_they_are():
    """PROMPT_14 §2.1: binding 127.0.0.1 is a deployment property, not a licence to weaken a
    permission check. The desktop profile must not touch authorisation or the invariants."""
    import config.settings_desktop as desktop_settings

    source = open(desktop_settings.__file__, encoding="utf-8").read()
    for smell in ("MIDDLEWARE", "AUTHENTICATION", "can_access_course", "DEBUG = True"):
        assert smell not in source, f"the desktop profile touches {smell}"
    # …and it still runs the same apps as the server.
    assert desktop_settings.INSTALLED_APPS == settings.INSTALLED_APPS
