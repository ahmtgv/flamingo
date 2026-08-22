"""Сняли копию → снесли кабинет → восстановили → работы и оценки на месте (Р5.5).

The phase brief is explicit that this is the acceptance, and that «код написан» is not it. So
the central test below really does delete the rows and the file from disk, and really does
read them back out of one file.

Why this ran before any live lesson: the first run **forces** a teacher to configure a copy
(OWNER_SCOPE §19.1) and nothing wrote one. The whole «данные у преподавателя» architecture
rests on this file existing.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest
from django.test import override_settings
from django.utils import timezone

from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.homework import services as homework
from apps.homework.models import Homework, Submission, SubmissionFile
from common import storage
from common.cabinet_file import (
    MAGIC,
    export_cabinet,
    import_cabinet,
    read_header,
    seal_required_for,
)
from common.enums import HomeworkType, Role
from common.exceptions import ValidationError
from common.portability import CABINET_TABLES, exported_model_classes
from tests.consent_helpers import sign_for_child

pytestmark = pytest.mark.django_db

ESSAY = "Москва — столица России. Я живу в Казани.".encode()


@pytest.fixture
def cabinet(tmp_path, settings):
    """Локальный кабинет: файлы рядом с базой, экспорт разрешён конфигурацией."""
    settings.STORAGE_BACKEND = "local"
    settings.LOCAL_STORAGE_ROOT = str(tmp_path / "files")
    settings.CABINET_IS_LOCAL = True
    return tmp_path


def a_lesson_with_marked_work():
    """Преподаватель, курс, урок, домашняя работа, сданное сочинение и оценка за него."""
    teacher = accounts.register_user(
        email="lucia@example.com",
        password="strongpass1!",
        first_name="Люция",
        last_name="Валерьевна",
        role=Role.TEACHER,
        consent_152fz=True,
    )
    pupil = accounts.register_user(
        email="anya@example.com",
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2011, 5, 1),
        consent_152fz=True,
    )
    course = courses.create_course(teacher, title="English A2", subject="Английский", level="a2")
    section = courses.create_section(teacher, course.id, title="Unit 4")
    lesson = courses.create_lesson(teacher, section.id, title="Travel", duration_min=40)
    courses.publish_lesson(teacher, lesson.id)
    courses.publish_course(teacher, course.id)
    # §51: ребёнку младше 16 курс открывает подпись законного представителя.
    sign_for_child(pupil)
    courses.enroll(pupil, course.id)

    task = homework.create_homework(
        teacher, title="Сочинение о своём городе", type=HomeworkType.FILE, lesson_id=lesson.id
    )
    homework.publish_homework(teacher, task.id)

    # Ключ в пространстве самого ученика — как его выдал бы requestUpload.
    key = f"submission/{pupil.id}/essay.txt"
    storage.write_bytes(key, ESSAY)
    submission = homework.submit_homework(
        pupil, homework_id=task.id, content_text="Готово", file_keys=[key]
    )
    homework.grade_submission(teacher, submission_id=submission.id, score=5, comment="Отлично")
    return teacher, pupil, submission, key


def wipe_the_cabinet():
    """Снести кабинет: все строки и все файлы. Как будто ноутбук залили кофе."""
    for model in reversed(exported_model_classes()):
        manager = getattr(model, "all_objects", model.objects)
        manager.all().delete()
    root = Path(storage._local_root())
    for path in sorted(root.rglob("*"), reverse=True):
        if path.is_file():
            path.unlink()


# --- 🔴 приёмка фазы ---------------------------------------------------------
def test_export_wipe_restore_and_the_work_and_the_grade_are_back(cabinet):
    _teacher, pupil, submission, key = a_lesson_with_marked_work()
    backup = cabinet / f"cabinet{'.flamingo'}"

    header = export_cabinet(backup, passphrase="красный фламинго 42")
    assert backup.is_file() and header.rows > 0 and header.files >= 1

    wipe_the_cabinet()
    assert Submission.objects.count() == 0
    assert storage.read_bytes(key) is None

    report = import_cabinet(backup, passphrase="красный фламинго 42")

    restored = Submission.objects.get(id=submission.id)
    assert restored.score == 5, "оценка не вернулась"
    assert restored.comment == "Отлично"
    assert restored.student_id == pupil.id
    # И само сочинение — байт в байт, а не строка, которая на него ссылается.
    assert storage.read_bytes(key) == ESSAY, "работа не вернулась"
    assert SubmissionFile.objects.filter(submission=restored, file_key=key).exists()
    assert report.rows > 0 and report.files >= 1 and report.missing_files == 0


def test_a_restore_onto_a_clean_machine_needs_nothing_that_was_not_in_the_file(cabinet):
    """«Тот же файл — и резерв, и переезд на другой компьютер» (лист D2)."""
    _t, _p, submission, key = a_lesson_with_marked_work()
    backup = cabinet / "move.flamingo"
    export_cabinet(backup)

    wipe_the_cabinet()
    import_cabinet(backup)

    assert Submission.objects.filter(id=submission.id).exists()
    assert storage.read_bytes(key) == ESSAY


# --- состав файла ------------------------------------------------------------
def test_the_export_covers_exactly_the_declared_boundary(cabinet):
    """Состав выгрузки сверен с CABINET_TABLES — приёмка фазы называет это прямо."""
    import io
    import json
    import zipfile

    a_lesson_with_marked_work()
    backup = cabinet / "b.flamingo"
    export_cabinet(backup)

    with backup.open("rb") as fh:
        fh.readline()
        fh.readline()
        body = fh.read()
    with zipfile.ZipFile(io.BytesIO(body)) as zf:
        tables = json.loads(zf.read("cabinet.json").decode("utf-8"))

    assert set(tables) == {m.label for m in CABINET_TABLES}


def test_soft_deleted_rows_travel_too(cabinet):
    """Копия, тихо теряющая удалённое, не может ответить «верните, я удалил случайно».

    `Homework` прячет удалённое своим менеджером; выгрузка идёт через `all_objects` именно
    поэтому — резерв обязан уметь вернуть то, что человек стёр по ошибке.
    """
    _t, _p, submission, _key = a_lesson_with_marked_work()
    task = Homework.all_objects.get(submissions__id=submission.id)
    Homework.all_objects.filter(id=task.id).update(deleted_at=timezone.now())
    assert not Homework.objects.filter(id=task.id).exists()

    backup = cabinet / "b.flamingo"
    export_cabinet(backup)
    wipe_the_cabinet()
    import_cabinet(backup)

    assert Homework.all_objects.filter(id=task.id).exists()


# --- 🔒 шифрование -----------------------------------------------------------
def test_a_sealed_file_gives_nothing_away(cabinet):
    a_lesson_with_marked_work()
    backup = cabinet / "sealed.flamingo"
    export_cabinet(backup, passphrase="красный фламинго 42")

    raw = backup.read_bytes()
    assert ESSAY not in raw, "сочинение читается прямо из файла"
    assert b"lucia@example.com" not in raw, "почта преподавателя читается прямо из файла"
    assert "Отлично".encode() not in raw


def test_the_header_stays_readable_so_a_lost_key_is_still_an_answerable_question(cabinet):
    """Человек с зашифрованным файлом должен уметь узнать, что это за файл.

    Иначе забытый пароль превращает копию в неопознаваемый блок, и честный ответ «это ваш
    кабинет от третьего августа, а ключа больше нет» сказать нечем.
    """
    a_lesson_with_marked_work()
    backup = cabinet / "sealed.flamingo"
    export_cabinet(backup, passphrase="ключ")

    assert backup.read_bytes().startswith(MAGIC)
    header = read_header(backup)
    assert header.sealed is True
    assert header.created_at and header.rows > 0


def test_a_wrong_passphrase_is_refused_and_so_is_a_tampered_file(cabinet):
    a_lesson_with_marked_work()
    backup = cabinet / "sealed.flamingo"
    export_cabinet(backup, passphrase="правильный")

    with pytest.raises(ValidationError):
        import_cabinet(backup, passphrase="неправильный")

    with pytest.raises(ValidationError):
        import_cabinet(backup)  # без пароля вовсе

    # Подделка отличается от чужого пароля только для нас: снаружи это одно событие —
    # «этим ключом файл не открывается». GCM ловит изменение, а не только подбор.
    data = bytearray(backup.read_bytes())
    data[-1] ^= 0xFF
    backup.write_bytes(bytes(data))
    with pytest.raises(ValidationError):
        import_cabinet(backup, passphrase="правильный")


def test_the_cloud_copy_may_not_be_unsealed():
    """🔒 §19.1 — на сервере лежит блок, который мы не умеем прочитать. Не пожелание."""
    assert seal_required_for("cloud") is True
    assert seal_required_for("external_disk") is False


# --- 🔴 отказ выгружать не-кабинет -------------------------------------------
@override_settings(CABINET_IS_LOCAL=False)
def test_the_server_refuses_to_export_itself(cabinet, tmp_path):
    """Тот же код живёт на сервере, где в этих таблицах — все преподаватели и все ученики.

    Выгрузка там была бы полным дампом базы по запросу. Отказ — по конфигурации (§18-г),
    а не по угадыванию движка базы: развёртывание решает, чем оно является.
    """
    a_lesson_with_marked_work()
    with pytest.raises(ValidationError):
        export_cabinet(tmp_path / "nope.flamingo")
    with pytest.raises(ValidationError):
        import_cabinet(tmp_path / "nope.flamingo")


def test_a_file_from_a_newer_flamingo_is_refused_rather_than_half_read(cabinet):
    """Опасное направление — то же, что в common/desktop.refuses_cabinet."""
    import json

    a_lesson_with_marked_work()
    backup = cabinet / "b.flamingo"
    export_cabinet(backup)

    with backup.open("rb") as fh:
        magic = fh.readline()
        header = json.loads(fh.readline())
        body = fh.read()
    header["format"] = 99
    backup.write_bytes(magic + json.dumps(header).encode() + b"\n" + body)

    with pytest.raises(ValidationError):
        import_cabinet(backup)


def test_something_that_is_not_a_cabinet_file_is_not_read_as_one(cabinet):
    junk = cabinet / "photo.jpg"
    junk.write_bytes(b"\xff\xd8\xff\xe0 not a cabinet")
    with pytest.raises(ValidationError):
        read_header(junk)
    with pytest.raises(ValidationError):
        import_cabinet(junk)
