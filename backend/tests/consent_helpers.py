"""Подпись законного представителя — одна на все проверки.

🔴 Заведено 22.08 вместе с порогом 16 (§51). Ребёнок младше шестнадцати попадает на курс
только с согласия представителя, и это правило сразу же покрасило два десятка проверок,
которые про другое: домашние работы, доску, журнал, кабинет-файл. Чинить их подъёмом
возраста было бы подгонкой: дети — основные пользователи продукта, и проверять его надо
на детях.

Поэтому здесь одна функция: она заводит родителя и его подпись. Если завтра подпись начнёт
храниться иначе, поменяется одно место, а не двадцать.
"""

from __future__ import annotations

import uuid

from django.utils import timezone

from apps.accounts import services as accounts
from apps.accounts.models import Guardianship
from common.enums import GuardianshipStatus, Role


def sign_for_child(child_user, *, parent_email: str | None = None):
    """Родитель, связанный с ребёнком, и его согласие по 152-ФЗ. Возвращает родителя."""
    parent = accounts.register_user(
        email=parent_email or f"parent-{uuid.uuid4().hex[:8]}@example.com",
        password="strongpass1!",
        first_name="Ольга",
        last_name="Ковалёва",
        role=Role.PARENT,
        consent_152fz=True,
    )
    Guardianship.objects.create(
        parent_user=parent,
        child_user=child_user,
        status=GuardianshipStatus.ACTIVE.value,
        consent_152fz=True,
        consent_at=timezone.now(),
    )
    return parent
