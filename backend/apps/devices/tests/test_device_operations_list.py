"""Список device-операций во фронте не расходится с резолверами бэкенда.

🔴 РЕГРЕССИЯ 16.08 (промпт 21 §2.2). `apolloClient` выбирал заголовок по наличию токена.
Пока пользовательской сессии в приложении не бывало НИКОГДА, «по наличию» случайно совпадало
с «по смыслу». §Б0-септ научил связывание выдавать сессию — и все `require_device`-операции
пошли как `Bearer`. Мастер встал на переходе 1→2.

Починка требует списка «кому нужен ключ машины». Рукописный разошёлся бы с кодом на первой же
новой мутации — и разошёлся бы МОЛЧА, как и всё в этой истории. Поэтому список генерируется
из исходников, а этот тест не даёт ему протухнуть: добавили резолвер с `require_device`,
не пересобрали список — тест назовёт операцию по имени.

    cd backend && .venv/bin/python -m apps.devices.device_operations
"""

from apps.devices.device_operations import TS_PATH, device_operations, render_ts, ts_names


def test_the_generated_list_matches_the_resolvers():
    """Что во фронте — то и в резолверах. Расхождение называется поимённо."""
    from_code = device_operations()
    from_file = ts_names()

    missing = sorted(set(from_code) - set(from_file))
    extra = sorted(set(from_file) - set(from_code))

    assert not missing, (
        f"операции требуют ключ машины, но фронт об этом не знает: {missing}. "
        "Пересоберите: python -m apps.devices.device_operations"
    )
    assert not extra, f"во фронте есть лишние device-операции: {extra}"


def test_the_generated_file_is_byte_for_byte_what_the_generator_produces():
    """Файл не правили руками.

    Без этой проверки предыдущая пройдёт и на файле, куда кто-то дописал комментарий «временно»
    или переставил строки: имена-то совпадут. Сгенерированное должно быть сгенерированным.
    """
    assert TS_PATH.exists(), f"нет файла {TS_PATH}"
    assert (
        TS_PATH.read_text(encoding="utf-8") == render_ts()
    ), "сгенерированный файл разошёлся с генератором — пересоберите, а не правьте руками"


def test_the_list_is_not_empty_and_holds_the_wizard():
    """Страховка от зелени на пустом множестве.

    Если разбор исходников однажды перестанет что-либо находить, обе проверки выше сойдутся
    на пустых списках и будут идеально зелёными — а мастер снова встанет.
    """
    names = device_operations()

    assert len(names) >= 7, names
    # Шаги мастера: без них список бессмыслен, потому что чинили именно мастер.
    for required in ("thisDevice", "advanceDeviceSetup", "completeDeviceSetup"):
        assert required in names, f"{required} потерялась из списка"


def test_operations_that_take_either_door_are_not_in_the_list():
    """`consenting_user`-резолверы сюда не попадают.

    Они принимают и человека, и машину, и человек приоритетнее: иначе браузер преподавателя,
    открытый рядом, начал бы ходить с правами машины. Согласия — ровно такой случай (§Б0-кватер).
    """
    names = device_operations()

    assert "setSpeechConsent" not in names
    assert "setAttentionConsent" not in names
