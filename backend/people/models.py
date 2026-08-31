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
    made_at = models.DateTimeField(auto_now_add=True)

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
