"""Журнал доступа надзора (OWNER_SCOPE §23.1, лист D7).

🔴 Решение владельца 15.08: **суперадмин видит всё, и каждый просмотр чужого личного пишется
в журнал**. Журнал здесь не ограничение владельца, а то, что делает режим бога защитимым: на
вопрос «кто читал документы этого преподавателя» должен существовать ответ, и он должен быть
короче, чем «никто, наверное».

Две вещи, которые делают запись записью, а не отметкой:

* **Неизменяемость.** Ни `deleted_at`, ни мутации правки, ни `save()` поверх существующей
  строки. Журнал, который можно подчистить, — не журнал (§23.4).
* **Живучесть.** `on_delete=SET_NULL` на обоих людях: строка обязана пережить и того, кто
  смотрел, и того, чьё смотрели. Каскад стёр бы ровно те записи, ради которых журнал заводят.

Фаза 17 расширяет журнал на всю панель надзора; здесь он покрывает верификацию — единственный
надзорный путь, который существует на сегодня.
"""

from django.db import models

from common.models import BaseModel


class OversightAction(models.TextChoices):
    """Что произошло. Разделение «смотрел» и «решил» — из листа D7: в журнале они помечены
    по-разному, потому что вопросы к ним разные."""

    VIEWED_DOCUMENT = "viewed_document", "открыл документ"
    VIEWED_QUEUE = "viewed_queue", "открыл очередь верификации"
    VERIFIED = "verified", "верифицировал преподавателя"
    REJECTED = "rejected", "отказал в верификации"
    REQUESTED_DOCUMENTS = "requested_documents", "запросил документы"


class AccessLogEntry(BaseModel):
    """Одна строка журнала. Пишется ДО выдачи: без записи нет выдачи (§23.4)."""

    actor = models.ForeignKey(
        "accounts.User",
        related_name="oversight_actions",
        null=True,
        on_delete=models.SET_NULL,
    )
    action = models.CharField(max_length=32, choices=OversightAction.choices)
    # Чьё смотрели. Пусто у действий, которые ни к кому конкретно не относятся (очередь).
    subject_user = models.ForeignKey(
        "accounts.User",
        related_name="oversight_records",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    # Что именно — «Диплом.pdf», «очередь верификации». Строка, а не ссылка: запись обязана
    # остаться читаемой после того, как сам объект удалят.
    object_label = models.CharField(max_length=200, blank=True, default="")
    # Повод. Лист D7 показывает и «повод не указан» — принуждать к нему мы не будем
    # (§2.2-бис: ограничение либо решение владельца, либо строка закона), но место есть.
    reason = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            # Два среза листа D7: общий журнал по времени и «кто смотрел этого человека».
            models.Index(fields=["-created_at"]),
            models.Index(fields=["subject_user", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} · {self.object_label}"
