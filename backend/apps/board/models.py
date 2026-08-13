"""The lesson board (PROMPT_13 R3.2, atlas sheet 02).

Boards and mind-maps are on the storage whitelist (§4.2 п.2) — they are kept, and they are
what a lesson leaves behind now that no recording exists. A board is where the class thought
out loud, so it belongs in the lesson's materials next to the guide and the test.

**`BoardSnapshot`, never `BoardFrame`** (§2.8): the storage-policy gate greps the schema for
`frame`, and a board state has nothing to do with video frames. The name is a contract.
"""

from django.db import models

from common.enums import BoardElementKind, choices
from common.models import BaseModel


class Board(BaseModel):
    """One canvas per lesson. Infinite: the elements carry their own coordinates and the
    canvas has no bounds of its own."""

    lesson = models.OneToOneField("courses.Lesson", related_name="board", on_delete=models.CASCADE)
    #: The teacher opens and closes writing for everyone else — sheet 02, owner answer 3.
    open_for_students = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"board of {self.lesson_id}"


class BoardElement(BaseModel):
    """One thing on the canvas.

    Geometry is plain numbers and the payload is JSON, so a new element kind is a new kind —
    not a migration. Authorship is a column because the sheet requires it to be visible: you
    can always see who put a thing on the board.
    """

    board = models.ForeignKey(Board, related_name="elements", on_delete=models.CASCADE)
    kind = models.CharField(max_length=12, choices=choices(BoardElementKind))
    author = models.ForeignKey(
        "accounts.User", related_name="board_elements", on_delete=models.CASCADE
    )
    x = models.FloatField(default=0)
    y = models.FloatField(default=0)
    width = models.FloatField(default=0)
    height = models.FloatField(default=0)
    #: Kind-specific: text body, stroke points, sticker colour, the two ends of a link, or the
    #: object key of a pasted image. Never a media stream — an image is a stored file, and a
    #: board is not a recording of anything.
    data = models.JSONField(default=dict, blank=True)
    #: Last writer wins. Conflicts are resolved optimistically: two people editing the same
    #: element is rare, and blocking the canvas to prevent it costs more than it saves.
    revision = models.PositiveIntegerField(default=1)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["board", "deleted_at"])]


class BoardSnapshot(BaseModel):
    """A board saved into the lesson's materials — «доска прошлого урока».

    The elements are frozen into JSON rather than referenced, so a saved board keeps showing
    what it showed on the day even after the live canvas moves on.
    """

    board = models.ForeignKey(Board, related_name="snapshots", on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    saved_by = models.ForeignKey(
        "accounts.User", related_name="board_snapshots", on_delete=models.CASCADE
    )
    elements = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
