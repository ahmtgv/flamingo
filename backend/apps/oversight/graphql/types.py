"""Типы надзора. Все — только для сотрудника платформы; проверка в сервисе, не здесь."""

from __future__ import annotations

import datetime as dt

import strawberry


@strawberry.type
class VerificationQueueDocument:
    id: strawberry.ID
    filename: str
    size_bytes: int | None
    created_at: dt.datetime


@strawberry.type
class VerificationQueueEntry:
    """Преподаватель, ждущий решения — лист D7, «Преподаватели ждут решения»."""

    teacher_user_id: strawberry.ID
    first_name: str
    last_name: str
    email: str
    specialty: str
    education: str
    submitted_at: dt.datetime
    # Нагрузка: сколько курсов и занятий он уже ведёт. Решение о допуске к детям принимается
    # по человеку целиком, а не по одному файлу.
    course_count: int
    session_count: int
    documents: list[VerificationQueueDocument]

    @classmethod
    def of(cls, entry) -> VerificationQueueEntry:
        return cls(
            teacher_user_id=strawberry.ID(entry.teacher_user_id),
            first_name=entry.first_name,
            last_name=entry.last_name,
            email=entry.email,
            specialty=entry.specialty,
            education=entry.education,
            submitted_at=entry.submitted_at,
            course_count=entry.course_count,
            session_count=entry.session_count,
            documents=[
                VerificationQueueDocument(
                    id=strawberry.ID(doc.id),
                    filename=doc.filename,
                    size_bytes=doc.size_bytes,
                    created_at=doc.created_at,
                )
                for doc in entry.documents
            ],
        )


@strawberry.type
class AccessLogRow:
    """Строка журнала. Имена людей — строками из записи, а не ссылками: запись обязана
    читаться и после того, как объект удалят."""

    id: strawberry.ID
    action: str
    actor_name: str
    subject_name: str
    object_label: str
    reason: str
    at: dt.datetime

    @classmethod
    def of(cls, row) -> AccessLogRow:
        def name(person) -> str:
            if person is None:
                return ""
            return f"{person.first_name} {person.last_name}".strip()

        return cls(
            id=strawberry.ID(str(row.id)),
            action=row.action,
            actor_name=name(row.actor),
            subject_name=name(row.subject_user),
            object_label=row.object_label,
            reason=row.reason,
            at=row.created_at,
        )
