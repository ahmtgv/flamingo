"""What still works when the teacher's machine is off (Р5.0).

One place, on purpose. Atlas D3's offline screen lists this to the pupil in words, and the
desktop phase will implement the refusals — so it has to be the same list in both, or the
screen becomes a promise the product does not keep.

The split is the architecture, not a policy choice:

* the **meeting point** lives on the server, so the schedule, the standing chats and writing
  homework survive the host being off. D3 says it out loud: «домашняя работа — можно писать
  сейчас, ответ уйдёт сам, когда преподаватель появится в сети»;
* the **cabinet** lives on the teacher's laptop, so materials, past summaries and the lesson
  room itself do not. «Откроются, когда преподаватель будет в сети» is the honest wording,
  and pretending otherwise would mean serving a stale copy nobody promised to keep fresh.

⚠️ This module describes the desktop-host contour, which is what the pilot ships. The full
server contour is still in the repo as the fallback path (OWNER_SCOPE §18) and serves
everything; nothing here refuses a request today. What it fixes is the answer the offline
screen gives, so Р5.2 implements against a written contract rather than a memory of one.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class OfflineCapabilities:
    """Reachable without the host machine — true for each, and only these fields exist."""

    schedule: bool
    chat: bool
    homework: bool
    materials: bool
    summaries: bool
    room: bool


#: The one answer. A screen that disagrees with this is a screen that lies to a child about
#: whether their evening is wasted.
WITHOUT_HOST = OfflineCapabilities(
    # on the server — the meeting point is exactly this
    schedule=True,
    chat=True,
    homework=True,
    # on the teacher's machine
    materials=False,
    summaries=False,
    room=False,
)


def without_host() -> OfflineCapabilities:
    return WITHOUT_HOST
