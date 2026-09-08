"""Часовой пояс человека (решение владельца 08.09: пояса идут в v1).

Написана руками, а не `makemigrations`: виртуальное окружение собрано на маке
под python 3.14, а с монтированной машины доступен 3.10 — запустить `manage.py`
отсюда нечем. Одно поле со значением по умолчанию, разночтений тут не бывает;
сверить можно так:

    cd backend && .venv/bin/python manage.py makemigrations --check --dry-run

«No changes detected» — файл сходится с моделью.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("people", "0002_tries_reset"),
    ]

    operations = [
        migrations.AddField(
            model_name="person",
            name="tz",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]
