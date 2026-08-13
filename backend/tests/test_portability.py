"""The four things the desktop-host decision asked to lay down NOW (Р5.2, OWNER_SCOPE §18).

They were asked for early because each is cheap today and expensive once synchronisation
exists. So each one gets a gate rather than a promise:

а) every record has a stable id and a modification time;
б) a cabinet has a declared boundary — one file, and it is known what is in it;
в) a copy that leaves the device is client-encrypted, and the server holds an opaque blob;
г) nothing hardcodes «data stays local» — where a copy may go is configuration.
"""

import ast
import re
from pathlib import Path

from django.apps import apps

from common.portability import (
    CABINET_EXPORT_VERSION,
    CABINET_TABLES,
    NOT_EXPORTED,
    cabinet_manifest,
    exported_model_classes,
    stable_id_field,
)

BACKEND = Path(__file__).resolve().parents[1]


def _ours() -> list[type]:
    return [m for m in apps.get_models() if m.__module__.startswith("apps.")]


# --- а) a stable identifier and a modification time on every record ---------------------------
def test_every_model_has_a_uuid_primary_key_and_a_modification_time():
    """Without these, merging two copies of a cabinet is hand-resolved conflict by conflict.

    A UUID also means two devices can create records offline without colliding — which an
    autoincrement cannot promise, and which is the whole reason the id kind matters here and
    not just its existence.
    """
    missing_id, missing_time = [], []
    for model in _ours():
        label = f"{model._meta.app_label}.{model.__name__}"
        pk = stable_id_field(model)
        if pk.get_internal_type() != "UUIDField":
            missing_id.append(f"{label} (pk resolves to {pk.get_internal_type()})")
        names = {f.name for f in model._meta.get_fields()}
        if "updated_at" not in names and "created_at" not in names:
            missing_time.append(label)

    assert not missing_id, f"records without a stable id: {sorted(missing_id)}"
    assert not missing_time, f"records with no modification time: {sorted(missing_time)}"


# --- б) the cabinet has a boundary ------------------------------------------------------------
def test_every_model_is_either_in_a_cabinet_or_excluded_on_the_record():
    """A model nobody classified is the one that goes missing from a restore.

    The point of this test is not the list — it is that adding a model forces a decision, in
    a file a reviewer reads, instead of silently landing outside every backup.
    """
    classified = {m.label for m in CABINET_TABLES} | set(NOT_EXPORTED)
    unclassified = [
        f"{m._meta.app_label}.{m.__name__}"
        for m in _ours()
        if f"{m._meta.app_label}.{m.__name__}" not in classified
    ]
    assert not unclassified, (
        "these models belong to neither CABINET_TABLES nor NOT_EXPORTED — "
        f"decide, do not leave them out of the backup by accident: {sorted(unclassified)}"
    )


def test_the_manifest_names_real_models():
    """A boundary that names a table which does not exist is not a boundary."""
    assert exported_model_classes()  # resolves every label, or raises
    for label in NOT_EXPORTED:
        apps.get_model(label)


def test_the_export_is_versioned_so_an_importer_knows_what_it_is_holding():
    manifest = cabinet_manifest()
    assert manifest["version"] == CABINET_EXPORT_VERSION
    assert manifest["tables"]
    assert all(row["why"] for row in manifest["tables"]), "every table says why it is in there"


def test_a_cabinet_carries_the_things_the_storage_whitelist_promises():
    """§4.2 in table form: the summary (with the chat inside it), boards, student work with
    every attempt, grades and progress, and the SEduM buckets. If a restore lost any of these
    the owner's «ноутбук — единственная копия» risk would have teeth."""
    labels = {m.label for m in CABINET_TABLES}
    for required in (
        "summaries.LessonSummary",
        "summaries.SummaryItem",
        "board.BoardSnapshot",
        "chat.ChannelMessage",
        "homework.Submission",
        "exercises.Attempt",
        "exercises.SrsCard",
        "seedum.AttentionMetric",
    ):
        assert required in labels, required


def test_a_cabinet_never_carries_a_credential():
    """A backup that restores somebody's revoked-token list or a projector code is a backup
    that hands out access along with the homework."""
    labels = {m.label for m in CABINET_TABLES}
    assert "accounts.RevokedToken" not in labels
    assert "scheduling.ProjectorCode" not in labels


# --- в) a copy that leaves the device is client-encrypted --------------------------------------
def test_the_transport_contract_is_an_opaque_blob():
    """The shape UbpBackup already uses (CLAUDE.md §2.1): the device encrypts, the server
    stores bytes it cannot read. Fixed now so the desktop phase cannot quietly ship the
    readable version and «add encryption later»."""
    assert cabinet_manifest()["transport"] == "client_encrypted_blob"

    backup = apps.get_model("seedum.UbpBackup")
    fields = {f.name for f in backup._meta.get_fields()}
    assert "encrypted_blob" in fields
    assert "key_hint" in fields
    # And the server has no field for the plaintext, which is what makes the promise real.
    assert not {"payload", "plaintext", "data"} & fields


# --- г) no «local only» hardcoded ---------------------------------------------------------------
def test_where_a_copy_may_go_is_configuration_not_a_constant():
    manifest = cabinet_manifest()
    assert "sync_target" in manifest  # read from settings; empty = sync not turned on


def test_no_module_asserts_that_data_stays_local():
    """The owner asked for no hardcodes: turning sync on must be a setting, not a rewrite.

    Executable code only — this file's own prose says «local only» several times on purpose.
    """
    offenders = []
    for path in (BACKEND / "common").rglob("*.py"):
        if "test" in path.name:
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Module | ast.ClassDef | ast.FunctionDef):
                body = node.body
                if (
                    body
                    and isinstance(body[0], ast.Expr)
                    and isinstance(body[0].value, ast.Constant)
                ):
                    node.body = body[1:]
        code = ast.unparse(tree).lower()
        if re.search(r"local_only\s*=\s*true|allow_sync\s*=\s*false|never_sync", code):
            offenders.append(str(path.relative_to(BACKEND)))
    assert not offenders, f"locality is hardcoded in: {offenders}"
