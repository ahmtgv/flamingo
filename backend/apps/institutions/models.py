"""Institutions domain (ERD §3.1, §3.3): INSTITUTION, INSTITUTION_MEMBERSHIP,
GROUP, GROUP_MEMBERSHIP, GROUP_TEACHER.

MVP delivery is group-based (Option A): a course/session/homework optionally
carries a single nullable ``group_id`` (those cross-app FKs are added in the
institutions step (b) migration). Reviews live in the future engagement app and
are intentionally absent here. Branding JSON is stored but unused in MVP.
"""

from django.db import models

from common.enums import InstitutionStatus, MembershipRole, MembershipStatus, choices
from common.models import BaseModel, SoftDeleteModel


class Institution(SoftDeleteModel):
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=512, blank=True, default="")
    logo_key = models.CharField(max_length=512, blank=True, default="")
    website = models.CharField(max_length=255, blank=True, default="")
    subdomain = models.CharField(max_length=63, unique=True, null=True, blank=True)
    status = models.CharField(
        max_length=12, choices=choices(InstitutionStatus), default=InstitutionStatus.ACTIVE.value
    )
    default_locale = models.CharField(max_length=8, default="ru")
    # white-label colors/domain — stored but unused in MVP (no subdomain routing/theming yet).
    branding = models.JSONField(default=dict, blank=True)

    def __str__(self) -> str:
        return self.name


class InstitutionMembership(BaseModel):
    user = models.ForeignKey(
        "accounts.User", related_name="institution_memberships", on_delete=models.CASCADE
    )
    institution = models.ForeignKey(
        Institution, related_name="memberships", on_delete=models.CASCADE
    )
    role = models.CharField(max_length=12, choices=choices(MembershipRole))
    status = models.CharField(
        max_length=12, choices=choices(MembershipStatus), default=MembershipStatus.PENDING.value
    )
    joined_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "institution"], name="uniq_institution_membership"
            )
        ]


class Group(BaseModel):
    institution = models.ForeignKey(Institution, related_name="groups", on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    level = models.CharField(max_length=32, blank=True, default="")

    def __str__(self) -> str:
        return self.name


class GroupMembership(BaseModel):
    group = models.ForeignKey(Group, related_name="memberships", on_delete=models.CASCADE)
    student = models.ForeignKey(
        "accounts.StudentProfile", related_name="group_memberships", on_delete=models.CASCADE
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["group", "student"], name="uniq_group_membership")
        ]


class GroupTeacher(BaseModel):
    group = models.ForeignKey(Group, related_name="group_teachers", on_delete=models.CASCADE)
    teacher = models.ForeignKey(
        "accounts.TeacherProfile", related_name="group_assignments", on_delete=models.CASCADE
    )
    subject = models.CharField(max_length=200)
