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

from config.язык import сейчас

log = logging.getLogger("flamingo.mail")


#: Письма на всех языках сайта. Язык — язык страницы того, кто письмо
#: попросил (`config/язык.py`). Письма на языке нет — уходит английское.
ПИСЬМА: dict[str, dict[str, tuple[str, str]]] = {
    "сброс": {
        "ru": ("Flamingo · смена пароля",
               "{name}, здравствуйте.\n\n"
               "Кто-то попросил сменить пароль во Flamingo. Если это вы — вот ссылка:\n\n"
               "{link}\n\n"
               "Ссылка работает один час и только один раз.\n\n"
               "Если вы ничего не просили — просто не открывайте её. Пароль останется прежним, "
               "а в вашу учётную запись никто не вошёл: одной этой ссылки для входа мало.\n"),
        "en": ("Flamingo · password change",
               "Hello, {name}.\n\n"
               "Someone asked to change the password on Flamingo. If it was you, here is the link:\n\n"
               "{link}\n\n"
               "The link works for one hour and only once.\n\n"
               "If you didn't ask for anything, just don't open it. Your password stays the same, "
               "and nobody has signed in to your account: this link alone is not enough to sign in.\n"),
    },
    "приглашение": {
        "ru": ("Flamingo · приглашение на занятия",
               "Здравствуйте.\n\n"
               "{teacher} зовёт вас к себе на занятия во Flamingo. Вот ссылка:\n\n"
               "{link}\n\n"
               "Она работает семь дней и добавляет одного человека. Перейдёте — и вы "
               "увидите друг друга: {teacher} вас в журнале, вы её или его в своих "
               "преподавателях, и у вас появится общий чат.\n\n"
               "Если вы никого не ждали — просто не открывайте ссылку. Ничего не "
               "произойдёт, и о вас никто не узнает.\n"),
        "en": ("Flamingo · invitation to lessons",
               "Hello.\n\n"
               "{teacher} invites you to lessons on Flamingo. Here is the link:\n\n"
               "{link}\n\n"
               "It works for seven days and adds one person. Follow it and you will "
               "see each other: {teacher} will have you in the journal, you will have them among your "
               "teachers, and you will have a shared chat.\n\n"
               "If you weren't expecting anyone, just don't open the link. Nothing will "
               "happen, and nobody will find out about you.\n"),
    },
}


def письмо(вид: str, **поля: str) -> tuple[str, str]:
    """Тема и текст письма на языке запроса (нет такого — английское)."""
    варианты = ПИСЬМА[вид]
    тема, текст = варианты.get(сейчас()) or варианты["en"]
    # Подстановка по одному полю: в имени человека могут быть фигурные скобки.
    for ключ, значение in поля.items():
        текст = текст.replace("{" + ключ + "}", значение)
    return тема, текст


def send_reset(email: str, name: str, link: str) -> None:
    subject, text = письмо("сброс", name=name, link=link)
    if not settings.EMAIL_HOST:
        log.warning("ПОЧТА НЕ НАСТРОЕНА. Письмо для %s не ушло. Ссылка: %s", email, link)
        return
    send_mail(
        subject=subject,
        message=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )


def send_invite(email: str, teacher: str, link: str) -> None:
    """Приглашение ученика в журнал преподавателя.

    🔴 Письмо НЕ говорит, зарегистрирован человек у нас или нет, и не намекает
    на это ни словом: тот же ответ получает и тот, кого у нас нет. Иначе журнал
    становится способом перебором собрать базу почт наших учеников.

    Язык письма — язык страницы преподавателя, который зовёт (`config/язык.py`).
    """
    subject, text = письмо("приглашение", teacher=teacher, link=link)
    if not settings.EMAIL_HOST:
        log.warning("ПОЧТА НЕ НАСТРОЕНА. Приглашение для %s не ушло. Ссылка: %s", email, link)
        return
    send_mail(
        subject=subject,
        message=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )
