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

from common.enums import MeetingAccessMode, choices
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
