"""What still works when the teacher's machine is off (Р5.0 / Р5.0-Б).

One place, on purpose. Atlas D3's offline screen lists this to the pupil in words, and the
desktop phase will implement the refusals — so it has to be the same list in both, or the
screen becomes a promise the product does not keep.

The line is drawn by **whose data it is** (owner decision 14.08, OWNER_SCOPE §20.2/§20.3),
not by what is technically convenient:

* **the pupil's own** — their work, their grades and progress, the summaries of lessons they
  attended, their chats — is mirrored to the meeting point as it happens and opens *always*.
  A teacher leaving the platform must not take a child's schooling with them;
* **the teacher's own** — the programme, the guides, unshared board drafts, the material of
  the lesson happening right now — lives on their machine and needs it awake. «Их показывает
  преподаватель, и без него показывать нечего.»

Writing homework is on the first list even though the teacher receives it: D3 says «ответ
уйдёт сам, когда преподаватель появится в сети», so the writing is never blocked.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class OfflineCapabilities:
    """Reachable without the host machine. One boolean each, and only these fields exist."""

    #: the meeting point answers these itself
    schedule: bool
    chat: bool
    homework: bool
    #: the pupil's mirror answers these (Р5.0-Б)
    my_work: bool
    my_grades: bool
    my_summaries: bool
    #: these need the teacher's machine
    lesson_materials: bool
    live_board: bool
    room: bool


#: The one answer. A screen that disagrees with this is a screen that lies to a child about
#: whether their evening is wasted.
WITHOUT_HOST = OfflineCapabilities(
    schedule=True,
    chat=True,
    homework=True,
    my_work=True,
    my_grades=True,
    my_summaries=True,
    lesson_materials=False,
    live_board=False,
    room=False,
)


def without_host() -> OfflineCapabilities:
    return WITHOUT_HOST
