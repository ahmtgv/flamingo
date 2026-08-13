"""The lesson summary (PROMPT_13 R4.2, atlas sheet 02).

Now that no recording exists, the summary **is** what a lesson leaves behind. It is first on
the storage whitelist (§4.2 п.1) — and that entry carries a second clause that shapes this
whole module: *«чат занятия — отдельный раздел внутри саммари»*.

So the lesson chat is not a table of its own. A message written during the lesson is written
straight into the summary, as an item of the CHAT section, from the very first word. There is
no copy step at the end and no eternal lesson feed to fall out of sync with — the owner's
«переписка едет вместе с итогом» is literally true of the schema, not just of the screen.

Three more rules live here:

* **A summary is a draft until the teacher sends it.** Learners never read a draft. The one
  exception is the CHAT section, which they are reading live while they write it — refusing
  a person their own conversation would be absurd, and it is a different rule, tested apart.
* **Every item says where it came from**, as data (`source` + `source_meta`), never as
  server-composed Russian. Sheet 02 puts that line under every single item.
* **Speech is never stored.** A SPEECH item is a short point assembled from an in-memory
  stream that is dropped the moment the summary is built (see ``speech_stream.py``). There is
  no field here for recognised text, and ``test_storage_policy.py`` fails if one appears.
"""

from django.db import models

from common.enums import SummarySection, SummarySource, SummaryStatus, choices
from common.models import BaseModel


class LessonSummary(BaseModel):
    """One summary per session: assembled automatically, edited by the teacher, then sent."""

    session = models.OneToOneField(
        "scheduling.LessonSession", related_name="summary", on_delete=models.CASCADE
    )
    status = models.CharField(
        max_length=8, choices=choices(SummaryStatus), default=SummaryStatus.DRAFT.value
    )
    #: The teacher's own words above the sections. Their text, not ours.
    intro = models.TextField(blank=True, default="")
    assembled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    sent_by = models.ForeignKey(
        "accounts.User",
        related_name="summaries_sent",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    #: True when speech points were left out because the feature or a consent was missing.
    #: Kept so the screen can say so plainly instead of silently showing a thinner summary.
    speech_omitted = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = "lesson summaries"

    @property
    def is_sent(self) -> bool:
        return self.status == SummaryStatus.SENT.value

    def __str__(self) -> str:
        return f"summary of {self.session_id}"


class SummaryItem(BaseModel):
    """One line of the summary.

    ``source`` and ``source_meta`` are the provenance the sheet shows under every item. They
    are data: ``BOARD`` + ``{"elements": 4, "authorName": "Петя"}`` becomes «с доски · 4 узла,
    добавил Петя» in the client, in whatever locale it is running.
    """

    summary = models.ForeignKey(LessonSummary, related_name="items", on_delete=models.CASCADE)
    section = models.CharField(max_length=12, choices=choices(SummarySection))
    source = models.CharField(max_length=12, choices=choices(SummarySource))
    #: Provenance specifics — counts, names, ids of the board element / exercise it came from.
    #: Never recognised speech: a SPEECH item's meta carries the speaker, not what was said.
    source_meta = models.JSONField(default=dict, blank=True)
    #: Offset from the start of the lesson, in seconds — the «06:20» column. Null on items
    #: that are not a moment (the word list, the homework).
    at_offset_sec = models.PositiveIntegerField(null=True, blank=True)
    #: The line itself.
    text = models.TextField()
    #: Who said/wrote it — the chat author, the speaker of a SPEECH point.
    author = models.ForeignKey(
        "accounts.User",
        related_name="summary_items",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    #: Homework items carry their due date and, after sending, the row they created.
    due_at = models.DateTimeField(null=True, blank=True)
    homework = models.ForeignKey(
        "homework.Homework",
        related_name="summary_items",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    order = models.PositiveIntegerField(default=0)
    #: Set when the teacher rewrote the line. Assembly must not overwrite a human's edit.
    edited = models.BooleanField(default=False)

    class Meta:
        ordering = ["section", "order", "created_at"]
        indexes = [models.Index(fields=["summary", "section"])]

    def __str__(self) -> str:
        return f"{self.section}: {self.text[:40]}"
