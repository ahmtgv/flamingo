"""Письмо со ссылкой на смену пароля.

🔴 Отправка почты — единственное место, которому нужен внешний сервис. Пока
в .env нет SMTP, письмо уходит в журнал сервера, а человеку мы всё равно отвечаем
«если такая почта у нас есть, письмо ушло». Так вход не ломается от того, что почта
ещё не настроена, но и врать в интерфейсе не приходится: письма правда нет,
и в журнале это видно.
"""
from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

log = logging.getLogger("flamingo.mail")

ЧАС = 60


def send_reset(email: str, name: str, link: str) -> None:
    text = (
        f"{name}, здравствуйте.\n\n"
        f"Кто-то попросил сменить пароль во Flamingo. Если это вы — вот ссылка:\n\n"
        f"{link}\n\n"
        f"Ссылка работает один час и только один раз.\n\n"
        f"Если вы ничего не просили — просто не открывайте её. Пароль останется прежним, "
        f"а в вашу учётную запись никто не вошёл: одной этой ссылки для входа мало.\n"
    )
    if not settings.EMAIL_HOST:
        log.warning("ПОЧТА НЕ НАСТРОЕНА. Письмо для %s не ушло. Ссылка: %s", email, link)
        return
    send_mail(
        subject="Flamingo · смена пароля",
        message=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )
