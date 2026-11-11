"""Кто у нас есть. Одна таблица, потому что пока и правда одна сущность.

Своя модель, а не django.contrib.auth.User: у нас нет ни админки, ни прав, ни групп —
есть человек, его почта, имя и роль. Тащить ради этого половину контриба значит
объяснять потом, почему у нас есть is_staff, который ничего не значит.
"""
from __future__ import annotations

import uuid

from django.db import models


def new_id() -> str:
    """🔴 Именованная функция, а не lambda: миграции Django лямбду не сериализуют
    и валятся с «Cannot serialize function: lambda». Поймано первой же миграцией."""
    return str(uuid.uuid4())


class Person(models.Model):
    TEACHER = "teacher"
    STUDENT = "student"
    ROLES = [(TEACHER, "веду уроки"), (STUDENT, "учусь")]

    id = models.CharField(primary_key=True, max_length=36, default=new_id)
    #: Почта хранится приведённой к нижнему регистру: «Nina@» и «nina@» — один человек.
    email = models.EmailField(unique=True, max_length=254)
    name = models.CharField(max_length=60)
    role = models.CharField(max_length=16, choices=ROLES, default=STUDENT)
    #: 🔴 Не пароль. Отпечаток argon2id, по которому пароль не восстановить.
    #: Имя поля названо так, чтобы никто и никогда не записал сюда пароль.
    pass_hash = models.CharField(max_length=256)
    #: 🔴 Часовой пояс человека — имя IANA («Europe/Moscow»), пусто = не знаем.
    #: Приходит от браузера при входе и при заведении записи, а формой НЕ
    #: спрашивается: браузер знает пояс точно, а поле в анкете — это ещё один
    #: способ ошибиться. Обновляется при каждом удачном входе: человек мог
    #: переехать, и «его пояс» — это где он СЕЙЧАС. На уже поставленные занятия
    #: это не влияет: у занятия свой пояс, тот, в котором его поставили.
    tz = models.CharField(max_length=64, blank=True, default="")
    made_at = models.DateTimeField(auto_now_add=True)

    # ── проверка и блокировка (решение владельца 10.11.2026) ───────────────
    #: 🔴 ПРОВЕРКА ПРЕПОДАВАТЕЛЯ. Новый преподаватель заводить занятия не может,
    #: пока владелец его не подтвердил: иначе подтверждение ничего не защищает.
    #: По умолчанию — `ok`: все, кто был до этого поля, уже работают, и ломать
    #: им занятия нельзя; `new` ставит сама регистрация преподавателя. Ученику
    #: поле ничего не значит и остаётся `ok`.
    VET_NEW, VET_OK, VET_NO = "new", "ok", "no"
    VETS = [(VET_NEW, "ждёт проверки"), (VET_OK, "подтверждён"), (VET_NO, "отклонён")]
    vet = models.CharField(max_length=8, choices=VETS, default=VET_OK)
    #: Почту подтверждает владелец руками, пока письма с сервера не ходят.
    email_ok = models.BooleanField(default=False)
    phone = models.CharField(max_length=32, blank=True, default="")
    #: Заблокированный не входит, и открытые сеансы гаснут сразу: `session.who`
    #: его больше не узнаёт. Пусто — не заблокирован.
    blocked_at = models.DateTimeField(null=True, blank=True)
    blocked_why = models.CharField(max_length=200, blank=True, default="")
    #: Заметка владельца о проверке. Наружу не уходит никому, кроме админки.
    note = models.TextField(blank=True, default="")

    class Meta:
        db_table = "people"

    def __str__(self) -> str:
        return f"{self.name} <{self.email}>"


class Tries(models.Model):
    """Счётчик неудачных попыток. Пять — и двадцать минут отдыха.

    🔴 Считаем ДВА раза: по почте и по адресу, откуда стучат.

    Только по почте — и любой желающий запирает чужой вход, стуча наугад пять раз:
    защита превращается в оружие против нашего же ученика.
    Только по адресу — и перебор с десяти адресов проходит насквозь.
    Вместе они закрывают оба случая, и цена — одна лишняя строка в таблице.

    Запирание НЕ говорит, есть такая почта или нет: считаем и незнакомые тоже,
    иначе сам факт «вас заперли» становится ответом на вопрос «я угадал почту?».
    """

    KEY_MAX = 254

    key = models.CharField(primary_key=True, max_length=KEY_MAX)
    fails = models.PositiveIntegerField(default=0)
    until = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "tries"


class Reset(models.Model):
    """Одноразовый ключ на смену пароля.

    🔴 В базе лежит ОТПЕЧАТОК ключа, а не он сам. Утёкшая база тогда не даёт войти
    ни в одну учётную запись: по отпечатку письмо не подделать. Быстрый SHA-256
    здесь достаточен — ключ случайный на 32 байта, перебирать нечего.
    """

    token_hash = models.CharField(primary_key=True, max_length=64)
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="resets")
    made_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "resets"


class Deed(models.Model):
    """Журнал действий владельца в админке: кто, когда, над кем, что.

    🔴 Запись НЕ УДАЛЯЕТСЯ вместе с человеком (`SET_NULL`), и почта админа
    лежит строкой, а не ссылкой: журнал должен пережить и того, над кем
    действовали, и того, кто действовал. Иначе «кто заблокировал» исчезает
    ровно тогда, когда этот вопрос задают.
    """

    id = models.BigAutoField(primary_key=True)
    admin = models.CharField(max_length=254)
    person = models.ForeignKey(Person, null=True, on_delete=models.SET_NULL, related_name="deeds")
    #: Кого касалось — словами, на случай если человека уже нет.
    whom = models.CharField(max_length=320, blank=True, default="")
    what = models.CharField(max_length=32)
    detail = models.CharField(max_length=300, blank=True, default="")
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "deeds"
        ordering = ["-at", "-id"]


class Star(models.Model):
    """Избранный источник «Источников мира»: человек отметил — и видит его
    первым с любого устройства. Имя источника — строкой из каталога витрины
    (`common/хаб-источники.json`); порядок — порядок добавления."""

    id = models.BigAutoField(primary_key=True)
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="stars")
    source = models.CharField(max_length=40)
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stars"
        ordering = ["id"]
        constraints = [models.UniqueConstraint(fields=["person", "source"], name="star_once")]
