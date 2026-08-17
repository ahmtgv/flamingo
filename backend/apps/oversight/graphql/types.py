"""Типы надзора. Все — только для сотрудника платформы; проверка в сервисе, не здесь."""

from __future__ import annotations

import datetime as dt
from enum import Enum

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
    full_name: str
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
            full_name=entry.full_name,
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
            # Карточка надзора — документ: там нужна полная форма, включая отчество.
            return person.full_name

        return cls(
            id=strawberry.ID(str(row.id)),
            action=row.action,
            actor_name=name(row.actor),
            subject_name=name(row.subject_user),
            object_label=row.object_label,
            reason=row.reason,
            at=row.created_at,
        )


@strawberry.enum
class AccountStateValue(Enum):
    """Три положения учётной записи (лист D7, OWNER_SCOPE §23.3.3).

    Перечисление в схеме, а не строка: «ограничен» и «заблокирован» — разные решения с разными
    последствиями, и опечатка в них не должна доезжать до базы.
    """

    ACTIVE = "active"
    LIMITED = "limited"
    BLOCKED = "blocked"


@strawberry.type
class AccountStateRow:
    """Один ПЕРЕХОД: кто перевёл, когда и почему.

    История, а не текущее значение, — потому что вопрос человека звучит «почему у меня нет
    доступа», и ответом на него может быть только запись с датой и автором.
    """

    state: AccountStateValue
    reason: str
    actor_name: str
    at: dt.datetime

    @classmethod
    def of(cls, row) -> AccountStateRow:
        return cls(
            state=AccountStateValue(row.state),
            reason=row.reason,
            actor_name=row.actor.full_name if row.actor else "",
            at=row.created_at,
        )


@strawberry.type
class PersonRow:
    """Человек в разделе «Люди» листа D7.

    Показываем ровно то, по чему принимают решение: кто это, какая роль, в каком состоянии
    учётка. Ни адреса, ни телефона, ни детей — панель надзора не витрина персональных данных,
    а место, где закрывают и открывают доступ.
    """

    user_id: strawberry.ID
    full_name: str
    email: str
    role: str
    state: AccountStateValue

    @classmethod
    def of(cls, user, state: str) -> PersonRow:
        return cls(
            user_id=strawberry.ID(str(user.id)),
            full_name=user.full_name,
            email=user.email,
            role=user.role,
            state=AccountStateValue(state),
        )
