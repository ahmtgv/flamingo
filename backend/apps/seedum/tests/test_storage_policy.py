"""Storage-policy invariant (CLAUDE.md §2.2, owner decision 2026-08-12).

Sibling of ``test_privacy.py``. That one guards what may be *sent* to the server; this one
guards what may be *kept*. Owner's words: lesson video, lesson audio and the verbatim speech
transcript are never stored, anywhere. Speech is processed as an in-memory stream to build
the summary, and the buffer is dropped afterwards.

Everything else the product needs IS storable and this file must never obstruct it:
summaries (with the lesson chat inside), boards and mind-maps, teaching guides, materials,
tests, chats, student work with every attempt, grades and progress, and SEduM avg_attention.

Written because the legacy it now forbids — ``LessonSession.recording_key`` and a
``recordingUrl`` field in the published contract — survived the storage decision unnoticed
until a later phase tripped over it. A rule with no gate is a rule that erodes.
"""

import re

from django.apps import apps

from api.schema import schema

SDL = schema.as_str()

# Tokens that must not appear in a stored model field or in the published schema.
FORBIDDEN = ("recording", "transcript", "audio", "video")

# The ONLY exceptions, kept deliberately short — every entry widens the gate.
#
# A live A/V *track* is not storage: turning a camera on and off is control-plane state that
# never lands in a table. Anything added here must be transient by construction; if it can be
# persisted, it does not belong on this list.
ALLOWED_SCHEMA_TOKENS = (
    "videoenabled",  # live track toggle (LessonOptions/room control)
    "audioenabled",  # live track toggle
)


def _offending_identifiers(line: str, token: str) -> list[str]:
    """Identifiers on this line that contain `token` and are not an allowed track control.

    Checked per identifier rather than per line: a line that legitimately mentions
    `videoEnabled` must not become a hiding place for `recordingUrl` next to it.
    """
    return [
        word
        for word in re.findall(r"\w+", line)
        if token in word.lower() and word.lower() not in ALLOWED_SCHEMA_TOKENS
    ]


def _schema_hits(token: str, sdl: str = SDL) -> list[str]:
    """SDL lines that expose `token` through a non-allowed identifier."""
    return [line.strip() for line in sdl.splitlines() if _offending_identifiers(line, token)]


def test_schema_has_no_recording_or_transcript_surface():
    """The published contract must not offer a way to reach lesson media or a transcript.

    The contract is the first thing a regulator reads: a `recordingUrl` in it says the
    product records lessons, whatever the implementation actually does.
    """
    for token in FORBIDDEN:
        assert not _schema_hits(token), f"{token!r} appears in the schema: {_schema_hits(token)}"


def test_the_allowlist_permits_track_controls_and_nothing_more():
    """The exception list must let R3's camera/mic toggles through while still catching a
    stored-media field on the very same line — otherwise the first live-room change either
    trips a false alarm or gets the gate quietly widened."""
    assert _schema_hits("video", "  videoEnabled: Boolean!") == []
    assert _schema_hits("audio", "  audioEnabled: Boolean!") == []
    assert _schema_hits("video", "  videoEnabled: Boolean!  recordingUrl: String") == []
    assert _schema_hits("recording", "  videoEnabled: Boolean!  recordingUrl: String") != []
    assert _schema_hits("video", "  lessonVideoUrl: String") != []


def test_no_model_stores_lesson_media_or_a_transcript():
    """No Django model — in any app — may have a field or a name for lesson A/V or a
    verbatim transcript. Catches `LessonRecording`, `AudioChunk`, `Transcript`, and the
    quieter form this actually took: a `recording_key` column on an innocent model."""
    offenders = []
    for model in apps.get_models():
        if not model.__module__.startswith("apps."):
            continue  # third-party/admin models are not ours to police
        label = f"{model._meta.app_label}.{model.__name__}"
        for token in FORBIDDEN:
            if token in model.__name__.lower():
                offenders.append(f"{label} (model name)")
            for field in model._meta.get_fields():
                name = getattr(field, "name", "").lower()
                if token in name and not any(a in name for a in ALLOWED_SCHEMA_TOKENS):
                    offenders.append(f"{label}.{field.name}")
    assert not offenders, f"models storing lesson media/transcript: {sorted(set(offenders))}"


def test_no_mutation_ingests_a_lesson_media_stream():
    """There is no way to POST lesson media at the server.

    reportAttention (per-bucket aggregate scalars) is the only lesson-time ingress, and
    test_privacy.py already pins its shape; here we assert nothing else appeared beside it.
    """
    mutation_block = re.search(r"type Mutation \{(.*?)\n\}", SDL, re.S).group(1)
    for line in mutation_block.splitlines():
        lowered = line.lower()
        for token in FORBIDDEN:
            if token in lowered and not any(
                a in lowered.replace(" ", "") for a in ALLOWED_SCHEMA_TOKENS
            ):
                raise AssertionError(f"mutation may ingest lesson media: {line.strip()}")


def test_no_upload_purpose_exists_for_recording_a_lesson():
    """The file pipeline is the other way lesson media could arrive — and the gate is the
    PURPOSE, not the MIME family.

    ⚠️ Правка 15.08 (владелец, OWNER_SCOPE §22). Раньше здесь стояло «ни одна цель не
    принимает audio/* или video/*», и это было слишком широким прочтением инварианта. Оно
    запрещало учебный ролик, который преподаватель прикрепил сам, — а это пункт 2 белого
    списка §2.2 («прикреплённые материалы»), а вовсе не запись занятия.

    Что стережётся вместо этого — то же, что и стереглось: **нет цели, назначенной под запись
    урока**. Запись делает система, и её нет: ни кода, ни ручки, ни имени. Ингресс потока
    отдельно пришпилен `test_privacy.py`, который не менялся.
    """
    from apps.files.services import PURPOSE_POLICY

    for purpose, policy in PURPOSE_POLICY.items():
        name = f"{purpose.name}{policy.prefix}".lower()
        assert not any(token in name for token in FORBIDDEN), f"media upload purpose: {purpose}"


def test_media_is_allowed_only_where_a_person_attaches_it_deliberately():
    """Граница правки §22: ролик кладёт ЧЕЛОВЕК в материалы, а не система в запись.

    Аватар, обложка и логотип учреждения остаются картинками. Это не вкусовщина: цель, куда
    можно положить видео, — это цель, которую однажды используют как место для записи урока.
    """
    from apps.files.services import PURPOSE_POLICY
    from common.enums import UploadPurpose

    def media_of(purpose):
        types = PURPOSE_POLICY[purpose].content_types
        return [ct for ct in types if ct.startswith(("audio/", "video/"))]

    assert media_of(UploadPurpose.MATERIAL), "материалы курса обязаны принимать видео (§22)"
    for purpose in (UploadPurpose.AVATAR, UploadPurpose.COVER, UploadPurpose.INSTITUTION_LOGO):
        assert not media_of(purpose), f"{purpose} — картинка, медиа тут незачем"


def test_a_summary_model_may_not_hold_a_verbatim_transcript():
    """Forward guard for R4: the summary is what remains of a lesson, so it is the natural
    place someone would park the raw speech text. A summary model may keep its assembled
    body, but never a field that reads as the full recognised speech."""
    banned_fields = {"transcript", "raw_text", "speech_text", "full_text", "utterances"}
    offenders = []
    for model in apps.get_models():
        if not model.__module__.startswith("apps."):
            continue
        if "summary" not in model.__name__.lower():
            continue
        for field in model._meta.get_fields():
            if getattr(field, "name", "").lower() in banned_fields:
                offenders.append(f"{model._meta.app_label}.{model.__name__}.{field.name}")
    assert not offenders, f"summary model holds raw speech: {offenders}"


# --- Р5.0-Б: the rule governs BOTH places the data lives -------------------------------------
def test_the_pupils_mirror_refuses_the_lessons_media_and_only_that():
    """Owner decision 14.08 (OWNER_SCOPE §20.3 + §20.4.1). Two rules, not one:

    * the LESSON's video, audio and verbatim transcript are forbidden in both storage points;
    * a child's own work — including a recording of themselves reading aloud — belongs to the
      child whole and is mirrored by content.

    The first version of this test enforced «only text», which banned the second. The owner
    named that as an over-correction, so the gate now checks the rule it was written for. The
    payload is a JSON column no grep can see into, which is why the sanitiser is the gate.
    """
    from apps.meetingpoint import mirror
    from common.exceptions import ValidationError

    for token in ("recording", "transcript"):
        assert token in mirror.FORBIDDEN_KEYS, f"the mirror does not refuse {token!r}"

    for bad in ({"recording": "x"}, {"transcript": "x"}, {"lesson_video": "x"}):
        try:
            mirror._no_lesson_media(bad)
        except ValidationError:
            continue
        raise AssertionError(f"the mirror accepted lesson media: {bad}")

    # …and the child's own work goes through, which is the half that was broken.
    mirror._no_lesson_media(
        {"attachments": [{"name": "чтение.m4a", "objectKey": "sub/1/a", "sizeBytes": 900}]}
    )


def test_the_mirror_row_itself_holds_no_bytes():
    """A pupil's file rides as an object key beside the record, never inline: a JSON column
    holding a photo of a solution is something nothing can stream."""
    from apps.meetingpoint.models import MirroredRecord

    names = {f.name for f in MirroredRecord._meta.get_fields()}
    assert not {"blob", "bytes", "content"} & names
