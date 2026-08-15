"""Identity models: USER, role profiles, guardianship, verification."""

import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from common.enums import (
    AgeBand,
    GuardianshipStatus,
    Role,
    VerificationStatus,
    choices,
)
from common.models import BaseModel, JurisdictionMixin, TimeStampedModel

from .managers import UserManager


class User(JurisdictionMixin, AbstractBaseUser, PermissionsMixin):
    """Single account table. Role-specific data lives in 1:1 profiles.

    The jurisdiction fields apply to B2C users only: for a user who belongs to an
    institution, the institution's jurisdiction wins (it is the tenant).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=32, blank=True, default="")
    role = models.CharField(max_length=16, choices=choices(Role))
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120)
    # Отчество — требование владельца 15.08 (OWNER_SCOPE §24). **Необязательное**: его нет у
    # части народов России и у иностранного преподавателя, и форма не должна требовать
    # невозможного. Читается только через display_name/full_name ниже.
    middle_name = models.CharField(max_length=120, blank=True, default="")
    locale = models.CharField(max_length=8, default="ru")  # i18n-ready
    # Which learning profile the account is currently working in ("pupil:<uuid>" /
    # "cadet:<uuid>" / "teacher:<uuid>"). The profiles themselves are NOT stored — they are
    # projected from INSTITUTION_MEMBERSHIP and ENROLLMENT (apps/accounts/learning.py); this
    # is only a pointer, so the choice follows the person between devices. Empty = "not
    # chosen yet", which resolves to the first available profile.
    active_learning_profile = models.CharField(max_length=64, blank=True, default="")
    # PROMPT_13 §5: the explicit consent point — «речь занятий обрабатывается для саммари;
    # видео и аудио не записываются». Withheld by default, because a default-on consent is
    # not a consent. A minor additionally needs their guardian's 152-FZ consent; both checks
    # live in apps/summaries/consent.py, which is the only place that reads these fields.
    consent_speech = models.BooleanField(default=False)
    consent_speech_at = models.DateTimeField(null=True, blank=True)
    # D2 step 3 / OWNER_SCOPE §19: attention analysis is **off until someone turns it on**,
    # and the sheet says why in a sentence worth keeping — «это не осторожность, а уважение:
    # включать наблюдение за вниманием ребёнка должно быть осознанным действием, а не
    # следствием того, что кто-то не снял галочку». Read by apps/seedum/services.py, which
    # refuses the bucket without it — a default enforced only by a checkbox is not a default.
    consent_attention = models.BooleanField(default=False)
    consent_attention_at = models.DateTimeField(null=True, blank=True)
    # 🔴 R-04 (аудит 14.08). CLAUDE.md §2.3: «Children < 18 require parental consent
    # (consent152fz) captured at registration». Галочку спрашивали и выбрасывали — в мутацию
    # она не доезжала, и юридически согласия не существовало нигде.
    #
    # Хранится на пользователе, а не на GUARDIANSHIP: на момент регистрации связи с родителем
    # ещё нет, а согласие уже дано и уже обязано быть зафиксировано. Guardianship-согласие
    # (§20.х, привязка родителя к ребёнку) — отдельный факт и остаётся на своём месте.
    consent_152fz = models.BooleanField(default=False)
    consent_152fz_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    # A-authz-3: bumped on logout / password-reset to invalidate every outstanding token
    # (embedded as the `tv` claim; auth rejects a token whose tv != this).
    token_version = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name", "role"]

    def __str__(self) -> str:
        return self.email

    # --- как зовут человека (OWNER_SCOPE §24) ------------------------------------------------
    #
    # 🔴 Три метода вместо склейки, и это не вкусовщина. Склейка `f"{first} {last}"` жила
    # минимум в семнадцати местах питона и в двух десятках мест фронта; добавить отчество и
    # обойти их руками — гарантированно забыть половину, и тогда поле появилось бы в базе и не
    # появилось бы на половине экранов.
    #
    # Правило обращения — та же ось, что «вы»/«ты» (§Б4 промпта 16): имя-отчество это форма
    # ДЛЯ ПРЕПОДАВАТЕЛЯ. Ребёнка по отчеству не зовут, и звать не начнём.

    @property
    def full_name(self) -> str:
        """Фамилия Имя Отчество — для документов и карточки надзора.

        Порядок «фамилия первой» — тот, в котором пишут в документах и в котором ищут в
        списке. Пустое отчество не оставляет двойного пробела: `join` по непустым.
        """
        return " ".join(p for p in (self.last_name, self.first_name, self.middle_name) if p)

    @property
    def display_name(self) -> str:
        """Как обращаются К ЭТОМУ ЧЕЛОВЕКУ. Приветствие, его собственный кабинет.

        К преподавателю — Имя Отчество («Здравствуйте, Люция Валерьевна»), к остальным — имя.
        Отчества нет (а его нет у части народов России и у иностранного преподавателя) —
        остаётся имя, без хвоста и без лишнего пробела.
        """
        if self.role == Role.TEACHER.value and self.middle_name:
            return f"{self.first_name} {self.middle_name}".strip()
        return self.first_name.strip()

    @property
    def formal_name(self) -> str:
        """Как о человеке говорят ДРУГИМ: «кто ведёт этот курс», подпись автора, отправитель.

        🔴 Разница с `display_name` найдена тестами, а не придумана: ученик, читающий «Мария»
        вместо «Мария Петровна», обращается к преподавателю по-свойски, чего в русской школе
        не делают. Обращение и упоминание — разные формы, и склеивать их в одну нельзя.

        Преподаватель с отчеством — Имя Отчество. Все остальные (и преподаватель без
        отчества) — Имя Фамилия: этого достаточно, чтобы отличить двух Тимуров, и не
        избыточно, как полная форма из трёх слов.
        """
        if self.role == Role.TEACHER.value and self.middle_name:
            return f"{self.first_name} {self.middle_name}".strip()
        return " ".join(p for p in (self.first_name, self.last_name) if p)

    @property
    def short_name(self) -> str:
        """Имя Ф. — там, где места мало: список участников, чат, полоса видео."""
        initial = f" {self.last_name[0]}." if self.last_name else ""
        return f"{self.first_name}{initial}".strip()


class StudentProfile(TimeStampedModel):
    user = models.OneToOneField(
        User, primary_key=True, related_name="student_profile", on_delete=models.CASCADE
    )
    birth_date = models.DateField(null=True, blank=True)
    age_band = models.CharField(max_length=8, choices=choices(AgeBand), default=AgeBand.TEEN.value)
    grade_level = models.CharField(max_length=32, blank=True, default="")
    points_cached = models.PositiveIntegerField(default=0)
    avatar_key = models.CharField(max_length=512, blank=True, default="")
    # institution FK is added with the institutions module.


class ParentProfile(TimeStampedModel):
    user = models.OneToOneField(
        User, primary_key=True, related_name="parent_profile", on_delete=models.CASCADE
    )


class TeacherProfile(TimeStampedModel):
    user = models.OneToOneField(
        User, primary_key=True, related_name="teacher_profile", on_delete=models.CASCADE
    )
    specialty = models.CharField(max_length=200, blank=True, default="")
    education = models.TextField(blank=True, default="")
    experience = models.TextField(blank=True, default="")
    bio = models.TextField(blank=True, default="")
    verification_status = models.CharField(
        max_length=12, choices=choices(VerificationStatus), default=VerificationStatus.PENDING.value
    )
    rating_cached = models.DecimalField(max_digits=2, decimal_places=1, null=True, blank=True)
    avatar_key = models.CharField(max_length=512, blank=True, default="")


class AdminProfile(TimeStampedModel):
    user = models.OneToOneField(
        User, primary_key=True, related_name="admin_profile", on_delete=models.CASCADE
    )
    # institution FK is added with the institutions module.


class Guardianship(BaseModel):
    """Parent <-> child link with 152-FZ consent."""

    parent_user = models.ForeignKey(User, related_name="children_links", on_delete=models.CASCADE)
    child_user = models.ForeignKey(User, related_name="parent_links", on_delete=models.CASCADE)
    status = models.CharField(
        max_length=12, choices=choices(GuardianshipStatus), default=GuardianshipStatus.PENDING.value
    )
    consent_152fz = models.BooleanField(default=False)
    consent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["parent_user", "child_user"], name="uniq_guardianship")
        ]


class VerificationDocument(BaseModel):
    """Teacher diploma/certificate submitted for moderation.

    Решение принимается на листе D7 («Надзор · верификация») и обязано быть объяснимым:
    отказ без причины уходит человеку молчанием, а он ждёт допуска к детям. Поэтому у
    документа есть автор решения, момент и причина — а не только статус.

    Состав документов (диплом, справка, паспорт) — вопрос к юристам и к юрисдикционной
    матрице, а не к коду: лист рисует МЕХАНИЗМ, и здесь его ровно столько.
    """

    teacher_user = models.ForeignKey(
        User, related_name="verification_documents", on_delete=models.CASCADE
    )
    file_key = models.CharField(max_length=512)
    # Что человек видит в очереди: имя и вес файла. Без них строка очереди — «документ»,
    # и админ вынужден открывать каждый, чтобы понять, что перед ним.
    filename = models.CharField(max_length=200, blank=True, default="")
    size_bytes = models.PositiveBigIntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=12, choices=choices(VerificationStatus), default=VerificationStatus.PENDING.value
    )
    reviewed_by = models.ForeignKey(
        User,
        related_name="verifications_reviewed",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    # 🔴 Причина отказа. Лист D7: «Отказ требует причины и уходит человеку текстом, а не
    # молчанием». Пустая при одобрении — там объяснять нечего.
    reason = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["created_at"]
        # Очередь — «ждут решения, сначала самые давние»: один индекс на весь экран.
        indexes = [models.Index(fields=["status", "created_at"])]


class RevokedToken(BaseModel):
    """A-authz-3: server-side revocation list for refresh-token ``jti``s. A refresh token whose
    jti is here is rejected — used to invalidate the presented token on rotation (refresh) so a
    rotated/leaked refresh token cannot be replayed. Expired entries are safe to prune."""

    jti = models.UUIDField(unique=True)
    expires_at = models.DateTimeField()
