"""Состояние учётной записи — три положения и их история (OWNER_SCOPE §23.3.3, лист D7).

🔴 Что было: булев `User.is_active`. Он отвечал «пускать или нет» и не отвечал ни на один
вопрос, который возникает следом: кто закрыл, когда, почему, и что было до этого. Спор
«меня заблокировали ни за что» разбирать было нечем.

Три состояния, а не флажок:

* **active** — обычная работа;
* **limited** — входит и видит СВОЁ, но не ведёт занятий и не пишет в общие чаты;
* **blocked** — входа нет.

⚠️ **Ни одно состояние не трогает учёбу ученика** (§20.5). Заблокированный теряет доступ к
платформе, но не свою базу знаний: снятие блокировки возвращает человека ровно к тому, что
было. Удаления пользователя и его данных в панели нет вовсе — и здесь нет ни одной функции,
которая бы что-нибудь удаляла.
"""

from __future__ import annotations

from django.db import models, transaction

from apps.accounts.models import User
from common.exceptions import NotFound, ValidationError
from common.models import BaseModel

from .models import AccessLogEntry, OversightAction  # noqa: F401  (журнал пишется рядом)


class AccountState(models.TextChoices):
    ACTIVE = "active", "активен"
    LIMITED = "limited", "ограничен"
    BLOCKED = "blocked", "заблокирован"


class AccountStateRecord(BaseModel):
    """Один ПЕРЕХОД, а не текущее значение.

    Текущее состояние — последняя запись. Хранить историю переходов, а не поле на пользователе,
    нужно ровно затем, зачем заведён журнал: чтобы на вопрос «почему у меня нет доступа»
    существовал ответ с датой и автором, а не пересказ.

    Неизменяема, как и журнал: правки и удаления нет ни здесь, ни в схеме.
    """

    user = models.ForeignKey(User, related_name="state_records", on_delete=models.CASCADE)
    state = models.CharField(max_length=12, choices=AccountState.choices)
    reason = models.TextField(blank=True, default="")
    # Кто перевёл. Пусто — система (например, первичное состояние при заведении учётки).
    actor = models.ForeignKey(
        User, related_name="state_changes_made", null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.user_id} → {self.state}"


def current_state(user: User) -> str:
    """Состояние сейчас. Нет записей — активен: учётка заводится работающей."""
    row = AccountStateRecord.objects.filter(user=user).order_by("-created_at").first()
    return row.state if row else AccountState.ACTIVE.value


def history(user: User) -> list[AccountStateRecord]:
    return list(AccountStateRecord.objects.filter(user=user).select_related("actor"))


@transaction.atomic
def set_state(actor, user_id, *, state: str, reason: str = "") -> User:
    """Перевести учётную запись в состояние. Только сотрудник платформы.

    Причина обязательна для всего, кроме возврата в active: закрыть человеку доступ молча —
    это то же самое, что отказать в верификации без причины, и по той же причине не делается.
    """
    from .services import _require_staff, record

    _require_staff(actor)
    if state not in AccountState.values:
        raise ValidationError("Неизвестное состояние учётной записи")
    if state != AccountState.ACTIVE.value and not reason.strip():
        raise ValidationError("Скажите причину: человек имеет право знать, почему потерял доступ")

    target = User.objects.filter(id=user_id).first()
    if target is None:
        raise NotFound("Пользователь не найден")

    AccountStateRecord.objects.create(user=target, state=state, reason=reason, actor=actor)

    # 🔴 Два источника истины — плохо, и это записано осознанно (§В2 промпта 18): переписывать
    # аутентификацию в этой фазе мы не будем. Пока их два, синхронизирует их ОДНА функция —
    # эта, — и тест проверяет, что они не расходятся.
    blocked = state == AccountState.BLOCKED.value
    if target.is_active == blocked:
        target.is_active = not blocked
        target.save(update_fields=["is_active", "updated_at"])

    record(
        actor,
        OversightAction.STATE_CHANGED,
        subject=target,
        label=f"{target.full_name} → {AccountState(state).label}",
        reason=reason,
    )
    return target


def may_teach(user) -> bool:
    """Может ли человек вести занятия. `limited` входит и видит своё, но не ведёт."""
    return current_state(user) == AccountState.ACTIVE.value


def may_write_to_shared_chats(user) -> bool:
    """То же ограничение с другой стороны: ограниченный не пишет в общие чаты."""
    return current_state(user) == AccountState.ACTIVE.value
