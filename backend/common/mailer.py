"""Отправка письма — и честный ответ, когда отправлять нечем.

🔴 НАЙДЕНО 18.08 (наряд 37 §3). Почтовой отправки в продукте не было вовсе:
`_send_password_reset_email` писал ссылку в лог сервера. Человек, забывший пароль, вернуться
не мог ничем — а кнопка «Забыли пароль?» делала вид, что письмо ушло. Это худший из вариантов:
молчащий отказ, притворяющийся успехом.

⚠️ ДВА РАЗНЫХ СОСТОЯНИЯ, КОТОРЫЕ НЕЛЬЗЯ ПУТАТЬ:
  * почта НЕ НАСТРОЕНА — наша недоделка, и человеку надо сказать, куда написать;
  * почта настроена и письмо НЕ УШЛО — сбой, и это уже другой разговор.
Первое видно до попытки (`is_configured`), второе — только после неё.
"""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    """Есть ли куда отправлять. Пустой `EMAIL_HOST` — не сбой, а ненастроенность."""
    return bool(getattr(settings, "EMAIL_HOST", ""))


def support_email() -> str:
    """Куда написать, если восстановление недоступно. Пусто — значит окружение не задало."""
    return getattr(settings, "SUPPORT_EMAIL", "") or ""


def send(*, to: str, subject: str, body: str) -> bool:
    """Отправить письмо. Возвращает, ушло ли оно.

    ⚠️ Отказ НЕ поднимается наверх исключением: письмо — не то, ради чего человек пришёл, и
    ронять из-за него регистрацию или смену пароля нельзя. Но и глотать молча нельзя: отказ
    возвращается значением, и зовущий решает, что сказать человеку.
    """
    if not is_configured():
        return False
    try:
        sent = send_mail(
            subject=subject,
            message=body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None) or None,
            recipient_list=[to],
            fail_silently=False,
        )
    except Exception:  # noqa: BLE001 — причина уходит в лог, наверх идёт «не ушло»
        logger.exception("письмо не ушло: %s", subject)
        return False
    return bool(sent)
