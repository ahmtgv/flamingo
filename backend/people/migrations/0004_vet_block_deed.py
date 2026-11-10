"""Проверка преподавателей, блокировка и журнал админки (владелец, 10.11.2026).

🔴 ПОЧЕМУ `vet` ПО УМОЛЧАНИЮ `ok`. Поле добавляется к людям, которые уже
работают: преподаватель, заведённый до этой миграции, обязан и после неё
заводить занятия как раньше. «Ждёт проверки» ставит сама регистрация, и
только новым преподавателям.

Сверить с моделью:

    cd backend && .venv/bin/python manage.py makemigrations --check --dry-run
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("people", "0003_person_tz"),
    ]

    operations = [
        migrations.AddField(
            model_name="person",
            name="vet",
            field=models.CharField(
                choices=[("new", "ждёт проверки"), ("ok", "подтверждён"), ("no", "отклонён")],
                default="ok", max_length=8),
        ),
        migrations.AddField(
            model_name="person",
            name="email_ok",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="person",
            name="phone",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AddField(
            model_name="person",
            name="blocked_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="person",
            name="blocked_why",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
        migrations.AddField(
            model_name="person",
            name="note",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.CreateModel(
            name="Deed",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("admin", models.CharField(max_length=254)),
                ("whom", models.CharField(blank=True, default="", max_length=320)),
                ("what", models.CharField(max_length=32)),
                ("detail", models.CharField(blank=True, default="", max_length=300)),
                ("at", models.DateTimeField(auto_now_add=True)),
                ("person", models.ForeignKey(
                    null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="deeds", to="people.person")),
            ],
            options={"db_table": "deeds", "ordering": ["-at", "-id"]},
        ),
    ]
