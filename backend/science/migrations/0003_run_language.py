from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("science", "0002_invite"),
    ]

    operations = [
        migrations.AddField(
            model_name="run",
            name="language",
            field=models.CharField(default="ru", max_length=2),
        ),
    ]
