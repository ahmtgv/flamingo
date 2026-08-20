"""Очистить боевую базу начисто — учётки, курсы и всё, что за ними тянется.

🔴 РАСПОРЯЖЕНИЕ ВЛАДЕЛЬЦА 19.08 (наряд 40-бис, шаг 1 плана `OWNER_SCOPE §44`). Владелец
начинает с чистого листа и проходит регистрацию заново; курсы «Введение в Астрономию» и
«уцкыавп» — мусор, и он лежит в общем каталоге, где его видит любой гость.

⚠️ ПОЧЕМУ ОТДЕЛЬНАЯ КОМАНДА, А НЕ ПАРАМЕТР К `purge_test_accounts`. В той маска
`@flamingo-test.invalid` **зашита в код намеренно** (§6-бис п.3): параметр однажды позволил бы
набрать `--mask "*@gmail.com"`, и команда послушно выполнит. Ослаблять тот предохранитель
нельзя — поэтому здесь своя команда, у которой в имени написано, что она делает.

🔒 ЧЕГО ЭТА КОМАНДА НЕ ДЕЛАЕТ. Не трогает файловое хранилище (вложения в MinIO), настройки
окружения и вообще ничего вне базы. Если у удаляемых работ есть вложения — их количество
печатается, но файлы остаются: распоряжения на них не было.

🔴 СНИМОК ДЕЛАЕТСЯ СКРИПТОМ, А НЕ РУКАМИ (наряд 43 §4). 19.08 снимок сделали руками, и он
лёг внутрь контейнера — 518 КБ исчезли при первой пересборке, страховки не было ни минуты, и
мы этого не знали. `infra/prod/snapshot-before-purge.sh` пишет в примонтированный том и
проверяет файл С ХОСТА: размер, читаемость архива. Без его «✓» чистку не начинать.

Запуск на боевом — ТОЛЬКО ПОСЛЕ ДАМПА:

    sh /opt/flamingo/infra/prod/snapshot-before-purge.sh   # снимок + проверка снаружи


    docker compose -f infra/prod/docker-compose.prod.yml --env-file .env.production \\
      exec api python manage.py purge_everything            # показать, ничего не трогая
    ... exec api python manage.py purge_everything --confirm  # удалить
"""

import logging

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

#: 🔴 СЛЕД В ЖУРНАЛЕ — ИЗЪЯН, СТОИВШИЙ ПОЛДНЯ СПОРА (наряд 43 §4).
#:
#: Чистку запустили через `ssh root@… 'команда'`, и в историю сервера такой запуск не
#: попадает ВОВСЕ. Полдня ушло на выяснение, отработала команда или нет: база была пуста, но
#: пуста она могла быть и по другой причине. Догадка вместо знания.
#:
#: Теперь команда пишет строку сама: когда, сколько записей каждого вида ушло. Журнал
#: контейнера переживает и `ssh`, и закрытую сессию.
log = logging.getLogger("flamingo.purge")


class Command(BaseCommand):
    help = "Очистить базу начисто: все учётки, все курсы и их следы (распоряжение владельца)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Удалить. Без него команда только показывает, что уйдёт.",
        )

    def handle(self, *args, **options):
        counts = self._count()

        self.stdout.write("Будет удалено:")
        for label, number in counts.items():
            self.stdout.write(f"  {label}: {number}")

        files = self._attachments()
        if files:
            self.stdout.write("")
            self.stdout.write(
                f"⚠️ Вложений в хранилище у этих работ: {files}. Файлы НЕ трогаются — "
                f"распоряжения на хранилище не было."
            )

        if not options["confirm"]:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING("Это только показ. Удалить: --confirm"))
            return

        log.warning(
            "purge_everything: начало · %s",
            " · ".join(f"{label}={number}" for label, number in counts.items()),
        )
        with transaction.atomic():
            deleted = self._delete()

        left = self._count()
        log.warning(
            "purge_everything: удалено записей %s · осталось %s",
            deleted,
            " · ".join(f"{label}={number}" for label, number in left.items()),
        )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Удалено записей всего: {deleted}"))
        self.stdout.write("")
        self.stdout.write("Осталось в базе:")
        for label, number in left.items():
            self.stdout.write(f"  {label}: {number}")

        # ⚠️ Учреждения и группы наряд НЕ называет, и я их не трогаю — «ничего сверх списка».
        # Но пустое учреждение без единого участника это тоже сирота, и решать про него
        # владельцу. Поэтому печатаем, а не удаляем молча.
        self._report_leftovers()

    # --- что именно считаем и удаляем ---------------------------------------------------
    def _models(self):
        """Виды записей, которые называет наряд. Порядок — для чтения человеком."""
        from apps.courses.models import Course, Enrollment
        from apps.homework.models import Submission
        from apps.meetingpoint.models import MeetingPoint, MirroredRecord
        from apps.scheduling.models import Attendance, LessonSession

        return {
            "учётки": get_user_model(),
            "курсы": Course,
            "зачисления": Enrollment,
            "занятия": LessonSession,
            "посещаемость": Attendance,
            "работы": Submission,
            "записи зеркала": MirroredRecord,
            "точки встречи": MeetingPoint,
        }

    def _count(self) -> dict[str, int]:
        """Считаем ВСЁ, включая мягко удалённое.

        🔴 `Model.objects` у содержимого — менеджер мягкого удаления: он прячет строки с
        `deleted_at`. Считать им значило бы напечатать «курсов 0» при полной таблице —
        и уборка выглядела бы сделанной, не будучи ею.
        """
        out = {}
        for label, model in self._models().items():
            manager = getattr(model, "all_objects", model.objects)
            out[label] = manager.count()
        return out

    def _report_leftovers(self) -> None:
        from apps.institutions.models import Group, Institution

        institutions = Institution.objects.count()
        groups = Group.objects.count()
        if not institutions and not groups:
            return
        self.stdout.write("")
        self.stdout.write(
            f"⚠️ Осталось вне списка наряда: учреждений {institutions}, групп {groups}. "
            f"Участников в них нет — все учётки удалены. Убирать их отдельным распоряжением."
        )

    def _attachments(self) -> int:
        from apps.homework.models import SubmissionFile

        return SubmissionFile.objects.count()

    def _delete(self) -> int:
        """Удаляем учётки и курсы; остальное уходит каскадом.

        ⚠️ Курсы удаляются ОТДЕЛЬНО и после: у курса владелец — профиль преподавателя, и при
        удалении учётки курс может остаться сиротой, если связь настроена на `SET_NULL`.
        Наряд требует прямо: осиротевших записей после чистки быть не должно.
        """
        from apps.courses.models import Course

        total = 0
        removed, _ = get_user_model().objects.all().delete()
        total += removed

        # 🔴 НАСТОЯЩЕЕ УДАЛЕНИЕ, А НЕ МЯГКОЕ. `Course.objects.delete()` проставляет
        # `deleted_at` и оставляет строку в базе: каталог опустеет, а таблица нет, и
        # «осиротевших записей быть не должно» окажется невыполненным. Для уборки нужен
        # `all_objects` — менеджер без фильтра — и обычное удаление Django.
        removed, _ = Course.all_objects.all().delete()
        total += removed

        # 🔴 ТОЧКИ ВСТРЕЧИ НЕ УХОДЯТ КАСКАДОМ, и первый прогон это показал: после удаления
        # всех учёток и курсов их осталось четыре. Точка висит на ГРУППЕ, а группа — на
        # учреждении; ни то, ни другое не принадлежит пользователю. Наряд называет их прямо:
        # «осиротевших записей после чистки быть не должно».
        from apps.meetingpoint.models import MeetingPoint

        removed, _ = MeetingPoint.objects.all().delete()
        total += removed
        return total
