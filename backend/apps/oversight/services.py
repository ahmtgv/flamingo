"""Надзор — очередь верификации преподавателей и журнал доступа.

Отвечает на находку владельца 15.08, п.4: «баннер "Документы на проверке" висит, а экрана
подтверждения нет ни у кого». Путь целиком: преподаватель грузит диплом → надзор видит
очередь → верифицирует или отказывает с причиной.

**Почему это отдельное приложение, а не функция в accounts** (OWNER_SCOPE §23.4): надзор — это
режим, в котором обычные правила доступа не действуют, и он обязан быть виден одним куском.
Растекись он по `accounts` и `institutions` — и через фазу никто не ответит, где на платформе
проходит граница между «я смотрю своё» и «я смотрю чужое».

**Почему каждый шаг пишет в журнал** (§23.1, лист D7): диплом и справка — чужое личное.
Владелец выбрал полный доступ и журнал каждого просмотра, потому что на вопрос «кто читал мои
документы» должен существовать ответ. Запись делается ДО выдачи: сначала след, потом данные.

Границы фазы: здесь только верификация. Учёт людей, блокировки и общий журнал панели — фаза 17
(`PROMPT_17_oversight.md`), и она расширяет эти же таблицы, а не заводит вторые.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import TeacherProfile, User, VerificationDocument
from common import storage
from common.enums import VerificationStatus
from common.exceptions import NotFound, PermissionDenied, ValidationError
from common.permissions import is_platform_staff

from .models import AccessLogEntry, OversightAction


def _require_staff(user) -> User:
    """Единственная дверь в надзор. Роль ADMIN сюда не проходит: она про учреждение."""
    if not is_platform_staff(user):
        raise PermissionDenied("Надзор доступен только сотруднику платформы")
    return user


def record(actor, action: OversightAction, *, subject=None, label: str = "", reason: str = ""):
    """Написать в журнал. Отдельная функция, потому что вызывается перед КАЖДОЙ выдачей."""
    return AccessLogEntry.objects.create(
        actor=actor,
        action=action.value,
        subject_user=subject,
        object_label=label[:200],
        reason=reason,
    )


@dataclass(frozen=True)
class QueueDocument:
    id: str
    filename: str
    size_bytes: int | None
    created_at: object


@dataclass(frozen=True)
class QueueEntry:
    """Строка очереди — лист D7, раздел «Преподаватели ждут решения».

    Несёт то, по чему решение и принимается: кто, когда подал, что преподаёт, сколько уже
    ведёт, и какие документы приложил. Без нагрузки («1 черновик, занятий не вёл») решение
    принимается вслепую.
    """

    teacher_user_id: str
    first_name: str
    last_name: str
    email: str
    specialty: str
    education: str
    submitted_at: object
    course_count: int
    session_count: int
    documents: list[QueueDocument]


def pending_verifications(user) -> list[QueueEntry]:
    """Кто ждёт решения — сначала самые давние.

    Пишет в журнал сам факт открытия очереди: она содержит почты и специальности живых людей,
    и «кто вообще открывал этот экран» — такой же вопрос, как «кто открывал этот документ».
    """
    from django.db.models import Count, Q

    _require_staff(user)
    record(user, OversightAction.VIEWED_QUEUE, label="очередь верификации")

    docs = (
        VerificationDocument.objects.filter(status=VerificationStatus.PENDING.value)
        .select_related("teacher_user__teacher_profile")
        .order_by("created_at")
    )

    by_teacher: dict[str, list[VerificationDocument]] = {}
    for doc in docs:
        by_teacher.setdefault(str(doc.teacher_user_id), []).append(doc)
    if not by_teacher:
        return []

    # Нагрузка — одним запросом на всех, а не запросом на строку.
    load = {
        str(row["user_id"]): row
        for row in TeacherProfile.objects.filter(user_id__in=by_teacher)
        .annotate(
            _courses=Count("courses", distinct=True),
            _sessions=Count(
                "courses__sections__lessons__sessions",
                distinct=True,
                filter=Q(courses__sections__lessons__deleted_at__isnull=True),
            ),
        )
        .values("user_id", "_courses", "_sessions")
    }

    entries = []
    for teacher_id, teacher_docs in by_teacher.items():
        teacher = teacher_docs[0].teacher_user
        profile = getattr(teacher, "teacher_profile", None)
        counts = load.get(teacher_id, {})
        entries.append(
            QueueEntry(
                teacher_user_id=teacher_id,
                first_name=teacher.first_name,
                last_name=teacher.last_name,
                email=teacher.email,
                specialty=getattr(profile, "specialty", "") or "",
                education=getattr(profile, "education", "") or "",
                submitted_at=min(doc.created_at for doc in teacher_docs),
                course_count=counts.get("_courses", 0),
                session_count=counts.get("_sessions", 0),
                documents=[
                    QueueDocument(
                        id=str(doc.id),
                        filename=doc.filename or doc.file_key.rsplit("/", 1)[-1],
                        size_bytes=doc.size_bytes,
                        created_at=doc.created_at,
                    )
                    for doc in teacher_docs
                ],
            )
        )
    entries.sort(key=lambda entry: entry.submitted_at)
    return entries


def document_url(user, document_id) -> str:
    """Подписанная ссылка на документ — и строка журнала перед ней.

    🔴 Порядок здесь не косметика: запись делается ДО выдачи ссылки. Сначала след, потом
    данные — иначе ссылка, полученная и не «использованная», выглядела бы как несмотренная.
    """
    _require_staff(user)
    doc = VerificationDocument.objects.filter(id=document_id).select_related("teacher_user").first()
    if doc is None:
        raise NotFound("Документ не найден")

    record(
        user,
        OversightAction.VIEWED_DOCUMENT,
        subject=doc.teacher_user,
        label=doc.filename or doc.file_key.rsplit("/", 1)[-1],
    )
    return storage.presign_get(doc.file_key)


@transaction.atomic
def review_verification(user, teacher_user_id, *, approve: bool, reason: str = ""):
    """Решение по преподавателю — одно на все его ожидающие документы.

    Решение принимается о ЧЕЛОВЕКЕ, а не о файле: три бумаги одного преподавателя — это одно
    дело, и «диплом принят, справка отклонена» не значит ничего. Лист D7 показывает кнопки под
    карточкой человека, а не под каждым документом, и это ровно та же мысль.

    Отказ без причины не проходит: лист требует, чтобы отказ уходил человеку текстом, а не
    молчанием, — а текст надо откуда-то взять.
    """
    _require_staff(user)
    if not approve and not reason.strip():
        raise ValidationError("Отказ без причины не отправляется: человеку нужно знать, что не так")

    teacher = User.objects.filter(id=teacher_user_id).first()
    if teacher is None:
        raise NotFound("Преподаватель не найден")

    pending = list(
        VerificationDocument.objects.filter(
            teacher_user=teacher, status=VerificationStatus.PENDING.value
        )
    )
    if not pending:
        raise NotFound("У этого преподавателя нет документов, ожидающих решения")

    decision = VerificationStatus.APPROVED if approve else VerificationStatus.REJECTED
    now = timezone.now()
    for doc in pending:
        doc.status = decision.value
        doc.reviewed_by = user
        doc.reviewed_at = now
        doc.reason = reason
        doc.save(update_fields=["status", "reviewed_by", "reviewed_at", "reason", "updated_at"])

    TeacherProfile.objects.filter(user=teacher).update(verification_status=decision.value)

    record(
        user,
        OversightAction.VERIFIED if approve else OversightAction.REJECTED,
        subject=teacher,
        label=f"{teacher.first_name} {teacher.last_name}".strip(),
        reason=reason,
    )
    return teacher


@transaction.atomic
def request_more_documents(user, teacher_user_id, *, reason: str):
    """«Запросить документы» листа D7 — третья кнопка, и она не отказ.

    Отдельное действие, потому что отказ и «принесите справку» — разные вещи для человека:
    первое закрывает дорогу, второе оставляет её открытой. Документы возвращаются в состояние
    «ждём», а причина уходит преподавателю текстом.
    """
    _require_staff(user)
    if not reason.strip():
        raise ValidationError("Скажите, каких документов не хватает")

    teacher = User.objects.filter(id=teacher_user_id).first()
    if teacher is None:
        raise NotFound("Преподаватель не найден")

    VerificationDocument.objects.filter(
        teacher_user=teacher, status=VerificationStatus.PENDING.value
    ).update(reason=reason, updated_at=timezone.now())

    record(
        user,
        OversightAction.REQUESTED_DOCUMENTS,
        subject=teacher,
        label=f"{teacher.first_name} {teacher.last_name}".strip(),
        reason=reason,
    )
    return teacher


def access_log(user, *, limit: int = 100) -> list[AccessLogEntry]:
    """Журнал — читается и самим владельцем: панель надзирает и за надзирающим (§23.3.5)."""
    _require_staff(user)
    return list(
        AccessLogEntry.objects.select_related("actor", "subject_user").all()[: max(1, limit)]
    )
