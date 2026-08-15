"""Верификация преподавателя — путь целиком (находка владельца 15.08, п.4).

🔴 Что было: баннер «Документы на проверке» висел, а экрана подтверждения не было ни у кого.
Мутация подачи существовала, очереди — нет, решения — нет, причины отказа — нет, а ссылка на
документ вела на выдуманный адрес `/files/<key>`.

Проверяется путь и его границы: кто видит очередь, что решение требует причины, и что каждый
просмотр чужого личного оставляет след (OWNER_SCOPE §23.1, лист D7).
"""

from datetime import date

import pytest

from apps.accounts import services as accounts
from apps.accounts.models import TeacherProfile, VerificationDocument
from apps.oversight import services as oversight
from apps.oversight.models import AccessLogEntry, OversightAction
from common.enums import Role, VerificationStatus
from common.exceptions import NotFound, PermissionDenied, ValidationError

pytestmark = pytest.mark.django_db


def make_teacher(email="t@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Игорь",
        last_name="Ковалёв",
        role=Role.TEACHER,
        specialty="Физика",
        consent_152fz=True,
    )


def make_staff(email="staff@example.com"):
    user = accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Адель",
        last_name="Ахметгареев",
        role=Role.ADMIN,
        consent_152fz=True,
    )
    user.is_staff = True
    user.save(update_fields=["is_staff"])
    return user


def make_pupil(email="p@example.com"):
    return accounts.register_user(
        email=email,
        password="strongpass1!",
        first_name="Аня",
        last_name="Коваль",
        role=Role.STUDENT,
        birth_date=date(2010, 1, 1),
        consent_152fz=True,
    )


def submit(teacher, name="diploma.pdf"):
    """Документ в очередь. Мимо `submit_verification_document`, потому что тот проверяет объект
    в хранилище — здесь проверяется надзор, а не загрузка."""
    doc = VerificationDocument.objects.create(
        teacher_user=teacher,
        file_key=f"verification/{teacher.id}/abc/{name}",
        filename=name,
        size_bytes=2_100_000,
        status=VerificationStatus.PENDING.value,
    )
    TeacherProfile.objects.filter(user=teacher).update(
        verification_status=VerificationStatus.PENDING.value
    )
    return doc


# --- очередь ---------------------------------------------------------------------------------
def test_the_queue_shows_who_is_waiting_and_with_what():
    staff = make_staff()
    teacher = make_teacher()
    submit(teacher, "Диплом.pdf")
    submit(teacher, "Справка.pdf")

    queue = oversight.pending_verifications(staff)

    assert len(queue) == 1, "документы одного человека — одна строка очереди, а не две"
    entry = queue[0]
    # §24: очередь — карточка человека, а не обращение к нему: полная форма имени.
    assert entry.full_name == "Ковалёв Игорь"
    assert entry.specialty == "Физика"
    assert {doc.filename for doc in entry.documents} == {"Диплом.pdf", "Справка.pdf"}
    # Нагрузка — по ней и принимают решение о допуске к детям.
    assert (entry.course_count, entry.session_count) == (0, 0)


def test_the_queue_is_oldest_first():
    """Лист D7 меряет ожидание днями. Значит, ждавший дольше стоит выше."""
    staff = make_staff()
    first = make_teacher("first@example.com")
    second = make_teacher("second@example.com")
    submit(first)
    submit(second)

    queue = oversight.pending_verifications(staff)

    assert [entry.email for entry in queue] == ["first@example.com", "second@example.com"]


def test_a_decided_teacher_leaves_the_queue():
    staff = make_staff()
    teacher = make_teacher()
    submit(teacher)

    oversight.review_verification(staff, teacher.id, approve=True)

    assert oversight.pending_verifications(staff) == []


# --- решение ---------------------------------------------------------------------------------
def test_verifying_marks_the_profile_and_the_documents():
    staff = make_staff()
    teacher = make_teacher()
    doc = submit(teacher)

    oversight.review_verification(staff, teacher.id, approve=True)

    doc.refresh_from_db()
    assert doc.status == VerificationStatus.APPROVED.value
    assert doc.reviewed_by_id == staff.id and doc.reviewed_at is not None
    assert (
        TeacherProfile.objects.get(user=teacher).verification_status
        == VerificationStatus.APPROVED.value
    )


def test_a_refusal_without_a_reason_is_refused():
    """🔴 Лист D7: «Отказ требует причины и уходит человеку текстом, а не молчанием».

    Молчащий отказ — это человек, которому не дали вести занятия и не сказали почему.
    """
    staff = make_staff()
    teacher = make_teacher()
    submit(teacher)

    for blank in ("", "   "):
        with pytest.raises(ValidationError):
            oversight.review_verification(staff, teacher.id, approve=False, reason=blank)

    assert (
        TeacherProfile.objects.get(user=teacher).verification_status
        == VerificationStatus.PENDING.value
    ), "отказ не состоялся — состояние не должно было измениться"


def test_a_refusal_carries_its_reason_to_the_document():
    staff = make_staff()
    teacher = make_teacher()
    doc = submit(teacher)

    oversight.review_verification(
        staff, teacher.id, approve=False, reason="Диплом нечитаем — нужен скан целиком"
    )

    doc.refresh_from_db()
    assert doc.status == VerificationStatus.REJECTED.value
    assert doc.reason == "Диплом нечитаем — нужен скан целиком"


def test_asking_for_more_documents_is_not_a_refusal():
    """Третья кнопка листа. Отказ закрывает дорогу, запрос документов оставляет её открытой."""
    staff = make_staff()
    teacher = make_teacher()
    doc = submit(teacher)

    oversight.request_more_documents(staff, teacher.id, reason="Нужна справка о несудимости")

    doc.refresh_from_db()
    assert doc.status == VerificationStatus.PENDING.value, "человек остался в очереди"
    assert doc.reason == "Нужна справка о несудимости"


def test_deciding_on_a_teacher_with_nothing_pending_is_an_error():
    staff = make_staff()
    teacher = make_teacher()
    with pytest.raises(NotFound):
        oversight.review_verification(staff, teacher.id, approve=True)


# --- границы ---------------------------------------------------------------------------------
@pytest.mark.parametrize("who", ["teacher", "pupil", "admin_without_staff"])
def test_only_platform_staff_reaches_the_queue(who):
    """Роль ADMIN — про учреждение, а не про платформу. Отдельная проверка, потому что
    перепутать эти два «админа» легче всего."""
    make_staff()
    teacher = make_teacher()
    submit(teacher)

    actor = {
        "teacher": lambda: teacher,
        "pupil": make_pupil,
        "admin_without_staff": lambda: accounts.register_user(
            email="inst-admin@example.com",
            password="strongpass1!",
            first_name="Админ",
            last_name="Учреждения",
            role=Role.ADMIN,
            consent_152fz=True,
        ),
    }[who]()

    with pytest.raises(PermissionDenied):
        oversight.pending_verifications(actor)
    with pytest.raises(PermissionDenied):
        oversight.review_verification(actor, teacher.id, approve=True)


def test_a_teacher_cannot_verify_themselves():
    teacher = make_teacher()
    submit(teacher)
    with pytest.raises(PermissionDenied):
        oversight.review_verification(teacher, teacher.id, approve=True)


# --- журнал ----------------------------------------------------------------------------------
def test_opening_a_document_is_written_down_before_the_link_is_handed_out():
    """🔴 §23.1: «каждый просмотр чужого личного пишется в журнал». Диплом — чужое личное."""
    staff = make_staff()
    teacher = make_teacher()
    doc = submit(teacher, "Диплом.pdf")

    oversight.document_url(staff, doc.id)

    row = AccessLogEntry.objects.filter(action=OversightAction.VIEWED_DOCUMENT.value).get()
    assert row.actor_id == staff.id
    assert row.subject_user_id == teacher.id
    assert row.object_label == "Диплом.pdf"


def test_every_decision_leaves_a_trace_with_its_reason():
    staff = make_staff()
    teacher = make_teacher()
    submit(teacher)

    oversight.review_verification(staff, teacher.id, approve=False, reason="Документ нечитаем")

    row = AccessLogEntry.objects.filter(action=OversightAction.REJECTED.value).get()
    assert row.subject_user_id == teacher.id
    assert row.reason == "Документ нечитаем"


def test_opening_the_queue_itself_is_written_down():
    """Очередь — это почты и специальности живых людей. «Кто открывал» — тот же вопрос."""
    staff = make_staff()
    oversight.pending_verifications(staff)
    assert AccessLogEntry.objects.filter(action=OversightAction.VIEWED_QUEUE.value).exists()


def test_the_log_cannot_be_edited_or_deleted_through_the_api():
    """Журнал, который можно подчистить, — не журнал (§23.4).

    Проверяется по контракту: в схеме нет ни одной мутации, трогающей журнал. Это сильнее
    проверки прав — ручки просто не существует.
    """
    from api.schema import schema

    sdl = schema.as_str()
    mutation_block = sdl[sdl.index("type Mutation {") :]
    mutation_block = mutation_block[: mutation_block.index("\n}")]
    for line in mutation_block.splitlines():
        lowered = line.lower()
        assert "accesslog" not in lowered and "oversightlog" not in lowered, line


def test_the_log_survives_the_people_it_is_about():
    """Каскад стёр бы ровно те записи, ради которых журнал и заводят."""
    staff = make_staff()
    teacher = make_teacher()
    doc = submit(teacher)
    oversight.document_url(staff, doc.id)

    teacher.delete()

    row = AccessLogEntry.objects.filter(action=OversightAction.VIEWED_DOCUMENT.value).get()
    assert row.subject_user_id is None
    assert row.object_label == "diploma.pdf", "запись осталась читаемой без самого человека"
