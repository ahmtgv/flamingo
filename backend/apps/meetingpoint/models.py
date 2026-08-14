"""The meeting point: where a lesson lives when the teacher's machine is off (Р5.0).

Atlas D3 fixes the shape and the reasoning: **the link belongs to the group, not to the
lesson.** A fresh link per lesson sounds safer and is in practice a weekly mailout half the
class loses. So one permanent link, plus a six-character code beside it for the people who
would rather read it out loud than forward it.

The point of this app is what stays reachable when the host is down. A pupil who opens the
link at 17:59 must be told when the lesson is, what they can do meanwhile, and what they
cannot — from the server, without the teacher's laptop being awake. That is the difference
between «преподаватель сейчас не в сети» and a white screen.

`RetiredLink` exists for one sentence on the sheet: «Эта ссылка больше не работает —
преподаватель заменил ссылку группы». Without remembering the old slug we could only say
«не найдено», which is the same words a typo gets and sends the person hunting for a mistake
they did not make.
"""

from django.db import models

from common.enums import MeetingAccessMode, MirrorKind, choices
from common.models import BaseModel


class MeetingPoint(BaseModel):
    """One permanent way into a group's lessons."""

    group = models.OneToOneField(
        "institutions.Group", related_name="meeting_point", on_delete=models.CASCADE
    )
    #: The path in the permanent link. Regenerated only by «заменить ссылку».
    slug = models.CharField(max_length=32, unique=True, db_index=True)
    #: The same entry, for a voice. Six characters, no lookalikes.
    code = models.CharField(max_length=12, unique=True, db_index=True)
    access_mode = models.CharField(
        max_length=20,
        choices=choices(MeetingAccessMode),
        default=MeetingAccessMode.GROUP_ONLY.value,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"meeting point {self.slug}"


class RetiredLink(BaseModel):
    """A slug that used to work.

    Kept so a stale link can be answered honestly. It carries no access of its own — looking
    one up tells a person the link was replaced and nothing else about the group.
    """

    meeting_point = models.ForeignKey(
        MeetingPoint, related_name="retired_links", on_delete=models.CASCADE
    )
    slug = models.CharField(max_length=32, unique=True, db_index=True)
    code = models.CharField(max_length=12)
    retired_at = models.DateTimeField()

    class Meta:
        ordering = ["-retired_at"]


class MirroredRecord(BaseModel):
    """A pupil's own learning, kept where the teacher's laptop cannot take it away (Р5.0-Б).

    Owner decision 14.08, verbatim: «в любом случае данные сохраняются у ученика — то есть он
    должен иметь возможность получить доступ к этим документам». A teacher leaving the
    platform must not take a child's schooling with them, so this is a **second place the
    data lives**, not a setting.

    Three choices in this model are the decision rather than notes about it:

    * **`source_id` is a plain UUID, not a foreign key.** That is the entire point. An FK to
      a submission would cascade away the moment the teacher's course did, which is exactly
      the day the mirror is supposed to matter. `test_mirror.py` deletes the teacher's
      account and reads the pupil's work back.
    * **`payload` is text.** Not a file key, not a blob — «зеркало не превращается в
      медиахранилище», and CLAUDE.md §2.2 applies to *both* places data lives. The sanitiser
      in ``mirror.py`` refuses a payload that carries anything media-shaped, and the storage
      gate greps this model like any other.
    * **`occurred_at` plus the inherited `updated_at`** are the stable-identity pair that
      `common/portability.py` already requires — reused, not reinvented.
    """

    student = models.ForeignKey(
        "accounts.StudentProfile", related_name="mirrored_records", on_delete=models.CASCADE
    )
    kind = models.CharField(max_length=16, choices=choices(MirrorKind))
    #: The id of the original record on the teacher's machine. NOT an FK — see the docstring.
    source_id = models.UUIDField()
    #: When the thing happened (a summary was sent, a work was graded), not when it synced.
    occurred_at = models.DateTimeField()
    #: Text only. What it holds per kind is documented in mirror.py.
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-occurred_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "kind", "source_id"], name="uniq_mirrored_record"
            )
        ]
        indexes = [models.Index(fields=["student", "kind", "-occurred_at"])]

    def __str__(self) -> str:
        return f"{self.kind}:{self.source_id}"
