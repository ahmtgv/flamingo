"""Entry point of the sidecar as it ships: uvicorn serving Django on the loopback (Р5.3).

The ASGI application is imported and passed as an OBJECT, not as the string
`"config.asgi:application"`. A frozen bundle has no source tree for uvicorn's string import to
resolve against, and the failure is a bare «Could not import module» with nothing pointing at
the cause — found while building this, and worth the two lines to avoid.
"""

import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_desktop")


def prepare_cabinet() -> None:
    """Довести кабинет до текущей схемы — ДО того, как окно начнёт задавать вопросы.

    🔴 Найдено при пересборке 15.08. Миграции не запускал никто: ни оболочка, ни sidecar, ни
    экран первого запуска. Свежеустановленное приложение поднимало uvicorn поверх пустого файла
    SQLite, и первый же запрос отвечал «no such table: devices_pairingcode» — то есть мастер
    первого запуска не мог показать даже код связывания. Раньше это не всплывало потому, что на
    машине разработчика кабинет оставался от прогонов `manage.py migrate` руками.

    Здесь, а не в оболочке: миграции — знание Django о самом себе, и оболочке на Rust незачем
    знать имена приложений. Здесь, а не в первом запросе: тогда первый пользователь ждал бы
    секунду молча, а второй, пришедший одновременно, получил бы полуприменённую схему.

    Идемпотентно: на уже мигрированном кабинете `migrate` не делает ничего и стоит миллисекунды.
    """
    import django

    django.setup()

    from django.core.management import call_command

    call_command("migrate", interactive=False, verbosity=0)


def main() -> None:
    import uvicorn

    prepare_cabinet()

    from config.asgi import application

    uvicorn.run(
        application,
        host="127.0.0.1",
        port=int(os.environ.get("FLAMINGO_SIDECAR_PORT", "8931")),
        log_level="warning",
    )


if __name__ == "__main__":
    sys.exit(main())
