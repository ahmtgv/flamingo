"""Исследование внимания SEduM: кто участвует и какие проверки прошёл.

Две таблицы, и каждая отвечает на один вопрос:

    Volunteer  кто это (ссылка-код, наша пометка, согласие, анкета)
    Run        одна проверка: какая, когда, в каких условиях, сколько записано

🔴 САМИ ЗАПИСИ — НЕ В БАЗЕ, А НА ДИСКЕ (`хранилище.py`). Пять минут видео,
точки лица на каждый кадр и все события — это десятки мегабайт; база для них
не место. База знает только «что, где и сколько», а папка каждой проверки
описывает себя сама (`meta.json`) и читается без базы — так её можно унести на
анализ одной архивной командой (`manage.py наука_выгрузка`).

🔴 ПОЧЕМУ ЗДЕСЬ МОЖНО ТО, ЧЕГО НЕЛЬЗЯ В ПРОДУКТЕ. Решение владельца 06.10:
участники — добровольцы, друзья и близкие; их данные храним, всё, что нужно для
науки, и пишем сразу к нам на сервер. «В исследовании можно больше, чем в
релизе». В продукте (комната урока) кадры и точки лица по-прежнему не
покидают устройство ученика — это разные режимы, и смешивать их нельзя.
"""
from __future__ import annotations

import secrets
import uuid

from django.db import models

#: Без i, l, o, 0, 1 — тот же алфавит, что у кода комнаты: код читают вслух и
#: переписывают руками, похожие знаки там — источник ошибок.
ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


def new_code() -> str:
    """Код добровольца: 12 знаков — 31¹² ≈ 8·10¹⁷, перебором не найти."""
    return "".join(secrets.choice(ALPHABET) for _ in range(12))


def new_id() -> str:
    """Именованная функция, а не lambda: миграции Django лямбду не сериализуют."""
    return str(uuid.uuid4())


class Volunteer(models.Model):
    #: Код из ссылки `flamingo.plus/наука/<код>`. Ссылка и есть пропуск:
    #: учётной записи у добровольца нет и не нужно.
    code = models.CharField(primary_key=True, max_length=16, default=new_code)
    #: Наша пометка «кто это» (например, «мама Адели»). Видна только в командах
    #: сервера, на страницу не отдаётся.
    label = models.CharField(max_length=120, blank=True)
    #: Версия текста согласия, которое человек принял. Пусто — ещё не принял.
    consent = models.CharField(max_length=20, blank=True)
    consent_at = models.DateTimeField(null=True, blank=True)
    #: Анкета: возраст, пол, очки, ведущая рука… — как ответил человек.
    profile = models.JSONField(default=dict, blank=True)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "science_volunteers"

    def __str__(self) -> str:  # pragma: no cover — для журнала и админки
        return f"{self.code} · {self.label or 'без пометки'}"


class Run(models.Model):
    id = models.CharField(primary_key=True, max_length=36, default=new_id)
    volunteer = models.ForeignKey(Volunteer, on_delete=models.CASCADE, related_name="runs")
    #: Какая проверка: «взгляд», «тетрадь», «сон», «думай», «точка», «чтение», «голос».
    kind = models.CharField(max_length=24)
    #: Версия протокола: один и тот же вид может меняться, и старые записи
    #: должны читаться по своим правилам.
    protocol = models.CharField(max_length=24)
    started = models.DateTimeField(auto_now_add=True)
    finished = models.DateTimeField(null=True, blank=True)
    #: «Как вы сейчас»: сонливость, свет, очки, где сидите.
    before = models.JSONField(default=dict, blank=True)
    #: Устройство: браузер, экран, камера, чем считает модель.
    device = models.JSONField(default=dict, blank=True)
    #: Что сказала страница в конце: сколько кадров, сколько кусков, ответы.
    summary = models.JSONField(default=dict, blank=True)
    #: Сколько байт записано на диск — для потолков, без обхода папки.
    bytes = models.BigIntegerField(default=0)
    chunks = models.IntegerField(default=0)

    class Meta:
        db_table = "science_runs"
        ordering = ["started"]
