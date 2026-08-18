"""GraphQL types for the accounts domain (strawberry-django)."""

from __future__ import annotations

import datetime as dt
from typing import TYPE_CHECKING, Annotated

import strawberry
import strawberry_django
from strawberry import auto

from apps.accounts import models, services
from apps.accounts.start_page import StartEntryKind
from common import storage
from common.auth import get_current_user, require_user
from common.enums import (
    AgeBand,
    GuardianshipStatus,
    LearningProfileKind,
    Role,
    VerificationStatus,
)
from common.marking import is_markless

if TYPE_CHECKING:
    # Lazily referenced to avoid the accounts <-> institutions graphql import cycle.
    from apps.institutions.graphql.types import Institution


@strawberry_django.type(models.StudentProfile)
class StudentProfileType:
    user: UserType
    birth_date: auto
    grade_level: auto

    @strawberry_django.field
    def age_band(self) -> AgeBand:
        return AgeBand(self.age_band)

    @strawberry_django.field
    def points(self) -> int:
        return self.points_cached

    @strawberry_django.field
    def markless(self) -> bool:
        """Этот ученик учится без отметок — дошкольник или первый класс.

        🔴 ОДИН ОТВЕТ НА ВЕСЬ ПРОДУКТ (наряд §34.4). Правило внешнее (ФГОС НОО, приказ 373 от
        06.10.2009 в ред. 286 от 31.05.2021; ФЗ-273) и считается в `common/marking.py`. Экраны
        СПРАШИВАЮТ, а не выводят сами: три экрана, каждый со своим «а первый ли это класс»,
        разойдутся на первом же изменении — этот механизм в репозитории уже подводил.

        ⚠️ Запрещены не только цифры: значки, баллы, полоски, «уровни» и рейтинги — это та же
        отметка другим шрифтом. Поэтому поле называется markless, а не noDigits.
        """
        return is_markless(self)


@strawberry_django.type(models.TeacherProfile)
class TeacherProfileType:
    user: UserType
    specialty: auto
    education: auto
    experience: auto
    bio: auto

    @strawberry_django.field
    def verification_status(self) -> VerificationStatus:
        return VerificationStatus(self.verification_status)

    @strawberry_django.field
    def rating(self) -> float | None:
        return float(self.rating_cached) if self.rating_cached is not None else None

    @strawberry_django.field
    def review_count(self) -> int:
        return 0  # populated by the engagement module

    @strawberry_django.field
    def verification_documents(self, info: strawberry.Info) -> list["VerificationDocumentType"]:
        """Свои документы — и только свои.

        🔴 Находка владельца 15.08, п.4: баннер «Документы на проверке» висел у каждого
        преподавателя, потому что `verification_status` рождается со значением PENDING.
        Человек, не загрузивший ничего, читал, что его документы проверяют. Отличить
        «не загружал» от «жду решения» можно только по наличию документов — вот они.

        Чужой профиль отдаёт пустой список: список документов человека — его личное, а карточка
        преподавателя открыта всем, кто смотрит курс.
        """
        viewer = get_current_user(info)
        if viewer is None or str(viewer.id) != str(self.user_id):
            return []
        return services.my_verification_documents(viewer)


@strawberry_django.type(models.AdminProfile)
class AdminProfileType:
    user: UserType

    @strawberry_django.field
    def institution(
        self,
    ) -> Annotated["Institution", strawberry.lazy("apps.institutions.graphql.types")] | None:
        """The admin's institution, derived from their active admin membership.

        Gives the admin FE an entry point (there is no AdminProfile.institution
        column). The quoted "Institution" is required by strawberry.lazy to break
        the accounts<->institutions graphql import cycle (UP037 ignored for this
        file in pyproject)."""
        from apps.institutions.models import InstitutionMembership
        from common.enums import MembershipRole, MembershipStatus

        membership = (
            InstitutionMembership.objects.filter(
                user_id=self.user_id,
                role=MembershipRole.ADMIN.value,
                status=MembershipStatus.ACTIVE.value,
            )
            .select_related("institution")
            .first()
        )
        return membership.institution if membership else None


@strawberry_django.type(models.ParentProfile)
class ParentProfileType:
    user: UserType

    @strawberry_django.field
    def children(self) -> list[StudentProfileType]:
        child_ids = models.Guardianship.objects.filter(
            parent_user=self.user, status=GuardianshipStatus.ACTIVE.value
        ).values_list("child_user_id", flat=True)
        return list(models.StudentProfile.objects.filter(user_id__in=child_ids))


@strawberry_django.type(models.User)
class UserType:
    id: auto
    first_name: auto
    last_name: auto
    middle_name: auto
    locale: auto
    is_active: auto
    created_at: auto
    #: D2 step 3 — the wizard has to know what was already agreed to when it resumes, and the
    #: settings screen shows both. Own account only: `me` is the only query that returns a
    #: UserType for the caller themselves, and a consent is nobody else's business.
    consent_speech: auto
    consent_attention: auto
    #: Когда подписано согласие 152-ФЗ. Мастер показывает это вместо метки «обязательно»:
    #: галочки там нет — согласие даётся при регистрации, и здесь оно справка, а не поле
    #: (промпт 18 §Б0-кватер). Своя учётка: `me` — единственный запрос, отдающий UserType себе.
    consent_152fz_at: auto
    #: Пояс человека (§37). Пусто — не сказал; сутки тогда считаются по умолчанию сервера.
    timezone: auto

    @strawberry_django.field
    def email(self, info: strawberry.Info) -> str | None:
        # 152-FZ (A-152fz-1): contact PII only to self or a same-institution ACTIVE admin;
        # the public catalog owner / teacher card sees None.
        return self.email if services.contact_visible(get_current_user(info), self) else None

    @strawberry_django.field
    def phone(self, info: strawberry.Info) -> str | None:
        return self.phone if services.contact_visible(get_current_user(info), self) else None

    @strawberry_django.field
    def role(self) -> Role:
        return Role(self.role)

    # --- как зовут человека (§24) --------------------------------------------------------
    # Три готовых имени вместо склейки на клиенте. Правило «преподавателю имя-отчество,
    # ученику имя» живёт в ОДНОМ месте — на модели; повтори его во фронте, и однажды один
    # экран начнёт звать ребёнка по отчеству, а другой перестанет звать так преподавателя.

    @strawberry_django.field
    def display_name(self) -> str:
        return self.display_name

    @strawberry_django.field
    def formal_name(self) -> str:
        return self.formal_name

    @strawberry_django.field
    def full_name(self) -> str:
        return self.full_name

    @strawberry_django.field
    def short_name(self) -> str:
        return self.short_name

    @strawberry_django.field
    def avatar_url(self, info: strawberry.Info) -> str | None:
        # Presigned GET for the avatar (low sensitivity: any authenticated user, private
        # bucket, short TTL). avatar_key lives on student/teacher profiles only.
        if self.role == Role.STUDENT.value:
            key = self.student_profile.avatar_key
        elif self.role == Role.TEACHER.value:
            key = self.teacher_profile.avatar_key
        else:
            return None
        if not key:
            return None
        require_user(info)  # any authed viewer may see avatars; anonymous gets nothing
        return storage.presign_get(key)

    @strawberry_django.field
    def student_profile(self) -> StudentProfileType | None:
        return getattr(self, "student_profile", None)

    @strawberry_django.field
    def teacher_profile(self) -> TeacherProfileType | None:
        return getattr(self, "teacher_profile", None)

    @strawberry_django.field
    def parent_profile(self) -> ParentProfileType | None:
        return getattr(self, "parent_profile", None)

    @strawberry_django.field
    def admin_profile(self) -> AdminProfileType | None:
        return getattr(self, "admin_profile", None)


@strawberry_django.type(models.Guardianship)
class GuardianshipType:
    id: auto
    parent: UserType = strawberry_django.field(field_name="parent_user")
    child: UserType = strawberry_django.field(field_name="child_user")
    consent_at: auto

    @strawberry_django.field
    def status(self) -> GuardianshipStatus:
        return GuardianshipStatus(self.status)

    @strawberry.field(name="consent152fz")
    def consent_152fz(self) -> bool:
        return self.consent_152fz


@strawberry_django.type(models.VerificationDocument)
class VerificationDocumentType:
    id: auto
    created_at: auto
    filename: auto
    size_bytes: auto
    # Причина отказа или «каких документов не хватает» — то, что человек обязан прочитать
    # словами. Молчащий отказ и есть то, на что владелец пожаловался 15.08.
    reason: auto
    reviewed_at: auto

    @strawberry_django.field
    def status(self) -> VerificationStatus:
        return VerificationStatus(self.status)

    @strawberry_django.field
    def file_url(self, info: strawberry.Info) -> str | None:
        """Ссылка на СВОЙ документ — и только на свой.

        🔴 Здесь стояло `f"/files/{self.file_key}"` — маршрута с таким адресом в продукте нет
        и не было. Поле выглядело работающим и не открывало ничего.

        Надзор берёт документ другим путём (`verificationDocumentUrl`), потому что там просмотр
        чужого личного обязан попасть в журнал, а здесь человек смотрит своё — журналу нечего
        записывать.
        """
        viewer = get_current_user(info)
        if viewer is None or str(viewer.id) != str(self.teacher_user_id):
            return None
        return storage.presign_get(self.file_key)


@strawberry.type
class AuthPayload:
    token: str
    refresh_token: str
    user: UserType


@strawberry.type
class LearningProfile:
    """One of the educations inside a single account (owner req. 15, atlas sheet 00).

    A projection over INSTITUTION_MEMBERSHIP / ENROLLMENT — nothing here is stored as a row
    (see apps/accounts/learning.py for why). It deliberately carries data rather than
    display text: the client builds "Ученик · 9А" from `kind` + `groupName` through i18n, so
    the server never ships a Russian string.
    """

    id: strawberry.ID
    kind: LearningProfileKind
    institution_id: strawberry.ID | None
    institution_name: str | None
    group_name: str | None  # the class, e.g. "9А"
    course_id: strawberry.ID | None
    course_title: str | None
    course_count: int  # subjects studied in this context
    is_active: bool

    @classmethod
    def from_projection(cls, profile) -> LearningProfile:
        return cls(
            id=strawberry.ID(profile.id),
            kind=profile.kind,
            institution_id=(
                strawberry.ID(profile.institution_id) if profile.institution_id else None
            ),
            institution_name=profile.institution_name,
            group_name=profile.group_name,
            course_id=strawberry.ID(profile.course_id) if profile.course_id else None,
            course_title=profile.course_title,
            course_count=profile.course_count,
            is_active=profile.is_active,
        )


# --- start page (atlas sheet 00) -----------------------------------------------------------
@strawberry.type
class StartEntry:
    """One row on the start page. Carries DATA — the client words it from `kind` via i18n."""

    id: strawberry.ID
    kind: StartEntryKind
    title: str
    course_title: str | None
    teacher_name: str | None
    at: dt.datetime | None
    count: int | None
    age_days: int | None
    session_id: strawberry.ID | None
    lesson_id: strawberry.ID | None
    course_id: strawberry.ID | None
    is_live: bool

    @classmethod
    def of(cls, entry) -> "StartEntry":
        return cls(
            id=strawberry.ID(entry.id),
            kind=entry.kind,
            title=entry.title,
            course_title=entry.course_title,
            teacher_name=entry.teacher_name,
            at=entry.at,
            count=entry.count,
            age_days=entry.age_days,
            session_id=strawberry.ID(entry.session_id) if entry.session_id else None,
            lesson_id=strawberry.ID(entry.lesson_id) if entry.lesson_id else None,
            course_id=strawberry.ID(entry.course_id) if entry.course_id else None,
            is_live=entry.is_live,
        )


@strawberry.type
class StartDay:
    date: dt.date
    is_today: bool
    entries: list[StartEntry]


@strawberry.type
class StartMastery:
    """Одна тема и то, как она зашла классу — «Усвоение группы» листа 00 (§27.5 п.3).

    `answers` едет вместе с процентом намеренно: «84%» по четырём ответам и «84%» по двумстам
    — разные утверждения, и преподаватель имеет право отличить одно от другого.
    """

    lesson_id: strawberry.ID
    title: str
    course_title: str
    mastery_pct: int
    answers: int
    struggling: int


@strawberry.type
class StartProgress:
    course_id: strawberry.ID
    course_title: str
    done_lessons: int
    total_lessons: int
    progress_pct: int


@strawberry.type
class StartCourse:
    """Курс преподавателя на стартовой — «что я веду», одной строкой на курс."""

    course_id: strawberry.ID
    title: str
    subject: str
    section_count: int
    lesson_count: int
    published_lessons: int
    student_count: int
    is_draft: bool
    next_at: dt.datetime | None
    next_lesson_title: str | None


@strawberry.type
class StartPage:
    """Atlas sheet 00. The frame is the same for every role; the active learning profile
    decides what fills it."""

    profile: LearningProfile | None
    now: StartEntry | None
    today: list[StartEntry]
    attention: list[StartEntry]
    week: list[StartDay]
    continue_entries: list[StartEntry]
    progress: list[StartProgress]
    # Наполнение того же слота у преподавателя: у него нет своего прогресса, зато есть курсы.
    teaching: list[StartCourse]
    mastery: list[StartMastery]

    @classmethod
    def of(cls, page) -> "StartPage":
        return cls(
            profile=(LearningProfile.from_projection(page.profile) if page.profile else None),
            now=StartEntry.of(page.now) if page.now else None,
            today=[StartEntry.of(e) for e in page.today],
            attention=[StartEntry.of(e) for e in page.attention],
            week=[
                StartDay(
                    date=day.date,
                    is_today=day.is_today,
                    entries=[StartEntry.of(e) for e in day.entries],
                )
                for day in page.week
            ],
            continue_entries=[StartEntry.of(e) for e in page.continue_entries],
            progress=[
                StartProgress(
                    course_id=strawberry.ID(row.course_id),
                    course_title=row.course_title,
                    done_lessons=row.done_lessons,
                    total_lessons=row.total_lessons,
                    progress_pct=row.progress_pct,
                )
                for row in page.progress
            ],
            mastery=[
                StartMastery(
                    lesson_id=strawberry.ID(row.lesson_id),
                    title=row.title,
                    course_title=row.course_title,
                    mastery_pct=row.mastery_pct,
                    answers=row.answers,
                    struggling=row.struggling,
                )
                for row in page.mastery
            ],
            teaching=[
                StartCourse(
                    course_id=strawberry.ID(row.course_id),
                    title=row.title,
                    subject=row.subject,
                    section_count=row.section_count,
                    lesson_count=row.lesson_count,
                    published_lessons=row.published_lessons,
                    student_count=row.student_count,
                    is_draft=row.is_draft,
                    next_at=row.next_at,
                    next_lesson_title=row.next_lesson_title,
                )
                for row in page.teaching
            ],
        )
