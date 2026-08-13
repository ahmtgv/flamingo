"""Chat domain (PROMPT_13 R2): channels, membership, messages, complaints.

Chats are on the storage whitelist (§4.2 п.3) — subject, pupil↔teacher and pupil↔pupil
conversations are kept. The **lesson** chat is deliberately not here: it lives inside the
lesson summary and arrives with R4.

Two things are worth knowing before changing anything in this file:

* **Membership is the authorisation.** A person sees a channel because there is a row in
  ``ChannelMembership`` for them, and that row is created from a real relation (their group,
  their teacher, their institution's staff). No resolver re-derives access from a role name.
* **Safety strictness is not modelled here.** Whether pupils may write to each other at all,
  whether a teacher sees everything, whether messages are pre-moderated — those come from
  ``chat/policy.py`` (the jurisdiction gate plus the institution's own settings). This module
  stores conversations; it does not decide who is allowed to have them.
"""

from django.db import models

from common.enums import ChannelKind, ReportStatus, choices
from common.models import BaseModel


class ChatChannel(BaseModel):
    """One conversation. `pair_key` makes a direct conversation idempotent: two people can
    only ever have one, no matter who opens it first."""

    kind = models.CharField(max_length=16, choices=choices(ChannelKind))
    institution = models.ForeignKey(
        "institutions.Institution",
        related_name="chat_channels",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    group = models.ForeignKey(
        "institutions.Group",
        related_name="chat_channels",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    course = models.ForeignKey(
        "courses.Course",
        related_name="chat_channels",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    # Sorted participant ids for a direct channel; empty for room channels.
    pair_key = models.CharField(max_length=128, blank=True, default="")
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["kind", "last_message_at"])]
        constraints = [
            models.UniqueConstraint(
                fields=["pair_key"],
                condition=models.Q(pair_key__gt=""),
                name="uniq_direct_channel",
            ),
            models.UniqueConstraint(
                fields=["course", "group"],
                condition=models.Q(kind="subject_group"),
                name="uniq_subject_group_channel",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.kind}:{self.id}"


class ChannelMembership(BaseModel):
    """Who is in a conversation, and how far they have read it."""

    channel = models.ForeignKey(ChatChannel, related_name="memberships", on_delete=models.CASCADE)
    user = models.ForeignKey(
        "accounts.User", related_name="chat_memberships", on_delete=models.CASCADE
    )
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["channel", "user"], name="uniq_channel_membership")
        ]
        indexes = [models.Index(fields=["user", "channel"])]


class ChannelMessage(BaseModel):
    """A message in a channel.

    Named `ChannelMessage`, not `ChatMessage`: the SDL already publishes a `ChatMessage` for
    the **lesson** chat (R4), and two different things sharing a name in one contract is how
    a wrong join gets written a year from now.
    """

    channel = models.ForeignKey(ChatChannel, related_name="messages", on_delete=models.CASCADE)
    sender = models.ForeignKey(
        "accounts.User", related_name="chat_messages", on_delete=models.CASCADE
    )
    text = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sent_at"]
        indexes = [models.Index(fields=["channel", "sent_at"])]


class ChatReport(BaseModel):
    """A complaint — «пожаловаться» on the conversation (base safety mode, §6.3).

    This is the thing that unlocks a group teacher's access to a pupil↔pupil conversation.
    Without an open report the teacher cannot read it, which is the whole point: the base
    mode protects children without putting every child under permanent observation.
    """

    channel = models.ForeignKey(ChatChannel, related_name="reports", on_delete=models.CASCADE)
    message = models.ForeignKey(
        ChannelMessage, related_name="reports", null=True, blank=True, on_delete=models.SET_NULL
    )
    reporter = models.ForeignKey(
        "accounts.User", related_name="chat_reports", on_delete=models.CASCADE
    )
    reason = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=12, choices=choices(ReportStatus), default=ReportStatus.OPEN.value
    )
    reviewed_by = models.ForeignKey(
        "accounts.User",
        related_name="chat_reports_reviewed",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["channel", "status"])]


class InstitutionChatSettings(BaseModel):
    """Per-institution safety options.

    Everything stricter than the base mode is an OPTION, not a constant: an institution (or
    a jurisdiction, via the matrix) turns it on. Defaults are the base mode described in
    §6.3 — the minimum that protects a child without treating every conversation as suspect.
    """

    institution = models.OneToOneField(
        "institutions.Institution", related_name="chat_settings", on_delete=models.CASCADE
    )
    # Off by default: permanent surveillance is a jurisdiction/institution choice, not ours.
    teacher_visible_always = models.BooleanField(default=False)
    premoderation = models.BooleanField(default=False)
    direct_messages_enabled = models.BooleanField(default=True)
    stopwords = models.JSONField(default=list, blank=True)

    def __str__(self) -> str:
        return f"chat settings: {self.institution_id}"
