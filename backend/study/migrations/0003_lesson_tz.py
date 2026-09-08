"""Часовой пояс занятия (решение владельца 08.09: пояса идут в v1).

Пояс — ПОЛЕ ЗАНЯТИЯ, а не свойство хранения: `on` и `at` остаются настенными
часами, `tz` говорит, чьи они. Формат `on`/`at` не меняется, поэтому старый
клиент от нового ответа не ломается.

Написана руками — почему, сказано в `people/migrations/0003_person_tz.py`.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("study", "0002_message"),
    ]

    operations = [
        migrations.AddField(
            model_name="lesson",
            name="tz",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]
