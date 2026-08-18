"""Человек, забывший пароль, не должен быть заперт навсегда (наряд 37 §3).

🔴 НАЙДЕНО 18.08. `_send_password_reset_email` писал ссылку в лог сервера и ничего не
отправлял; почтовой отправки в продукте не было вовсе. Кнопка «Забыли пароль?» изображала
отправку — молчащий отказ, притворяющийся успехом.
"""

from __future__ import annotations

import pytest
from django.core import mail

from apps.accounts import services
from common.enums import Role

pytestmark = pytest.mark.django_db


def a_user(email="forgot@example.com"):
    return services.register_user(
        email=email,
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.TEACHER,
        specialty="Английский",
        consent_152fz=True,
    )


def test_a_reset_letter_really_leaves_when_mail_is_configured(settings):
    settings.EMAIL_HOST = "smtp.example.com"
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    user = a_user()
    mail.outbox.clear()

    assert services.request_password_reset(user.email) is True

    assert len(mail.outbox) == 1
    letter = mail.outbox[0]
    assert letter.to == [user.email]
    # Ссылка — то единственное, ради чего письмо существует.
    assert "/reset-password?token=" in letter.body


def test_without_mail_the_product_says_so_instead_of_pretending(settings):
    """🔴 ВОРОТА: не настроена почта — отвечаем «нельзя», а не «письмо отправлено»."""
    settings.EMAIL_HOST = ""
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    user = a_user("forgot2@example.com")
    mail.outbox.clear()

    assert services.request_password_reset(user.email) is False
    assert mail.outbox == []


def test_the_answer_does_not_reveal_whether_the_email_exists(settings):
    """🔒 По ответу нельзя перебрать список почт продукта: он о нашей настройке, не об учётке."""
    settings.EMAIL_HOST = "smtp.example.com"
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    a_user("forgot3@example.com")

    assert services.request_password_reset("forgot3@example.com") is True
    assert services.request_password_reset("nobody@example.com") is True
