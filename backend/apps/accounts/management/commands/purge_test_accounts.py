"""Убрать тестовые учётки, оставшиеся от живых проходов.

🔴 Зачем команда, а не мутация в API (решение владельца, промпт 23 §6-бис п.3). Разовая
уборка тестового мусора — не повод открывать в GraphQL дверь, которой там быть не должно.
§20.5 прямо говорит: данные ученика не удаляются. Учётка преподавателя-пустышки — другое
дело, но право на это живёт у того, у кого доступ к серверу, а не у любого держателя токена.

Запуск на боевом:

    docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production \\
      exec api python manage.py purge_test_accounts --confirm

Без `--confirm` показывает список и не трогает ничего.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

#: 🔒 Маска ЗАШИТА В КОД и параметром не передаётся (§6-бис п.3).
#:
#: Параметр здесь означал бы, что однажды кто-то наберёт `--mask "*@gmail.com"` — и команда
#: послушно выполнит. Домен `.invalid` зарезервирован RFC 2606 именно под то, что никогда не
#: существует: настоящей почты в этой зоне не бывает, поэтому под маску не может попасть
#: живой человек.
TEST_EMAIL_SUFFIX = "@flamingo-test.invalid"

#: Защита от опечатки: если под маску попало больше — что-то не так, и лучше остановиться.
#:
#: 🔴 БЫЛО 10 (промпт 29 §2.4). Прогон заводит по учётке за проход; после десятка ночных
#: прогонов команда отказывалась убирать НАКОПЛЕННОЕ — то есть переставала работать ровно
#: тогда, когда становилась нужна. Уборщик, который бастует при виде мусора, бесполезен.
#:
#: Порог остался — он ловит опечатку в маске, — но сдвинут и стал параметром: сотня покрывает
#: месяц ночных прогонов, а осознанное «уберу больше» теперь возможно и видно в команде.
MAX_REASONABLE = 100


class Command(BaseCommand):
    help = "Удалить тестовые учётки *@flamingo-test.invalid вместе с их следами"

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Действительно удалить. Без него — только показать.",
        )
        parser.add_argument(
            "--max",
            type=int,
            default=MAX_REASONABLE,
            help=(
                f"Предохранитель: больше скольких учёток считать ошибкой, а не уборкой "
                f"(по умолчанию {MAX_REASONABLE})."
            ),
        )

    def handle(self, *args, **options):
        user_model = get_user_model()
        victims = list(user_model.objects.filter(email__iendswith=TEST_EMAIL_SUFFIX))

        if not victims:
            self.stdout.write(f"Учёток по маске *{TEST_EMAIL_SUFFIX} не найдено.")
            return

        ceiling = options["max"]
        if len(victims) > ceiling:
            raise CommandError(
                f"Под маску попало {len(victims)} учёток — больше предела {ceiling}. "
                f"Это похоже на ошибку, а не на уборку. Ничего не удалено. "
                f"Если накопилось за месяц прогонов — поднимите: --max {len(victims)}"
            )

        counts = self._count_traces(victims)

        self.stdout.write(f"Учёток по маске *{TEST_EMAIL_SUFFIX}: {len(victims)}")
        for user in victims:
            self.stdout.write(f"  · {user.email}")
        self.stdout.write("")
        self.stdout.write("Следы, которые уйдут вместе с ними:")
        for label, number in counts.items():
            self.stdout.write(f"  {label}: {number}")

        if not options["confirm"]:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING("Это только показ. Удалить: --confirm"))
            return

        with transaction.atomic():
            deleted, _ = user_model.objects.filter(id__in=[u.id for u in victims]).delete()

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Удалено записей всего: {deleted}"))

    def _count_traces(self, victims) -> dict[str, int]:
        """Что именно исчезнет. Считаем ДО удаления — потом считать будет нечего.

        Числа печатаются, чтобы уборка не была молчаливой: человек видит, что уходит
        не только строка в таблице пользователей.
        """
        ids = [u.id for u in victims]
        counts: dict[str, int] = {}

        from apps.devices.models import Device, DeviceToken, PairingCode

        counts["машины"] = Device.objects.filter(owner_id__in=ids).count()
        counts["ключи машин"] = DeviceToken.objects.filter(device__owner_id__in=ids).count()
        counts["коды связывания"] = PairingCode.objects.filter(confirmed_by_id__in=ids).count()
        # ⚠️ Отозванные токены (`RevokedToken`) здесь не считаются, и это не пропуск:
        # таблица хранит только `jti` и срок, без ссылки на человека — по построению, чтобы
        # denylist не превращался в журнал того, кто когда выходил. Значит и посчитать их
        # по учётке нельзя. Умирают сами, по `expires_at`.
        return counts
