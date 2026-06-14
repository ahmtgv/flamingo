"""Accounts mutations. Inputs are mapped to thin service calls."""

from __future__ import annotations

import datetime as dt

import strawberry

from apps.accounts import services
from common.auth import issue_tokens, require_user
from common.enums import Role

from .types import AuthPayload, GuardianshipType, VerificationDocumentType


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
    locale: str = "ru"
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
    def register_user(self, input: RegisterUserInput) -> AuthPayload:
        s, t = input.student, input.teacher
        user = services.register_user(
            email=input.email,
            password=input.password,
            first_name=input.first_name,
            last_name=input.last_name,
            role=input.role,
            locale=input.locale,
            birth_date=getattr(s, "birth_date", None) if s else None,
            grade_level=getattr(s, "grade_level", None) if s else None,
            parent_email=getattr(s, "parent_email", None) if s else None,
            specialty=getattr(t, "specialty", None) if t else None,
            education=getattr(t, "education", None) if t else None,
            experience=getattr(t, "experience", None) if t else None,
        )
        tokens = issue_tokens(user)
        return AuthPayload(token=tokens["token"], refresh_token=tokens["refresh_token"], user=user)

    @strawberry.mutation
    def login(self, email: str, password: str) -> AuthPayload:
        user, tokens = services.login(email=email, password=password)
        return AuthPayload(token=tokens["token"], refresh_token=tokens["refresh_token"], user=user)

    @strawberry.mutation
    def refresh_token(self, refresh_token: str) -> AuthPayload:
        user, tokens = services.refresh(refresh_token)
        return AuthPayload(token=tokens["token"], refresh_token=tokens["refresh_token"], user=user)

    @strawberry.mutation
    def logout(self) -> bool:
        # Stateless JWT: the client discards tokens. Refresh blocklist is future work.
        return True

    @strawberry.mutation
    def request_password_reset(self, email: str) -> bool:
        services.request_password_reset(email)
        return True

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
