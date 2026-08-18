"""Accounts mutations. Inputs are mapped to thin service calls."""

from __future__ import annotations

import datetime as dt

import strawberry

from apps.accounts import learning, services
from common.auth import get_current_user, issue_tokens, require_user
from common.enums import Role

from .types import (
    AuthPayload,
    GuardianshipType,
    LearningProfile,
    UserType,
    VerificationDocumentType,
)


@strawberry.input
class StudentInfoInput:
    birth_date: dt.date | None = None
    grade_level: str | None = None
    parent_email: str | None = None


@strawberry.input
class TeacherInfoInput:
    specialty: str | None = None
    education: str | None = None
    experience: str | None = None


@strawberry.input
class RegisterUserInput:
    email: str
    password: str
    first_name: str
    last_name: str
    role: Role
    # Отчество (§24) — необязательное: его нет у части народов России и у иностранного
    # преподавателя. Умолчание пустой строкой, а не null: «нет отчества» это факт, а не пропуск.
    middle_name: str = ""
    locale: str = "ru"
    # 🔴 R-04: согласие 152-ФЗ доезжает до сервера. Для ученика младше 18 без него регистрация
    # не проходит — отказ в `services.register_user`, а не на экране.
    consent_152fz: bool = False
    student: StudentInfoInput | None = None
    teacher: TeacherInfoInput | None = None


@strawberry.input
class AddChildInput:
    first_name: str
    last_name: str
    consent_152fz: bool
    grade_level: str | None = None
    birth_date: dt.date | None = None
    child_email: str | None = None


@strawberry.type
class AccountsMutation:
    @strawberry.mutation
    def register_user(self, info: strawberry.Info, input: RegisterUserInput) -> AuthPayload:
        s, t = input.student, input.teacher
        user = services.register_user(
            email=input.email,
            password=input.password,
            first_name=input.first_name,
            last_name=input.last_name,
            role=input.role,
            middle_name=input.middle_name,
            locale=input.locale,
            birth_date=getattr(s, "birth_date", None) if s else None,
            grade_level=getattr(s, "grade_level", None) if s else None,
            parent_email=getattr(s, "parent_email", None) if s else None,
            specialty=getattr(t, "specialty", None) if t else None,
            education=getattr(t, "education", None) if t else None,
            experience=getattr(t, "experience", None) if t else None,
            consent_152fz=input.consent_152fz,
        )
        tokens = issue_tokens(user)
        # The caller is now authenticated as `user` for the rest of THIS request, so the
        # AuthPayload's own user resolves self-visible contact fields (email/phone). A-152fz-1.
        info.context.request.user = user
        return AuthPayload(token=tokens["token"], refresh_token=tokens["refresh_token"], user=user)

    @strawberry.mutation
    def login(self, info: strawberry.Info, email: str, password: str) -> AuthPayload:
        user, tokens = services.login(email=email, password=password)
        info.context.request.user = user
        return AuthPayload(token=tokens["token"], refresh_token=tokens["refresh_token"], user=user)

    @strawberry.mutation
    def refresh_token(self, info: strawberry.Info, refresh_token: str) -> AuthPayload:
        user, tokens = services.refresh(refresh_token)
        info.context.request.user = user
        return AuthPayload(token=tokens["token"], refresh_token=tokens["refresh_token"], user=user)

    @strawberry.mutation
    def logout(self, info: strawberry.Info) -> bool:
        # A-authz-3: server-side revocation — bump the user's token_version so every outstanding
        # access/refresh token is rejected. Anonymous callers are a no-op success.
        user = get_current_user(info)
        if user is not None:
            services.logout(user)
        return True

    @strawberry.mutation
    def request_password_reset(self, email: str) -> bool:
        """Просьба сменить пароль.

        🔴 ВОЗВРАЩАЕМОЕ ЗНАЧЕНИЕ ИЗМЕНИЛО СМЫСЛ (наряд 37 §3): раньше здесь стояло `return
        True` всегда — то есть экран показывал «письмо отправлено», когда почты в продукте не
        было вовсе и письмо не уходило никому. Теперь `true` значит «мы умеем отправлять»,
        а `false` — «восстановление пока недоступно», и экран говорит об этом словами.

        🔒 Ответ по-прежнему НЕ раскрывает, есть ли такая почта: он о нашей настройке, не об
        учётной записи.
        """
        return services.request_password_reset(email)

    @strawberry.mutation
    def reset_password(self, token: str, new_password: str) -> bool:
        services.reset_password(token, new_password)
        return True

    @strawberry.mutation
    def verify_email(self, token: str) -> bool:
        services.verify_email(token)
        return True

    @strawberry.mutation
    def add_child(self, info: strawberry.Info, input: AddChildInput) -> GuardianshipType:
        parent = require_user(info)
        return services.add_child(
            parent,
            first_name=input.first_name,
            last_name=input.last_name,
            grade_level=input.grade_level,
            birth_date=input.birth_date,
            child_email=input.child_email,
            consent_152fz=input.consent_152fz,
        )

    @strawberry.mutation
    def respond_guardianship(
        self, info: strawberry.Info, id: strawberry.ID, accept: bool
    ) -> GuardianshipType:
        user = require_user(info)
        return services.respond_guardianship(user, id, accept)

    @strawberry.mutation
    def submit_verification_document(
        self, info: strawberry.Info, file_key: str
    ) -> VerificationDocumentType:
        user = require_user(info)
        return services.submit_verification_document(user, file_key)

    @strawberry.mutation
    def update_my_name(
        self,
        info: strawberry.Info,
        first_name: str,
        last_name: str,
        middle_name: str = "",
    ) -> UserType:
        """Поправить своё имя. Только СВОЁ — чужого пользователя тут нет и взять неоткуда.

        Отчество появилось после того, как люди уже зарегистрировались (§24): без этой мутации
        добавить его было бы негде, и «Здравствуйте, Люция Валерьевна» осталось бы только у тех,
        кто завёл учётку после релиза.
        """
        return services.update_my_name(
            require_user(info),
            first_name=first_name,
            last_name=last_name,
            middle_name=middle_name,
        )

    @strawberry.mutation
    def set_avatar(self, info: strawberry.Info, file_key: str) -> UserType:
        # Own avatar; the key must be in the caller's own avatar/<userId>/ namespace (service).
        return services.set_avatar(require_user(info), file_key)

    @strawberry.mutation
    def set_active_learning_profile(
        self, info: strawberry.Info, id: strawberry.ID
    ) -> LearningProfile:
        """Switch the account into one of ITS OWN learning profiles.

        The id is checked against the caller's projected profiles, so an id naming another
        person's school or course cannot be pinned onto this account (it raises NotFound
        rather than confirming that the id exists elsewhere).
        """
        profile = learning.set_active_learning_profile(require_user(info), str(id))
        return LearningProfile.from_projection(profile)
