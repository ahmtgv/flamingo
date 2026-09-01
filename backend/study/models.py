"""Занятия, журнал и всё, что к ним крепится.

Пять таблиц, и каждая отвечает на один вопрос:

    Lesson    что и когда преподаватель проводит
    Bond      кто у него учится
    Invite    одноразовая ссылка, которой ученик к нему приходит
    Visit     кто на каком занятии был
    Material  что приложено к занятию

🔴 Ученик добавляется НЕ поиском по справочнику, а ссылкой (решение владельца
01.09). Разница не косметическая: поиск по почте или телефону — это способ
перебором узнать, кто у нас зарегистрирован, то есть собрать базу почт наших
учеников. Ссылки такого не позволяют вовсе: нечего перебирать.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import timedelta

from django.db import models
from django.utils import timezone

from people.models import Person

#: Тот же алфавит, что у кода комнаты во фронте и в `room/views.py`: без i, l, o, 0, 1.
#: Правило одно, записано в трёх местах — потому что живёт по обе стороны провода.
ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


def new_id() -> str:
    """Именованная функция, а не lambda: миграции Django лямбду не сериализуют."""
    return str(uuid.uuid4())


def new_code() -> str:
    """Код комнаты: три группы по четыре."""
    def g() -> str:
        return "".join(secrets.choice(ALPHABET) for _ in range(4))
    return f"{g()}-{g()}-{g()}"


class Lesson(models.Model):
    """Занятие, заведённое заранее.

    🔴 Дата и время лежат ПОРОЗНЬ (`on` и `at`), а не одним моментом времени.
    Школьное расписание — это «вторник, 14:00», а не точка на мировой оси:
    если хранить моментом, урок у преподавателя из Казани и у ученика из Москвы
    начнётся в разное время по их собственным часам, и оба будут правы.
    Часовой пояс придёт тогда, когда придут ученики из другого пояса, — и тогда
    он станет полем занятия, а не свойством хранения.
    """

    id = models.CharField(primary_key=True, max_length=36, default=new_id)
    teacher = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=120)
    on = models.DateField()
    at = models.TimeField()
    minutes = models.PositiveIntegerField(default=45)
    #: Комната родится вместе с уроком: ссылку можно отдать классу заранее.
    code = models.CharField(max_length=14, unique=True, default=new_code)
    made_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "lessons"
        ordering = ["on", "at"]
        indexes = [models.Index(fields=["teacher", "on"])]

    def __str__(self) -> str:
        return f"{self.title} — {self.on} {self.at}"


class Bond(models.Model):
    """Связь «преподаватель ↔ ученик». Двусторонняя по смыслу: он у неё в журнале,
    она у него в преподавателях. Одна строка на пару."""

    id = models.CharField(primary_key=True, max_length=36, default=new_id)
    teacher = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="students")
    student = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="teachers")
    #: Как пришёл — «по ссылке» или «по почте». Показывается в журнале строкой.
    how = models.CharField(max_length=16, default="ссылке")
    since = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bonds"
        constraints = [models.UniqueConstraint(fields=["teacher", "student"],
                                               name="одна_связь_на_пару")]


class Invite(models.Model):
    """Одноразовая ссылка в журнал.

    🔴 В базе лежит ОТПЕЧАТОК ключа, а не он сам — так же, как у смены пароля.
    Утёкшая база тогда не даёт войти ни в чей журнал: по отпечатку ссылку не
    собрать обратно. Быстрый SHA-256 здесь достаточен: ключ случайный на 16 байт,
    перебирать нечего.
    """

    LIFE = timedelta(days=7)

    token_hash = models.CharField(primary_key=True, max_length=64)
    teacher = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="invites")
    #: Куда отправили письмо, если отправляли. Пусто — ссылку унесли руками.
    email = models.EmailField(max_length=254, blank=True, default="")
    made_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    student = models.ForeignKey(
        Person, on_delete=models.SET_NULL, null=True, blank=True, related_name="came_by")

    class Meta:
        db_table = "invites"

    @property
    def alive(self) -> bool:
        return self.used_at is None and timezone.now() - self.made_at < self.LIFE


class Visit(models.Model):
    """Кто был на занятии.

    🔴 Ставится НЕ руками: комната знает, кто в неё вошёл. Ручная правка
    («был, но с телефона брата») появится позже и не отменит эту запись,
    а ляжет рядом отдельным полем — иначе журнал перестанет быть свидетелем.
    """

    id = models.CharField(primary_key=True, max_length=36, default=new_id)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="visits")
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="visits")
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "visits"
        constraints = [models.UniqueConstraint(fields=["lesson", "person"],
                                               name="одно_посещение_на_урок")]


class Material(models.Model):
    """Учебное пособие, приложенное к занятию.

    🔴 Видео у нас НЕ ХРАНИТСЯ, и это не жадность. Час записи — это гигабайты,
    а раздача без CDN упирается в канал сервера на третьем зрителе. Поэтому
    видео — ссылкой (`kind='link'`), как и всё крупное. Диск занимают документы
    и картинки, которых на урок нужны единицы.
    """

    DOC, IMAGE, LINK = "doc", "image", "link"
    KINDS = [(DOC, "документ"), (IMAGE, "картинка"), (LINK, "ссылка")]

    id = models.CharField(primary_key=True, max_length=36, default=new_id)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="materials")
    kind = models.CharField(max_length=8, choices=KINDS)
    name = models.CharField(max_length=200)
    #: Для doc и image. Путь внутри MEDIA_ROOT.
    path = models.CharField(max_length=300, blank=True, default="")
    #: Для link.
    url = models.URLField(max_length=500, blank=True, default="")
    size = models.PositiveBigIntegerField(default=0)
    made_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "materials"
        ordering = ["made_at"]
