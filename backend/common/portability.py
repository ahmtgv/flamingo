"""What a personal cabinet IS, as one file — the boundary for backup and, later, sync.

Owner decisions Р5.2 / OWNER_SCOPE §18 (2026-08-13). The pilot runs as a **desktop app on the
teacher's machine**; the server comes back later and in a different role — not a media server,
but a place to sync a cabinet to, so a person can log in from another device. Four things
were asked for NOW because they are cheap now and expensive once sync exists:

а) **a stable identifier and a modification time on every record** — without them a merge is
   hand-resolved conflict by conflict;
б) **a cabinet export as one file** — the same work as the backup that §4 п.2 calls mandatory
   («ноутбук — единственная копия работ и оценок детей»);
в) **client-side encryption** wherever a copy goes outward, so a server holds an opaque blob —
   exactly as `UbpBackup` already does (CLAUDE.md §2.1);
г) **no «local only» hardcoded** — configuration, so turning sync on is not a rewrite.

This module is (а) and (б): it declares the boundary and lets a test hold it. It deliberately
does NOT write files, encrypt anything, or talk to a server — the desktop phase does that, and
inventing the transport now would be guessing. What it fixes in place is *what belongs in a
cabinet*, which is the part that gets expensive to discover late.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.apps import apps
from django.conf import settings

#: Bumped when the shape of an export changes incompatibly. An importer reads this first.
CABINET_EXPORT_VERSION = 1


@dataclass(frozen=True)
class ExportedModel:
    """One table in a cabinet export, and why it is in there."""

    label: str  # "app_label.ModelName"
    why: str


#: The §4.2 storage whitelist, as tables. A cabinet is one person's learning: who they are,
#: what they were taught, what they made, and what the platform measured about it.
CABINET_TABLES: tuple[ExportedModel, ...] = (
    # who the person is
    ExportedModel("accounts.User", "the account itself"),
    ExportedModel("accounts.StudentProfile", "learner profile"),
    ExportedModel("accounts.TeacherProfile", "teacher profile"),
    ExportedModel("accounts.ParentProfile", "parent profile"),
    ExportedModel("accounts.AdminProfile", "institution-admin profile"),
    ExportedModel("accounts.Guardianship", "parent↔child link and its 152-FZ consent"),
    ExportedModel("accounts.VerificationDocument", "the teacher's own diploma submission"),
    # where they study or teach
    ExportedModel("institutions.Institution", "the school this cabinet belongs to, if any"),
    ExportedModel("institutions.InstitutionMembership", "their place in it"),
    ExportedModel("institutions.Group", "the class"),
    ExportedModel("institutions.GroupMembership", "who is in it"),
    ExportedModel("institutions.GroupTeacher", "who teaches it"),
    ExportedModel("courses.Enrollment", "which courses this person is in"),
    # what is taught — a teacher's machine holds the whole course, that is the point of §18
    ExportedModel("courses.Course", "§4.2 п.2 — the teaching itself"),
    ExportedModel("courses.Section", "the unit"),
    ExportedModel("courses.Lesson", "the lesson"),
    ExportedModel("courses.Material", "§4.2 п.2 — guides and attachments, with their licences"),
    ExportedModel("courses.SavedItem", "what a learner kept for themselves"),
    ExportedModel("exercises.ExerciseSet", "§4.2 п.2 — tests are kept"),
    ExportedModel("exercises.Exercise", "…and the questions in them"),
    ExportedModel("homework.Homework", "the assignment, without which a submission is orphaned"),
    # what happened
    ExportedModel("scheduling.LessonSession", "when a lesson actually ran"),
    ExportedModel("scheduling.Attendance", "who was there"),
    ExportedModel("summaries.LessonSummary", "§4.2 п.1 — the record of a lesson"),
    ExportedModel("summaries.SummaryItem", "…including the lesson chat, which lives inside it"),
    ExportedModel("board.Board", "§4.2 п.2 — the lesson's canvas"),
    ExportedModel("board.BoardElement", "…and everything drawn on it"),
    ExportedModel("board.BoardSnapshot", "…and the versions kept in the materials"),
    ExportedModel("chat.ChatChannel", "§4.2 п.3 — a message without its channel is orphaned"),
    ExportedModel("chat.ChannelMembership", "…and who is in the conversation"),
    ExportedModel("chat.ChannelMessage", "…and the conversation"),
    ExportedModel("chat.ChatReport", "a complaint is part of the safety record, not scratch"),
    # what the person made, and what was measured
    ExportedModel("homework.Submission", "§4.2 п.4 — student work, every attempt"),
    ExportedModel("homework.SubmissionFile", "…and what was attached to it"),
    ExportedModel("exercises.Attempt", "§4.2 п.4 — every answer, append-only"),
    ExportedModel("exercises.SkillMastery", "§4.2 п.5 — what they have got the hang of"),
    ExportedModel("exercises.SrsCard", "§4.2 п.5 — the repetition queue"),
    ExportedModel("exercises.StudyStreak", "§4.2 п.5 — days in a row"),
    ExportedModel("exercises.EarnedAchievement", "§4.2 п.5 — milestones"),
    ExportedModel("seedum.AttentionMetric", "§4.2 п.6 — avg_attention buckets, nothing finer"),
    ExportedModel("seedum.Recommendation", "§4.2 п.5 — a personal indicator"),
    ExportedModel("seedum.UbpBackup", "already an opaque client-encrypted blob"),
    # the way in (Р5.0) — the group's front door outlives the laptop behind it
    ExportedModel(
        "meetingpoint.MeetingPoint",
        "the group's permanent link. A pupil saved it once; losing it to a laptop replacement"
        " is precisely the disaster the mandatory backup exists to prevent",
    ),
    ExportedModel(
        "meetingpoint.RetiredLink",
        "so a replaced link still answers «заменена» after a restore, instead of «не найдено»",
    ),
    ExportedModel(
        "meetingpoint.MirroredRecord",
        "§20.3 — the pupil's own copy of their learning. It is in a cabinet export for the"
        " same reason it exists at all: this is the copy that has to survive somebody else's"
        " laptop",
    ),
)

#: Deliberately NOT in a cabinet, each for a reason. Listed so the omission is a decision on
#: the record rather than something nobody thought about.
NOT_EXPORTED: dict[str, str] = {
    "accounts.RevokedToken": "a credential blacklist, not content — it must not travel",
    "compliance.PolicyDecisionLog": "the operator's evidence ledger, not the person's data",
    "compliance.PolicyChangeLog": "the operator's own audit trail",
    "scheduling.ProjectorCode": "a short-lived credential; expires long before any restore",
    "chat.InstitutionChatSettings": (
        "an institution's safety policy — configuration, restored from the institution rather"
        " than carried in a person's file, or one teacher's backup would rewrite a school's rules"
    ),
    "exercises.LexicalItem": (
        "open reference data, re-importable from the source dumps. Carrying a copy would also"
        " make every backup a redistribution of WordNet/Tatoeba, with the obligations that come"
        " with it — the licence travels with the source, not with a user's file"
    ),
    "exercises.LexicalExample": "same, and its Tatoeba credit belongs with the source",
    "devices.Device": (
        "a machine is paired, not restored. Carrying the list to a new laptop would resurrect"
        " entries for machines that no longer exist — and the whole point of the revoke button"
        " is that the list says what is true right now"
    ),
    "devices.DeviceToken": "a credential. It must not travel, and it could not: it is a hash",
    "devices.PairingCode": "a ten-minute credential; dead long before any restore",
    "meetingpoint.MeetingVisit": (
        "«кто открывал дверь» — сиюминутный признак для панели участников (Р5.6, лист D3), а не"
        " чья-то учёба. Восстановленный из копии, он рассказал бы преподавателю про вчерашние"
        " заходы как про сегодняшние; а список группы обязан говорить, что правда сейчас"
    ),
}


def cabinet_manifest() -> dict:
    """The export format, described rather than produced.

    Enough for a future importer to know what it is holding, and enough for a reviewer to see
    that the copy leaving a device is encrypted before it does (в) — not after it arrives.
    """
    return {
        "version": CABINET_EXPORT_VERSION,
        "tables": [{"label": m.label, "why": m.why} for m in CABINET_TABLES],
        # (в) The transport contract, fixed now so the desktop phase cannot quietly ship a
        # readable copy: whatever carries this file encrypts it on the device, and a server
        # that stores it stores bytes it cannot read — the shape UbpBackup already uses.
        "transport": "client_encrypted_blob",
        # (г) Where a copy may go is CONFIGURATION. Nothing in the codebase asserts «local
        # only»; a deployment that turns sync on changes a setting, not the code.
        "sync_target": getattr(settings, "CABINET_SYNC_TARGET", ""),
    }


def exported_model_classes() -> list[type]:
    return [apps.get_model(m.label) for m in CABINET_TABLES]


def stable_id_field(model: type):
    """The column a merge would key on.

    A profile's primary key IS its user's UUID (`OneToOneField(primary_key=True)`), which is
    every bit as stable as a UUID column of its own — following the relation is the difference
    between a real check and one that reads the field's class name.
    """
    pk = model._meta.pk
    while getattr(pk, "remote_field", None) is not None and pk.primary_key:
        pk = pk.remote_field.model._meta.pk
    return pk
