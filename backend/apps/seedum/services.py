"""Business logic for SEduM (CMF). Resolvers stay thin and call these.

Privacy invariants (CLAUDE.md §2/§7, 152-FZ):
* ``record_attention`` accepts ONLY an aggregate (sessionId, bucketStart,
  avgAttention). ``studentId`` is derived from the authenticated user — never
  trusted from input — so a client cannot report on someone else's behalf.
* No raw video/audio/frames/landmarks are accepted or stored anywhere.
* UBP is stored as an opaque, client-encrypted blob; the server never decrypts.
* Reads are self-only (or parent-of-child / teacher-of-course per §5); the live
  ``attentionUpdates`` subscription is teacher-only (enforced in the resolver).
"""

from __future__ import annotations

import base64

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import Avg
from django.db.models.functions import ExtractIsoWeekDay

from apps.accounts.models import Guardianship
from apps.courses.access import can_access_course
from apps.courses.models import Enrollment
from apps.courses.services import _student_profile
from apps.scheduling.models import LessonSession
from common.compliance import require_feature
from common.enums import GuardianshipStatus, RecommendationKind, Role
from common.exceptions import NotFound, PermissionDenied, ValidationError

from .models import AttentionMetric, Recommendation, UbpBackup

# Registered in common/compliance/matrix.json. The gate is asked by key, so the matrix — not
# this module — decides where the feature may run.
CMF_FEATURE = "cmf_attention"


# --- helpers ----------------------------------------------------------------
def _get_session(session_id) -> LessonSession:
    session = (
        LessonSession.objects.filter(id=session_id)
        .select_related("lesson__section__course__owner")
        .first()
    )
    if session is None:
        raise NotFound("Session not found")
    return session


def is_session_teacher(user, session: LessonSession) -> bool:
    """The session's owning teacher (course owner). Profile PKs are the User PK."""
    return session.lesson.section.course.owner_id == getattr(user, "id", None)


def _assert_can_view_student(user, student_user_id) -> None:
    """Self, a parent of the child, a teacher of a course the student is in, or staff."""
    if user is None:
        raise PermissionDenied("Authentication required")
    uid = getattr(user, "id", None)
    if str(uid) == str(student_user_id) or getattr(user, "is_staff", False):
        return
    if Guardianship.objects.filter(
        parent_user_id=uid,
        child_user_id=student_user_id,
        status=GuardianshipStatus.ACTIVE.value,
    ).exists():
        return
    if (
        getattr(user, "role", None) == Role.TEACHER.value
        and Enrollment.objects.filter(
            student__user_id=student_user_id, course__owner__user_id=uid
        ).exists()
    ):
        return
    raise PermissionDenied("Cannot view this student's attention")


# --- attention --------------------------------------------------------------
def record_attention(
    user,
    *,
    session_id,
    bucket_start,
    avg_attention,
    gaze_on_screen=None,
    eye_openness=None,
    head_yaw=None,
    head_pitch=None,
    alertness=None,
) -> bool:
    """Ingest one per-bucket aggregate, if this tenant's regime permits the feature at all.

    The jurisdiction gate runs OUTSIDE the write transaction on purpose. A refusal writes a
    row to the evidence ledger, and an enclosing atomic block would roll that row back along
    with the exception — leaving us unable to prove the refusal ever happened, which is the
    one thing the ledger exists for (RND_01_JURISDICTION.md §6.4).
    """
    require_feature(user, CMF_FEATURE)
    return _record_attention_bucket(
        user,
        session_id=session_id,
        bucket_start=bucket_start,
        avg_attention=avg_attention,
        gaze_on_screen=gaze_on_screen,
        eye_openness=eye_openness,
        head_yaw=head_yaw,
        head_pitch=head_pitch,
        alertness=alertness,
    )


@transaction.atomic
def _record_attention_bucket(
    user,
    *,
    session_id,
    bucket_start,
    avg_attention,
    gaze_on_screen=None,
    eye_openness=None,
    head_yaw=None,
    head_pitch=None,
    alertness=None,
) -> bool:
    profile = _student_profile(user)  # studentId == the auth user, never from input
    session = _get_session(session_id)
    # A-authz-4: only a participant of THIS session may record attention (mirrors join_session's
    # gate) — an authenticated student cannot inject rows into an arbitrary session.
    if not can_access_course(user, session.lesson.section.course):
        raise PermissionDenied("Not a participant of this session")
    # D2 step 3 / OWNER_SCOPE §19: «анализ внимания по умолчанию выключен», enforced by the
    # server and not only by the switch that drew it — a default living in a component lasts
    # until someone re-renders the component.
    #
    # ⚠️ Deliberately AFTER the authorization gate. Put first, it answers «no» to a stranger
    # for the wrong reason and quietly turns a permission boundary into a preference; a
    # non-participant must still be refused as a non-participant.
    #
    # Returning False rather than raising: nothing was measured, so nothing failed, and the
    # pipeline on the device stops after the first False instead of retrying a refusal it
    # cannot fix.
    if not getattr(user, "consent_attention", False):
        return False
    value = max(0, min(100, int(avg_attention)))
    metric, _ = AttentionMetric.objects.update_or_create(
        lesson_session=session,
        student=profile,
        bucket_start=bucket_start,
        defaults={"avg_attention": value},  # ONLY the composite is persisted (no migration)
    )
    # Sub-metrics are LIVE-ONLY: broadcast for the realtime teacher view, never stored.
    _publish_attention(
        metric,
        gaze_on_screen=gaze_on_screen,
        eye_openness=eye_openness,
        head_yaw=head_yaw,
        head_pitch=head_pitch,
        alertness=alertness,
    )
    return True


def _publish_attention(
    metric: AttentionMetric,
    *,
    gaze_on_screen=None,
    eye_openness=None,
    head_yaw=None,
    head_pitch=None,
    alertness=None,
) -> None:
    """Broadcast the per-bucket aggregate to the session's live channel group (teachers watch
    via attentionUpdates). Aggregate scalars only — never frames/landmarks. The sub-metrics ride
    the broadcast for the realtime view but are NOT persisted (live-only)."""
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(
        f"attention_{metric.lesson_session_id}",
        {
            "type": "attention.update",
            "id": str(metric.id),
            "session_id": str(metric.lesson_session_id),
            "student_id": str(metric.student_id),
            "bucket_start": metric.bucket_start.isoformat(),
            "avg_attention": metric.avg_attention,
            "gaze_on_screen": gaze_on_screen,
            "eye_openness": eye_openness,
            "head_yaw": head_yaw,
            "head_pitch": head_pitch,
            "alertness": alertness,
        },
    )


def session_attention(user, session_id) -> dict:
    """Post-session report (teacher-only): class average + per-bucket points."""
    session = _get_session(session_id)
    if not is_session_teacher(user, session):
        raise PermissionDenied("Not your session")
    metrics = AttentionMetric.objects.filter(lesson_session=session)
    if not metrics.exists():
        return {"average": 0, "peak": 0, "low": 0, "points": []}
    buckets = (
        metrics.values("bucket_start").annotate(v=Avg("avg_attention")).order_by("bucket_start")
    )
    points = [{"at": b["bucket_start"], "value": round(b["v"])} for b in buckets]
    values = [p["value"] for p in points]
    overall = round(metrics.aggregate(a=Avg("avg_attention"))["a"])
    return {"average": overall, "peak": max(values), "low": min(values), "points": points}


def attention_analytics(user, *, student_id=None, course_id=None, from_=None, to=None) -> dict:
    target_id = student_id or getattr(user, "id", None)
    _assert_can_view_student(user, target_id)
    qs = AttentionMetric.objects.filter(student_id=target_id)
    if course_id:
        qs = qs.filter(lesson_session__lesson__section__course_id=course_id)
    if from_:
        qs = qs.filter(bucket_start__gte=from_)
    if to:
        qs = qs.filter(bucket_start__lte=to)
    if not qs.exists():
        return {"average": 0, "by_subject": [], "by_weekday": [], "insights": []}

    overall = round(qs.aggregate(a=Avg("avg_attention"))["a"])
    subj = (
        qs.values("lesson_session__lesson__section__course__subject")
        .annotate(v=Avg("avg_attention"))
        .order_by()
    )
    by_subject = [
        {
            "subject": row["lesson_session__lesson__section__course__subject"] or "",
            "average": round(row["v"]),
        }
        for row in subj
    ]
    wd = (
        qs.annotate(wd=ExtractIsoWeekDay("bucket_start"))
        .values("wd")
        .annotate(v=Avg("avg_attention"))
        .order_by("wd")
    )
    by_weekday = [{"weekday": row["wd"], "average": round(row["v"])} for row in wd]
    return {
        "average": overall,
        "by_subject": by_subject,
        "by_weekday": by_weekday,
        "insights": _attention_insights(qs, overall),
    }


def _attention_drops(qs) -> bool:
    """True if, on average across sessions, the late part of a session is notably
    lower than the early part (>10 points)."""
    rows = list(qs.values("lesson_session_id", "bucket_start", "avg_attention"))
    by_session: dict = {}
    for r in rows:
        by_session.setdefault(r["lesson_session_id"], []).append(
            (r["bucket_start"], r["avg_attention"])
        )
    drops = []
    for buckets in by_session.values():
        if len(buckets) < 4:
            continue
        buckets.sort(key=lambda b: b[0])
        half = len(buckets) // 2
        early = sum(v for _, v in buckets[:half]) / half
        late = sum(v for _, v in buckets[half:]) / (len(buckets) - half)
        drops.append(early - late)
    return bool(drops) and (sum(drops) / len(drops)) > 10


def _attention_insights(qs, overall: int) -> list[dict]:
    insights: list[dict] = []
    if overall >= 70:
        insights.append({"kind": "good", "text": "Хорошая средняя концентрация."})
    elif overall < 50:
        insights.append(
            {"kind": "watch", "text": "Средняя концентрация низкая — попробуйте короткие перерывы."}
        )
    if _attention_drops(qs):
        insights.append({"kind": "watch", "text": "Внимание заметно падает к концу занятий."})
    return insights


# --- recommendations (rule-based generator) ---------------------------------
def _generate_recommendations(user) -> None:
    """A few real, rule-based insights from the user's ATTENTION_METRIC. Idempotent
    (get_or_create by kind+title; dismissed ones are left dismissed)."""
    qs = AttentionMetric.objects.filter(student__user=user)
    if not qs.exists():
        return
    overall = round(qs.aggregate(a=Avg("avg_attention"))["a"])
    if _attention_drops(qs):
        Recommendation.objects.get_or_create(
            user=user,
            kind=RecommendationKind.WELLBEING.value,
            title="Делайте короткие перерывы",
            defaults={"body": "Внимание падает к концу занятий — короткий перерыв помогает."},
        )
    if overall < 50:
        Recommendation.objects.get_or_create(
            user=user,
            kind=RecommendationKind.SCHEDULE.value,
            title="Планируйте занятия на утро",
            defaults={"body": "Средняя концентрация низкая — попробуйте более раннее время."},
        )


def recommendations(user) -> list[Recommendation]:
    if user is None:
        return []
    _generate_recommendations(user)
    return list(Recommendation.objects.filter(user=user, dismissed=False).order_by("-created_at"))


def dismiss_recommendation(user, rec_id) -> Recommendation:
    rec = Recommendation.objects.filter(id=rec_id, user=user).first()
    if rec is None:
        raise NotFound("Recommendation not found")
    rec.dismissed = True
    rec.save(update_fields=["dismissed", "updated_at"])
    return rec


# --- UBP backup (opaque, client-encrypted) ----------------------------------
def backup_ubp(user, *, encrypted_blob, key_hint="") -> UbpBackup:
    try:
        raw = base64.b64decode(encrypted_blob, validate=True)
    except (ValueError, base64.binascii.Error) as exc:
        raise ValidationError("encryptedBlob must be base64") from exc
    backup, _ = UbpBackup.objects.update_or_create(
        user=user, defaults={"encrypted_blob": raw, "key_hint": key_hint or ""}
    )
    return backup


def delete_ubp_backup(user) -> bool:
    UbpBackup.objects.filter(user=user).delete()
    return True


def get_ubp_backup(user) -> UbpBackup | None:
    if user is None:
        return None
    return UbpBackup.objects.filter(user=user).first()


def ubp_blob_b64(backup: UbpBackup) -> str:
    """Re-encode the stored opaque bytes as base64 for transport."""
    blob = backup.encrypted_blob
    if isinstance(blob, memoryview):
        blob = blob.tobytes()
    return base64.b64encode(bytes(blob)).decode()
